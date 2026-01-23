/**
 * Mobile Models Index
 * 
 * Re-exports shared models from @pet-genie/shared package
 * and adds any mobile-specific models or extensions
 */

// Re-export all shared models
export * from '@pet-genie/shared/models';

// Re-export shared utilities (commonly used with models)
export {
  // Calculation utilities
  calculateMonthlyMetrics,
  calculateDateRangeMetrics,
  calculateWeeklyHours,
  calculateDayWorkHours,
  calculateEventHoursInRange,
  filterWorkEvents,
  filterEventsInMonth,
  filterEventsOverlappingMonth,
  getUniqueClients,
  eventOverlapsRange,
  getWorkloadLevel,
  getWorkloadSummary,
  // Metrics types
  type MonthlyMetrics,
  type DateRangeMetrics,
} from '@pet-genie/shared/utils';

// Re-export shared constants
export {
  WORKLOAD_COLORS,
  WORKLOAD_COLORS_DARK,
  getWorkloadColors,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_ICONS,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_DURATIONS,
  ALL_SERVICE_TYPES,
  getServiceTypeLabel,
  getServiceTypeIcon,
  getServiceTypeColor,
} from '@pet-genie/shared/constants';
