/**
 * Date and Time Utilities
 * Common date formatting and manipulation functions
 */

import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isSameDay,
  isSameWeek,
  isSameMonth,
  parseISO,
  eachDayOfInterval,
} from 'date-fns';

/**
 * Format a date for display with relative labels
 */
export function formatDateRelative(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'EEEE, MMMM d');
}

/**
 * Format a date with full weekday and date
 */
export function formatDateFull(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Format a date short (e.g., "Jan 15")
 */
export function formatDateShort(date: Date): string {
  return format(date, 'MMM d');
}

/**
 * Format a time (12h or 24h based on preference)
 */
export function formatTime(date: Date, use24Hour: boolean = false): string {
  return format(date, use24Hour ? 'HH:mm' : 'h:mm a');
}

/**
 * Format a time range
 */
export function formatTimeRange(start: Date, end: Date, use24Hour: boolean = false): string {
  return `${formatTime(start, use24Hour)} - ${formatTime(end, use24Hour)}`;
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format hours in a human-readable way
 */
export function formatHoursDisplay(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 30 minutes")
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffMinutes = differenceInMinutes(date, now);
  
  if (Math.abs(diffMinutes) < 1) {
    return 'now';
  }
  
  const isFuture = diffMinutes > 0;
  const absDiff = Math.abs(diffMinutes);
  
  if (absDiff < 60) {
    return isFuture ? `in ${absDiff} min` : `${absDiff} min ago`;
  }
  
  const diffHours = Math.floor(absDiff / 60);
  if (diffHours < 24) {
    return isFuture ? `in ${diffHours}h` : `${diffHours}h ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return isFuture ? `in ${diffDays}d` : `${diffDays}d ago`;
}

/**
 * Get date range for a period
 */
export function getDateRange(
  period: 'day' | 'week' | 'month',
  referenceDate: Date = new Date(),
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): { start: Date; end: Date } {
  switch (period) {
    case 'day':
      return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
    case 'week':
      return {
        start: startOfWeek(referenceDate, { weekStartsOn }),
        end: endOfWeek(referenceDate, { weekStartsOn }),
      };
    case 'month':
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  }
}

/**
 * Navigate date forward/backward by period
 */
export function navigateDate(
  date: Date,
  period: 'day' | 'week' | 'month',
  direction: 'forward' | 'backward'
): Date {
  const amount = direction === 'forward' ? 1 : -1;
  
  switch (period) {
    case 'day':
      return direction === 'forward' ? addDays(date, 1) : subDays(date, 1);
    case 'week':
      return direction === 'forward' ? addWeeks(date, 1) : subWeeks(date, 1);
    case 'month':
      return direction === 'forward' ? addMonths(date, 1) : subMonths(date, 1);
  }
}

/**
 * Check if two dates are in the same period
 */
export function isSamePeriod(
  date1: Date,
  date2: Date,
  period: 'day' | 'week' | 'month',
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): boolean {
  switch (period) {
    case 'day':
      return isSameDay(date1, date2);
    case 'week':
      return isSameWeek(date1, date2, { weekStartsOn });
    case 'month':
      return isSameMonth(date1, date2);
  }
}

/**
 * Parse an ISO date string safely
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = parseISO(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Re-export commonly used date-fns functions
export {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isSameDay,
  isSameWeek,
  isSameMonth,
  parseISO,
  eachDayOfInterval,
};
