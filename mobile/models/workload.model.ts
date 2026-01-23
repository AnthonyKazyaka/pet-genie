/**
 * Workload Models
 * For calculating and displaying workload metrics and burnout analysis
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
 * Workload level colors for consistent UI
 * Using semi-transparent versions for backgrounds
 */
export const WORKLOAD_COLORS: Record<WorkloadLevel, {
  solid: string;
  background: string;
  text: string;
  label: string;
}> = {
  none: {
    solid: '#E5E7EB',
    background: 'transparent',
    text: '#6B7280',
    label: 'Free',
  },
  comfortable: {
    solid: '#10B981',
    background: 'rgba(16, 185, 129, 0.15)',
    text: '#059669',
    label: 'Light',
  },
  busy: {
    solid: '#F59E0B',
    background: 'rgba(245, 158, 11, 0.15)',
    text: '#D97706',
    label: 'Moderate',
  },
  high: {
    solid: '#F97316',
    background: 'rgba(249, 115, 22, 0.18)',
    text: '#EA580C',
    label: 'Heavy',
  },
  burnout: {
    solid: '#EF4444',
    background: 'rgba(239, 68, 68, 0.20)',
    text: '#DC2626',
    label: 'Overloaded',
  },
};

/**
 * Dark mode workload colors
 */
export const WORKLOAD_COLORS_DARK: Record<WorkloadLevel, {
  solid: string;
  background: string;
  text: string;
  label: string;
}> = {
  none: {
    solid: '#4B5563',
    background: 'transparent',
    text: '#9CA3AF',
    label: 'Free',
  },
  comfortable: {
    solid: '#34D399',
    background: 'rgba(52, 211, 153, 0.20)',
    text: '#6EE7B7',
    label: 'Light',
  },
  busy: {
    solid: '#FBBF24',
    background: 'rgba(251, 191, 36, 0.20)',
    text: '#FCD34D',
    label: 'Moderate',
  },
  high: {
    solid: '#FB923C',
    background: 'rgba(251, 146, 60, 0.22)',
    text: '#FDBA74',
    label: 'Heavy',
  },
  burnout: {
    solid: '#F87171',
    background: 'rgba(248, 113, 113, 0.25)',
    text: '#FCA5A5',
    label: 'Overloaded',
  },
};

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

/**
 * Filter to only include work events
 */
export function filterWorkEvents<T extends { isWorkEvent?: boolean }>(events: T[]): T[] {
  return events.filter(e => e.isWorkEvent !== false);
}

/**
 * Warning types for workload alerts
 */
export interface WorkloadWarning {
  type: 'daily-visits' | 'daily-hours' | 'weekly-hours';
  severity: 'warning' | 'critical';
  message: string;
  current: number;
  limit: number;
  percentage: number;
}
