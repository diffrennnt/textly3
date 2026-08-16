import React, { useState, useEffect } from 'react';

import {
  ScheduledMessage,
  AppSettings,
  ActiveTab,
} from './types';

import {
  loadMessages,
  saveMessages,
  loadSettings,
  saveSettings,
  INITIAL_SEED_MESSAGES,
} from './storage';

import {
  playNotificationSound,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  initServiceWorker,
  syncSchedulesToServiceWorker,
  markMessageAsNotified,
  clearNotifiedMessage,
} from './notifications';

import { calculateNextOccurrence } from './recurrence';

import { BottomNav } from './BottomNav';
import { HomeScreen } from './HomeScreen';
import { ScheduleScreen } from './ScheduleScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { MessagePreparationModal } from './MessagePreparationModal';
import { AndroidNotificationSim } from './AndroidNotificationSim';

export default function App() {
  const [messages, setMessages] = useState<ScheduledMessage[]>(
    () => loadMessages()
  );

  const [settings, setSettings] = useState<AppSettings>(
    () => loadSettings()
  );

  const [activeTab, setActiveTab] =
    useState<ActiveTab>('home');

  const [selectedMessage, setSelectedMessage] =
    useState<ScheduledMessage | null>(null);

  const [editingMessage, setEditingMessage] =
    useState<ScheduledMessage | null>(null);

  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission | 'unsupported'>(
      () => getNotificationPermissionStatus()
    );

  const [activeNotification, setActiveNotification] =
    useState<{
      message?: ScheduledMessage;
      title: string;
      body: string;
      time: string;
    } | null>(null);

  // Save messages
  useEffect(() => {
    saveMessages(messages);
    syncSchedulesToServiceWorker(messages);
  }, [messages]);

  // Save settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Initialize service worker
  useEffect(() => {
    initServiceWorker();

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      const handleServiceWorkerMessage = (
        event: MessageEvent
      ) => {
        if (
          event.data?.type ===
          'TEXTLY_OPEN_MESSAGE'
        ) {
          const msgId = event.data.messageId;

          if (msgId) {
            setMessages((current) => {
              const found = current.find(
                (m) => m.id === msgId
              );

              if (found) {
                setSelectedMessage(found);
              }

              return current;
            });
          }
        }

        if (
          event.data?.type ===
          'TEXTLY_MESSAGE_DUE'
        ) {
          const msgId = event.data.messageId;

          if (msgId) {
            setMessages((current) =>
              current.map((m) => {
                if (
                  m.id === msgId &&
                  m.status === 'scheduled'
                ) {
                  return {
                    ...m,
                    status: 'ready' as const,
                  };
                }

                return m;
              })
            );
          }
        }
      };

      navigator.serviceWorker.addEventListener(
        'message',
        handleServiceWorkerMessage
      );

      return () => {
        navigator.serviceWorker.removeEventListener(
          'message',
          handleServiceWorkerMessage
        );
      };
    }
  }, []);

  // Handle notification URL
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const openMsgId =
      params.get('openMsgId');

    if (openMsgId) {
      const found = messages.find(
        (m) => m.id === openMsgId
      );

      if (found) {
        setSelectedMessage(found);
      }

      try {
        window.history.replaceState(
          {},
          '',
          window.location.pathname
        );
      } catch {
        // Ignore
      }
    }
  }, [messages]);

  // Check scheduled messages
  useEffect(() => {
    const evaluateDueMessages = () => {
      const now = Date.now();

      setMessages((prevMessages) => {
        let hasChanges = false;

        const updated =
          prevMessages.map((msg) => {
            if (
              msg.status === 'scheduled' &&
              !msg.isPaused
            ) {
              const scheduledTime =
                new Date(
                  msg.scheduledAt
                ).getTime();

              if (scheduledTime <= now) {
                hasChanges = true;

                const isFirstAlert =
                  markMessageAsNotified(
                    msg.id
                  );

                if (isFirstAlert) {
                  if (
                    settings.soundEnabled
                  ) {
                    playNotificationSound();
                  }

                  const title =
                    'Textly — Message Ready';

                  const body =
                    'Your scheduled message is ready to send.';

                  sendBrowserNotification(
                    title,
                    body,
                    {
                      messageId: msg.id,
                      recipientName:
                        msg.recipientName,
                      messageText:
                        msg.message,
                    },
                    () => {
                      setSelectedMessage({
                        ...msg,
                        status: 'ready',
                      });
                    }
                  );

                  if (
                    settings.simulateAndroidDrawer
                  ) {
                    setActiveNotification({
                      message: {
                        ...msg,
                        status: 'ready',
                      },
                      title,
                      body,
                      time: 'Just now',
                    });
                  }
                }

                // Recurring message
                if (
                  msg.repeat &&
                  msg.repeat !== 'never'
                ) {
                  const nextTime =
                    calculateNextOccurrence(
                      msg.scheduledAt,
                      msg.repeat,
                      now
                    );

                  return {
                    ...msg,
                    scheduledAt: nextTime,
                    status:
                      'scheduled' as const,
                  };
                }

                return {
                  ...msg,
                  status:
                    'ready' as const,
                };
              }
            }

            return msg;
          });

        return hasChanges
          ? updated
          : prevMessages;
      });
    };

    const interval =
      setInterval(
        evaluateDueMessages,
        2500
      );

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        evaluateDueMessages();
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    window.addEventListener(
      'focus',
      handleVisibility
    );

    window.addEventListener(
      'pageshow',
      handleVisibility
    );

    return () => {
      clearInterval(interval);

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );

      window.removeEventListener(
        'focus',
        handleVisibility
      );

      window.removeEventListener(
        'pageshow',
        handleVisibility
      );
    };
  }, [
    settings.soundEnabled,
    settings.simulateAndroidDrawer,
  ]);

  // Notification permission
  const handleRequestPermission =
    async () => {
      const status =
        await requestNotificationPermission();

      setPermissionStatus(status);

      return status;
    };

  // Create or edit message
  const handleSaveMessage = (
    data: Omit<
      ScheduledMessage,
      'id' | 'createdAt' | 'status'
    > & {
      id?: string;
    }
  ) => {
    if (data.id) {
      clearNotifiedMessage(
        data.id
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? {
                ...m,
                recipientName:
                  data.recipientName,
                recipientPhone:
                  data.recipientPhone,
                message:
                  data.message,
                scheduledAt:
                  data.scheduledAt,
                repeat:
                  data.repeat ||
                  'never',
                status:
                  'scheduled',
                isPaused: false,
              }
            : m
        )
      );
    } else {
      const newMessage: ScheduledMessage =
        {
          id: `msg-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 7)}`,

          recipientName:
            data.recipientName,

          recipientPhone:
            data.recipientPhone,

          message:
            data.message,

          scheduledAt:
            data.scheduledAt,

          createdAt:
            new Date().toISOString(),

          status:
            'scheduled',

          platform:
            'whatsapp',

          repeat:
            data.repeat ||
            'never',

          isPaused: false,
        };

      setMessages((prev) => [
        newMessage,
        ...prev,
      ]);
    }

    setEditingMessage(null);
    setActiveTab('home');
  };

  // Pause / resume
  const handleTogglePauseMessage =
    (msgId: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) {
            return m;
          }

          const willPause =
            !m.isPaused;

          if (
            !willPause &&
            m.repeat &&
            m.repeat !== 'never'
          ) {
            const nextTime =
              calculateNextOccurrence(
                m.scheduledAt,
                m.repeat,
                Date.now()
              );

            return {
              ...m,
              isPaused: false,
              scheduledAt:
                nextTime,
            };
          }

          return {
            ...m,
            isPaused: willPause,
          };
        })
      );
    };

  // Delete
  const handleDeleteMessage =
    (msgId: string) => {
      clearNotifiedMessage(
        msgId
      );

      setMessages((prev) =>
        prev.filter(
          (m) => m.id !== msgId
        )
      );
    };

  // Cancel
  const handleCancelMessage =
    (msgId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                status:
                  'cancelled',
              }
            : m
        )
      );
    };

  // Mark sent
  const handleMarkAsSent =
    (msgId: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) {
            return m;
          }

          if (
            m.repeat &&
            m.repeat !== 'never'
          ) {
            const nextTime =
              calculateNextOccurrence(
                m.scheduledAt,
                m.repeat,
                Date.now()
              );

            return {
              ...m,
              scheduledAt:
                nextTime,
              status:
                'scheduled' as const,
              sentAt:
                new Date().toISOString(),
            };
          }

          return {
            ...m,
            status:
              'sent_manually' as const,
            sentAt:
              new Date().toISOString(),
          };
        })
      );
    };

  // Reschedule
  const handleReschedule =
    (msg: ScheduledMessage) => {
      setEditingMessage({
        ...msg,
        scheduledAt:
          new Date(
            Date.now() +
              15 * 60 * 1000
          ).toISOString(),
      });

      setActiveTab('schedule');
    };

  // Test notification
  const handleTriggerTestNotification =
    async (): Promise<{
      success: boolean;
      reason?: string;
    }> => {
      if (
        permissionStatus !==
        'granted'
      ) {
        return {
          success: false,
          reason:
            'Notification permission is blocked in your browser. Allow notifications in site settings.',
        };
      }

      if (settings.soundEnabled) {
        playNotificationSound();
      }

      const title =
        'Textly — Test Notification';

      const body =
        'Notifications are working correctly!';

      const sent =
        await sendBrowserNotification(
          title,
          body,
          {
            messageText:
              'Test notification from Textly',
          },
          () => {
            window.focus();
          }
        );

      if (
        settings.simulateAndroidDrawer
      ) {
        setActiveNotification({
          title,
          body,
          time: 'Just now',
        });
      }

      return {
        success: sent,
      };
    };

  // Reset sample data
  const handleResetData = () => {
    setMessages(
      INITIAL_SEED_MESSAGES
    );

    saveMessages(
      INITIAL_SEED_MESSAGES
    );
  };

  const scheduledCount =
    messages.filter(
      (m) =>
        m.status ===
        'scheduled'
    ).length;

  const readyCount =
    messages.filter(
      (m) =>
        m.status ===
        'ready'
    ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">

      <AndroidNotificationSim
        notification={
          activeNotification
        }
        onDismiss={() =>
          setActiveNotification(
            null
          )
        }
        onOpenMessage={(msg) =>
          setSelectedMessage(
            msg
          )
        }
      />

      <main className="flex-1 w-full max-w-md mx-auto bg-slate-50 border-x border-slate-200/80 min-h-screen shadow-sm">

        {activeTab === 'home' && (
          <HomeScreen
            messages={messages}

            onScheduleClick={() => {
              setEditingMessage(
                null
              );
              setActiveTab(
                'schedule'
              );
            }}

            onOpenMessage={(msg) =>
              setSelectedMessage(
                msg
              )
            }

            onEditMessage={(msg) => {
              setEditingMessage(
                msg
              );
              setActiveTab(
                'schedule'
              );
            }}

            onDeleteMessage={
              handleDeleteMessage
            }

            onCancelMessage={
              handleCancelMessage
            }

            onTogglePauseMessage={
              handleTogglePauseMessage
            }

            onTriggerTestNotification={
              handleTriggerTestNotification
            }

            permissionStatus={
              permissionStatus
            }

            onRequestPermission={
              handleRequestPermission
            }

            onViewAllClick={() =>
              setActiveTab(
                'history'
              )
            }

            onOpenSettings={() =>
              setActiveTab(
                'settings'
              )
            }
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleScreen
            onSave={
              handleSaveMessage
            }

            onCancel={() => {
              setEditingMessage(
                null
              );
              setActiveTab(
                'home'
              );
            }}

            editingMessage={
              editingMessage
            }

            defaultCountryCode={
              settings.defaultCountryCode
            }
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            messages={messages}

            onOpenMessage={(msg) =>
              setSelectedMessage(
                msg
              )
            }

            onReschedule={
              handleReschedule
            }

            onClearHistory={() =>
              setMessages((prev) =>
                prev.filter(
                  (m) =>
                    m.status ===
                    'scheduled'
                )
              )
            }

            onDeleteMessage={
              handleDeleteMessage
            }
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}

            onUpdateSettings={(
              newSettings
            ) =>
              setSettings(
                (prev) => ({
                  ...prev,
                  ...newSettings,
                })
              )
            }

            permissionStatus={
              permissionStatus
            }

            onRequestPermission={
              handleRequestPermission
            }

            onTriggerTestNotification={
              handleTriggerTestNotification
            }

            onResetData={
              handleResetData
            }
          />
        )}

      </main>

      {selectedMessage && (
        <MessagePreparationModal
          message={
            selectedMessage
          }

          onClose={() =>
            setSelectedMessage(
              null
            )
          }

          onMarkAsSent={
            handleMarkAsSent
          }

          onDelete={
            handleDeleteMessage
          }

          onEdit={(msg) => {
            setEditingMessage(
              msg
            );
            setActiveTab(
              'schedule'
            );
          }}

          onCancel={
            handleCancelMessage
          }

          defaultCountryCode={
            settings.defaultCountryCode
          }
        />
      )}

      <BottomNav
        activeTab={
          activeTab
        }

        setActiveTab={(tab) => {
          if (
            tab === 'schedule'
          ) {
            setEditingMessage(
              null
            );
          }

          setActiveTab(tab);
        }}

        scheduledCount={
          scheduledCount
        }

        readyCount={
          readyCount
        }
      />

    </div>
  );
}
