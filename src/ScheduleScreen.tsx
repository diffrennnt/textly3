import React, { useEffect, useState } from 'react';
import { ScheduledMessage, Platform, RepeatOption } from '../types';
import { MessageSquare, ArrowLeft, ChevronRight, Calendar, Clock, Repeat, Sparkles } from 'lucide-react';
import { getRepeatLabel } from './recurrence';
import { pickWhatsAppContact } from './utils/whatsapp';

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

const pad = (value: number) => String(value).padStart(2, '0');

const getInitialDateTime = (editingMessage?: ScheduledMessage | null) => {
  const dt = editingMessage ? new Date(editingMessage.scheduledAt) : new Date(Date.now() + 15 * 60 * 1000);
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
};

const formatDate = (date: string) => {
  if (!date) return 'Select date';
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (time: string) => {
  if (!time) return 'Select time';
  const [hours, minutes] = time.split(':').map(Number);
  const value = new Date();
  value.setHours(hours, minutes, 0, 0);
  return value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ onSave, onCancel, editingMessage }) => {
  const initial = getInitialDateTime(editingMessage);
  const [recipientName, setRecipientName] = useState(editingMessage?.recipientName || 'WhatsApp Contact');
  const [recipientPhone, setRecipientPhone] = useState(editingMessage?.recipientPhone || '');
  const [message, setMessage] = useState(editingMessage?.message || '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [repeat, setRepeat] = useState<RepeatOption>(editingMessage?.repeat || 'never');
  const [errorMsg, setErrorMsg] = useState('');
  const [contactHint, setContactHint] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [platform] = useState<Platform>('whatsapp');

  useEffect(() => {
    const next = getInitialDateTime(editingMessage);
    setRecipientName(editingMessage?.recipientName || 'WhatsApp Contact');
    setRecipientPhone(editingMessage?.recipientPhone || '');
    setMessage(editingMessage?.message || '');
    setDate(next.date);
    setTime(next.time);
    setRepeat(editingMessage?.repeat || 'never');
    setContactHint('');
  }, [editingMessage]);

  const handleChooseContact = async () => {
    setContactHint('');

    // A web/PWA cannot read WhatsApp's private contact list or receive a
    // callback containing the contact selected inside WhatsApp. The supported
    // browser API is the Android contact picker, which returns the phone number
    // to Textly so the same recipient can be opened later automatically.
    const picked = await pickWhatsAppContact();

    if (!picked) {
      setContactHint('Choose a phone contact and Textly will save the number. WhatsApp does not allow websites to read the contact selected inside WhatsApp.');
      return;
    }

    setRecipientName(picked.name);
    setRecipientPhone(picked.phone);
    setContactHint(`${picked.name} selected. Textly saved this number. When the message is due, Open WhatsApp will go directly to this chat.`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');

    if (!message.trim()) {
      setErrorMsg('Please enter a message to schedule.');
      return;
    }
    if (!recipientPhone.trim()) {
      setErrorMsg('Please choose a WhatsApp contact first.');
      return;
    }
    if (!date || !time) {
      setErrorMsg('Please select a valid date and time.');
      return;
    }

    const scheduledDate = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduledDate.getTime())) {
      setErrorMsg('The selected date or time is invalid.');
      return;
    }
    if (scheduledDate.getTime() <= Date.now()) {
      setErrorMsg('Please choose a future date and time.');
      return;
    }

    onSave({
      id: editingMessage?.id,
      recipientName: recipientName.trim() || 'WhatsApp Contact',
      recipientPhone: recipientPhone.trim(),
      message: message.trim(),
      scheduledAt: scheduledDate.toISOString(),
      platform,
      repeat,
    });
  };

  const isFormValid = message.trim().length > 0 && recipientPhone.trim().length > 0 && !!date && !!time;

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={onCancel} className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-200/60 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-5 h-5" /><span>Back</span>
        </button>
        <h1 className="text-base font-bold text-slate-900">{editingMessage ? 'Edit Schedule' : 'Schedule Message'}</h1>
        <div className="w-12" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{errorMsg}</div>}

        <section className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">WHO</label>
          <button type="button" onClick={handleChooseContact} className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm hover:border-emerald-500 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>
              <div>
                <span className="text-sm font-semibold text-slate-900 block">{recipientName === 'WhatsApp Contact' ? 'Choose WhatsApp contact' : recipientName}</span>
                <span className="text-[11px] text-slate-500">{recipientPhone ? 'Number saved — will open this chat automatically' : 'Tap to choose the recipient'}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          {contactHint && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{contactHint}</p>}
          <p className="text-[11px] text-slate-500 px-1">Textly cannot read WhatsApp's private contact picker. We save the phone number through Android's contact picker, then use that exact number when opening WhatsApp later.</p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">MESSAGE</label>
            <span className="text-[11px] text-slate-400">{message.length} chars</span>
          </div>
          <textarea rows={4} placeholder="Type your message..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed" />
          <button type="button" onClick={() => setShowTemplates(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><Sparkles className="w-3.5 h-3.5" /> Use a template</button>
        </section>

        <section className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">WHEN</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="w-full px-3.5 py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 cursor-pointer hover:border-emerald-500">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="min-w-0 flex-1"><span className="block text-[10px] text-slate-400">DATE</span><span className="block truncate text-xs font-semibold text-slate-900">{formatDate(date)}</span></span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sr-only" />
            </label>
            <label className="w-full px-3.5 py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 cursor-pointer hover:border-emerald-500">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="min-w-0 flex-1"><span className="block text-[10px] text-slate-400">TIME</span><span className="block truncate text-xs font-semibold text-slate-900">{formatTime(time)}</span></span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="sr-only" />
            </label>
          </div>
        </section>

        <section className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">REPEAT</label>
          <div className="relative">
            <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
            <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatOption)} className="w-full p-4 pl-11 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 appearance-none">
              <option value="never">Never — One-time message</option>
              <option value="daily">Every day — {getRepeatLabel('daily', `${date}T${time}:00`)}</option>
              <option value="weekly">Every week — {getRepeatLabel('weekly', `${date}T${time}:00`)}</option>
              <option value="monthly">Every month — {getRepeatLabel('monthly', `${date}T${time}:00`)}</option>
              <option value="yearly">Every year — {getRepeatLabel('yearly', `${date}T${time}:00`)}</option>
            </select>
          </div>
        </section>

        <div className="pt-2 space-y-3">
          <button type="submit" disabled={!isFormValid} className={`w-full py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-md flex items-center justify-center ${isFormValid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600/50 cursor-not-allowed'}`}>
            {editingMessage ? 'Update Scheduled Message' : 'Schedule Message'}
          </button>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-xs mx-auto">When the message is due, Textly will show its popup and notification. Tap Open WhatsApp and Textly will open the saved recipient's chat with your message ready.</p>
        </div>
      </form>

      {showTemplates && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowTemplates(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Message templates</h2><button type="button" onClick={() => setShowTemplates(false)} className="text-slate-500">Close</button></div>
            {QUICK_MESSAGE_TEMPLATES.map((template) => <button key={template} type="button" onClick={() => { setMessage(template); setShowTemplates(false); }} className="w-full text-left p-3.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800">{template}</button>)}
          </div>
        </div>
      )}
    </div>
  );
};
