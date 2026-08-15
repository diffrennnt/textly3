import React, { useState } from 'react';
import { BellOff, X, Check, Smartphone, Monitor, Apple, RefreshCw, AlertCircle } from 'lucide-react';

interface NotificationUnblockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshPermission: () => Promise<void> | void;
}

export const NotificationUnblockModal: React.FC<NotificationUnblockModalProps> = ({
  isOpen,
  onClose,
  onRefreshPermission,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'desktop' | 'ios'>('android');
  const [checkedSuccess, setCheckedSuccess] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleCheckAgain = async () => {
    await onRefreshPermission();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setCheckedSuccess(true);
      setTimeout(() => {
        setCheckedSuccess(null);
        onClose();
      }, 1200);
    } else {
      setCheckedSuccess(false);
      setTimeout(() => setCheckedSuccess(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <BellOff className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="font-extrabold text-lg text-slate-900">Notifications Are Blocked</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Notifications are blocked in your browser. Open your browser's site settings and allow notifications for Textly.
          </p>
        </div>

        {/* Device Platform Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-700 space-y-3">
          {activeTab === 'android' && (
            <ol className="space-y-2.5 list-decimal list-inside leading-relaxed">
              <li className="font-medium">
                Tap the <strong className="text-slate-900">lock / tune icon 🔒</strong> at the left of your browser address bar.
              </li>
              <li className="font-medium">
                Tap <strong className="text-slate-900">Permissions</strong> or <strong className="text-slate-900">Site settings</strong>.
              </li>
              <li className="font-medium">
                Find <strong className="text-slate-900">Notifications</strong> and change it to <strong className="text-emerald-700">Allow</strong>.
              </li>
              <li className="font-medium">
                Return here and tap <strong className="text-slate-900">"Check Permission Again"</strong> below.
              </li>
            </ol>
          )}

          {activeTab === 'desktop' && (
            <ol className="space-y-2.5 list-decimal list-inside leading-relaxed">
              <li className="font-medium">
                Click the <strong className="text-slate-900">lock or tune icon</strong> directly to the left of the URL.
              </li>
              <li className="font-medium">
                Toggle <strong className="text-slate-900">Notifications</strong> to <strong className="text-emerald-700">Allow</strong>.
              </li>
              <li className="font-medium">
                Click <strong className="text-slate-900">"Check Permission Again"</strong> or refresh the tab.
              </li>
            </ol>
          )}

          {activeTab === 'ios' && (
            <ol className="space-y-2.5 list-decimal list-inside leading-relaxed">
              <li className="font-medium">
                Tap the Safari <strong className="text-slate-900">Share button</strong> (square with arrow up).
              </li>
              <li className="font-medium">
                Select <strong className="text-slate-900">"Add to Home Screen"</strong>.
              </li>
              <li className="font-medium">
                Launch Textly from your Home Screen to allow Web Push notification permissions.
              </li>
            </ol>
          )}
        </div>

        {/* Feedback Alert if still blocked */}
        {checkedSuccess === false && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Still blocked by browser. Please update site settings and try again.</span>
          </div>
        )}

        {checkedSuccess === true && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center gap-2 font-bold">
            <Check className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>Notifications enabled successfully!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCheckAgain}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Permission</span>
          </button>
        </div>
      </div>
    </div>
  );
};
