import React, { useState, useEffect, useRef } from 'react';
import { ScheduledMessage, AppSettings, ActiveTab, RepeatOption } from './types';
import {
  loadMessages,
  saveMessages,
  loadSettings,
  saveSettings,
  INITIAL_SEED_MESSAGES
} from './utils/storage';
import {
  playNotificationSound,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  initServiceWorker,
  syncSchedulesToServiceWorker,
  markMessageAsNotified,
  clearNotifiedMessage,
} from './utils/notifications';
import { calculateNextOccurrence } from './utils/recurrence';

import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { ScheduleScreen } from './components/ScheduleScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { MessagePreparationModal } from './components/MessagePreparationModal';
import { AndroidNotificationSim } from './components/AndroidNotificationSim';

export default function App() {
  const [messages, setMessages] = useState<ScheduledMessage[]>(() => loadMessages());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermissionStatus()
  );

  const [activeNotification, setActiveNotification] = useState<{
    message: ScheduledMessage;
    title: string;
    body: string;
    time: string;
  } | null>(null);

  // Sync messages to storage & Service Worker
  useEffect(() => {
    saveMessages(messages);
    syncSchedulesToServiceWorker(messages);
  }, [messages]);

  // Sync settings to storage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Initialize Service Worker & Setup Push/Notification Message Listeners
  useEffect(() => {
    initServiceWorker();

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data?.type === 'TEXTLY_OPEN_MESSAGE') {
          const msgId = event.data.messageId;
          if (msgId) {
            setMessages((current) => {
              const found = current.find((m) => m.id === msgId);
              if (found) {
                setSelectedMessage(found);
              }
              return current;
            });
          }
        } else if (event.data?.type === 'TEXTLY_MESSAGE_DUE') {
          const msgId = event.data.messageId;
          if (msgId) {
            setMessages((current) =>
              current.map((m) => {
                if (m.id === msgId && m.status === 'scheduled') {
                  return { ...m, status: 'ready' as const };
                }
                return m;
              })
            );
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);

  // Check URL Search Params for Direct Notification Tap Launch (e.g. ?openMsgId=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const openMsgId = params.get('openMsgId');
    if (openMsgId) {
      const found = messages.find((m) => m.id === openMsgId);
      if (found) {
        setSelectedMessage(found);
      }
      // Clean query parameter from URL cleanly without full reload
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (err) {
        // no-op
      }
    }
  }, [messages]);

  // Background & Foreground Alarm Checker Engine
  useEffect(() => {
    const evaluateDueMessages = () => {
      const now = new Date().getTime();

      setMessages((prevMessages) => {
        let hasChanges = false;
        const updated = prevMessages.map((msg) => {
          if (msg.status === 'scheduled' && !msg.isPaused) {
            const scheduledTime = new Date(msg.scheduledAt).getTime();
            if (scheduledTime <= now) {
              hasChanges = true;

              // Avoid duplicate notification triggers
              const isFirstAlert = markMessageAsNotified(msg.id);

              if (isFirstAlert) {
                // Play audio chime if enabled
                if (settings.soundEnabled) {
                  playNotificationSound();
                }

                // Send Real Operating System Notification (Android & Desktop)
                const notifTitle = 'Textly — Message Ready';
                const notifBody = 'Your scheduled message is ready to send.';

                sendBrowserNotification(
                  notifTitle,
                  notifBody,
                  {
                    messageId: msg.id,
                    recipientName: msg.recipientName,
                    messageText: msg.message,
                  },
                  () => {
                    setSelectedMessage({ ...msg, status: 'ready' });
                  }
                );

                // Show Android Drawer Simulation if enabled in settings
                if (settings.simulateAndroidDrawer) {
                  setActiveNotification({
                    message: { ...msg, status: 'ready' },
                    title: notifTitle,
                    body: notifBody,
                    time: 'Just now',
                  });
                }
              }

              // If recurring message, schedule next occurrence
              if (msg.repeat && msg.repeat !== 'never') {
                const nextTime = calculateNextOccurrence(msg.scheduledAt, msg.repeat, now);
                return {
                  ...msg,
                  scheduledAt: nextTime,
                  status: 'scheduled' as const,
                };
              }

              return { ...msg, status: 'ready' as const };
            }
          }
          return msg;
        });

        return hasChanges ? updated : prevMessages;
      });
    };

    // Periodic check every 2.5 seconds
    const interval = setInterval(evaluateDueMessages, 2500);

    // Immediate check whenever user refocuses the app / returns from background
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        evaluateDueMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
    };
  }, [settings.soundEnabled, settings.simulateAndroidDrawer]);

  // Handle Request Notification Permission
  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setPermissionStatus(status);
    return status;
  };

  // Handle Save (Create or Edit)
  const handleSaveMessage = (
    data: Omit<ScheduledMessage, 'id' | 'createdAt' | 'status'> & { id?: string }
  ) => {
    if (data.id) {
      // Edit existing
      clearNotifiedMessage(data.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? {
                ...m,
                recipientName: data.recipientName,
                recipientPhone: data.recipientPhone,
                message: data.message,
                scheduledAt: data.scheduledAt,
                repeat: data.repeat || 'never',
                status: 'scheduled', // Reset to scheduled
                isPaused: false,
              }
            : m
        )
      );
    } else {
      // Create new
      const newMsg: ScheduledMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        message: data.message,
        scheduledAt: data.scheduledAt,
        createdAt: new Date().toISOString(),
        status: 'scheduled',
        platform: 'whatsapp',
        repeat: data.repeat || 'never',
        isPaused: false,
      };
      setMessages((prev) => [newMsg, ...prev]);
    }

    setEditingMessage(null);
    setActiveTab('home');
  };

  // Handle Toggle Pause / Resume for Recurring Message
  const handleTogglePauseMessage = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const willPause = !m.isPaused;
        if (!willPause && m.repeat && m.repeat !== 'never') {
          // Resuming: calculate next future occurrence from current time
          const nextTime = calculateNextOccurrence(m.scheduledAt, m.repeat, Date.now());
          return { ...m, isPaused: false, scheduledAt: nextTime };
        }
        return { ...m, isPaused: willPause };
      })
    );
  };

  // Handle Delete
  const handleDeleteMessage = (msgId: string) => {
    clearNotifiedMessage(msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  // Handle Cancel Schedule
  const handleCancelMessage = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: 'cancelled' } : m))
    );
  };

  // Handle Mark as Sent Manually
  const handleMarkAsSent = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        if (m.repeat && m.repeat !== 'never') {
          // Advance recurring message to next occurrence
          const nextTime = calculateNextOccurrence(m.scheduledAt, m.repeat, Date.now());
          return {
            ...m,
            scheduledAt: nextTime,
            status: 'scheduled' as const,
            sentAt: new Date().toISOString(),
          };
        }
        return { ...m, status: 'sent_manually' as const, sentAt: new Date().toISOString() };
      })
    );
  };

  // Handle Reschedule
  const handleReschedule = (msg: ScheduledMessage) => {
    setEditingMessage({
      ...msg,
      // Default to 15 mins from now for easy rescheduling
      scheduledAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
    setActiveTab('schedule');
  };

  // Dedicated Test Notification Trigger
  const handleTriggerTestNotification = async (): Promise<{ success: boolean; reason?: string }> => {
    if (permissionStatus !== 'granted') {
      return {
        success: false,
        reason: 'Notification permission is blocked in your browser. Allow notifications in site settings.',
      };
    }

    if (settings.soundEnabled) {
      playNotificationSound();
    }

    const notifTitle = 'Textly — Test Notification';
    const notifBody = 'Notifications are working correctly!';

    const sent = await sendBrowserNotification(
      notifTitle,
      notifBody,
      {
        messageText: 'Test notification from Textly',
      },
      () => {
        window.focus();
      }
    );

    // Show simulation banner if enabled in settings
    if (settings.simulateAndroidDrawer) {
      setActiveNotification({
        title: notifTitle,
        body: notifBody,
        time: 'Just now',
      });
    }

    return { success: sent };
  };

  // Reset Sample Data
  const handleResetData = () => {
    setMessages(INITIAL_SEED_MESSAGES);
    saveMessages(INITIAL_SEED_MESSAGES);
  };

  // Counts for bottom navigation
  const scheduledCount = messages.filter((m) => m.status === 'scheduled').length;
  const readyCount = messages.filter((m) => m.status === 'ready').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Top Banner Android Simulation */}
      <AndroidNotificationSim
        notification={activeNotification}
        onDismiss={() => setActiveNotification(null)}
        onOpenMessage={(msg) => setSelectedMessage(msg)}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-md mx-auto bg-slate-50 border-x border-slate-200/80 min-h-screen shadow-xs">
        {activeTab === 'home' && (
          <HomeScreen
            messages={messages}
            onScheduleClick={() => {
              setEditingMessage(null);
              setActiveTab('schedule');
            }}
            onOpenMessage={(msg) => setSelectedMessage(msg)}
            onEditMessage={(msg) => {
              setEditingMessage(msg);
              setActiveTab('schedule');
            }}
            onDeleteMessage={handleDeleteMessage}
            onCancelMessage={handleCancelMessage}
            onTogglePauseMessage={handleTogglePauseMessage}
            onTriggerTestNotification={handleTriggerTestNotification}
            permissionStatus={permissionStatus}
            onRequestPermission={handleRequestPermission}
            onViewAllClick={() => setActiveTab('history')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleScreen
            onSave={handleSaveMessage}
            onCancel={() => {
              setEditingMessage(null);
              setActiveTab('home');
            }}
            editingMessage={editingMessage}
            defaultCountryCode={settings.defaultCountryCode}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            messages={messages}
            onOpenMessage={(msg) => setSelectedMessage(msg)}
            onReschedule={handleReschedule}
            onClearHistory={() => setMessages((prev) => prev.filter((m) => m.status === 'scheduled'))}
            onDeleteMessage={handleDeleteMessage}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
            permissionStatus={permissionStatus}
            onRequestPermission={handleRequestPermission}
            onTriggerTestNotification={handleTriggerTestNotification}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Message Preparation / Dispatch Modal */}
      {selectedMessage && (
        <MessagePreparationModal
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onMarkAsSent={handleMarkAsSent}
          onDelete={handleDeleteMessage}
          onEdit={(msg) => {
            setEditingMessage(msg);
            setActiveTab('schedule');
          }}
          onCancel={handleCancelMessage}
          defaultCountryCode={settings.defaultCountryCode}
        />
      )}

      {/* Bottom Mobile Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'schedule') setEditingMessage(null);
          setActiveTab(tab);
        }}
        scheduledCount={scheduledCount}
        readyCount={readyCount}
      />
    </div>
  );
}

