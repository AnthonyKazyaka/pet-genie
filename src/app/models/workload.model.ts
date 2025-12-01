/**
 * Workload Models
 * For calculating and displaying workload metrics and burnout analysis
 */

export interface WorkloadMetrics {
  date: Date;
  workTime: number; // minutes of actual work
  travelTime: number; // estimated travel minutes
  totalTime: number; // workTime + travelTime
  eventCount: number;
  level: WorkloadLevel;
}

export type WorkloadLevel = 'comfortable' | 'busy' | 'high' | 'burnout';

export interface WorkloadThresholds {
  daily: ThresholdConfig;
  weekly: ThresholdConfig;
  monthly: ThresholdConfig;
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
  monthly: {
    comfortable: 100,
    busy: 140,
    high: 180,
  },
};

export interface WorkloadSummary {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalWorkHours: number;
  totalTravelHours: number;
  averageDailyHours: number;
  busiestDay: {
    date: Date;
    hours: number;
  };
  level: WorkloadLevel;
  eventCount: number;
}

export interface TrendData {
  dates: Date[];
  workHours: number[];
  travelHours: number[];
  levels: WorkloadLevel[];
  averageHours: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Workload level colors for consistent UI
 */
export const WORKLOAD_COLORS: Record<WorkloadLevel, string> = {
  comfortable: '#10B981', // Green
  busy: '#F59E0B', // Amber
  high: '#F97316', // Orange
  burnout: '#EF4444', // Red
};

/**
 * Get workload level based on hours and thresholds
 */
export function getWorkloadLevel(
  hours: number,
  period: 'daily' | 'weekly' | 'monthly',
  thresholds: WorkloadThresholds = DEFAULT_THRESHOLDS
): WorkloadLevel {
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
