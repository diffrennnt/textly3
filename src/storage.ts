import { ScheduledMessage, AppSettings, NotificationLog } from '../types';

const STORAGE_KEY_MESSAGES = 'messagelater_messages_v1';
const STORAGE_KEY_SETTINGS = 'messagelater_settings_v1';
const STORAGE_KEY_LOGS = 'messagelater_logs_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCountryCode: '+1',
  soundEnabled: true,
  browserNotificationsEnabled: true,
  autoOpenWhatsAppOnTap: false,
  simulateAndroidDrawer: true,
};

export const INITIAL_SEED_MESSAGES: ScheduledMessage[] = [
  {
    id: 'msg-seed-1',
    recipientName: 'Mom ❤️',
    recipientPhone: '+1 555-0188',
    message: 'Happy birthday! Hope you have an amazing day ❤️',
    scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Tomorrow 8:00 PM
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'scheduled',
    platform: 'whatsapp',
    repeat: 'never',
  },
  {
    id: 'msg-seed-2',
    recipientName: 'John',
    recipientPhone: '+1 555-0192',
    message: "Don't forget about our meeting.",
    scheduledAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), // 2 days from now 10:00 AM
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    status: 'scheduled',
    platform: 'whatsapp',
    repeat: 'weekly',
  },
];

export function loadMessages(): ScheduledMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!raw) {
      saveMessages(INITIAL_SEED_MESSAGES);
      return INITIAL_SEED_MESSAGES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading messages from localStorage:', err);
    return INITIAL_SEED_MESSAGES;
  }
}

export function saveMessages(messages: ScheduledMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  } catch (err) {
    console.error('Error saving messages to localStorage:', err);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

export function loadLogs(): NotificationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading logs:', err);
    return [];
  }
}

export function saveLogs(logs: NotificationLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving logs:', err);
  }
}
