/**
 * Calculation Utilities
 * Pure calculation functions for metrics and analytics
 * 
 * Shared between web and mobile applications
 */

import type { CalendarEvent } from '../models/event.model';
import type { WorkloadLevel, WorkloadThresholds } from '../models/workload.model';
import { DEFAULT_THRESHOLDS } from '../models/workload.model';

/**
 * Check if an event overlaps with a given date range
 */
export function eventOverlapsRange(
  eventStart: Date,
  eventEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  return eventEnd >= rangeStart && eventStart <= rangeEnd;
}

/**
 * Calculate hours for an event within a specific date range.
 * Clamps the event to the range boundaries for multi-day events.
 * 
 * @param event - Calendar event with start and end times
 * @param rangeStart - Start of the time range to calculate within
 * @param rangeEnd - End of the time range to calculate within
 * @returns Hours of the event that fall within the range
 */
export function calculateEventHoursInRange(
  event: { start: string; end: string },
  rangeStart: Date,
  rangeEnd: Date
): number {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);

  // Check if event overlaps with range at all
  if (!eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd)) {
    return 0;
  }

  // Clamp to range boundaries for multi-day/multi-period events
  const effectiveStart = eventStart < rangeStart ? rangeStart : eventStart;
  const effectiveEnd = eventEnd > rangeEnd ? rangeEnd : eventEnd;

  const milliseconds = effectiveEnd.getTime() - effectiveStart.getTime();
  return milliseconds / (1000 * 60 * 60); // Convert to hours
}

/**
 * Filter events to only include work events
 */
export function filterWorkEvents<T extends { isWorkEvent?: boolean }>(events: T[]): T[] {
  return events.filter(e => e.isWorkEvent !== false);
}

/**
 * Filter events that start within a specific month
 */
export function filterEventsInMonth(
  events: CalendarEvent[],
  year: number,
  month: number
): CalendarEvent[] {
  return events.filter(e => {
    const d = new Date(e.start);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

/**
 * Filter events that overlap with a specific month
 * (includes events that start before but extend into the month)
 */
export function filterEventsOverlappingMonth(
  events: CalendarEvent[],
  year: number,
  month: number
): CalendarEvent[] {
  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  return events.filter(e => {
    const eventStart = new Date(e.start);
    const eventEnd = new Date(e.end);
    return eventOverlapsRange(eventStart, eventEnd, monthStart, monthEnd);
  });
}

/**
 * Get unique client names from events
 */
export function getUniqueClients(events: CalendarEvent[]): string[] {
  const clients = new Set<string>();
  events.forEach(e => {
    if (e.clientName) {
      clients.add(e.clientName);
    }
  });
  return Array.from(clients);
}

/**
 * Monthly metrics result
 */
export interface MonthlyMetrics {
  totalVisits: number;
  totalHours: number;
  uniqueClients: number;
}

/**
 * Calculate monthly metrics for work events only
 * 
 * @param events - All calendar events (will be filtered to work events)
 * @param year - Year to calculate for
 * @param month - Month to calculate for (0-indexed)
 * @returns Monthly metrics with visits, hours, and unique clients
 */
export function calculateMonthlyMetrics(
  events: CalendarEvent[],
  year: number,
  month: number
): MonthlyMetrics {
  // Get month boundaries
  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  // Filter to work events only
  const workEvents = filterWorkEvents(events);

  // Events that START in this month (for visit count)
  const eventsStartingInMonth = filterEventsInMonth(workEvents, year, month);
  
  // Events that OVERLAP with this month (for hours calculation)
  const eventsOverlappingMonth = filterEventsOverlappingMonth(workEvents, year, month);

  // Calculate total hours, properly clamped to month boundaries
  const totalHours = eventsOverlappingMonth.reduce((sum, event) => {
    return sum + calculateEventHoursInRange(event, monthStart, monthEnd);
  }, 0);

  // Get unique clients from events starting in the month
  const uniqueClients = getUniqueClients(eventsStartingInMonth);

  return {
    totalVisits: eventsStartingInMonth.length,
    totalHours,
    uniqueClients: uniqueClients.length,
  };
}

/**
 * Date range metrics result
 */
export interface DateRangeMetrics {
  totalVisits: number;
  totalHours: number;
  uniqueClients: number;
}

/**
 * Calculate metrics for a custom date range (for week view, etc.)
 * 
 * @param events - All calendar events (will be filtered to work events)
 * @param rangeStart - Start of the date range
 * @param rangeEnd - End of the date range
 * @returns Metrics with visits, hours, and unique clients
 */
export function calculateDateRangeMetrics(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): DateRangeMetrics {
  // Filter to work events only
  const workEvents = filterWorkEvents(events);

  // Events that START in this range (for visit count)
  const eventsInRange = workEvents.filter(e => {
    const d = new Date(e.start);
    return d >= rangeStart && d <= rangeEnd;
  });

  // Events that OVERLAP with this range (for hours calculation)
  const overlappingEvents = workEvents.filter(e => {
    const eventStart = new Date(e.start);
    const eventEnd = new Date(e.end);
    return eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd);
  });

  // Calculate total hours, properly clamped to range boundaries
  const totalHours = overlappingEvents.reduce((sum, event) => {
    return sum + calculateEventHoursInRange(event, rangeStart, rangeEnd);
  }, 0);

  // Get unique clients from events in the range
  const uniqueClients = getUniqueClients(eventsInRange);

  return {
    totalVisits: eventsInRange.length,
    totalHours,
    uniqueClients: uniqueClients.length,
  };
}

/**
 * Calculate weekly hours from events
 * Used for weekly summary display
 */
export function calculateWeeklyHours(
  events: CalendarEvent[],
  weekStart: Date,
  weekEnd: Date
): number {
  const workEvents = filterWorkEvents(events);
  
  return workEvents.reduce((total, event) => {
    return total + calculateEventHoursInRange(event, weekStart, weekEnd);
  }, 0);
}

/**
 * Calculate work hours from events for a specific day
 */
export function calculateDayWorkHours(
  events: Array<{ start: string; end: string; isWorkEvent?: boolean }>,
  date: Date
): number {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return events
    .filter(e => e.isWorkEvent !== false)
    .reduce((total, event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Check if event falls on this day
      if (eventEnd < dayStart || eventStart > dayEnd) {
        return total;
      }

      // Clamp to day boundaries for multi-day events
      const start = eventStart < dayStart ? dayStart : eventStart;
      const end = eventEnd > dayEnd ? dayEnd : eventEnd;

      const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
      return total + minutes / 60;
    }, 0);
}

/**
 * Get workload level based on hours and thresholds
 */
export function getWorkloadLevel(
  hours: number,
  period: 'daily' | 'weekly' = 'daily',
  thresholds: WorkloadThresholds = DEFAULT_THRESHOLDS
): WorkloadLevel {
  if (hours <= 0) {
    return 'none';
  }

  const config = thresholds[period];

  if (hours <= config.comfortable) {
    return 'comfortable';
  } else if (hours <= config.busy) {
    return 'busy';
  } else if (hours <= config.high) {
    return 'high';
  } else {
    return 'burnout';
  }
}

/**
 * Get workload summary text
 */
export function getWorkloadSummary(level: WorkloadLevel, hours: number): string {
  const hoursText = hours < 1 
    ? `${Math.round(hours * 60)}m` 
    : `${hours.toFixed(1)}h`;

  switch (level) {
    case 'none':
      return 'No visits scheduled';
    case 'comfortable':
      return `${hoursText} scheduled - Light day`;
    case 'busy':
      return `${hoursText} scheduled - Moderate workload`;
    case 'high':
      return `${hoursText} scheduled - Heavy workload`;
    case 'burnout':
      return `${hoursText} scheduled - Consider rescheduling`;
  }
}
