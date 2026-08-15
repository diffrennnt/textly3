import React, { useState } from 'react';
import { ScheduledMessage } from '../types';
import { formatPhoneDisplay } from '../utils/whatsapp';
import { formatScheduledDateTime } from '../utils/notifications';
import { getRepeatLabel } from '../utils/recurrence';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { NotificationUnblockModal } from './NotificationUnblockModal';
import { NotificationStatusModal } from './NotificationStatusModal';
import { TextlyLogo } from './TextlyLogo';
import {
  Plus,
  Clock,
  Calendar,
  Bell,
  BellOff,
  Check,
  ChevronRight,
  ExternalLink,
  Edit,
  Trash2,
  Repeat,
  Pause,
  Play,
  MoreVertical
} from 'lucide-react';

interface HomeScreenProps {
  messages: ScheduledMessage[];
  onScheduleClick: () => void;
  onOpenMessage: (msg: ScheduledMessage) => void;
  onEditMessage: (msg: ScheduledMessage) => void;
  onDeleteMessage: (msgId: string) => void;
  onCancelMessage: (msgId: string) => void;
  onTogglePauseMessage?: (msgId: string) => void;
  onTriggerTestNotification: () => void;
  permissionStatus: NotificationPermission | 'unsupported';
  onRequestPermission: () => Promise<NotificationPermission | 'unsupported'> | void;
  onViewAllClick?: () => void;
  onOpenSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  messages,
  onScheduleClick,
  onOpenMessage,
  onEditMessage,
  onDeleteMessage,
  onCancelMessage,
  onTogglePauseMessage,
  onTriggerTestNotification,
  permissionStatus,
  onRequestPermission,
  onViewAllClick,
  onOpenSettings,
}) => {
  const [deletingMsg, setDeletingMsg] = useState<ScheduledMessage | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const isGranted = permissionStatus === 'granted';

  // Filter active scheduled and ready messages
  const activeMessages = messages
    .filter((m) => m.status === 'scheduled' || m.status === 'ready')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const readyCount = activeMessages.filter((m) => m.status === 'ready').length;

  const handleCardClick = async () => {
    if (permissionStatus === 'denied') {
      setShowUnblockModal(true);
    } else {
      const res = await onRequestPermission();
      if (res === 'denied') {
        setShowUnblockModal(true);
      }
    }
  };

  const handleBellClick = () => {
    setShowStatusModal(true);
  };

  return (
    <div className="pb-28 pt-5 px-5 max-w-md mx-auto space-y-5 bg-slate-50 min-h-screen">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <TextlyLogo size="md" />
        <button
          type="button"
          onClick={handleBellClick}
          className={`p-2.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 ${
            isGranted
              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100/80 ring-1 ring-amber-200/70'
          }`}
          title={isGranted ? 'Notifications Enabled — Tap to manage' : 'Notifications Blocked — Tap to enable'}
          aria-label={isGranted ? 'Notifications Enabled' : 'Notifications Blocked'}
        >
          {isGranted ? (
            <Bell className="w-5 h-5 stroke-[2.2]" />
          ) : (
            <BellOff className="w-5 h-5 stroke-[2.2]" />
          )}
          {readyCount > 0 && isGranted && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
          )}
          {!isGranted && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
          )}
        </button>
      </div>

      {/* Subtitle Tagline */}
      <div className="space-y-0.5 pt-0.5">
        <p className="text-sm font-semibold text-slate-700">Schedule messages.</p>
        <p className="text-sm font-semibold text-slate-700">Never forget to send them.</p>
      </div>

      {/* Notification Status Card */}
      {isGranted ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleBellClick}
          className="bg-emerald-50/80 hover:bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs cursor-pointer transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-900">✓ Notifications Enabled</p>
              <p className="text-[11px] text-slate-600 truncate">
                Textly will alert you when your messages are ready.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0" />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          className="bg-amber-50/70 hover:bg-amber-50 border border-amber-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs cursor-pointer transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <BellOff className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-900">🔔 Notifications Blocked</p>
              <p className="text-[11px] text-slate-600 truncate">
                Allow notifications to receive alerts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Main Action: + Schedule Message */}
      <button
        type="button"
        onClick={onScheduleClick}
        className="w-full py-3.5 px-6 rounded-2xl font-bold text-base bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
      >
        <Plus className="w-5 h-5 stroke-[3]" />
        <span>Schedule Message</span>
      </button>

      {/* Section: Upcoming Messages */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-base font-bold text-slate-900">Upcoming Messages</h2>
          {onViewAllClick && (
            <button
              type="button"
              onClick={onViewAllClick}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Message List or Empty State */}
        {activeMessages.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/70 shadow-2xs space-y-3 my-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900">No upcoming messages</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Schedule a message and Textly will remind you when it's time.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMessages.map((msg) => {
              const dt = formatScheduledDateTime(msg.scheduledAt);
              const isReady = msg.status === 'ready' || dt.isPast;
              const isRecurring = !!(msg.repeat && msg.repeat !== 'never');
              const repeatText = isRecurring ? getRepeatLabel(msg.repeat, msg.scheduledAt) : '';
              const isMenuOpen = activeMenuId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`bg-white rounded-2xl p-4 border transition-all duration-150 shadow-2xs relative ${
                    msg.isPaused
                      ? 'border-slate-200 bg-slate-50/70 opacity-75'
                      : isReady
                      ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20'
                      : 'border-slate-200/90 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Contact Info + Message */}
                    <div className="flex gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          msg.isPaused
                            ? 'bg-slate-200 text-slate-600'
                            : isReady
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {msg.recipientName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {msg.recipientName}
                          </h4>
                          {/* Scheduled Date/Time or Status on top right */}
                          <span className="text-[11px] font-semibold text-slate-500 shrink-0 text-right">
                            {dt.dateFormatted} · {dt.timeFormatted}
                          </span>
                        </div>

                        {/* Message Preview */}
                        <p
                          onClick={() => onOpenMessage(msg)}
                          className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed cursor-pointer hover:text-slate-900 transition-colors"
                        >
                          "{msg.message}"
                        </p>

                        {/* Badge row & quick actions */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div>
                            {isRecurring ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
                                <Repeat className="w-3 h-3" />
                                <span>{repeatText}</span>
                              </span>
                            ) : msg.isPaused ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                                Paused
                              </span>
                            ) : isReady ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md animate-pulse">
                                Ready to send
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                                Scheduled
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenMessage(msg)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              title="Open in WhatsApp"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Send</span>
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(isMenuOpen ? null : msg.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Action Menu Dropdown */}
                              {isMenuOpen && (
                                <div className="absolute right-0 top-7 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onEditMessage(msg);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Edit</span>
                                  </button>

                                  {isRecurring && onTogglePauseMessage && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onTogglePauseMessage(msg.id);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      {msg.isPaused ? (
                                        <>
                                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Resume</span>
                                        </>
                                      ) : (
                                        <>
                                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Pause</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setDeletingMsg(msg);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingMsg}
        onClose={() => setDeletingMsg(null)}
        onConfirm={() => {
          if (deletingMsg) {
            onDeleteMessage(deletingMsg.id);
            setDeletingMsg(null);
          }
        }}
        isRecurring={!!(deletingMsg?.repeat && deletingMsg.repeat !== 'never')}
      />

      {/* Notification Status Modal */}
      <NotificationStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        permissionStatus={permissionStatus}
        onRequestPermission={async () => {
          const res = await onRequestPermission();
          if (res === 'denied') {
            setShowStatusModal(false);
            setShowUnblockModal(true);
          }
        }}
        onOpenSettings={onOpenSettings}
        onTriggerTestNotification={onTriggerTestNotification}
      />

      {/* Notification Unblock Guide Modal */}
      <NotificationUnblockModal
        isOpen={showUnblockModal}
        onClose={() => setShowUnblockModal(false)}
        onRefreshPermission={onRequestPermission}
      />
    </div>
  );
};
