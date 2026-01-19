/**
 * Workload Calculator Service
 * Calculates workload metrics, levels, and burnout analysis
 * Pure functions - no framework dependencies
 */

import {
  CalendarEvent,
  WorkloadMetrics,
  WorkloadLevel,
  WorkloadSummary,
  WorkloadThresholds,
  DEFAULT_THRESHOLDS,
  getWorkloadLevel,
} from '../models';
import { calculateEventDurationForDay } from './event-processor';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';

// Default travel time per event leg (minutes)
const DEFAULT_TRAVEL_TIME = 15;

/**
 * Check if an event overlaps with a specific day
 */
export function eventOverlapsDay(event: CalendarEvent, date: Date): boolean {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  return event.start <= dayEnd && event.end >= dayStart;
}

/**
 * Calculate estimated travel time for work events
 * Uses 15-minute estimate per travel leg (to and from each unique location)
 */
export function calculateEstimatedTravelTime(
  workEvents: CalendarEvent[],
  travelTimePerLeg: number = DEFAULT_TRAVEL_TIME
): number {
  if (workEvents.length === 0) return 0;

  // Count unique trips (simplified: 2 legs per event, except consecutive at same location)
  let trips = 0;
  const sortedEvents = [...workEvents].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const prevEvent = i > 0 ? sortedEvents[i - 1] : null;

    // Check if this is at same location as previous (no travel needed)
    if (prevEvent && event.location && prevEvent.location === event.location) {
      trips += 1; // Only return trip needed
    } else {
      trips += 2; // To and from
    }
  }

  return trips * travelTimePerLeg;
}

/**
 * Get events for a specific date from a list of events
 */
export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((e) => eventOverlapsDay(e, date));
}

/**
 * Calculate workload metrics for a specific date
 */
export function calculateDailyMetrics(
  date: Date,
  events: CalendarEvent[],
  options: {
    includeTravelTime?: boolean;
    thresholds?: WorkloadThresholds;
    travelBuffer?: number;
  } = {}
): WorkloadMetrics {
  const {
    includeTravelTime = true,
    thresholds = DEFAULT_THRESHOLDS,
    travelBuffer = DEFAULT_TRAVEL_TIME,
  } = options;

  const dayEvents = getEventsForDate(events, date);
  const workEvents = dayEvents.filter((e) => e.isWorkEvent);

  let workTime = 0;

  for (const event of workEvents) {
    workTime += calculateEventDurationForDay(event, date);
  }

  const travelTime = includeTravelTime
    ? calculateEstimatedTravelTime(workEvents, travelBuffer)
    : 0;

  const totalTime = workTime + travelTime;
  const totalHours = totalTime / 60;

  return {
    date,
    workTime,
    travelTime,
    totalTime,
    eventCount: workEvents.length,
    level: getWorkloadLevel(totalHours, 'daily', thresholds),
  };
}

/**
 * Calculate workload metrics for a date range
 */
export function calculateRangeMetrics(
  startDate: Date,
  endDate: Date,
  events: CalendarEvent[],
  options: {
    includeTravelTime?: boolean;
    thresholds?: WorkloadThresholds;
    travelBuffer?: number;
  } = {}
): WorkloadMetrics[] {
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days.map((date) => {
    const dayEvents = events.filter((e) => eventOverlapsDay(e, date));
    return calculateDailyMetrics(date, dayEvents, options);
  });
}

/**
 * Get period date range
 */
export function getPeriodRange(
  period: 'daily' | 'weekly' | 'monthly',
  referenceDate: Date = new Date(),
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): { startDate: Date; endDate: Date } {
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'daily':
      startDate = startOfDay(referenceDate);
      endDate = endOfDay(referenceDate);
      break;
    case 'weekly':
      startDate = startOfWeek(referenceDate, { weekStartsOn });
      endDate = endOfWeek(referenceDate, { weekStartsOn });
      break;
    case 'monthly':
      startDate = startOfMonth(referenceDate);
      endDate = endOfMonth(referenceDate);
      break;
  }

  return { startDate, endDate };
}

/**
 * Get workload summary for a period
 */
export function getWorkloadSummary(
  period: 'daily' | 'weekly' | 'monthly',
  events: CalendarEvent[],
  options: {
    referenceDate?: Date;
    includeTravelTime?: boolean;
    thresholds?: WorkloadThresholds;
    travelBuffer?: number;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  } = {}
): WorkloadSummary {
  const {
    referenceDate = new Date(),
    includeTravelTime = true,
    thresholds = DEFAULT_THRESHOLDS,
    travelBuffer = DEFAULT_TRAVEL_TIME,
    weekStartsOn = 0,
  } = options;

  const { startDate, endDate } = getPeriodRange(period, referenceDate, weekStartsOn);

  const metrics = calculateRangeMetrics(startDate, endDate, events, {
    includeTravelTime,
    thresholds,
    travelBuffer,
  });

  const totalWorkMinutes = metrics.reduce((sum, m) => sum + m.workTime, 0);
  const totalTravelMinutes = metrics.reduce((sum, m) => sum + m.travelTime, 0);
  const totalEvents = metrics.reduce((sum, m) => sum + m.eventCount, 0);

  // Find busiest day
  const busiestDay = metrics.reduce(
    (max, m) =>
      m.totalTime > max.hours * 60 ? { date: m.date, hours: m.totalTime / 60 } : max,
    { date: startDate, hours: 0 }
  );

  const totalHours = (totalWorkMinutes + totalTravelMinutes) / 60;
  const daysInPeriod = metrics.length;
  const averageDailyHours = totalHours / daysInPeriod;

  return {
    period,
    startDate,
    endDate,
    totalWorkHours: totalWorkMinutes / 60,
    totalTravelHours: totalTravelMinutes / 60,
    averageDailyHours,
    busiestDay,
    level: getWorkloadLevel(totalHours, period, thresholds),
    eventCount: totalEvents,
  };
}

/**
 * Get workload level color
 */
export function getWorkloadColor(level: WorkloadLevel): string {
  const colors: Record<WorkloadLevel, string> = {
    comfortable: '#10B981',
    busy: '#F59E0B',
    high: '#F97316',
    burnout: '#EF4444',
  };
  return colors[level];
}

/**
 * Get workload level label
 */
export function getWorkloadLabel(level: WorkloadLevel): string {
  const labels: Record<WorkloadLevel, string> = {
    comfortable: 'Comfortable',
    busy: 'Busy',
    high: 'High',
    burnout: 'Burnout Risk',
  };
  return labels[level];
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
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
