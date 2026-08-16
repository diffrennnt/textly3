import React from 'react';
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

export const AndroidNotificationSim: React.FC<AndroidNotificationSimProps> = ({ notification, onDismiss, onOpenMessage }) => {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-2 left-2 right-2 z-[100] max-w-md mx-auto"
        >
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-3.5 backdrop-blur-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[9px]">TX</span>
                <span className="font-semibold text-slate-300">Textly • WhatsApp</span>
                <span className="text-slate-500">•</span>
                <span>{notification.time}</span>
              </div>
              <button type="button" onClick={onDismiss} className="text-slate-400 hover:text-white p-1 rounded-full transition-colors" title="Dismiss">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              onClick={() => {
                if (notification.message) onOpenMessage(notification.message);
                onDismiss();
              }}
              className="flex items-start gap-3 cursor-pointer group p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <MessageSquare className="w-5 h-5 fill-white/20" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>{notification.title}</span>
                  <Bell className="w-3 h-3 text-emerald-400 animate-pulse" />
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{notification.body}</p>
                {notification.message && (
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
