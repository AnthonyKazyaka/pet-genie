/**
 * Date/Time Formatting Utilities
 * Consistent date and time formatting across web and mobile
 * 
 * Shared between web and mobile applications
 */

/**
 * Format time from ISO string for display
 * @param isoString - ISO date string or Date object
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTime(isoString: string | Date): string {
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date header with relative day names (Today, Tomorrow)
 * @param date - Date to format
 * @param includeSuffix - Whether to include "Visits" suffix
 * @returns Formatted header (e.g., "Today's Visits" or "Monday, January 15")
 */
export function formatDateHeader(date: Date, includeSuffix: boolean = true): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const suffix = includeSuffix ? "'s Visits" : '';

  if (compareDate.getTime() === today.getTime()) {
    return `Today${suffix}`;
  } else if (compareDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow${suffix}`;
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

/**
 * Format date for section headers (shorter format)
 * @param date - Date object or ISO date string
 * @returns Formatted section date (e.g., "Today", "Tomorrow", "Mon, Jan 15")
 */
export function formatSectionDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const compareDate = new Date(d);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (compareDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get greeting based on time of day
 * @returns Greeting string (e.g., "Good morning", "Good afternoon", "Good evening")
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format duration in hours
 * @param hours - Number of hours
 * @returns Formatted hours string (e.g., "2.5h")
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

/**
 * Format duration in minutes or hours based on length
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "45m" or "2h 30m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Get start of day for a given date
 * @param date - Input date
 * @returns New Date set to start of day (00:00:00.000)
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day for a given date
 * @param date - Input date
 * @returns New Date set to end of day (23:59:59.999)
 */
export function getEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of the week (Sunday) for a given date
 * @param date - Input date
 * @returns New Date set to start of week
 */
export function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the week (Saturday) for a given date
 * @param date - Input date
 * @returns New Date set to end of week
 */
export function getEndOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + (6 - result.getDay()));
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of the month for a given date
 * @param date - Input date
 * @returns New Date set to first day of month at 00:00:00
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get the end of the month for a given date
 * @param date - Input date
 * @returns New Date set to last day of month at 23:59:59
 */
export function getEndOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is tomorrow
 * @param date - Date to check
 * @returns True if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/**
 * Add days to a date
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate the difference between two dates in days
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates (can be negative)
 */
export function daysDifference(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const d1 = getStartOfDay(date1);
  const d2 = getStartOfDay(date2);
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

/**
 * Get date range for a preset option
 * @param option - Preset range type
 * @returns Date range with start and end
 */
export function getPresetDateRange(
  option: 'today' | 'week' | 'month' | 'quarter' | 'year'
): { start: Date; end: Date } {
  const now = new Date();
  const today = getStartOfDay(now);

  switch (option) {
    case 'today':
      return { start: today, end: now };
    case 'week':
      return { start: getStartOfWeek(today), end: now };
    case 'month':
      return { start: getStartOfMonth(now), end: now };
    case 'quarter': {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStart, 1);
      return { start, end: now };
    }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
}
