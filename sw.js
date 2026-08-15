// Textly Service Worker for Reliable Android Background Notifications
const CACHE_NAME = 'textly-v1';

// Active scheduled alarms in SW memory
let scheduledAlarms = [];
let alarmCheckInterval = null;
const notifiedSwSet = new Set();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  startBackgroundAlarmChecker();
});

// Start persistent timer inside SW for background message checks
function startBackgroundAlarmChecker() {
  if (alarmCheckInterval) return;
  alarmCheckInterval = setInterval(() => {
    checkDueMessages();
  }, 2500);
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
    if (scheduledTime <= now) {
      if (!notifiedSwSet.has(item.id)) {
        notifiedSwSet.add(item.id);
        // Trigger OS-level notification
        showNotificationForItem(item);
        // Notify open clients that message is ready
        notifyClientsMessageReady(item.id);
      }
    } else {
      remaining.push(item);
    }
  }

  scheduledAlarms = remaining;
}

function showNotificationForItem(item) {
  const title = 'Textly — Message Ready';
  const body = 'Your scheduled message is ready to send.';

  const options = {
    body: body,
    icon: '/icon.svg',
    badge: '/badge.svg',
    tag: `textly-msg-${item.id}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      messageId: item.id,
      recipientName: item.recipientName,
      scheduledAt: item.scheduledAt,
      url: `/?openMsgId=${encodeURIComponent(item.id)}`,
    },
    actions: [
      {
        action: 'open_whatsapp',
        title: 'Open in WhatsApp',
      },
    ],
  };

  return self.registration.showNotification(title, options);
}

function notifyClientsMessageReady(messageId) {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'TEXTLY_MESSAGE_DUE',
        messageId: messageId,
      });
    });
  });
}

// Listen for messages from frontend
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SYNC_SCHEDULES') {
    // Update SW scheduled alarms
    if (Array.isArray(data.schedules)) {
      scheduledAlarms = data.schedules.filter(
        (m) => m.status === 'scheduled' && !m.isPaused
      );
      checkDueMessages();
    }
  } else if (data.type === 'SHOW_NOTIFICATION') {
    const title = data.title || 'Textly — Message Ready';
    const options = {
      body: data.body || 'Your scheduled message is ready to send.',
      icon: '/icon.svg',
      badge: '/badge.svg',
      tag: data.tag || (data.data?.messageId ? `textly-msg-${data.data.messageId}` : `textly-alert-${Date.now()}`),
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: 'open_whatsapp',
          title: 'Open in WhatsApp',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Handle User Tapping the Notification on Android
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const msgId = event.notification.data?.messageId;
  const targetUrl = msgId ? `/?openMsgId=${encodeURIComponent(msgId)}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and tell it to open the message
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (msgId) {
            client.postMessage({
              type: 'TEXTLY_OPEN_MESSAGE',
              messageId: msgId,
            });
          }
          return client;
        }
      }

      // If no window is currently open, open a new one with the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
