import React, { useEffect, useState } from "react";
import type { ScheduledMessage, AppSettings, ActiveTab } from "./types";
import { loadMessages, saveMessages, loadSettings, saveSettings, INITIAL_SEED_MESSAGES } from "./storage";
import { playNotificationSound, getNotificationPermissionStatus, requestNotificationPermission, sendBrowserNotification, initServiceWorker, syncSchedulesToServiceWorker, markMessageAsNotified, clearNotifiedMessage } from "./notifications";
import { calculateNextOccurrence } from "./recurrence";
import { BottomNav } from "./BottomNav";
import { HomeScreen } from "./HomeScreen";
import { ScheduleScreen } from "./ScheduleScreen";
import { HistoryScreen } from "./HistoryScreen";
import { SettingsScreen } from "./SettingsScreen";
import { MessagePreparationModal } from "./MessagePreparationModal";
import { AndroidNotificationSim } from "./AndroidNotificationSim";

export default function App() {
  const [messages, setMessages] = useState<ScheduledMessage[]>(() => loadMessages());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">(() => getNotificationPermissionStatus());
  const [activeNotification, setActiveNotification] = useState<{ message?: ScheduledMessage; title: string; body: string; time: string } | null>(null);

  useEffect(() => { saveMessages(messages); syncSchedulesToServiceWorker(messages); }, [messages]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  useEffect(() => {
    initServiceWorker();
    if (!("serviceWorker" in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "TEXTLY_MESSAGE_DUE" && data.messageId) {
        setMessages(current => {
          const found = current.find(m => m.id === data.messageId);
          if (!found) return current;
          const ready = { ...found, status: "ready" as const };
          const title = "Textly — Message Ready";
          const body = ready.recipientName
            ? `Your message for ${ready.recipientName} is ready to send.`
            : "Your scheduled message is ready to send.";

          if (settings.simulateAndroidDrawer) {
            setActiveNotification({ message: ready, title, body, time: "Just now" });
          }
          return current.map(m => m.id === data.messageId && m.status === "scheduled" ? ready : m);
        });
      }

      if (data.type === "TEXTLY_OPEN_MESSAGE" && data.messageId) {
        setMessages(current => {
          const found = current.find(m => m.id === data.messageId);
          if (found) setSelectedMessage(found);
          return current;
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
  }, [settings.simulateAndroidDrawer]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("openMsgId");
    if (!id) return;
    const found = messages.find(m => m.id === id);
    if (found) setSelectedMessage(found);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [messages]);

  useEffect(() => {
    const evaluateDueMessages = () => {
      const now = Date.now();
      setMessages(previous => {
        let changed = false;
        const updated = previous.map(message => {
          if (message.status !== "scheduled" || message.isPaused) return message;
          const scheduledTime = new Date(message.scheduledAt).getTime();
          if (!Number.isFinite(scheduledTime) || scheduledTime > now) return message;
          changed = true;
          const firstAlert = markMessageAsNotified(message.id);
          const ready = { ...message, status: "ready" as const };
          const title = "Textly — Message Ready";
          const body = message.recipientName
            ? `Your message for ${message.recipientName} is ready to send.`
            : "Your scheduled message is ready to send.";

          if (firstAlert) {
            if (settings.soundEnabled) playNotificationSound();
            void sendBrowserNotification(title, body, {
              messageId: message.id,
              recipientName: message.recipientName,
              messageText: message.message,
              recipientPhone: message.recipientPhone,
            });
            if (settings.simulateAndroidDrawer) setActiveNotification({ message: ready, title, body, time: "Just now" });
          }

          if (message.repeat && message.repeat !== "never") {
            const nextTime = calculateNextOccurrence(message.scheduledAt, message.repeat, now);
            return { ...message, scheduledAt: nextTime, status: "scheduled" as const };
          }
          return ready;
        });
        return changed ? updated : previous;
      });
    };

    const interval = window.setInterval(evaluateDueMessages, 2500);
    const onVisible = () => { if (document.visibilityState === "visible") evaluateDueMessages(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [settings.soundEnabled, settings.simulateAndroidDrawer]);

  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setPermissionStatus(status);
    return status;
  };

  const handleSaveMessage = (data: Omit<ScheduledMessage, "id" | "createdAt" | "status"> & { id?: string }) => {
    if (data.id) {
      clearNotifiedMessage(data.id);
      setMessages(previous => previous.map(message => message.id === data.id ? {
        ...message,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        message: data.message,
        scheduledAt: data.scheduledAt,
        repeat: data.repeat || "never",
        status: "scheduled" as const,
        isPaused: false,
      } : message));
    } else {
      const newMessage: ScheduledMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      setMessages(previous => [newMessage, ...previous]);
    }
    setEditingMessage(null);
    setActiveTab("home");
  };

  const handleTogglePauseMessage = (id: string) => setMessages(previous => previous.map(message => {
    if (message.id !== id) return message;
    const paused = !message.isPaused;
    if (!paused && message.repeat && message.repeat !== "never") {
      return { ...message, isPaused: false, scheduledAt: calculateNextOccurrence(message.scheduledAt, message.repeat, Date.now()), status: "scheduled" as const };
    }
    return { ...message, isPaused: paused };
  }));

  const handleDeleteMessage = (id: string) => { clearNotifiedMessage(id); setMessages(previous => previous.filter(m => m.id !== id)); };
  const handleCancelMessage = (id: string) => setMessages(previous => previous.map(m => m.id === id ? { ...m, status: "cancelled" as const } : m));

  const handleMarkAsSent = (id: string) => setMessages(previous => previous.map(m => {
    if (m.id !== id) return m;
    const sentAt = new Date().toISOString();
    if (m.repeat && m.repeat !== "never") return { ...m, scheduledAt: calculateNextOccurrence(m.scheduledAt, m.repeat, Date.now()), status: "scheduled" as const, sentAt };
    return { ...m, status: "sent_manually" as const, sentAt };
  }));

  const handleReschedule = (message: ScheduledMessage) => {
    setEditingMessage({ ...message, scheduledAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
    setActiveTab("schedule");
  };

  const handleTriggerTestNotification = async (): Promise<{ success: boolean; reason?: string }> => {
    if (permissionStatus !== "granted") return { success: false, reason: "Notification permission is blocked in your browser. Allow notifications in your site settings." };
    if (settings.soundEnabled) playNotificationSound();
    const title = "Textly — Test Notification";
    const body = "Notifications are working correctly!";
    const sent = await sendBrowserNotification(title, body, { messageText: "Test notification from Textly" });
    if (settings.simulateAndroidDrawer) setActiveNotification({ title, body, time: "Just now" });
    return { success: sent };
  };

  const handleResetData = () => { setMessages(INITIAL_SEED_MESSAGES); saveMessages(INITIAL_SEED_MESSAGES); };
  const scheduledCount = messages.filter(m => m.status === "scheduled").length;
  const readyCount = messages.filter(m => m.status === "ready").length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      <AndroidNotificationSim notification={activeNotification} onDismiss={() => setActiveNotification(null)} onOpenMessage={message => setSelectedMessage(message)} />
      <main className="flex-1 w-full max-w-md mx-auto bg-slate-50 border-x border-slate-200/80 min-h-screen shadow-sm">
        {activeTab === "home" && <HomeScreen messages={messages} onScheduleClick={() => { setEditingMessage(null); setActiveTab("schedule"); }} onOpenMessage={setSelectedMessage} onEditMessage={message => { setEditingMessage(message); setActiveTab("schedule"); }} onDeleteMessage={handleDeleteMessage} onCancelMessage={handleCancelMessage} onTogglePauseMessage={handleTogglePauseMessage} onTriggerTestNotification={handleTriggerTestNotification} permissionStatus={permissionStatus} onRequestPermission={handleRequestPermission} onViewAllClick={() => setActiveTab("history")} onOpenSettings={() => setActiveTab("settings")} />}
        {activeTab === "schedule" && <ScheduleScreen onSave={handleSaveMessage} onCancel={() => { setEditingMessage(null); setActiveTab("home"); }} editingMessage={editingMessage} defaultCountryCode={settings.defaultCountryCode} />}
        {activeTab === "history" && <HistoryScreen messages={messages} onOpenMessage={setSelectedMessage} onReschedule={handleReschedule} onClearHistory={() => setMessages(previous => previous.filter(m => m.status === "scheduled"))} onDeleteMessage={handleDeleteMessage} />}
        {activeTab === "settings" && <SettingsScreen settings={settings} onUpdateSettings={newSettings => setSettings(previous => ({ ...previous, ...newSettings }))} permissionStatus={permissionStatus} onRequestPermission={handleRequestPermission} onTriggerTestNotification={handleTriggerTestNotification} onResetData={handleResetData} />}
      </main>
      {selectedMessage && <MessagePreparationModal message={selectedMessage} onClose={() => setSelectedMessage(null)} onMarkAsSent={handleMarkAsSent} onDelete={handleDeleteMessage} onEdit={message => { setSelectedMessage(null); setEditingMessage(message); setActiveTab("schedule"); }} onCancel={handleCancelMessage} defaultCountryCode={settings.defaultCountryCode} />}
      <BottomNav activeTab={activeTab} setActiveTab={tab => { if (tab === "schedule") setEditingMessage(null); setActiveTab(tab); }} scheduledCount={scheduledCount} readyCount={readyCount} />
    </div>
  );
}
