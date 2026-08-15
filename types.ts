export type MessageStatus = 'scheduled' | 'ready' | 'sent_manually' | 'cancelled' | 'failed';

export type Platform = 'whatsapp';

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ScheduledMessage {
  id: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  scheduledAt: string; // ISO date string
  createdAt: string; // ISO date string
  status: MessageStatus;
  platform: Platform;
  repeat?: RepeatOption;
  isPaused?: boolean;
  sentAt?: string;
  notes?: string;
}

export interface NotificationLog {
  id: string;
  messageId: string;
  recipientName: string;
  messagePreview: string;
  triggeredAt: string;
  read: boolean;
}

export interface AppSettings {
  defaultCountryCode: string;
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  autoOpenWhatsAppOnTap: boolean;
  simulateAndroidDrawer: boolean;
}

export type ActiveTab = 'home' | 'schedule' | 'history' | 'settings';
