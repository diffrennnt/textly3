import React, { useState, useEffect } from 'react';
import { Clock, X, Check } from 'lucide-react';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTime: string; // HH:MM (24h)
  onConfirm: (timeStr: string) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isOpen,
  onClose,
  selectedTime,
  onConfirm,
}) => {
  const [tempTime, setTempTime] = useState<string>(selectedTime || '12:00');

  useEffect(() => {
    if (isOpen) {
      setTempTime(selectedTime || '12:00');
    }
  }, [isOpen, selectedTime]);

  if (!isOpen) return null;

  // Format 24h to 12h display
  const format12h = (t24: string) => {
    if (!t24) return '';
    const [hStr, mStr] = t24.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return t24;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${mStr} ${ampm}`;
  };

  // Add minutes shortcut
  const handleAddMinutes = (minsToAdd: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minsToAdd);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setTempTime(`${h}:${m}`);
  };

  const handleConfirm = () => {
    if (!tempTime) return;
    onConfirm(tempTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Select Time</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Shortcuts */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleAddMinutes(15)}
            className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            +15 Mins
          </button>
          <button
            type="button"
            onClick={() => handleAddMinutes(60)}
            className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            +1 Hour
          </button>
          <button
            type="button"
            onClick={() => setTempTime('20:00')}
            className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            8:00 PM
          </button>
        </div>

        {/* Time Selector */}
        <div className="py-3 text-center space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Set Time
          </label>
          <input
            type="time"
            value={tempTime}
            onChange={(e) => setTempTime(e.target.value)}
            className="text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200/90 rounded-2xl py-3 px-6 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
          />
          <p className="text-xs font-bold text-emerald-700 pt-1">
            {format12h(tempTime)}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm ({format12h(tempTime)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
