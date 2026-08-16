import React, { useEffect, useRef, useState } from 'react';
import { ScheduledMessage } from '../types';
import { MessageSquare, ExternalLink, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AndroidNotificationSimProps {
  notification: {
    message?: ScheduledMessage;
    title: string;
    body: string;
    time: string;
  } | null;
  onDismiss: () => void;
  onOpenMessage: (msg: ScheduledMessage) => void;
}

const STORAGE_KEY_MESSAGES = 'messagelater_messages_v1';

/**
 * This is the in-app Android-style Textly banner.
 *
 * It intentionally has its own small foreground scheduler instead of relying
 * only on the service worker. A service worker can be suspended by the browser,
 * while this component is guaranteed to notice a due message whenever Textly
 * is open. The real service-worker notification remains separate for
 * background/OS notifications.
 */
export const AndroidNotificationSim: React.FC<AndroidNotificationSimProps> = ({
  notification,
  onDismiss,
  onOpenMessage,
}) => {
  const [localNotification, setLocalNotification] = useState<{
    message: ScheduledMessage;
    title: string;
    body: string;
    time: string;
  } | null>(null);
  const shownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkDueMessages = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_MESSAGES);
        if (!raw) return;

        const messages = JSON.parse(raw) as ScheduledMessage[];
        const now = Date.now();

        const due = messages.find((message) => {
          if (!message || message.status !== 'scheduled' || message.isPaused) return false;
          if (shownIds.current.has(message.id)) return false;
          const scheduledTime = new Date(message.scheduledAt).getTime();
          return Number.isFinite(scheduledTime) && scheduledTime <= now;
        });

        if (!due) return;

        shownIds.current.add(due.id);
        setLocalNotification({
          message: { ...due, status: 'ready' },
          title: 'Textly — Message Ready',
          body: due.recipientName
            ? `Your message for ${due.recipientName} is ready to send.`
            : 'Your scheduled message is ready to send.',
          time: 'Just now',
        });
      } catch (error) {
        console.warn('Textly banner could not check scheduled messages:', error);
      }
    };

    checkDueMessages();
    const interval = window.setInterval(checkDueMessages, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const visibleNotification = notification || localNotification;

  const dismiss = () => {
    setLocalNotification(null);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {visibleNotification && (
        <motion.div
          initial={{ y: -120, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-2 left-2 right-2 z-[9999] max-w-md mx-auto"
        >
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-3.5 backdrop-blur-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[9px]">TX</span>
                <span className="font-semibold text-slate-300">Textly • WhatsApp</span>
                <span className="text-slate-500">•</span>
                <span>{visibleNotification.time}</span>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="text-slate-400 hover:text-white p-1 rounded-full transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              onClick={() => {
                if (visibleNotification.message) {
                  onOpenMessage(visibleNotification.message);
                }
                dismiss();
              }}
              className="flex items-start gap-3 cursor-pointer group p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <MessageSquare className="w-5 h-5 fill-white/20" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>{visibleNotification.title}</span>
                  <Bell className="w-3 h-3 text-emerald-400 animate-pulse" />
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                  {visibleNotification.body}
                </p>

                {visibleNotification.message && (
                  <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-1 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ExternalLink className="w-3 h-3" />
                    <span>Prepare & Open WhatsApp</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
