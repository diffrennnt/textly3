import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onConfirm: (dateStr: string) => void;
}

function formatDateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onConfirm,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateToYYYYMMDD(today);

  const [tempDate, setTempDate] = useState<string>(selectedDate || todayStr);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    if (isOpen) {
      const initial = selectedDate || todayStr;
      setTempDate(initial);
      const [y, m] = initial.split('-').map(Number);
      if (y && m) {
        setViewMonth(new Date(y, m - 1, 1));
      } else {
        setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const currentYear = viewMonth.getFullYear();
  const currentMonth = viewMonth.getMonth(); // 0-indexed

  // Month Title
  const monthTitle = viewMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Month navigation boundary (cannot go before current month)
  const isCurrentMonthOrEarlier =
    currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth <= today.getMonth());

  const handlePrevMonth = () => {
    if (isCurrentMonthOrEarlier) return;
    setViewMonth(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonth(new Date(currentYear, currentMonth + 1, 1));
  };

  // Calendar calculations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const daysGrid: Array<{ dayNum: number; dateStr: string; isPast: boolean } | null> = [];

  // Padding before 1st of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }

  // Days of current month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isPast = dStr < todayStr;
    daysGrid.push({ dayNum: day, dateStr: dStr, isPast });
  }

  // Quick Preset Handlers
  const handlePreset = (daysFromToday: number) => {
    const target = new Date(today);
    target.setDate(target.getDate() + daysFromToday);
    const targetStr = formatDateToYYYYMMDD(target);
    setTempDate(targetStr);
    setViewMonth(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  // Format confirm label
  const getDisplayFormattedTemp = () => {
    if (!tempDate) return '';
    const [y, m, d] = tempDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleConfirm = () => {
    if (!tempDate) return;
    onConfirm(tempDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Select Date</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => handlePreset(0)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              tempDate === todayStr
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handlePreset(1)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              tempDate === formatDateToYYYYMMDD(new Date(today.getTime() + 86400000))
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => handlePreset(7)}
            className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            +1 Week
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1 pt-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isCurrentMonthOrEarlier}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isCurrentMonthOrEarlier
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-900">{monthTitle}</span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysGrid.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-9" />;
            }

            const { dayNum, dateStr, isPast } = cell;
            const isSelected = dateStr === tempDate;
            const isTodayCell = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isPast}
                onClick={() => setTempDate(dateStr)}
                className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                  isPast
                    ? 'text-slate-300 cursor-not-allowed hover:bg-transparent opacity-40'
                    : isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20 scale-105'
                    : isTodayCell
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 hover:bg-emerald-100'
                    : 'text-slate-800 hover:bg-slate-100 active:bg-slate-200'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Footer Confirmation */}
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
            <span>Confirm ({getDisplayFormattedTemp()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
