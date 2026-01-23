/**
 * Workload Models
 * For calculating and displaying workload metrics and burnout analysis
 * 
 * Shared between web and mobile applications
 */

export type WorkloadLevel = 'none' | 'comfortable' | 'busy' | 'high' | 'burnout';

export interface WorkloadThresholds {
  daily: ThresholdConfig;
  weekly: ThresholdConfig;
}

export interface ThresholdConfig {
  comfortable: number; // hours
  busy: number; // hours
  high: number; // hours
  // Above high = burnout
}

export const DEFAULT_THRESHOLDS: WorkloadThresholds = {
  daily: {
    comfortable: 4,
    busy: 6,
    high: 8,
  },
  weekly: {
    comfortable: 25,
    busy: 35,
    high: 45,
  },
};

/**
 * Warning types for workload alerts
 */
export interface WorkloadWarningDetail {
  type: 'daily-visits' | 'daily-hours' | 'weekly-hours';
  severity: 'warning' | 'critical';
  message: string;
  current: number;
  limit: number;
  percentage: number;
}
