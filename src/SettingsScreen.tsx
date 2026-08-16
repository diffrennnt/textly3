import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { NotificationUnblockModal } from './NotificationUnblockModal';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Smartphone,
  Check,
  Info,
  ChevronRight,
  Zap,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  permissionStatus: NotificationPermission | 'unsupported';
  onRequestPermission: () => Promise<NotificationPermission | 'unsupported'> | void;
  onTriggerTestNotification: () => Promise<{ success: boolean; reason?: string }> | void;
  onResetData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  permissionStatus,
  onRequestPermission,
  onTriggerTestNotification,
  onResetData,
}) => {
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsPWA(isStandalone);
    }
  }, []);

  const handleTestNotification = async () => {
    setTestStatusMsg(null);
    if (permissionStatus !== 'granted') {
      setTestStatusMsg({
        type: 'error',
        text: 'Notifications are blocked in your browser. Allow notifications in site settings to receive alerts.',
      });
      setShowUnblockModal(true);
      return;
    }

    const result = await onTriggerTestNotification();
    if (result && result.success === false) {
      setTestStatusMsg({
        type: 'error',
        text: result.reason || 'Could not display test notification.',
      });
    } else {
      setTestStatusMsg({
        type: 'success',
        text: '✓ Test notification sent! Check your notification tray or desktop.',
      });
      setTimeout(() => setTestStatusMsg(null), 4000);
    }
  };

  const handleEnableNotifications = async () => {
    if (permissionStatus === 'denied') {
      setShowUnblockModal(true);
    } else {
      const res = await onRequestPermission();
      if (res === 'denied') {
        setShowUnblockModal(true);
      }
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset sample data? This will restore sample scheduled messages.')) {
      onResetData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  const isGranted = permissionStatus === 'granted';

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Preferences & Notification Architecture</p>
      </div>

      {/* 1. Notifications Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${isGranted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isGranted ? <Bell className="w-5 h-5 text-emerald-700" /> : <BellOff className="w-5 h-5 text-amber-700" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
              <p className="text-xs text-slate-500">Status:{' '}<span className={`font-semibold ${isGranted ? 'text-emerald-700' : 'text-amber-700'}`}>{isGranted ? 'Enabled' : 'Blocked'}</span></p>
            </div>
          </div>
          {isGranted ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full"><Check className="w-3.5 h-3.5 stroke-[2.5]" />Enabled</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full"><AlertCircle className="w-3.5 h-3.5" />Blocked</span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleTestNotification} className="flex-1 py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span>Test Notification</span>
          </button>
          {!isGranted && (
            <button type="button" onClick={handleEnableNotifications} className="flex-1 py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <Bell className="w-3.5 h-3.5" /><span>Enable Notifications</span>
            </button>
          )}
        </div>

        {testStatusMsg && (
          <div className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 animate-in fade-in duration-150 ${testStatusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            {testStatusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />}
            <span className="leading-snug">{testStatusMsg.text}</span>
          </div>
        )}
      </div>

      {/* 2. Preferences */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Preferences</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <div>
              <p className="font-bold text-xs text-slate-900">Notification Sound Chime</p>
              <p className="text-[11px] text-slate-500">Play chime when message is ready</p>
            </div>
          </div>
          <button onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })} className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${settings.soundEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* In-App Android Notification Drawer Simulation */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-slate-500" />
            <div>
              <p className="font-bold text-xs text-slate-900">Simulate Android Notification Banner</p>
              <p className="text-[11px] text-slate-500">Show top notification bar preview in UI</p>
            </div>
          </div>
          <button onClick={() => onUpdateSettings({ simulateAndroidDrawer: !settings.simulateAndroidDrawer })} className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${settings.simulateAndroidDrawer ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${settings.simulateAndroidDrawer ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* 3. Web App & PWA Background Delivery Architecture Guide */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <button onClick={() => setShowAndroidGuide(!showAndroidGuide)} className="w-full flex items-center justify-between text-left cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold"><Info className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Web App & PWA Notification Architecture</h3>
              <p className="text-[11px] text-slate-500">Mode: <span className="font-semibold text-slate-800">{isPWA ? 'Installed PWA' : 'Web Browser Tab'}</span> • Background details</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showAndroidGuide ? 'rotate-90' : ''}`} />
        </button>

        {showAndroidGuide && (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2.5 leading-relaxed animate-in fade-in duration-200">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><h4 className="font-bold text-slate-900 mb-1">1. Background Service Worker</h4><p>Textly registers a background Service Worker to manage scheduled alerts. While Textly is running or in a background tab, the Service Worker triggers system notifications precisely on time.</p></div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><h4 className="font-bold text-slate-900 mb-1">2. Browser Sleep & Closed App Limitation</h4><p>Mobile web browsers (Android Chrome, iOS Safari) suspend JavaScript execution if the browser process is completely force-closed. For maximum reliability, keep Textly installed to your home screen (PWA) or keep a browser tab open.</p></div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><h4 className="font-bold text-slate-900 mb-1">3. WhatsApp Privacy & Hand-off</h4><p>WhatsApp does not permit silent automatic message sending without user review. Textly prepares the exact message and opens WhatsApp with one tap for you to press send.</p></div>
          </div>
        )}
      </div>

      {/* 4. Reset Data */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900">Reset Sample Data</h3>
            <p className="text-[11px] text-slate-500">Restore default sample scheduled messages</p>
          </div>
          <button onClick={handleReset} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /><span>Reset</span></button>
        </div>
        {resetSuccess && <p className="text-xs font-semibold text-emerald-600 animate-in fade-in">✓ Sample data restored successfully!</p>}
      </div>

      <NotificationUnblockModal isOpen={showUnblockModal} onClose={() => setShowUnblockModal(false)} onRefreshPermission={onRequestPermission} />
    </div>
  );
};
