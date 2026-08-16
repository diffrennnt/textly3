import type { ScheduledMessage } from '../types';

let swRegistration: ServiceWorkerRegistration | null = null;
const notifiedMessageIds = new Set<string>();

export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;
    registration.update().catch(() => {});
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

export function syncSchedulesToServiceWorker(schedules: ScheduledMessage[]): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const activeSchedules = schedules
    .filter((m) => m.status === 'scheduled' && !m.isPaused)
    .map((m) => ({
      id: m.id,
      recipientName: m.recipientName,
      message: m.message,
      scheduledAt: m.scheduledAt,
      isPaused: m.isPaused,
      status: m.status,
    }));

  const post = (registration: ServiceWorkerRegistration) => {
    registration.active?.postMessage({ type: 'SYNC_SCHEDULES', schedules: activeSchedules });
  };

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_SCHEDULES', schedules: activeSchedules });
  } else {
    navigator.serviceWorker.ready.then(post).catch(() => {});
  }
}

export function playNotificationSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn('AudioContext playback error:', err);
  }
}

export function triggerHapticVibration(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch {
    // Vibration is optional.
  }
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await initServiceWorker();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export interface NotificationPayloadData {
  messageId?: string;
  recipientName?: string;
  messageText?: string;
  [key: string]: unknown;
}

export function markMessageAsNotified(messageId: string): boolean {
  if (notifiedMessageIds.has(messageId)) return false;
  notifiedMessageIds.add(messageId);
  return true;
}

export function clearNotifiedMessage(messageId: string): void {
  notifiedMessageIds.delete(messageId);
}

export async function sendBrowserNotification(
  title: string,
  body: string,
  data?: NotificationPayloadData,
  onClick?: () => void
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  triggerHapticVibration();

  const tag = data?.messageId ? `textly-msg-${data.messageId}` : `textly-alert-${Date.now()}`;
  const notificationOptions: NotificationOptions & Record<string, unknown> = {
    body,
    icon: '/icon.svg',
    badge: '/badge.svg',
    tag,
    renotify: true,
    requireInteraction: true,
    data: {
      ...data,
      url: data?.messageId ? `/?openMsgId=${encodeURIComponent(data.messageId)}` : '/',
    },
    vibrate: [200, 100, 200, 100, 200],
    actions: [{ action: 'open_whatsapp', title: 'Open in WhatsApp' }],
  };

  if ('serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.ready);
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch (err) {
      console.warn('ServiceWorker showNotification failed:', err);
    }
  }

  try {
    const notif = new Notification(title, notificationOptions);
    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
        notif.close();
      };
    }
    return true;
  } catch (err) {
    console.warn('Direct Notification constructor failed:', err);
    return false;
  }
}

export function formatScheduledDateTime(dateString: string): {
  dateFormatted: string;
  timeFormatted: string;
  relative: string;
  isPast: boolean;
} {
  const target = new Date(dateString);
  const now = new Date();
  const isPast = target.getTime() <= now.getTime();
  const dateFormatted = target.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
  const timeFormatted = target.toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  let relative = '';
  if (isPast) {
    if (Math.abs(diffMins) < 1) relative = 'Due now';
    else if (Math.abs(diffMins) < 60) relative = `${Math.abs(diffMins)}m ago`;
    else if (Math.abs(diffHours) < 24) relative = `${Math.abs(diffHours)}h ago`;
    else relative = `${Math.abs(diffDays)}d ago`;
  } else {
    if (diffMins <= 1) relative = 'In under 1 min';
    else if (diffMins < 60) relative = `In ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    else if (diffHours < 24) relative = `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    else relative = `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  return { dateFormatted, timeFormatted, relative, isPast };
}
