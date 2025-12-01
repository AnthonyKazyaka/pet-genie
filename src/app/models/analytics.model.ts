/**
 * Analytics Models
 * For workload analysis, insights, and recommendations
 */

import { WorkloadLevel } from './workload.model';

export interface AnalyticsOverview {
  period: AnalyticsPeriod;
  totalWorkHours: number;
  totalEvents: number;
  averageDailyHours: number;
  averageEventDuration: number;
  workloadLevel: WorkloadLevel;
  comparisonToPrevious: {
    hoursChange: number;
    eventsChange: number;
    percentChange: number;
  };
}

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface ClientStats {
  clientName: string;
  eventCount: number;
  totalHours: number;
  percentage: number;
  lastVisit: Date;
}

export interface ServiceStats {
  serviceType: string;
  eventCount: number;
  totalHours: number;
  percentage: number;
  averageDuration: number;
}

export interface DayStats {
  dayOfWeek: number; // 0 = Sunday
  dayName: string;
  eventCount: number;
  averageHours: number;
  percentage: number;
}

export interface TimeStats {
  hour: number;
  label: string;
  eventCount: number;
  percentage: number;
}

export interface DurationStats {
  range: string; // e.g., "0-30 min", "30-60 min"
  eventCount: number;
  percentage: number;
}

export interface Insight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric?: number;
  recommendation?: string;
  icon: string;
}

export type InsightType =
  | 'burnout-risk'
  | 'workload-trend'
  | 'client-concentration'
  | 'scheduling-gap'
  | 'peak-time'
  | 'efficiency'
  | 'recommendation';

export interface Recommendation {
  id: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: string;
  icon: string;
}

/**
 * Chart data structures
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: Date;
  value: number;
  label?: string;
}
