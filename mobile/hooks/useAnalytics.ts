import { useState, useCallback } from 'react';
import { VisitRecord } from '../models/visit-record.model';
import { CalendarEvent } from '../models/event.model';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';
import {
  AnalyticsSummary,
  DailyStats,
  ServiceBreakdown,
  ClientBreakdown,
  WorkloadWarning,
} from '../models/analytics.model';

/**
 * Get start of day for a date
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of week (Sunday) for a date
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate minutes between two ISO date strings
 */
function calculateMinutes(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.round((endTime - startTime) / 60000);
}

/**
 * Hook for computing analytics from visit records and events
 */
export function useAnalytics() {
  const [loading, setLoading] = useState(false);

  /**
   * Compute daily stats for a specific date
   * Only counts work events for hours/visits calculations
   */
  const computeDailyStats = useCallback((
    date: Date,
    visitRecords: VisitRecord[],
    events: CalendarEvent[]
  ): DailyStats => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Ensure arrays are valid
    const safeRecords = Array.isArray(visitRecords) ? visitRecords : [];
    const safeEvents = Array.isArray(events) ? events : [];
    
    // Filter events for this day - only work events for metrics
    const dayEvents = safeEvents.filter(e => {
      const eventDate = e.start.split('T')[0];
      return eventDate === dateStr && e.isWorkEvent !== false;
    });

    // Filter visit records for these events
    const dayRecords = safeRecords.filter(r => {
      const event = dayEvents.find(e => e.id === r.eventId && e.calendarId === r.calendarId);
      return !!event;
    });

    // Calculate scheduled hours from events
    const scheduledMinutes = dayEvents.reduce((sum, e) => {
      return sum + calculateMinutes(e.start, e.end);
    }, 0);

    // Calculate actual hours from visit records
    const actualMinutes = dayRecords.reduce((sum, r) => {
      return sum + calculateMinutes(r.checkInAt, r.checkOutAt);
    }, 0);

    return {
      date: dateStr,
      visitCount: dayEvents.length,
      scheduledHours: scheduledMinutes / 60,
      actualHours: actualMinutes / 60,
      completedCount: dayRecords.filter(r => r.status === 'completed').length,
      inProgressCount: dayRecords.filter(r => r.status === 'in-progress').length,
      cancelledCount: dayRecords.filter(r => r.status === 'cancelled').length,
    };
  }, []);

  /**
   * Compute analytics summary for a date range
   */
  const computeAnalytics = useCallback((
    startDate: Date,
    endDate: Date,
    visitRecords: VisitRecord[],
    events: CalendarEvent[],
    clientNames?: Map<string, string>
  ): AnalyticsSummary => {
    setLoading(true);

    try {
      const days: DailyStats[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        days.push(computeDailyStats(current, visitRecords, events));
        current.setDate(current.getDate() + 1);
      }

      // Filter events in range - only work events for metrics
      const rangeEvents = events.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate >= startDate && eventDate <= endDate && e.isWorkEvent !== false;
      });

      // Get visit records for range
      const rangeRecords = visitRecords.filter(r => {
        const event = events.find(e => e.id === r.eventId && e.calendarId === r.calendarId);
        if (!event) return false;
        const eventDate = new Date(event.start);
        return eventDate >= startDate && eventDate <= endDate;
      });

      // Calculate totals
      const totalScheduledMinutes = rangeEvents.reduce((sum, e) => 
        sum + calculateMinutes(e.start, e.end), 0);
      
      const totalActualMinutes = rangeRecords.reduce((sum, r) => 
        sum + calculateMinutes(r.checkInAt, r.checkOutAt), 0);

      // Status counts
      const completedVisits = rangeRecords.filter(r => r.status === 'completed').length;
      const inProgressVisits = rangeRecords.filter(r => r.status === 'in-progress').length;
      const cancelledVisits = rangeRecords.filter(r => r.status === 'cancelled').length;
      const scheduledVisits = rangeEvents.length - completedVisits - inProgressVisits - cancelledVisits;

      // Find peak day
      const peakDay = days.reduce((peak, day) => {
        if (day.visitCount > peak.visits) {
          return { date: day.date, visits: day.visitCount, hours: day.scheduledHours };
        }
        return peak;
      }, { date: '', visits: 0, hours: 0 });

      // Service breakdown
      const serviceMap = new Map<string, { count: number; minutes: number }>();
      rangeEvents.forEach(e => {
        const serviceType = e.serviceInfo?.type || 'other';
        const minutes = calculateMinutes(e.start, e.end);
        const existing = serviceMap.get(serviceType) || { count: 0, minutes: 0 };
        serviceMap.set(serviceType, {
          count: existing.count + 1,
          minutes: existing.minutes + minutes,
        });
      });

      const serviceBreakdown: ServiceBreakdown[] = Array.from(serviceMap.entries())
        .map(([serviceType, data]) => ({
          serviceType,
          count: data.count,
          totalMinutes: data.minutes,
          percentage: rangeEvents.length > 0 
            ? Math.round((data.count / rangeEvents.length) * 100) 
            : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Client breakdown
      const clientMap = new Map<string, { clientId?: string; count: number; minutes: number }>();
      rangeEvents.forEach(e => {
        const clientName = e.clientName || 'Unknown';
        const minutes = calculateMinutes(e.start, e.end);
        const existing = clientMap.get(clientName) || { count: 0, minutes: 0 };
        clientMap.set(clientName, {
          clientId: undefined, // Could be linked via mapping
          count: existing.count + 1,
          minutes: existing.minutes + minutes,
        });
      });

      const clientBreakdown: ClientBreakdown[] = Array.from(clientMap.entries())
        .map(([clientName, data]) => ({
          clientId: data.clientId,
          clientName,
          visitCount: data.count,
          totalMinutes: data.minutes,
          percentage: rangeEvents.length > 0 
            ? Math.round((data.count / rangeEvents.length) * 100) 
            : 0,
        }))
        .sort((a, b) => b.visitCount - a.visitCount);

      // Current week stats
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekDays = days.filter(d => new Date(d.date) >= weekStart);
      const currentWeekHours = weekDays.reduce((sum, d) => sum + d.scheduledHours, 0);
      const currentWeekVisits = weekDays.reduce((sum, d) => sum + d.visitCount, 0);

      // Number of days with visits
      const daysWithVisits = days.filter(d => d.visitCount > 0).length;

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalVisits: rangeEvents.length,
        totalScheduledHours: totalScheduledMinutes / 60,
        totalActualHours: totalActualMinutes / 60,
        completedVisits,
        inProgressVisits,
        scheduledVisits: Math.max(0, scheduledVisits),
        cancelledVisits,
        averageVisitsPerDay: daysWithVisits > 0 
          ? Math.round((rangeEvents.length / daysWithVisits) * 10) / 10 
          : 0,
        averageHoursPerDay: daysWithVisits > 0 
          ? Math.round((totalScheduledMinutes / 60 / daysWithVisits) * 10) / 10 
          : 0,
        averageVisitDuration: rangeEvents.length > 0 
          ? Math.round(totalScheduledMinutes / rangeEvents.length) 
          : 0,
        serviceBreakdown,
        clientBreakdown,
        peakDay,
        currentWeekHours,
        currentWeekVisits,
      };
    } finally {
      setLoading(false);
    }
  }, [computeDailyStats]);

  /**
   * Check workload against limits and generate warnings
   */
  const checkWorkloadWarnings = useCallback((
    visitRecords: VisitRecord[],
    events: CalendarEvent[],
    settings: AppSettings = DEFAULT_SETTINGS
  ): WorkloadWarning[] => {
    const warnings: WorkloadWarning[] = [];
    const today = new Date();
    const todayStats = computeDailyStats(today, visitRecords, events);
    
    // Get this week's stats
    const weekStart = startOfWeek(today);
    const now = new Date();
    let weekHours = 0;
    const current = new Date(weekStart);
    
    while (current <= now) {
      const stats = computeDailyStats(current, visitRecords, events);
      weekHours += stats.scheduledHours;
      current.setDate(current.getDate() + 1);
    }

    // Check daily visits
    const dailyVisitPercent = (todayStats.visitCount / settings.maxVisitsPerDay) * 100;
    if (dailyVisitPercent >= settings.warningThresholdPercent) {
      warnings.push({
        type: 'daily-visits',
        severity: dailyVisitPercent >= 100 ? 'critical' : 'warning',
        message: dailyVisitPercent >= 100 
          ? `You've reached your daily visit limit (${settings.maxVisitsPerDay} visits)`
          : `Approaching daily visit limit (${todayStats.visitCount}/${settings.maxVisitsPerDay})`,
        current: todayStats.visitCount,
        limit: settings.maxVisitsPerDay,
        percentage: Math.round(dailyVisitPercent),
      });
    }

    // Check daily hours
    const dailyHoursPercent = (todayStats.scheduledHours / settings.maxHoursPerDay) * 100;
    if (dailyHoursPercent >= settings.warningThresholdPercent) {
      warnings.push({
        type: 'daily-hours',
        severity: dailyHoursPercent >= 100 ? 'critical' : 'warning',
        message: dailyHoursPercent >= 100 
          ? `You've reached your daily hours limit (${settings.maxHoursPerDay}h)`
          : `Approaching daily hours limit (${todayStats.scheduledHours.toFixed(1)}/${settings.maxHoursPerDay}h)`,
        current: todayStats.scheduledHours,
        limit: settings.maxHoursPerDay,
        percentage: Math.round(dailyHoursPercent),
      });
    }

    // Check weekly hours
    const weeklyHoursPercent = (weekHours / settings.maxHoursPerWeek) * 100;
    if (weeklyHoursPercent >= settings.warningThresholdPercent) {
      warnings.push({
        type: 'weekly-hours',
        severity: weeklyHoursPercent >= 100 ? 'critical' : 'warning',
        message: weeklyHoursPercent >= 100 
          ? `You've reached your weekly hours limit (${settings.maxHoursPerWeek}h)`
          : `Approaching weekly hours limit (${weekHours.toFixed(1)}/${settings.maxHoursPerWeek}h)`,
        current: weekHours,
        limit: settings.maxHoursPerWeek,
        percentage: Math.round(weeklyHoursPercent),
      });
    }

    return warnings;
  }, [computeDailyStats]);

  return {
    loading,
    computeAnalytics,
    computeDailyStats,
    checkWorkloadWarnings,
  };
}
