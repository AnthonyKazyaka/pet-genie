import { Injectable, inject, signal, computed } from '@angular/core';
import { CalendarEvent, DateRange } from '../../models/event.model';
import { 
  WorkloadLevel, 
  WorkloadThresholds, 
  WORKLOAD_COLORS,
  getWorkloadLevel 
} from '../../models/workload.model';
import { DataService } from './data.service';
import { WorkloadService } from './workload.service';
import { EventProcessorService } from './event-processor.service';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  eachDayOfInterval,
  format,
} from 'date-fns';

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
  date?: Date;
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
 * Rules Engine Service
 * Central enforcement for workload limits and burnout protection
 * 
 * Features:
 * - Max visits/day enforcement
 * - Max hours/week monitoring
 * - Threshold warnings
 * - Burnout risk assessment
 * - Advisory insights (non-blocking)
 */
@Injectable({
  providedIn: 'root',
})
export class RulesEngineService {
  private dataService = inject(DataService);
  private workloadService = inject(WorkloadService);
  private eventProcessor = inject(EventProcessorService);

  // Current violations (updated when events change)
  private violations = signal<RuleViolation[]>([]);
  private burnoutRisk = signal<BurnoutRisk>({ 
    level: 'low', 
    score: 0, 
    factors: [], 
    violations: [] 
  });

  // Public computed signals
  readonly currentViolations = this.violations.asReadonly();
  readonly currentBurnoutRisk = this.burnoutRisk.asReadonly();

  readonly hasWarnings = computed(() => 
    this.violations().some(v => v.severity === 'warning' || v.severity === 'critical')
  );

  readonly hasCritical = computed(() => 
    this.violations().some(v => v.severity === 'critical')
  );

  readonly warningCount = computed(() => 
    this.violations().filter(v => v.severity === 'warning').length
  );

  readonly criticalCount = computed(() => 
    this.violations().filter(v => v.severity === 'critical').length
  );

  /**
   * Evaluate all rules against current events
   */
  evaluateRules(
    events: CalendarEvent[],
    dateRange?: DateRange,
    rules: WorkloadRules = DEFAULT_RULES
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const range = dateRange ?? this.getDefaultDateRange();
    const workEvents = events.filter(e => e.isWorkEvent);

    // Check daily limits
    violations.push(...this.checkDailyLimits(workEvents, range, rules));

    // Check weekly limits
    violations.push(...this.checkWeeklyLimits(workEvents, range, rules));

    // Check consecutive busy days
    violations.push(...this.checkConsecutiveBusyDays(workEvents, range, rules));

    // Check weekend work
    if (rules.warnOnWeekendWork) {
      violations.push(...this.checkWeekendWork(workEvents, range));
    }

    // Update signals
    this.violations.set(violations);
    this.burnoutRisk.set(this.assessBurnoutRisk(violations, workEvents, range));

    return violations;
  }

  /**
   * Quick check for a specific day
   */
  checkDay(events: CalendarEvent[], date: Date, rules: WorkloadRules = DEFAULT_RULES): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const dayEvents = events.filter(e => e.isWorkEvent && isSameDay(e.start, date));

    // Check visit count
    if (dayEvents.length > rules.maxVisitsPerDay) {
      violations.push({
        type: 'max-visits-day',
        severity: dayEvents.length > rules.maxVisitsPerDay + 2 ? 'critical' : 'warning',
        title: 'Too Many Visits',
        description: `${dayEvents.length} visits scheduled (max: ${rules.maxVisitsPerDay})`,
        metric: dayEvents.length,
        threshold: rules.maxVisitsPerDay,
        date,
        icon: 'event_busy',
        recommendation: 'Consider rescheduling some visits to another day.',
      });
    }

    // Check hours
    const totalMinutes = dayEvents.reduce((sum, e) => 
      sum + this.eventProcessor.calculateEventDurationForDay(e, date), 0
    );
    const totalHours = totalMinutes / 60;

    if (totalHours > rules.maxHoursPerDay) {
      violations.push({
        type: 'max-hours-day',
        severity: totalHours > rules.maxHoursPerDay + 2 ? 'critical' : 'warning',
        title: 'Long Day Ahead',
        description: `${totalHours.toFixed(1)} hours scheduled (max: ${rules.maxHoursPerDay})`,
        metric: totalHours,
        threshold: rules.maxHoursPerDay,
        date,
        icon: 'schedule',
        recommendation: 'Plan for extra rest before or after this busy day.',
      });
    }

    return violations;
  }

  /**
   * Check if adding a new event would cause violations
   */
  wouldViolateRules(
    existingEvents: CalendarEvent[],
    newEvent: CalendarEvent,
    rules: WorkloadRules = DEFAULT_RULES
  ): RuleViolation[] {
    const allEvents = [...existingEvents, newEvent];
    return this.checkDay(allEvents, newEvent.start, rules);
  }

  /**
   * Get burnout indicators for dashboard display
   */
  getBurnoutIndicators(events: CalendarEvent[]): {
    isHighLoad: boolean;
    level: WorkloadLevel;
    weeklyHours: number;
    dailyAverage: number;
    busiestDay: { date: Date; hours: number } | null;
    message: string;
    color: string;
  } {
    const weekSummary = this.workloadService.getThisWeekSummary();
    const thresholds = this.dataService.settings().thresholds;

    // Find busiest day this week
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    let busiestDay: { date: Date; hours: number } | null = null;
    
    days.forEach(date => {
      const dayEvents = events.filter(e => e.isWorkEvent && isSameDay(e.start, date));
      const hours = dayEvents.reduce((sum, e) => 
        sum + this.eventProcessor.calculateEventDurationForDay(e, date), 0
      ) / 60;
      
      if (!busiestDay || hours > busiestDay.hours) {
        busiestDay = { date, hours };
      }
    });

    const weeklyHours = weekSummary.totalWorkHours + weekSummary.totalTravelHours;
    const level = weekSummary.level;
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
  getThresholdStatus(
    hours: number,
    period: 'daily' | 'weekly' | 'monthly'
  ): { level: WorkloadLevel; percentage: number; remaining: number; color: string } {
    const thresholds = this.dataService.settings().thresholds;
    const config = thresholds[period];
    const level = getWorkloadLevel(hours, period, thresholds);
    
    // Calculate percentage toward high threshold
    const percentage = Math.min((hours / config.high) * 100, 100);
    const remaining = Math.max(config.high - hours, 0);

    return {
      level,
      percentage,
      remaining,
      color: WORKLOAD_COLORS[level],
    };
  }

  // ========== Private Methods ==========

  private getDefaultDateRange(): DateRange {
    const now = new Date();
    return {
      start: startOfWeek(now),
      end: endOfWeek(addDays(now, 7)), // This week + next week
    };
  }

  private checkDailyLimits(
    events: CalendarEvent[],
    range: DateRange,
    rules: WorkloadRules
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const days = eachDayOfInterval({ start: range.start, end: range.end });

    days.forEach(date => {
      const dayViolations = this.checkDay(events, date, rules);
      violations.push(...dayViolations);
    });

    return violations;
  }

  private checkWeeklyLimits(
    events: CalendarEvent[],
    range: DateRange,
    rules: WorkloadRules
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    // Check this week
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());
    const weekEvents = events.filter(e => 
      e.start >= thisWeekStart && e.start <= thisWeekEnd
    );

    const weeklyMinutes = weekEvents.reduce((sum, e) => {
      const dayEvents = events.filter(ev => isSameDay(ev.start, e.start));
      return sum + this.eventProcessor.calculateEventDurationForDay(e, e.start);
    }, 0);
    const weeklyHours = weeklyMinutes / 60;

    if (weeklyHours > rules.maxHoursPerWeek) {
      violations.push({
        type: 'max-hours-week',
        severity: weeklyHours > rules.maxHoursPerWeek + 10 ? 'critical' : 'warning',
        title: 'High Load Week',
        description: `${weeklyHours.toFixed(1)} hours this week (max: ${rules.maxHoursPerWeek})`,
        metric: weeklyHours,
        threshold: rules.maxHoursPerWeek,
        date: thisWeekStart,
        icon: 'trending_up',
        recommendation: 'Consider blocking off some time for yourself this week.',
      });
    }

    return violations;
  }

  private checkConsecutiveBusyDays(
    events: CalendarEvent[],
    range: DateRange,
    rules: WorkloadRules
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const thresholds = this.dataService.settings().thresholds;
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    
    let consecutiveBusy = 0;
    let streakStart: Date | null = null;

    days.forEach(date => {
      const dayEvents = events.filter(e => isSameDay(e.start, date));
      const hours = dayEvents.reduce((sum, e) => 
        sum + this.eventProcessor.calculateEventDurationForDay(e, date), 0
      ) / 60;

      const level = getWorkloadLevel(hours, 'daily', thresholds);
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
            date: streakStart,
            icon: 'local_fire_department',
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
        date: streakStart,
        icon: 'local_fire_department',
        recommendation: 'Schedule a lighter day or day off to recover.',
      });
    }

    return violations;
  }

  private checkWeekendWork(events: CalendarEvent[], range: DateRange): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const days = eachDayOfInterval({ start: range.start, end: range.end });

    days.forEach(date => {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) return; // Not weekend

      const dayEvents = events.filter(e => isSameDay(e.start, date));
      const hours = dayEvents.reduce((sum, e) => 
        sum + this.eventProcessor.calculateEventDurationForDay(e, date), 0
      ) / 60;

      if (hours > 4) {
        violations.push({
          type: 'weekend-overwork',
          severity: 'info',
          title: 'Weekend Work',
          description: `${hours.toFixed(1)} hours scheduled on ${format(date, 'EEEE')}`,
          metric: hours,
          threshold: 4,
          date,
          icon: 'weekend',
          recommendation: 'Balance work with rest time on weekends when possible.',
        });
      }
    });

    return violations;
  }

  private assessBurnoutRisk(
    violations: RuleViolation[],
    events: CalendarEvent[],
    range: DateRange
  ): BurnoutRisk {
    const factors: string[] = [];
    let score = 0;

    // Score based on violations
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    score += criticalCount * 20;
    score += warningCount * 10;

    if (criticalCount > 0) {
      factors.push('Multiple critical workload violations');
    }
    if (warningCount > 2) {
      factors.push('Several workload warnings');
    }

    // Score based on weekly hours
    const weekSummary = this.workloadService.getThisWeekSummary();
    const weeklyHours = weekSummary.totalWorkHours + weekSummary.totalTravelHours;
    const thresholds = this.dataService.settings().thresholds;

    if (weeklyHours > thresholds.weekly.high) {
      score += 25;
      factors.push('Weekly hours exceed high threshold');
    } else if (weeklyHours > thresholds.weekly.busy) {
      score += 15;
      factors.push('Busy weekly schedule');
    }

    // Score based on consecutive busy days
    const consecutiveViolations = violations.filter(v => v.type === 'consecutive-busy-days');
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
}
