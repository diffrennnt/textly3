import { RepeatOption } from '../../types';

/**
 * Gets ordinal suffix for day of month (e.g., 1st, 2nd, 3rd, 15th)
 */
export function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;

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
 * Returns a human-readable label for repeat settings.
 */
export function getRepeatLabel(repeat?: RepeatOption, dateISO?: string): string {
  if (!repeat || repeat === 'never') return 'Never';
  if (repeat === 'daily') return 'Every day';

  const date = dateISO ? new Date(dateISO) : new Date();

  if (repeat === 'weekly') {
    return `Every ${date.toLocaleString('en-US', { weekday: 'long' })}`;
  }

  if (repeat === 'monthly') {
    return `Every month on the ${getOrdinalSuffix(date.getDate())}`;
  }

  if (repeat === 'yearly') {
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    return `Every year on ${monthName} ${date.getDate()}`;
  }

  return 'Never';
}

/**
 * Calculates the next future occurrence for a recurring schedule.
 */
export function calculateNextOccurrence(
  scheduledAtISO: string,
  repeat: RepeatOption,
  afterTimeMs: number = Date.now()
): string {
  if (!repeat || repeat === 'never') return scheduledAtISO;

  const baseDate = new Date(scheduledAtISO);
  if (Number.isNaN(baseDate.getTime())) {
    return new Date(afterTimeMs + 60000).toISOString();
  }

  if (baseDate.getTime() > afterTimeMs) {
    return baseDate.toISOString();
  }

  const targetDayOfMonth = baseDate.getDate();
  const targetMonth = baseDate.getMonth();
  const targetHours = baseDate.getHours();
  const targetMinutes = baseDate.getMinutes();
  const targetSeconds = baseDate.getSeconds();

  const nextDate = new Date(baseDate.getTime());
  let safety = 1000;

  while (nextDate.getTime() <= afterTimeMs && safety-- > 0) {
    if (repeat === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (repeat === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (repeat === 'monthly') {
      const year = nextDate.getFullYear();
      const month = nextDate.getMonth() + 1;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const safeDay = Math.min(targetDayOfMonth, lastDay);
      nextDate.setFullYear(year, month, safeDay);
      nextDate.setHours(targetHours, targetMinutes, targetSeconds, 0);
    } else if (repeat === 'yearly') {
      const year = nextDate.getFullYear() + 1;
      const lastDay = new Date(year, targetMonth + 1, 0).getDate();
      const safeDay = Math.min(targetDayOfMonth, lastDay);
      nextDate.setFullYear(year, targetMonth, safeDay);
      nextDate.setHours(targetHours, targetMinutes, targetSeconds, 0);
    } else {
      break;
    }
  }

  return nextDate.toISOString();
}
