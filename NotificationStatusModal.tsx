import React from 'react';
import { Bell, BellOff, Check, AlertCircle, X, ExternalLink, Zap } from 'lucide-react';

interface NotificationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionStatus: NotificationPermission | 'unsupported';
  onRequestPermission: () => Promise<NotificationPermission | 'unsupported'> | void;
  onOpenSettings?: () => void;
  onTriggerTestNotification?: () => void;
}

export const NotificationStatusModal: React.FC<NotificationStatusModalProps> = ({
  isOpen,
  onClose,
  permissionStatus,
  onRequestPermission,
  onOpenSettings,
  onTriggerTestNotification,
}) => {
  if (!isOpen) return null;

  const isGranted = permissionStatus === 'granted';

  const handleEnableClick = async () => {
    await onRequestPermission();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
              isGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isGranted ? (
              <Bell className="w-5 h-5 stroke-[2.4]" />
            ) : (
              <BellOff className="w-5 h-5 stroke-[2.4]" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Content */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-slate-900">
              {isGranted ? 'Notifications Enabled' : 'Notifications Blocked'}
            </h3>
            {isGranted ? (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                <Check className="w-3 h-3 stroke-[2.5]" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                <AlertCircle className="w-3 h-3" />
                Blocked
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {isGranted
              ? 'Textly will alert you with sound and system notifications the exact moment your scheduled messages are ready to send.'
              : 'Notifications are currently blocked or not granted in your browser. Allow notifications to receive reminders when scheduled messages are ready.'}
          </p>
        </div>

        {/* Action area */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          {!isGranted ? (
            <button
              type="button"
              onClick={handleEnableClick}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Notifications</span>
            </button>
          ) : (
            onTriggerTestNotification && (
              <button
                type="button"
                onClick={() => {
                  onTriggerTestNotification();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Send Test Alert</span>
              </button>
            )
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Open Notification Settings</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
