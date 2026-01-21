import { useState, useCallback, useMemo } from 'react';
import { CalendarEvent } from '../models/event.model';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';
import {
  RulesEngineService,
  RuleViolation,
  BurnoutRisk,
  BurnoutIndicators,
  WorkloadRules,
  DEFAULT_RULES,
} from '../services/rules-engine.service';

/**
 * Hook for using the Rules Engine Service
 * Provides burnout protection and workload limit enforcement
 */
export function useRulesEngine(settings: AppSettings = DEFAULT_SETTINGS) {
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [burnoutRisk, setBurnoutRisk] = useState<BurnoutRisk>({
    level: 'low',
    score: 0,
    factors: [],
    violations: [],
  });

  /**
   * Get rules from current settings
   */
  const rules = useMemo(
    () => RulesEngineService.getRulesFromSettings(settings),
    [settings]
  );

  /**
   * Evaluate all rules against a set of events
   */
  const evaluateRules = useCallback(
    (events: CalendarEvent[], dateRange?: { start: Date; end: Date }) => {
      const newViolations = RulesEngineService.evaluateRules(events, settings, dateRange);
      setViolations(newViolations);

      const risk = RulesEngineService.assessBurnoutRisk(newViolations, events, settings);
      setBurnoutRisk(risk);

      return newViolations;
    },
    [settings]
  );

  /**
   * Quick check for a specific day
   */
  const checkDay = useCallback(
    (events: CalendarEvent[], date: Date) => {
      return RulesEngineService.checkDay(events, date, rules);
    },
    [rules]
  );

  /**
   * Check if adding a new event would cause violations
   */
  const wouldViolateRules = useCallback(
    (existingEvents: CalendarEvent[], newEvent: CalendarEvent) => {
      return RulesEngineService.wouldViolateRules(existingEvents, newEvent, rules);
    },
    [rules]
  );

  /**
   * Get burnout indicators for dashboard
   */
  const getBurnoutIndicators = useCallback(
    (events: CalendarEvent[]): BurnoutIndicators => {
      return RulesEngineService.getBurnoutIndicators(events, settings);
    },
    [settings]
  );

  /**
   * Get threshold status for a period
   */
  const getThresholdStatus = useCallback(
    (hours: number, period: 'daily' | 'weekly') => {
      return RulesEngineService.getThresholdStatus(hours, period, settings);
    },
    [settings]
  );

  /**
   * Computed: Has any warnings
   */
  const hasWarnings = useMemo(
    () => violations.some((v) => v.severity === 'warning' || v.severity === 'critical'),
    [violations]
  );

  /**
   * Computed: Has critical violations
   */
  const hasCritical = useMemo(
    () => violations.some((v) => v.severity === 'critical'),
    [violations]
  );

  /**
   * Computed: Warning count
   */
  const warningCount = useMemo(
    () => violations.filter((v) => v.severity === 'warning').length,
    [violations]
  );

  /**
   * Computed: Critical count
   */
  const criticalCount = useMemo(
    () => violations.filter((v) => v.severity === 'critical').length,
    [violations]
  );

  return {
    // State
    violations,
    burnoutRisk,
    rules,

    // Computed
    hasWarnings,
    hasCritical,
    warningCount,
    criticalCount,

    // Methods
    evaluateRules,
    checkDay,
    wouldViolateRules,
    getBurnoutIndicators,
    getThresholdStatus,
  };
}
