```tsx
import React, { useEffect, useState } from "react";
import type { ScheduledMessage, AppSettings, ActiveTab } from "./types";

import {
  loadMessages,
  saveMessages,
  loadSettings,
  saveSettings,
  INITIAL_SEED_MESSAGES,
} from "./storage";

import {
  playNotificationSound,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  initServiceWorker,
  syncSchedulesToServiceWorker,
  markMessageAsNotified,
  clearNotifiedMessage,
} from "./notifications";

import { calculateNextOccurrence } from "./recurrence";

import { BottomNav } from "./BottomNav";
import { HomeScreen } from "./HomeScreen";
import { ScheduleScreen } from "./ScheduleScreen";
import { HistoryScreen } from "./HistoryScreen";
import { SettingsScreen } from "./SettingsScreen";
import { MessagePreparationModal } from "./MessagePreparationModal";
import { AndroidNotificationSim } from "./AndroidNotificationSim";

export default function App() {
  const [messages, setMessages] = useState<ScheduledMessage[]>(() =>
    loadMessages()
  );

  const [settings, setSettings] = useState<AppSettings>(() =>
    loadSettings()
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("home");

  const [selectedMessage, setSelectedMessage] =
    useState<ScheduledMessage | null>(null);

  const [editingMessage, setEditingMessage] =
    useState<ScheduledMessage | null>(null);

  const [permissionStatus, setPermissionStatus] = useState<
    NotificationPermission | "unsupported"
  >(() => getNotificationPermissionStatus());

  const [activeNotification, setActiveNotification] = useState<{
    message?: ScheduledMessage;
    title: string;
    body: string;
    time: string;
  } | null>(null);

  /*
   * Save messages and synchronize them with the service worker.
   */
  useEffect(() => {
    saveMessages(messages);
    syncSchedulesToServiceWorker(messages);
  }, [messages]);

  /*
   * Save settings whenever they change.
   */
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  /*
   * Initialize the service worker and listen for messages from it.
   */
  useEffect(() => {
    initServiceWorker();

    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data;

      if (!data) return;

      if (data.type === "TEXTLY_OPEN_MESSAGE" && data.messageId) {
        setMessages((current) => {
          const found = current.find(
            (message) => message.id === data.messageId
          );

          if (found) {
            setSelectedMessage(found);
          }

          return current;
        });
      }

      if (data.type === "TEXTLY_MESSAGE_DUE" && data.messageId) {
        setMessages((current) =>
          current.map((message) =>
            message.id === data.messageId &&
            message.status === "scheduled"
              ? {
                  ...message,
                  status: "ready",
                }
              : message
          )
        );
      }
    };

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, []);

  /*
   * Open a message directly from a notification URL.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const openMessageId = params.get("openMsgId");

    if (!openMessageId) return;

    const found = messages.find(
      (message) => message.id === openMessageId
    );

    if (found) {
      setSelectedMessage(found);
    }

    try {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    } catch {
      // Ignore URL cleanup errors.
    }
  }, [messages]);

  /*
   * Foreground scheduler.
   *
   * This checks scheduled messages periodically while the web app
   * is open. The service worker handles background notification work.
   */
  useEffect(() => {
    const evaluateDueMessages = () => {
      const now = Date.now();

      setMessages((previousMessages) => {
        let changed = false;

        const updatedMessages = previousMessages.map((message) => {
          if (
            message.status !== "scheduled" ||
            message.isPaused
          ) {
            return message;
          }

          const scheduledTime = new Date(
            message.scheduledAt
          ).getTime();

          if (
            Number.isNaN(scheduledTime) ||
            scheduledTime > now
          ) {
            return message;
          }

          changed = true;

          const firstAlert = markMessageAsNotified(message.id);

          if (firstAlert) {
            const title = "Textly — Message Ready";
            const body = "Your scheduled message is ready to send.";

            if (settings.soundEnabled) {
              playNotificationSound();
            }

            sendBrowserNotification(
              title,
              body,
              {
                messageId: message.id,
                recipientName: message.recipientName,
                messageText: message.message,
              },
              () => {
                setSelectedMessage({
                  ...message,
                  status: "ready",
                });
              }
            );

            if (settings.simulateAndroidDrawer) {
              setActiveNotification({
                message: {
                  ...message,
                  status: "ready",
                },
                title,
                body,
                time: "Just now",
              });
            }
          }

          if (
            message.repeat &&
            message.repeat !== "never"
          ) {
            const nextTime = calculateNextOccurrence(
              message.scheduledAt,
              message.repeat,
              now
            );

            return {
              ...message,
              scheduledAt: nextTime,
              status: "scheduled",
            };
          }

          return {
            ...message,
            status: "ready",
          };
        });

        return changed ? updatedMessages : previousMessages;
      });
    };

    const interval = window.setInterval(
      evaluateDueMessages,
      2500
    );

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        evaluateDueMessages();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityOrFocus
    );

    window.addEventListener(
      "focus",
      handleVisibilityOrFocus
    );

    window.addEventListener(
      "pageshow",
      handleVisibilityOrFocus
    );

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityOrFocus
      );

      window.removeEventListener(
        "focus",
        handleVisibilityOrFocus
      );

      window.removeEventListener(
        "pageshow",
        handleVisibilityOrFocus
      );
    };
  }, [
    settings.soundEnabled,
    settings.simulateAndroidDrawer,
  ]);

  /*
   * Request browser notification permission.
   */
  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();

    setPermissionStatus(status);

    return status;
  };

  /*
   * Create or edit a scheduled message.
   */
  const handleSaveMessage = (
    data: Omit<
      ScheduledMessage,
      "id" | "createdAt" | "status"
    > & {
      id?: string;
    }
  ) => {
    if (data.id) {
      clearNotifiedMessage(data.id);

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.id === data.id
            ? {
                ...message,
                recipientName: data.recipientName,
                recipientPhone: data.recipientPhone,
                message: data.message,
                scheduledAt: data.scheduledAt,
                repeat: data.repeat || "never",
                status: "scheduled",
                isPaused: false,
              }
            : message
        )
      );
    } else {
      const newMessage: ScheduledMessage = {
        id: `msg-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        message: data.message,
        scheduledAt: data.scheduledAt,
        createdAt: new Date().toISOString(),
        status: "scheduled",
        platform: "whatsapp",
        repeat: data.repeat || "never",
        isPaused: false,
      };

      setMessages((previousMessages) => [
        newMessage,
        ...previousMessages,
      ]);
    }

    setEditingMessage(null);
    setActiveTab("home");
  };

  /*
   * Pause or resume a recurring message.
   */
  const handleTogglePauseMessage = (messageId: string) => {
    setMessages((previousMessages) =>
      previousMessages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        const willPause = !message.isPaused;

        if (
          !willPause &&
          message.repeat &&
          message.repeat !== "never"
        ) {
          const nextTime = calculateNextOccurrence(
            message.scheduledAt,
            message.repeat,
            Date.now()
          );

          return {
            ...message,
            isPaused: false,
            scheduledAt: nextTime,
            status: "scheduled",
          };
        }

        return {
          ...message,
          isPaused: willPause,
        };
      })
    );
  };

  /*
   * Delete a message.
   */
  const handleDeleteMessage = (messageId: string) => {
    clearNotifiedMessage(messageId);

    setMessages((previousMessages) =>
      previousMessages.filter(
        (message) => message.id !== messageId
      )
    );
  };

  /*
   * Cancel a scheduled message.
   */
  const handleCancelMessage = (messageId: string) => {
    setMessages((previousMessages) =>
      previousMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              status: "cancelled",
            }
          : message
      )
    );
  };

  /*
   * Mark a message as manually sent.
   */
  const handleMarkAsSent = (messageId: string) => {
    setMessages((previousMessages) =>
      previousMessages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        const sentAt = new Date().toISOString();

        if (
          message.repeat &&
          message.repeat !== "never"
        ) {
          const nextTime = calculateNextOccurrence(
            message.scheduledAt,
            message.repeat,
            Date.now()
          );

          return {
            ...message,
            scheduledAt: nextTime,
            status: "scheduled",
            sentAt,
          };
        }

        return {
          ...message,
          status: "sent_manually",
          sentAt,
        };
      })
    );
  };

  /*
   * Reschedule a message.
   */
  const handleReschedule = (
    message: ScheduledMessage
  ) => {
    setEditingMessage({
      ...message,
      scheduledAt: new Date(
        Date.now() + 15 * 60 * 1000
      ).toISOString(),
    });

    setActiveTab("schedule");
  };

  /*
   * Test notification.
   */
  const handleTriggerTestNotification =
    async (): Promise<{
      success: boolean;
      reason?: string;
    }> => {
      if (permissionStatus !== "granted") {
        return {
          success: false,
          reason:
            "Notification permission is blocked in your browser. Allow notifications in your site settings.",
        };
      }

      if (settings.soundEnabled) {
        playNotificationSound();
      }

      const title = "Textly — Test Notification";
      const body = "Notifications are working correctly!";

      const sent = await sendBrowserNotification(
        title,
        body,
        {
          messageText:
            "Test notification from Textly",
        },
        () => {
          window.focus();
        }
      );

      if (settings.simulateAndroidDrawer) {
        setActiveNotification({
          title,
          body,
          time: "Just now",
        });
      }

      return {
        success: sent,
      };
    };

  /*
   * Reset sample data.
   */
  const handleResetData = () => {
    setMessages(INITIAL_SEED_MESSAGES);
    saveMessages(INITIAL_SEED_MESSAGES);
  };

  const scheduledCount = messages.filter(
    (message) => message.status === "scheduled"
  ).length;

  const readyCount = messages.filter(
    (message) => message.status === "ready"
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      <AndroidNotificationSim
        notification={activeNotification}
        onDismiss={() =>
          setActiveNotification(null)
        }
        onOpenMessage={(message) =>
          setSelectedMessage(message)
        }
      />

      <main className="flex-1 w-full max-w-md mx-auto bg-slate-50 border-x border-slate-200/80 min-h-screen shadow-sm">
        {activeTab === "home" && (
          <HomeScreen
            messages={messages}
            onScheduleClick={() => {
              setEditingMessage(null);
              setActiveTab("schedule");
            }}
            onOpenMessage={(message) =>
              setSelectedMessage(message)
            }
            onEditMessage={(message) => {
              setEditingMessage(message);
              setActiveTab("schedule");
            }}
            onDeleteMessage={handleDeleteMessage}
            onCancelMessage={handleCancelMessage}
            onTogglePauseMessage={
              handleTogglePauseMessage
            }
            onTriggerTestNotification={
              handleTriggerTestNotification
            }
            permissionStatus={permissionStatus}
            onRequestPermission={
              handleRequestPermission
            }
            onViewAllClick={() =>
              setActiveTab("history")
            }
            onOpenSettings={() =>
              setActiveTab("settings")
            }
          />
        )}

        {activeTab === "schedule" && (
          <ScheduleScreen
            onSave={handleSaveMessage}
            onCancel={() => {
              setEditingMessage(null);
              setActiveTab("home");
            }}
            editingMessage={editingMessage}
            defaultCountryCode={
              settings.defaultCountryCode
            }
          />
        )}

        {activeTab === "history" && (
          <HistoryScreen
            messages={messages}
            onOpenMessage={(message) =>
              setSelectedMessage(message)
            }
            onReschedule={handleReschedule}
            onClearHistory={() =>
              setMessages((previousMessages) =>
                previousMessages.filter(
                  (message) =>
                    message.status === "scheduled"
                )
              )
            }
            onDeleteMessage={handleDeleteMessage}
          />
        )}

        {activeTab === "settings" && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={(newSettings) =>
              setSettings((previousSettings) => ({
                ...previousSettings,
                ...newSettings,
              }))
            }
            permissionStatus={permissionStatus}
            onRequestPermission={
              handleRequestPermission
            }
            onTriggerTestNotification={
              handleTriggerTestNotification
            }
            onResetData={handleResetData}
          />
        )}
      </main>

      {selectedMessage && (
        <MessagePreparationModal
          message={selectedMessage}
          onClose={() =>
            setSelectedMessage(null)
          }
          onMarkAsSent={handleMarkAsSent}
          onDelete={handleDeleteMessage}
          onEdit={(message) => {
            setSelectedMessage(null);
            setEditingMessage(message);
            setActiveTab("schedule");
          }}
          onCancel={handleCancelMessage}
          defaultCountryCode={
            settings.defaultCountryCode
          }
        />
      )}

      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "schedule") {
            setEditingMessage(null);
          }

          setActiveTab(tab);
        }}
        scheduledCount={scheduledCount}
        readyCount={readyCount}
      />
    </div>
  );
}
```
