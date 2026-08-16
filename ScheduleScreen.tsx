import React, { useState, useEffect } from 'react';
import { ScheduledMessage, Platform, RepeatOption } from '../types';
import {
  MessageSquare,
  Sparkles,
  ArrowLeft,
  X,
  ChevronRight,
  Calendar,
  Clock,
  Repeat,
  Check
} from 'lucide-react';
import { DatePickerModal } from './DatePickerModal';
import { TimePickerModal } from './TimePickerModal';
import { getRepeatLabel, getOrdinalSuffix } from './recurrence';

interface ScheduleScreenProps {
  onSave: (message: Omit<ScheduledMessage, 'id' | 'createdAt' | 'status'> & { id?: string }) => void;
  onCancel: () => void;
  editingMessage?: ScheduledMessage | null;
  defaultCountryCode?: string;
}

const QUICK_MESSAGE_TEMPLATES = [
  '👋 Hey! Just checking in to see how you are doing.',
  '🎉 Happy Birthday! Wishing you a fantastic day!',
  '⏰ Running about 10 minutes late, see you shortly!',
  '📝 Reminder: Our meeting is starting soon.',
  '☕ Hey, are you free for a quick coffee catch up later?',
  '✅ Done with the project updates! Let me know what you think.',
];

const formatDisplayDate = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayDiff = Math.round((d.getTime() - today.getTime()) / (1000 * 3600 * 24));

  const monthName = d.toLocaleString('en-US', { month: 'short' });
  const dayNum = d.getDate();

  if (dayDiff === 0) return `Today, ${monthName} ${dayNum}`;
  if (dayDiff === 1) return `Tomorrow, ${monthName} ${dayNum}`;
  return `${monthName} ${dayNum}, ${year}`;
};

const formatDisplayTime = (timeString: string) => {
  if (!timeString) return '';
  const [hoursStr, minsStr] = timeString.split(':');
  let hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return timeString;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minsStr} ${ampm}`;
};

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  onSave,
  onCancel,
  editingMessage,
}) => {
  const [recipientName, setRecipientName] = useState('WhatsApp Contact');
  const [message, setMessage] = useState('');
  const [platform] = useState<Platform>('whatsapp');

  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);

  // Date and Time calculation
  const getInitialDateTime = () => {
    if (editingMessage) {
      const dt = new Date(editingMessage.scheduledAt);
      return {
        date: dt.toISOString().split('T')[0],
        time: dt.toTimeString().substring(0, 5),
      };
    }
    // Default to today + 15 mins
    const future = new Date(Date.now() + 15 * 60 * 1000);
    const dateStr = future.toISOString().split('T')[0];
    const timeStr = future.toTimeString().substring(0, 5);
    return { date: dateStr, time: timeStr };
  };

  const initial = getInitialDateTime();
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [repeat, setRepeat] = useState<RepeatOption>(editingMessage?.repeat || 'never');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingMessage) {
      setRecipientName(editingMessage.recipientName || 'WhatsApp Contact');
      setMessage(editingMessage.message);
      setRepeat(editingMessage.repeat || 'never');
    }
  }, [editingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!message.trim()) {
      setErrorMsg('Please enter a message to schedule.');
      return;
    }

    if (!date || !time) {
      setErrorMsg('Please select a valid date and time.');
      return;
    }

    // Combine date + time
    const scheduledIso = new Date(`${date}T${time}:00`).toISOString();

    onSave({
      id: editingMessage?.id,
      recipientName: recipientName.trim() || 'WhatsApp Contact',
      recipientPhone: '',
      message: message.trim(),
      scheduledAt: scheduledIso,
      platform,
      repeat,
    });
  };

  const isFormValid = message.trim().length > 0 && !!date && !!time;

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            {editingMessage ? 'Edit Schedule' : 'Schedule Message'}
          </h1>
          <div className="w-12"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 animate-in fade-in duration-150">
              {errorMsg}
            </div>
          )}

          {/* 1. WHO */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              WHO
            </label>
            <div className="w-full p-4 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between shadow-xs transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <MessageSquare className="w-5 h-5 fill-white stroke-emerald-500" />
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  Choose WhatsApp contact
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 px-1 font-normal">
              Choose who you're sending this to.
            </p>
          </div>

          {/* 2. MESSAGE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                MESSAGE
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {message.length} chars
              </span>
            </div>

            <textarea
              rows={4}
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200/90 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all resize-none leading-relaxed"
            ></textarea>

            {/* Small secondary button underneath */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Use a template</span>
              </button>
            </div>
          </div>

          {/* 3. WHEN */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              WHEN
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
                className="w-full px-3.5 py-3.5 bg-white border border-slate-200/90 rounded-2xl flex items-center gap-2 text-xs font-semibold text-slate-900 shadow-xs cursor-pointer hover:border-emerald-500 transition-colors text-left"
              >
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{formatDisplayDate(date) || 'Select date'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTimePickerOpen(true)}
                className="w-full px-3.5 py-3.5 bg-white border border-slate-200/90 rounded-2xl flex items-center gap-2 text-xs font-semibold text-slate-900 shadow-xs cursor-pointer hover:border-emerald-500 transition-colors text-left"
              >
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{formatDisplayTime(time) || 'Select time'}</span>
              </button>
            </div>
          </div>

          {/* 4. REPEAT */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              REPEAT
            </label>

            <button
              type="button"
              onClick={() => setIsRepeatModalOpen(true)}
              className="w-full p-4 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between shadow-xs hover:border-emerald-500 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Repeat className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {getRepeatLabel(repeat, date ? `${date}T${time}:00` : undefined)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  {repeat === 'never' ? 'Never' : repeat === 'daily' ? 'Daily' : repeat === 'weekly' ? 'Weekly' : repeat === 'monthly' ? 'Monthly' : 'Yearly'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* 5. PRIMARY ACTION */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isFormValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/15 active:scale-98'
                  : 'bg-emerald-600/50 cursor-not-allowed opacity-60'
              }`}
            >
              <span>{editingMessage ? 'Update Scheduled Message' : 'Schedule Message'}</span>
            </button>

            {/* WHATSAPP EXPLANATION */}
            <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-xs mx-auto">
              You'll receive a notification when it's time. Open WhatsApp and confirm the message.
            </p>
          </div>
        </form>
      </div>

      {/* TEMPLATE MODAL / BOTTOM SHEET */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Select a Message Template</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1">
              {QUICK_MESSAGE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMessage(tmpl);
                    setIsTemplateModalOpen(false);
                  }}
                  className="w-full text-left p-3.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/70 hover:border-emerald-200 rounded-xl text-xs font-medium text-slate-800 transition-colors cursor-pointer"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REPEAT SELECTION MODAL */}
      {isRepeatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-600" />
                <span>Repeat Frequency</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsRepeatModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {[
                { id: 'never', label: 'Never', desc: 'One-time message' },
                { id: 'daily', label: 'Every day', desc: 'Repeats daily at this time' },
                { id: 'weekly', label: 'Every week', desc: `Repeats every week on ${date ? new Date(`${date}T12:00:00`).toLocaleString('en-US', { weekday: 'long' }) : 'this day'}` },
                { id: 'monthly', label: 'Every month', desc: `Repeats monthly on the ${date ? getOrdinalSuffix(parseInt(date.split('-')[2], 10)) : 'same day'}` },
                { id: 'yearly', label: 'Every year', desc: `Repeats yearly on ${date ? new Date(`${date}T12:00:00`).toLocaleString('en-US', { month: 'short', day: 'numeric' }) : 'this date'}` },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setRepeat(opt.id as RepeatOption);
                    setIsRepeatModalOpen(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    repeat === opt.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {repeat === opt.id && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DATE PICKER MODAL */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={date}
        onConfirm={(newDate) => setDate(newDate)}
      />

      {/* TIME PICKER MODAL */}
      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        selectedTime={time}
        onConfirm={(newTime) => setTime(newTime)}
      />
    </div>
  );
};



