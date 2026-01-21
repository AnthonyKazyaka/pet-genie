import { Injectable, inject } from '@angular/core';
import { Observable, of, firstValueFrom, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CalendarEvent, DateRange } from '../../models/event.model';
import { VisitRecord, VisitStatus } from '../../models/visit-record.model';
import { WorkloadLevel, getWorkloadLevel } from '../../models/workload.model';
import { VisitRecordDataService } from './visit-record-data.service';
import { DataService } from './data.service';
import { EventProcessorService } from './event-processor.service';
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  isSameDay,
  getDay,
  format,
  differenceInMinutes,
} from 'date-fns';

/**
 * Summary statistics for a time period
 */
export interface SummaryStats {
  totalEvents: number;
  totalMinutes: number;
  totalHours: string;
  uniqueClients: number;
  avgPerDay: string;
  avgPerDayMinutes: number;
}

/**
 * Daily statistics for charts
 */
export interface DailyStats {
  date: Date;
  label: string;
  workMinutes: number;
  eventCount: number;
  level: WorkloadLevel;
  actualMinutes?: number; // From VisitRecords when available
}

/**
 * Service type breakdown
 */
export interface ServiceBreakdown {
  type: string;
  count: number;
  minutes: number;
  percentage: number;
  color: string;
}

/**
 * Client statistics
 */
export interface ClientStats {
  name: string;
  visitCount: number;
  totalMinutes: number;
  actualMinutes?: number; // From VisitRecords when available
}

/**
 * Day of week statistics
 */
export interface DayOfWeekStats {
  day: string;
  dayIndex: number;
  averageMinutes: number;
  averageEvents: number;
}

/**
 * Weekly summary statistics
 */
export interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;
  totalMinutes: number;
  actualMinutes?: number;
  eventCount: number;
  level: WorkloadLevel;
}

/**
 * Analytics Service
 * Centralized analytics and aggregation logic for workload analysis
 * Supports both scheduled duration (from calendar events) and actual duration (from VisitRecords)
 */
@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private visitRecordService = inject(VisitRecordDataService);
  private dataService = inject(DataService);
  private eventProcessor = inject(EventProcessorService);

  // Service type colors
  private readonly SERVICE_COLORS: Record<string, string> = {
    'drop-in': '#3B82F6',
    'walk': '#10B981',
    'overnight': '#8B5CF6',
    'housesit': '#EC4899',
    'meet-greet': '#F59E0B',
    'nail-trim': '#6366F1',
    'other': '#6B7280',
  };

  // Service type labels
  private readonly SERVICE_LABELS: Record<string, string> = {
    'drop-in': 'Drop-In',
    'walk': 'Walk',
    'overnight': 'Overnight',
    'housesit': 'Housesit',
    'meet-greet': 'Meet & Greet',
    'nail-trim': 'Nail Trim',
    'other': 'Other',
  };

  /**
   * Calculate summary statistics for a set of events
   * When VisitRecords are available, uses actual duration
   */
  async calculateSummaryStats(
    events: CalendarEvent[],
    dateRange: DateRange,
    useActualDuration = true
  ): Promise<SummaryStats> {
    const workEvents = events.filter(e => e.isWorkEvent);
    
    let totalMinutes = 0;
    
    if (useActualDuration) {
      // Try to use actual duration from VisitRecords
      totalMinutes = await this.calculateTotalMinutesWithRecords(workEvents);
    } else {
      // Use scheduled duration
      totalMinutes = this.calculateScheduledMinutes(workEvents);
    }

    const uniqueClients = new Set(workEvents.map(e => e.clientName).filter(Boolean)).size;
    const days = Math.max(1, Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const avgPerDayMinutes = totalMinutes / days;

    return {
      totalEvents: workEvents.length,
      totalMinutes,
      totalHours: `${Math.round(totalMinutes / 60)}h`,
      uniqueClients,
      avgPerDay: `${(avgPerDayMinutes / 60).toFixed(1)}h`,
      avgPerDayMinutes,
    };
  }

  /**
   * Calculate daily statistics with optional VisitRecord support
   */
  async calculateDailyStats(
    events: CalendarEvent[],
    dateRange: DateRange,
    useActualDuration = true
  ): Promise<DailyStats[]> {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const thresholds = this.dataService.settings().thresholds;

    // Limit to last 31 days for readability
    const displayDays = days.slice(-31);

    const stats: DailyStats[] = [];

    for (const date of displayDays) {
      const dayEvents = events.filter(e => isSameDay(e.start, date) && e.isWorkEvent);
      
      // Calculate scheduled minutes
      const scheduledMinutes = dayEvents.reduce((sum, e) => {
        return sum + this.eventProcessor.calculateEventDurationForDay(e, date);
      }, 0);

      // Try to get actual minutes from VisitRecords
      let actualMinutes: number | undefined;
      if (useActualDuration) {
        actualMinutes = await this.calculateActualMinutesForEvents(dayEvents);
      }

      // Use actual if available, otherwise scheduled
      const workMinutes = actualMinutes ?? scheduledMinutes;
      const level = getWorkloadLevel(workMinutes / 60, 'daily', thresholds);

      stats.push({
        date,
        label: format(date, 'd'),
        workMinutes,
        eventCount: dayEvents.length,
        level,
        actualMinutes,
      });
    }

    return stats;
  }

  /**
   * Calculate service type breakdown
   */
  calculateServiceBreakdown(events: CalendarEvent[]): ServiceBreakdown[] {
    const workEvents = events.filter(e => e.isWorkEvent);
    const serviceMap = new Map<string, { count: number; minutes: number }>();

    workEvents.forEach(event => {
      const type = event.serviceInfo?.type || 'other';
      const label = this.getServiceLabel(type);
      const duration = this.calculateEventDuration(event);

      if (!serviceMap.has(label)) {
        serviceMap.set(label, { count: 0, minutes: 0 });
      }
      const current = serviceMap.get(label)!;
      current.count++;
      current.minutes += duration;
    });

    const total = workEvents.length || 1;
    return Array.from(serviceMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        minutes: data.minutes,
        percentage: (data.count / total) * 100,
        color: this.SERVICE_COLORS[type.toLowerCase().replace(/\s+/g, '-')] || this.SERVICE_COLORS['other'],
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate day of week statistics
   */
  calculateDayOfWeekStats(events: CalendarEvent[], dateRange: DateRange): DayOfWeekStats[] {
    const workEvents = events.filter(e => e.isWorkEvent);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = dayNames.map((day, index) => ({
      day,
      dayIndex: index,
      totalMinutes: 0,
      totalEvents: 0,
      dayCount: 0,
    }));

    // Count occurrences of each day in range
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    days.forEach(date => {
      const dayIndex = getDay(date);
      dayStats[dayIndex].dayCount++;
    });

    // Sum events by day of week
    workEvents.forEach(event => {
      const dayIndex = getDay(event.start);
      const duration = this.calculateEventDuration(event);
      dayStats[dayIndex].totalMinutes += Math.min(duration, 12 * 60);
      dayStats[dayIndex].totalEvents++;
    });

    return dayStats.map(stat => ({
      day: stat.day,
      dayIndex: stat.dayIndex,
      averageMinutes: stat.dayCount > 0 ? stat.totalMinutes / stat.dayCount : 0,
      averageEvents: stat.dayCount > 0 ? stat.totalEvents / stat.dayCount : 0,
    }));
  }

  /**
   * Calculate top clients by visit count
   */
  async calculateTopClients(
    events: CalendarEvent[],
    limit = 10,
    useActualDuration = true
  ): Promise<ClientStats[]> {
    const workEvents = events.filter(e => e.isWorkEvent && e.clientName);
    const clientMap = new Map<string, { visitCount: number; scheduledMinutes: number; eventIds: string[] }>();

    workEvents.forEach(event => {
      const name = event.clientName!;
      const duration = this.calculateEventDuration(event);

      if (!clientMap.has(name)) {
        clientMap.set(name, { visitCount: 0, scheduledMinutes: 0, eventIds: [] });
      }
      const current = clientMap.get(name)!;
      current.visitCount++;
      current.scheduledMinutes += Math.min(duration, 12 * 60);
      current.eventIds.push(event.id);
    });

    const results: ClientStats[] = [];

    for (const [name, data] of clientMap.entries()) {
      let actualMinutes: number | undefined;

      if (useActualDuration) {
        // Get actual minutes from VisitRecords for this client's events
        const clientEvents = workEvents.filter(e => e.clientName === name);
        actualMinutes = await this.calculateActualMinutesForEvents(clientEvents);
      }

      results.push({
        name,
        visitCount: data.visitCount,
        totalMinutes: actualMinutes ?? data.scheduledMinutes,
        actualMinutes,
      });
    }

    return results
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit);
  }

  /**
   * Calculate weekly statistics
   */
  async calculateWeeklyStats(
    events: CalendarEvent[],
    dateRange: DateRange,
    useActualDuration = true
  ): Promise<WeeklyStats[]> {
    const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
    const thresholds = this.dataService.settings().thresholds;
    const stats: WeeklyStats[] = [];

    for (const weekStart of weeks) {
      const weekEnd = endOfWeek(weekStart);
      const weekEvents = events.filter(e => 
        e.isWorkEvent && e.start >= weekStart && e.start <= weekEnd
      );

      const scheduledMinutes = weekEvents.reduce((sum, e) => {
        return sum + this.calculateEventDuration(e);
      }, 0);

      let actualMinutes: number | undefined;
      if (useActualDuration) {
        actualMinutes = await this.calculateActualMinutesForEvents(weekEvents);
      }

      const totalMinutes = actualMinutes ?? scheduledMinutes;
      const level = getWorkloadLevel(totalMinutes / 60, 'weekly', thresholds);

      stats.push({
        weekStart,
        weekEnd,
        totalMinutes,
        actualMinutes,
        eventCount: weekEvents.length,
        level,
      });
    }

    return stats;
  }

  /**
   * Get hours worked per day for a date range
   */
  async getHoursPerDay(
    events: CalendarEvent[],
    dateRange: DateRange
  ): Promise<Map<string, number>> {
    const dailyStats = await this.calculateDailyStats(events, dateRange);
    const hoursMap = new Map<string, number>();

    dailyStats.forEach(stat => {
      hoursMap.set(format(stat.date, 'yyyy-MM-dd'), stat.workMinutes / 60);
    });

    return hoursMap;
  }

  /**
   * Get hours worked per week for a date range
   */
  async getHoursPerWeek(
    events: CalendarEvent[],
    dateRange: DateRange
  ): Promise<Map<string, number>> {
    const weeklyStats = await this.calculateWeeklyStats(events, dateRange);
    const hoursMap = new Map<string, number>();

    weeklyStats.forEach(stat => {
      hoursMap.set(format(stat.weekStart, 'yyyy-MM-dd'), stat.totalMinutes / 60);
    });

    return hoursMap;
  }

  /**
   * Get breakdown by service type
   */
  getBreakdownByService(events: CalendarEvent[]): Map<string, { hours: number; count: number }> {
    const breakdown = this.calculateServiceBreakdown(events);
    const map = new Map<string, { hours: number; count: number }>();

    breakdown.forEach(item => {
      map.set(item.type, { hours: item.minutes / 60, count: item.count });
    });

    return map;
  }

  /**
   * Get breakdown by client
   */
  async getBreakdownByClient(events: CalendarEvent[]): Promise<Map<string, { hours: number; count: number }>> {
    const clients = await this.calculateTopClients(events, 100);
    const map = new Map<string, { hours: number; count: number }>();

    clients.forEach(client => {
      map.set(client.name, { hours: client.totalMinutes / 60, count: client.visitCount });
    });

    return map;
  }

  // ========== Private Helper Methods ==========

  /**
   * Calculate scheduled duration in minutes for an event
   */
  private calculateEventDuration(event: CalendarEvent): number {
    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
    return Math.min(duration, 12 * 60); // Cap at 12 hours
  }

  /**
   * Calculate total scheduled minutes from events
   */
  private calculateScheduledMinutes(events: CalendarEvent[]): number {
    return events.reduce((sum, e) => {
      return sum + this.calculateEventDuration(e);
    }, 0);
  }

  /**
   * Calculate total minutes using VisitRecords when available
   */
  private async calculateTotalMinutesWithRecords(events: CalendarEvent[]): Promise<number> {
    let total = 0;

    for (const event of events) {
      const actualMinutes = await this.getActualDurationForEvent(event);
      if (actualMinutes !== null) {
        total += actualMinutes;
      } else {
        total += this.calculateEventDuration(event);
      }
    }

    return total;
  }

  /**
   * Calculate actual minutes from VisitRecords for a set of events
   * Returns undefined if no records have actual duration
   */
  private async calculateActualMinutesForEvents(events: CalendarEvent[]): Promise<number | undefined> {
    let totalActual = 0;
    let hasActual = false;

    for (const event of events) {
      const actualMinutes = await this.getActualDurationForEvent(event);
      if (actualMinutes !== null) {
        totalActual += actualMinutes;
        hasActual = true;
      } else {
        totalActual += this.calculateEventDuration(event);
      }
    }

    return hasActual ? totalActual : undefined;
  }

  /**
   * Get actual duration from VisitRecord for an event
   * Returns null if no completed visit record exists
   */
  private async getActualDurationForEvent(event: CalendarEvent): Promise<number | null> {
    try {
      const record = await firstValueFrom(
        this.visitRecordService.getByEventId(event.id, event.calendarId)
      );

      if (record && record.status === 'completed' && record.checkInAt && record.checkOutAt) {
        return differenceInMinutes(record.checkOutAt, record.checkInAt);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get service label for display
   */
  getServiceLabel(type: string): string {
    return this.SERVICE_LABELS[type] || 'Other';
  }

  /**
   * Get service color
   */
  getServiceColor(type: string): string {
    return this.SERVICE_COLORS[type.toLowerCase().replace(/\s+/g, '-')] || this.SERVICE_COLORS['other'];
  }

  /**
   * Format minutes as hours string
   */
  formatMinutes(minutes: number): string {
    const hours = Math.round(minutes / 60 * 10) / 10;
    return `${hours}h`;
  }

  /**
   * Get date range for a time period
   */
  getDateRange(period: 'week' | 'month' | '3months'): DateRange {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months':
        return { start: subMonths(startOfMonth(now), 2), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }
}
