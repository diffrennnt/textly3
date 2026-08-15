import React, { useState } from 'react';
import { ScheduledMessage } from '../types';
import { formatPhoneDisplay, copyToClipboard, openWhatsApp, buildWhatsAppWebUrl } from '../utils/whatsapp';
import { formatScheduledDateTime } from '../utils/notifications';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Phone,
  Trash2,
  Edit,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

interface MessagePreparationModalProps {
  message: ScheduledMessage | null;
  onClose: () => void;
  onMarkAsSent: (msgId: string) => void;
  onDelete: (msgId: string) => void;
  onEdit: (msg: ScheduledMessage) => void;
  onCancel: (msgId: string) => void;
  defaultCountryCode: string;
}

export const MessagePreparationModal: React.FC<MessagePreparationModalProps> = ({
  message,
  onClose,
  onMarkAsSent,
  onDelete,
  onEdit,
  onCancel,
  defaultCountryCode,
}) => {
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const dateTime = formatScheduledDateTime(message.scheduledAt);
  const waUrl = buildWhatsAppWebUrl(message.recipientPhone, message.message, defaultCountryCode);

  const handleCopy = async () => {
    const success = await copyToClipboard(message.message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenWhatsApp = () => {
    openWhatsApp(message.recipientPhone, message.message, defaultCountryCode);
  };

  const handleMarkSent = () => {
    onMarkAsSent(message.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Message Preparation</h3>
              <p className="text-xs text-slate-400">WhatsApp Dispatch Helper</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Recipient Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{message.recipientName || 'WhatsApp Contact'}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <span>{formatPhoneDisplay(message.recipientPhone)}</span>
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div className="text-right">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    message.status === 'ready'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : message.status === 'sent_manually'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : message.status === 'cancelled'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {message.status === 'ready'
                    ? '⚡ Ready to Send'
                    : message.status === 'sent_manually'
                    ? '✓ Sent Manually'
                    : message.status === 'cancelled'
                    ? 'Cancelled'
                    : 'Scheduled'}
                </span>
              </div>
            </div>

            {/* Timing row */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {dateTime.dateFormatted}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {dateTime.timeFormatted} ({dateTime.relative})
              </span>
            </div>
          </div>

          {/* Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Message Content
              </label>
              <span className="text-xs text-slate-400">{message.message.length} chars</span>
            </div>
            <div className="relative bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 text-slate-900 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              "{message.message}"
            </div>
          </div>

          {/* Action Steps Box */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all duration-150 ${
                  copied
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>

              {/* WhatsApp Button */}
              <button
                onClick={handleOpenWhatsApp}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all duration-150"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open WhatsApp</span>
              </button>
            </div>

            {/* Direct Web link fallback */}
            <div className="text-center">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium"
              >
                Direct Web Link: {waUrl.substring(0, 42)}...
              </a>
            </div>
          </div>

          {/* User Confirmation Banner */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">User-Controlled Final Action</p>
              <p className="text-amber-800 mt-0.5">
                After sending in WhatsApp, tap <strong>Mark as Sent</strong> below to complete this schedule item.
              </p>
            </div>
          </div>

          {/* Mark as Sent button */}
          {message.status !== 'sent_manually' && (
            <button
              onClick={handleMarkSent}
              className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mark as Sent Manually</span>
            </button>
          )}

          {/* Edit / Delete / Cancel controls */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onEdit(message);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit</span>
              </button>
              {message.status === 'scheduled' && (
                <button
                  onClick={() => {
                    onCancel(message.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 font-medium transition-colors"
                >
                  <span>Cancel Schedule</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                onDelete(message.id);
                onClose();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
