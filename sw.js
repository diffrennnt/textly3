// Textly Service Worker for reliable background notifications
const CACHE_NAME = 'textly-v2';

let scheduledAlarms = [];
let alarmCheckInterval = null;
const notifiedSwSet = new Set();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  startBackgroundAlarmChecker();
});

function startBackgroundAlarmChecker() {
  if (alarmCheckInterval) return;

  // Service-worker timers are best-effort on mobile browsers. The checker
  // is used when the browser keeps the worker alive; notification scheduling
  // is also rechecked whenever the worker receives a schedule sync.
  alarmCheckInterval = setInterval(checkDueMessages, 2500);
}

function checkDueMessages() {
  const now = Date.now();
  const remaining = [];

  for (const item of scheduledAlarms) {
    if (item.isPaused) {
      remaining.push(item);
      continue;
    }

    const scheduledTime = new Date(item.scheduledAt).getTime();

    if (!Number.isFinite(scheduledTime)) {
      continue;
    }

    if (scheduledTime <= now) {
      if (!notifiedSwSet.has(item.id)) {
        notifiedSwSet.add(item.id);
        showNotificationForItem(item);
        notifyClientsMessageReady(item.id);
      }
    } else {
      remaining.push(item);
    }
  }

  scheduledAlarms = remaining;
}

function buildNotificationOptions(item, overrides = {}) {
  const messageId = item?.id || overrides.messageId;

  return {
    body: overrides.body || 'Your scheduled message is ready to send.',
    icon: '/icon.svg',
    badge: '/badge.svg',
    tag: overrides.tag || (messageId ? `textly-msg-${messageId}` : `textly-alert-${Date.now()}`),

    // Explicitly keep the notification audible/visible. The final heads-up
    // presentation is controlled by Android/Chrome notification settings.
    silent: false,
    renotify: true,
    requireInteraction: true,
    timestamp: Date.now(),
    dir: 'auto',
    lang: 'en-US',
    vibrate: [200, 100, 200, 100, 200],

    data: {
      ...(item || {}),
      ...(overrides.data || {}),
      messageId,
      url: messageId ? `/?openMsgId=${encodeURIComponent(messageId)}` : '/',
    },

    actions: [
      {
        action: 'open_whatsapp',
        title: 'Open in WhatsApp',
      },
    ],
  };
}

function showNotificationForItem(item) {
  const title = 'Textly — Message Ready';
  const options = buildNotificationOptions(item);

  return self.registration.showNotification(title, options);
}

function notifyClientsMessageReady(messageId) {
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'TEXTLY_MESSAGE_DUE',
          messageId,
        });
      });
    });
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SYNC_SCHEDULES') {
    if (Array.isArray(data.schedules)) {
      // Replace the schedule snapshot and forget IDs that are no longer
      // scheduled so a newly scheduled message can notify again.
      const nextIds = new Set(data.schedules.map((item) => item.id));
      for (const id of notifiedSwSet) {
        if (!nextIds.has(id)) notifiedSwSet.delete(id);
      }

      scheduledAlarms = data.schedules.filter(
        (item) => item.status === 'scheduled' && !item.isPaused
      );

      checkDueMessages();
    }
    return;
  }

  if (data.type === 'SHOW_NOTIFICATION') {
    const title = data.title || 'Textly — Message Ready';
    const options = buildNotificationOptions(
      data.data || {},
      {
        body: data.body,
        tag: data.tag,
        data: data.data || {},
      }
    );

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const msgId = event.notification.data?.messageId;
  const targetUrl = msgId
    ? `/?openMsgId=${encodeURIComponent(msgId)}`
    : '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus().then(() => {
              if (msgId) {
                client.postMessage({
                  type: 'TEXTLY_OPEN_MESSAGE',
                  messageId: msgId,
                });
              }
              return client;
            });
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
