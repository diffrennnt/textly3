import { RepeatOption } from '../types';

/**
 * Gets ordinal suffix for day of month (e.g., 1st, 2nd, 3rd, 15th)
 */
export function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/**
 * Returns human readable label for repeat settings
 */
export function getRepeatLabel(repeat?: RepeatOption, dateISO?: string): string {
  if (!repeat || repeat === 'never') {
    return 'Never';
  }

  if (repeat === 'daily') {
    return 'Every day';
  }

  const d = dateISO ? new Date(dateISO) : new Date();

  if (repeat === 'weekly') {
    const weekday = d.toLocaleString('en-US', { weekday: 'long' });
    return `Every ${weekday}`;
  }

  if (repeat === 'monthly') {
    const dayNum = d.getDate();
    return `Every month on the ${getOrdinalSuffix(dayNum)}`;
  }

  if (repeat === 'yearly') {
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    const dayNum = d.getDate();
    return `Every year on ${monthName} ${dayNum}`;
  }

  return 'Never';
}

/**
 * Calculates the next future occurrence date ISO string for a recurring schedule.
 * If base scheduledAt is already in the future compared to afterTimeMs, returns base scheduledAt.
 * Otherwise steps forward by repeat interval until next occurrence > afterTimeMs.
 */
export function calculateNextOccurrence(
  scheduledAtISO: string,
  repeat: RepeatOption,
  afterTimeMs: number = Date.now()
): string {
  if (!repeat || repeat === 'never') {
    return scheduledAtISO;
  }

  const baseDate = new Date(scheduledAtISO);
  if (isNaN(baseDate.getTime())) {
    return new Date(afterTimeMs + 60000).toISOString();
  }

  // If already in future, no recalculation needed
  if (baseDate.getTime() > afterTimeMs) {
    return baseDate.toISOString();
  }

  const targetHours = baseDate.getHours();
  const targetMinutes = baseDate.getMinutes();
  const targetSeconds = baseDate.getSeconds();
  const targetDayOfMonth = baseDate.getDate();
  const targetMonth = baseDate.getMonth();

  const nextDate = new Date(baseDate.getTime());

  // Loop forward until nextDate > afterTimeMs (with safety max iterations)
  let maxSafetyLoops = 1000;

  while (nextDate.getTime() <= afterTimeMs && maxSafetyLoops > 0) {
    maxSafetyLoops--;

    if (repeat === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (repeat === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (repeat === 'monthly') {
      const currentYear = nextDate.getFullYear();
      const currentMonth = nextDate.getMonth();
      const nextMonthIndex = currentMonth + 1;

      // Find last day of next month
      const lastDayOfNextMonth = new Date(currentYear, nextMonthIndex + 1, 0).getDate();
      const safeDay = Math.min(targetDayOfMonth, lastDayOfNextMonth);

      nextDate.setFullYear(currentYear, nextMonthIndex, safeDay);
      nextDate.setHours(targetHours, targetMinutes, targetSeconds, 0);
    } else if (repeat === 'yearly') {
      const nextYear = nextDate.getFullYear() + 1;

      // Handle leap year for Feb 29
      const lastDayOfTargetMonth = new Date(nextYear, targetMonth + 1, 0).getDate();
      const safeDay = Math.min(targetDayOfMonth, lastDayOfTargetMonth);

      nextDate.setFullYear(nextYear, targetMonth, safeDay);
      nextDate.setHours(targetHours, targetMinutes, targetSeconds, 0);
    }
  }

  return nextDate.toISOString();
}
