const DB_NAME = 'textly-background-v1';
const STORE_NAME = 'schedules';
const timers = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim().then(() => restoreSchedules()));
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSchedules(schedules) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const schedule of schedules) store.put(schedule);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readSchedules() {
  const db = await openDb();
  const result = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

async function restoreSchedules() {
  try {
    const schedules = await readSchedules();
    for (const schedule of schedules) armSchedule(schedule);
  } catch (error) {
    console.warn('Textly could not restore background schedules:', error);
  }
}

function clearTimer(id) {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
}

function nextOccurrence(iso, repeat) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (repeat === 'daily') date.setDate(date.getDate() + 1);
  else if (repeat === 'weekly') date.setDate(date.getDate() + 7);
  else if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
  else if (repeat === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else return null;
  return date.toISOString();
}

async function notifySchedule(schedule) {
  const messageId = schedule.id;
  const url = `/?openMsgId=${encodeURIComponent(messageId)}`;
  const phone = String(schedule.recipientPhone || '').replace(/\D/g, '');
  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(schedule.message || '')}`
    : `https://wa.me/?text=${encodeURIComponent(schedule.message || '')}`;

  // These are the strongest notification options exposed by the Web
  // Notifications API. Android/Chrome ultimately decides whether this is
  // rendered as a heads-up banner or only in the notification shade.
  await self.registration.showNotification('Textly — Message Ready', {
    body: schedule.recipientName
      ? `Your message for ${schedule.recipientName} is ready to send.`
      : 'Your scheduled message is ready to send.',
    icon: '/icon.svg',
    badge: '/badge.svg',
    tag: `textly-msg-${messageId}-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [250, 100, 250, 100, 400],
    timestamp: Date.now(),
    dir: 'auto',
    lang: 'en-US',
    data: { messageId, url, whatsappUrl },
    actions: [
      { action: 'open_whatsapp', title: 'Open in WhatsApp' },
      { action: 'open_textly', title: 'Open Textly' },
    ],
  });

  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) client.postMessage({ type: 'TEXTLY_MESSAGE_DUE', messageId });
}

async function handleDue(schedule) {
  clearTimer(schedule.id);
  try { await notifySchedule(schedule); }
  catch (error) { console.warn('Textly background notification failed:', error); }

  if (schedule.repeat && schedule.repeat !== 'never') {
    const next = nextOccurrence(schedule.scheduledAt, schedule.repeat);
    if (next) {
      const updated = { ...schedule, scheduledAt: next };
      const schedules = await readSchedules();
      await saveSchedules([...schedules.filter((item) => item.id !== schedule.id), updated]);
      armSchedule(updated);
      return;
    }
  }

  const schedules = await readSchedules();
  await saveSchedules(schedules.filter((item) => item.id !== schedule.id));
}

function armSchedule(schedule) {
  if (!schedule || schedule.isPaused || schedule.status !== 'scheduled') return;
  clearTimer(schedule.id);
  const target = new Date(schedule.scheduledAt).getTime();
  if (!Number.isFinite(target)) return;
  const delay = target - Date.now();
  timers.set(schedule.id, setTimeout(() => handleDue(schedule), Math.max(0, delay)));
}

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SYNC_SCHEDULES') {
    const schedules = Array.isArray(event.data.schedules) ? event.data.schedules : [];
    event.waitUntil(saveSchedules(schedules).then(() => {
      for (const [id] of timers) if (!schedules.some((schedule) => schedule.id === id)) clearTimer(id);
      for (const schedule of schedules) armSchedule(schedule);
    }));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = event.action === 'open_whatsapp' ? (data.whatsappUrl || 'https://wa.me/') : (data.url || '/');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl.startsWith('/')) return client.navigate(targetUrl);
          if (targetUrl.startsWith('http')) return self.clients.openWindow(targetUrl);
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
