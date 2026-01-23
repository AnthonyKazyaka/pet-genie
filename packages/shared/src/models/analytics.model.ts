/**
 * Analytics Model
 * Aggregated statistics for visits, hours, and workload
 * 
 * Shared between web and mobile applications
 */

export interface DailyStats {
  date: string; // ISO date string (date only)
  visitCount: number;
  scheduledHours: number;
  actualHours: number; // from checkIn/checkOut times
  completedCount: number;
  inProgressCount: number;
  cancelledCount: number;
}

export interface WeeklyStats {
  weekStart: string; // ISO date string
  weekEnd: string;
  totalVisits: number;
  totalScheduledHours: number;
  totalActualHours: number;
  dailyStats: DailyStats[];
  averageVisitsPerDay: number;
  busiestDay: string;
  quietestDay: string;
}

export interface ServiceBreakdown {
  serviceType: string;
  count: number;
  totalMinutes: number;
  percentage: number;
}

export interface ClientBreakdown {
  clientId?: string;
  clientName: string;
  visitCount: number;
  totalMinutes: number;
  percentage: number;
}

export interface AnalyticsSummary {
  // Time range
  startDate: string;
  endDate: string;
  
  // Overall stats
  totalVisits: number;
  totalScheduledHours: number;
  totalActualHours: number;
  
  // Status breakdown
  completedVisits: number;
  inProgressVisits: number;
  scheduledVisits: number;
  cancelledVisits: number;
  
  // Averages
  averageVisitsPerDay: number;
  averageHoursPerDay: number;
  averageVisitDuration: number; // in minutes
  
  // Breakdowns
  serviceBreakdown: ServiceBreakdown[];
  clientBreakdown: ClientBreakdown[];
  
  // Workload indicators
  peakDay: { date: string; visits: number; hours: number };
  currentWeekHours: number;
  currentWeekVisits: number;
}

export interface WorkloadWarning {
  type: 'daily-visits' | 'daily-hours' | 'weekly-hours';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  current: number;
  limit: number;
  percentage: number;
}
