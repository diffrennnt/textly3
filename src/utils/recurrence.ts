import type { RepeatOption } from '../types';

export function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

export function getRepeatLabel(repeat?: RepeatOption, dateISO?: string): string {
  if (!repeat || repeat === 'never') return 'Never';
  if (repeat === 'daily') return 'Every day';
  const d = dateISO ? new Date(dateISO) : new Date();
  if (repeat === 'weekly') return `Every ${d.toLocaleString('en-US', { weekday: 'long' })}`;
  if (repeat === 'monthly') return `Every month on the ${getOrdinalSuffix(d.getDate())}`;
  if (repeat === 'yearly') return `Every year on ${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}`;
  return 'Never';
}

export function calculateNextOccurrence(scheduledAtISO: string, repeat: RepeatOption, afterTimeMs = Date.now()): string {
  if (!repeat || repeat === 'never') return scheduledAtISO;
  const baseDate = new Date(scheduledAtISO);
  if (Number.isNaN(baseDate.getTime())) return new Date(afterTimeMs + 60000).toISOString();
  if (baseDate.getTime() > afterTimeMs) return baseDate.toISOString();

  const targetDay = baseDate.getDate();
  const targetMonth = baseDate.getMonth();
  const next = new Date(baseDate);
  let safety = 1000;

  while (next.getTime() <= afterTimeMs && safety-- > 0) {
    if (repeat === 'daily') next.setDate(next.getDate() + 1);
    else if (repeat === 'weekly') next.setDate(next.getDate() + 7);
    else if (repeat === 'monthly') {
      const year = next.getFullYear();
      const month = next.getMonth() + 1;
      const lastDay = new Date(year, month + 1, 0).getDate();
      next.setFullYear(year, month, Math.min(targetDay, lastDay));
    } else if (repeat === 'yearly') {
      const year = next.getFullYear() + 1;
      const lastDay = new Date(year, targetMonth + 1, 0).getDate();
      next.setFullYear(year, targetMonth, Math.min(targetDay, lastDay));
    }
  }
  return next.toISOString();
}
