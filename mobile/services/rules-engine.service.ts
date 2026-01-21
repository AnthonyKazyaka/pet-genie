/**
 * Rules Engine Service for Mobile
 * Central enforcement for workload limits and burnout protection
 * Ported from web app's rules-engine.service.ts
 */

import { CalendarEvent } from '../models/event.model';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';

/**
 * Rule violation types
 */
export type RuleViolationType =
  | 'max-visits-day'
  | 'max-hours-day'
  | 'max-hours-week'
  | 'consecutive-busy-days'
  | 'no-breaks'
  | 'weekend-overwork';

/**
 * Severity levels for rule violations
 */
export type RuleSeverity = 'info' | 'warning' | 'critical';

/**
 * A rule violation with details
 */
export interface RuleViolation {
  type: RuleViolationType;
  severity: RuleSeverity;
  title: string;
  description: string;
  metric: number;
  threshold: number;
  date?: string; // ISO date string
  icon: string;
  recommendation?: string;
}

/**
 * Burnout risk assessment
 */
export interface BurnoutRisk {
  level: 'low' | 'moderate' | 'high' | 'critical';
  score: number; // 0-100
  factors: string[];
  violations: RuleViolation[];
}

/**
 * Configurable rules
 */
export interface WorkloadRules {
  maxVisitsPerDay: number;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  maxConsecutiveBusyDays: number;
  minBreakMinutes: number;
  warnOnWeekendWork: boolean;
}

export const DEFAULT_RULES: WorkloadRules = {
  maxVisitsPerDay: 8,
  maxHoursPerDay: 10,
  maxHoursPerWeek: 50,
  maxConsecutiveBusyDays: 5,
  minBreakMinutes: 30,
  warnOnWeekendWork: true,
};

/**
 * Burnout indicators for dashboard
 */
export interface BurnoutIndicators {
  isHighLoad: boolean;
  level: 'comfortable' | 'busy' | 'high' | 'burnout';
  weeklyHours: number;
  dailyAverage: number;
  busiestDay: { date: string; hours: number } | null;
  message: string;
  color: string;
}

// Workload level colors
const WORKLOAD_COLORS: Record<string, string> = {
  comfortable: '#10B981', // Green
  busy: '#F59E0B', // Amber
  high: '#F97316', // Orange
  burnout: '#EF4444', // Red
};

/**
 * Helper: Get start of day for a date
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Helper: Get end of day for a date
 */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Helper: Get start of week (Sunday) for a date
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Helper: Get end of week (Saturday) for a date
 */
function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Helper: Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Helper: Get all days in a range
 */
function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Helper: Format date as ISO string (date only)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate event duration in minutes
 */
function calculateEventDuration(event: CalendarEvent): number {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
  return Math.min(minutes, 12 * 60); // Cap at 12 hours
}

/**
 * Get workload level based on hours
 */
function getWorkloadLevel(
  hours: number,
  period: 'daily' | 'weekly',
  settings: AppSettings
): 'comfortable' | 'busy' | 'high' | 'burnout' {
  const threshold = period === 'daily' ? settings.maxHoursPerDay : settings.maxHoursPerWeek;
  const warningPercent = settings.warningThresholdPercent / 100;

  const comfortable = threshold * 0.5;
  const busy = threshold * warningPercent;
  const high = threshold;

  if (hours <= comfortable) return 'comfortable';
  if (hours <= busy) return 'busy';
  if (hours <= high) return 'high';
  return 'burnout';
}

/**
 * Rules Engine Service
 */
export class RulesEngineService {
  /**
   * Get rules from app settings
   */
  static getRulesFromSettings(settings: AppSettings): WorkloadRules {
    return {
      maxVisitsPerDay: settings.maxVisitsPerDay,
      maxHoursPerDay: settings.maxHoursPerDay,
      maxHoursPerWeek: settings.maxHoursPerWeek,
      maxConsecutiveBusyDays: 5,
      minBreakMinutes: 30,
      warnOnWeekendWork: true,
    };
  }

  /**
   * Evaluate all rules against current events
   */
  static evaluateRules(
    events: CalendarEvent[],
    settings: AppSettings = DEFAULT_SETTINGS,
    dateRange?: { start: Date; end: Date }
  ): RuleViolation[] {
    const rules = this.getRulesFromSettings(settings);
    const violations: RuleViolation[] = [];
    const range = dateRange ?? this.getDefaultDateRange();
    const workEvents = events.filter((e) => e.isWorkEvent);

    // Check daily limits
    violations.push(...this.checkDailyLimits(workEvents, range, rules, settings));

    // Check weekly limits
    violations.push(...this.checkWeeklyLimits(workEvents, range, rules));

    // Check consecutive busy days
    violations.push(...this.checkConsecutiveBusyDays(workEvents, range, rules, settings));

    // Check weekend work
    if (rules.warnOnWeekendWork) {
      violations.push(...this.checkWeekendWork(workEvents, range));
    }

    return violations;
  }

  /**
   * Quick check for a specific day
   */
  static checkDay(
    events: CalendarEvent[],
    date: Date,
    rules: WorkloadRules = DEFAULT_RULES
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const dayEvents = events.filter(
      (e) => e.isWorkEvent && isSameDay(new Date(e.start), date)
    );

    // Check visit count
    if (dayEvents.length > rules.maxVisitsPerDay) {
      violations.push({
        type: 'max-visits-day',
        severity: dayEvents.length > rules.maxVisitsPerDay + 2 ? 'critical' : 'warning',
        title: 'Too Many Visits',
        description: `${dayEvents.length} visits scheduled (max: ${rules.maxVisitsPerDay})`,
        metric: dayEvents.length,
        threshold: rules.maxVisitsPerDay,
        date: formatDate(date),
        icon: 'calendar-times',
        recommendation: 'Consider rescheduling some visits to another day.',
      });
    }

    // Check hours
    const totalMinutes = dayEvents.reduce((sum, e) => sum + calculateEventDuration(e), 0);
    const totalHours = totalMinutes / 60;

    if (totalHours > rules.maxHoursPerDay) {
      violations.push({
        type: 'max-hours-day',
        severity: totalHours > rules.maxHoursPerDay + 2 ? 'critical' : 'warning',
        title: 'Long Day Ahead',
        description: `${totalHours.toFixed(1)} hours scheduled (max: ${rules.maxHoursPerDay})`,
        metric: totalHours,
        threshold: rules.maxHoursPerDay,
        date: formatDate(date),
        icon: 'clock',
        recommendation: 'Plan for extra rest before or after this busy day.',
      });
    }

    return violations;
  }

  /**
   * Check if adding a new event would cause violations
   */
  static wouldViolateRules(
    existingEvents: CalendarEvent[],
    newEvent: CalendarEvent,
    rules: WorkloadRules = DEFAULT_RULES
  ): RuleViolation[] {
    const allEvents = [...existingEvents, newEvent];
    return this.checkDay(allEvents, new Date(newEvent.start), rules);
  }

  /**
   * Get burnout indicators for dashboard display
   */
  static getBurnoutIndicators(
    events: CalendarEvent[],
    settings: AppSettings = DEFAULT_SETTINGS
  ): BurnoutIndicators {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const days = eachDayOfInterval(weekStart, weekEnd);

    // Calculate weekly stats
    const weekEvents = events.filter((e) => {
      const eventDate = new Date(e.start);
      return e.isWorkEvent && eventDate >= weekStart && eventDate <= weekEnd;
    });

    const weeklyMinutes = weekEvents.reduce((sum, e) => sum + calculateEventDuration(e), 0);
    const weeklyHours = weeklyMinutes / 60;

    // Find busiest day
    let busiestDay: { date: string; hours: number } | null = null;
    days.forEach((date) => {
      const dayEvents = weekEvents.filter((e) => isSameDay(new Date(e.start), date));
      const hours =
        dayEvents.reduce((sum, e) => sum + calculateEventDuration(e), 0) / 60;

      if (!busiestDay || hours > busiestDay.hours) {
        busiestDay = { date: formatDate(date), hours };
      }
    });

    const level = getWorkloadLevel(weeklyHours, 'weekly', settings);
    const isHighLoad = level === 'high' || level === 'burnout';

    let message = '';
    if (level === 'burnout') {
      message = 'Your schedule is extremely heavy this week. Consider declining new bookings.';
    } else if (level === 'high') {
      message = 'Heavy workload this week. Make sure to schedule breaks.';
    } else if (level === 'busy') {
      message = 'Busy week ahead. Keep an eye on your energy levels.';
    } else {
      message = 'Workload looks comfortable this week.';
    }

    return {
      isHighLoad,
      level,
      weeklyHours,
      dailyAverage: weeklyHours / 7,
      busiestDay,
      message,
      color: WORKLOAD_COLORS[level],
    };
  }

  /**
   * Get threshold status for a specific period
   */
  static getThresholdStatus(
    hours: number,
    period: 'daily' | 'weekly',
    settings: AppSettings = DEFAULT_SETTINGS
  ): { level: string; percentage: number; remaining: number; color: string } {
    const threshold = period === 'daily' ? settings.maxHoursPerDay : settings.maxHoursPerWeek;
    const level = getWorkloadLevel(hours, period, settings);
    const percentage = Math.min((hours / threshold) * 100, 100);
    const remaining = Math.max(threshold - hours, 0);

    return {
      level,
      percentage,
      remaining,
      color: WORKLOAD_COLORS[level],
    };
  }

  /**
   * Assess overall burnout risk
   */
  static assessBurnoutRisk(
    violations: RuleViolation[],
    events: CalendarEvent[],
    settings: AppSettings = DEFAULT_SETTINGS
  ): BurnoutRisk {
    const factors: string[] = [];
    let score = 0;

    // Score based on violations
    const criticalCount = violations.filter((v) => v.severity === 'critical').length;
    const warningCount = violations.filter((v) => v.severity === 'warning').length;

    score += criticalCount * 20;
    score += warningCount * 10;

    if (criticalCount > 0) {
      factors.push('Multiple critical workload violations');
    }
    if (warningCount > 2) {
      factors.push('Several workload warnings');
    }

    // Score based on weekly hours
    const indicators = this.getBurnoutIndicators(events, settings);
    if (indicators.level === 'burnout') {
      score += 25;
      factors.push('Weekly hours exceed high threshold');
    } else if (indicators.level === 'high') {
      score += 15;
      factors.push('Heavy weekly schedule');
    }

    // Score based on consecutive busy days
    const consecutiveViolations = violations.filter(
      (v) => v.type === 'consecutive-busy-days'
    );
    if (consecutiveViolations.length > 0) {
      score += 15;
      factors.push('Extended periods without rest');
    }

    // Cap score at 100
    score = Math.min(score, 100);

    // Determine level
    let level: BurnoutRisk['level'];
    if (score >= 70) {
      level = 'critical';
    } else if (score >= 50) {
      level = 'high';
    } else if (score >= 30) {
      level = 'moderate';
    } else {
      level = 'low';
    }

    return { level, score, factors, violations };
  }

  // ========== Private Methods ==========

  private static getDefaultDateRange(): { start: Date; end: Date } {
    const now = new Date();
    return {
      start: startOfWeek(now),
      end: endOfWeek(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)), // This week + next week
    };
  }

  private static checkDailyLimits(
    events: CalendarEvent[],
    range: { start: Date; end: Date },
    rules: WorkloadRules,
    settings: AppSettings
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const days = eachDayOfInterval(range.start, range.end);

    days.forEach((date) => {
      const dayViolations = this.checkDay(events, date, rules);
      violations.push(...dayViolations);
    });

    return violations;
  }

  private static checkWeeklyLimits(
    events: CalendarEvent[],
    range: { start: Date; end: Date },
    rules: WorkloadRules
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());

    const weekEvents = events.filter((e) => {
      const eventDate = new Date(e.start);
      return eventDate >= thisWeekStart && eventDate <= thisWeekEnd;
    });

    const weeklyMinutes = weekEvents.reduce((sum, e) => sum + calculateEventDuration(e), 0);
    const weeklyHours = weeklyMinutes / 60;

    if (weeklyHours > rules.maxHoursPerWeek) {
      violations.push({
        type: 'max-hours-week',
        severity: weeklyHours > rules.maxHoursPerWeek + 10 ? 'critical' : 'warning',
        title: 'High Load Week',
        description: `${weeklyHours.toFixed(1)} hours this week (max: ${rules.maxHoursPerWeek})`,
        metric: weeklyHours,
        threshold: rules.maxHoursPerWeek,
        date: formatDate(thisWeekStart),
        icon: 'chart-line',
        recommendation: 'Consider blocking off some time for yourself this week.',
      });
    }

    return violations;
  }

  private static checkConsecutiveBusyDays(
    events: CalendarEvent[],
    range: { start: Date; end: Date },
    rules: WorkloadRules,
    settings: AppSettings
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const days = eachDayOfInterval(range.start, range.end);

    let consecutiveBusy = 0;
    let streakStart: Date | null = null;

    days.forEach((date) => {
      const dayEvents = events.filter((e) => isSameDay(new Date(e.start), date));
      const hours =
        dayEvents.reduce((sum, e) => sum + calculateEventDuration(e), 0) / 60;

      const level = getWorkloadLevel(hours, 'daily', settings);
      const isBusy = level === 'busy' || level === 'high' || level === 'burnout';

      if (isBusy) {
        if (consecutiveBusy === 0) streakStart = date;
        consecutiveBusy++;
      } else {
        if (consecutiveBusy > rules.maxConsecutiveBusyDays && streakStart) {
          violations.push({
            type: 'consecutive-busy-days',
            severity: consecutiveBusy > rules.maxConsecutiveBusyDays + 2 ? 'critical' : 'warning',
            title: 'Long Busy Streak',
            description: `${consecutiveBusy} busy days in a row`,
            metric: consecutiveBusy,
            threshold: rules.maxConsecutiveBusyDays,
            date: formatDate(streakStart),
            icon: 'fire',
            recommendation: 'Schedule a lighter day or day off to recover.',
          });
        }
        consecutiveBusy = 0;
        streakStart = null;
      }
    });

    // Check final streak
    if (consecutiveBusy > rules.maxConsecutiveBusyDays && streakStart) {
      violations.push({
        type: 'consecutive-busy-days',
        severity: consecutiveBusy > rules.maxConsecutiveBusyDays + 2 ? 'critical' : 'warning',
        title: 'Long Busy Streak',
        description: `${consecutiveBusy} busy days in a row`,
        metric: consecutiveBusy,
        threshold: rules.maxConsecutiveBusyDays,
        date: formatDate(streakStart),
        icon: 'fire',
        recommendation: 'Schedule a lighter day or day off to recover.',
      });
    }

    return violations;
  }

  private static checkWeekendWork(
    events: CalendarEvent[],
    range: { start: Date; end: Date }
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const days = eachDayOfInterval(range.start, range.end);

    days.forEach((date) => {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) return; // Not weekend

      const dayEvents = events.filter((e) => isSameDay(new Date(e.start), date));
      const hours =
        dayEvents.reduce((sum, e) => sum + calculateEventDuration(e), 0) / 60;

      if (hours > 4) {
        const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
        violations.push({
          type: 'weekend-overwork',
          severity: 'info',
          title: 'Weekend Work',
          description: `${hours.toFixed(1)} hours scheduled on ${dayName}`,
          metric: hours,
          threshold: 4,
          date: formatDate(date),
          icon: 'bed',
          recommendation: 'Balance work with rest time on weekends when possible.',
        });
      }
    });

    return violations;
  }
}
