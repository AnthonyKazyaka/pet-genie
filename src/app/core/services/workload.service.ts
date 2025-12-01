import { Injectable, computed, signal } from '@angular/core';
import { DataService } from './data.service';
import { EventProcessorService } from './event-processor.service';
import {
  CalendarEvent,
  WorkloadMetrics,
  WorkloadLevel,
  WorkloadSummary,
  WorkloadThresholds,
  DEFAULT_THRESHOLDS,
  getWorkloadLevel,
} from '../../models';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInMinutes,
  isSameDay,
  format,
} from 'date-fns';

/**
 * WorkloadService
 * Calculates workload metrics, levels, and burnout analysis
 */
@Injectable({
  providedIn: 'root',
})
export class WorkloadService {
  // Default travel time per event leg (minutes)
  private readonly DEFAULT_TRAVEL_TIME = 15;

  constructor(
    private dataService: DataService,
    private eventProcessor: EventProcessorService
  ) {}

  /**
   * Calculate workload metrics for a specific date
   */
  calculateDailyMetrics(date: Date, events?: CalendarEvent[]): WorkloadMetrics {
    const dayEvents = events || this.dataService.getEventsForDate(date);
    const workEvents = dayEvents.filter((e) => e.isWorkEvent);
    const settings = this.dataService.settings();

    let workTime = 0;

    for (const event of workEvents) {
      workTime += this.eventProcessor.calculateEventDurationForDay(event, date);
    }

    const travelTime = settings.includeTravelTime
      ? this.calculateEstimatedTravelTime(workEvents)
      : 0;

    const totalTime = workTime + travelTime;
    const totalHours = totalTime / 60;

    return {
      date,
      workTime,
      travelTime,
      totalTime,
      eventCount: workEvents.length,
      level: getWorkloadLevel(totalHours, 'daily', settings.thresholds),
    };
  }

  /**
   * Calculate workload metrics for a date range
   */
  calculateRangeMetrics(
    startDate: Date,
    endDate: Date,
    events?: CalendarEvent[]
  ): WorkloadMetrics[] {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const allEvents = events || this.dataService.events();

    return days.map((date) => {
      const dayEvents = allEvents.filter((e) =>
        this.eventOverlapsDay(e, date)
      );
      return this.calculateDailyMetrics(date, dayEvents);
    });
  }

  /**
   * Check if an event overlaps with a specific day
   */
  private eventOverlapsDay(event: CalendarEvent, date: Date): boolean {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    return event.start <= dayEnd && event.end >= dayStart;
  }

  /**
   * Calculate estimated travel time for work events
   * Uses 15-minute estimate per travel leg (to and from each unique location)
   */
  calculateEstimatedTravelTime(workEvents: CalendarEvent[]): number {
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

    return trips * this.DEFAULT_TRAVEL_TIME;
  }

  /**
   * Get workload summary for a period
   */
  getWorkloadSummary(
    period: 'daily' | 'weekly' | 'monthly',
    referenceDate: Date = new Date()
  ): WorkloadSummary {
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'daily':
        startDate = startOfDay(referenceDate);
        endDate = endOfDay(referenceDate);
        break;
      case 'weekly':
        startDate = startOfWeek(referenceDate, { weekStartsOn: 0 });
        endDate = endOfWeek(referenceDate, { weekStartsOn: 0 });
        break;
      case 'monthly':
        startDate = startOfMonth(referenceDate);
        endDate = endOfMonth(referenceDate);
        break;
    }

    const metrics = this.calculateRangeMetrics(startDate, endDate);
    const totalWorkMinutes = metrics.reduce((sum, m) => sum + m.workTime, 0);
    const totalTravelMinutes = metrics.reduce((sum, m) => sum + m.travelTime, 0);
    const totalEvents = metrics.reduce((sum, m) => sum + m.eventCount, 0);

    // Find busiest day
    const busiestDay = metrics.reduce(
      (max, m) => (m.totalTime > max.hours * 60 ? { date: m.date, hours: m.totalTime / 60 } : max),
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
      level: getWorkloadLevel(totalHours, period, this.dataService.settings().thresholds),
      eventCount: totalEvents,
    };
  }

  /**
   * Get today's workload metrics
   */
  getTodayMetrics(): WorkloadMetrics {
    return this.calculateDailyMetrics(new Date());
  }

  /**
   * Get this week's workload summary
   */
  getThisWeekSummary(): WorkloadSummary {
    return this.getWorkloadSummary('weekly', new Date());
  }

  /**
   * Get this month's workload summary
   */
  getThisMonthSummary(): WorkloadSummary {
    return this.getWorkloadSummary('monthly', new Date());
  }

  /**
   * Get workload level color
   */
  getWorkloadColor(level: WorkloadLevel): string {
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
  getWorkloadLabel(level: WorkloadLevel): string {
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
  formatHours(hours: number): string {
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
}
