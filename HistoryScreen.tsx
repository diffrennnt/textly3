import React, { useState } from 'react';
import { ScheduledMessage, MessageStatus } from '../types';
import { formatPhoneDisplay } from '../utils/whatsapp';
import { formatScheduledDateTime } from '../utils/notifications';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  Trash2,
  Search,
  Filter,
  Check,
  MessageSquare
} from 'lucide-react';

interface HistoryScreenProps {
  messages: ScheduledMessage[];
  onOpenMessage: (msg: ScheduledMessage) => void;
  onReschedule: (msg: ScheduledMessage) => void;
  onClearHistory: () => void;
  onDeleteMessage: (msgId: string) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  messages,
  onOpenMessage,
  onReschedule,
  onClearHistory,
  onDeleteMessage,
}) => {
  const [filter, setFilter] = useState<'all' | 'sent_manually' | 'ready' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // History includes messages that are sent_manually, ready, cancelled, or failed
  const historyMessages = messages.filter((m) => {
    const isHistoryStatus = m.status === 'sent_manually' || m.status === 'ready' || m.status === 'cancelled' || m.status === 'failed';
    if (!isHistoryStatus) return false;

    if (filter !== 'all' && m.status !== filter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.recipientName.toLowerCase().includes(q);
      const matchPhone = m.recipientPhone.toLowerCase().includes(q);
      const matchMsg = m.message.toLowerCase().includes(q);
      return matchName || matchPhone || matchMsg;
    }

    return true;
  }).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Message History</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track dispatched and completed messages</p>
        </div>

        {historyMessages.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors border border-rose-200"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search recipient or message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: 'all', label: 'All History' },
            { id: 'sent_manually', label: '✓ Sent Manually' },
            { id: 'ready', label: '⚡ Ready' },
            { id: 'cancelled', label: 'Cancelled' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History List */}
      {historyMessages.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="font-bold text-sm text-slate-800">No history items found.</p>
          <p className="text-xs text-slate-500">
            Messages that reach their scheduled time or get sent will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyMessages.map((msg) => {
            const dt = formatScheduledDateTime(msg.scheduledAt);

            return (
              <div
                key={msg.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3"
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {msg.recipientName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {formatPhoneDisplay(msg.recipientPhone)}
                    </p>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      msg.status === 'sent_manually'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : msg.status === 'ready'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {msg.status === 'sent_manually' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {msg.status === 'cancelled' && <XCircle className="w-3 h-3 text-slate-500" />}
                    {msg.status === 'sent_manually'
                      ? 'Sent Manually'
                      : msg.status === 'ready'
                      ? 'Ready'
                      : 'Cancelled'}
                  </span>
                </div>

                {/* Preview text */}
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                  "{msg.message}"
                </p>

                {/* Footer time & actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {dt.dateFormatted} • {dt.timeFormatted}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenMessage(msg)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
                      title="Prepare & Copy"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Prepare</span>
                    </button>

                    <button
                      onClick={() => onReschedule(msg)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors border border-emerald-200"
                      title="Reschedule this message"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-600" />
                      <span>Reschedule</span>
                    </button>

                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
