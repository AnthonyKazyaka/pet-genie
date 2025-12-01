/**
 * Settings Models
 * User preferences and application configuration
 */

import { WorkloadThresholds, DEFAULT_THRESHOLDS } from './workload.model';

export interface AppSettings {
  // Workload configuration
  thresholds: WorkloadThresholds;
  includeTravelTime: boolean;
  defaultTravelBuffer: number; // minutes

  // Google Calendar configuration
  googleClientId: string;
  selectedCalendars: string[];

  // Display preferences
  defaultCalendarView: CalendarViewType;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  timeFormat: '12h' | '24h';
  showWeekNumbers: boolean;

  // Business settings
  businessName?: string;
  homeAddress?: string;

  // Cache settings
  cacheExpiryMinutes: number;
  autoRefreshMinutes: number;

  // Feature flags
  enableAnalytics: boolean;
  enableNotifications: boolean;
}

export type CalendarViewType = 'month' | 'week' | 'day' | 'list';

export const DEFAULT_SETTINGS: AppSettings = {
  thresholds: DEFAULT_THRESHOLDS,
  includeTravelTime: true,
  defaultTravelBuffer: 15,

  googleClientId: '',
  selectedCalendars: [],

  defaultCalendarView: 'month',
  weekStartsOn: 0,
  timeFormat: '12h',
  showWeekNumbers: false,

  cacheExpiryMinutes: 15,
  autoRefreshMinutes: 15,

  enableAnalytics: true,
  enableNotifications: true,
};

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Cache entry with expiry tracking
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiryMs: number;
}

/**
 * Check if cache entry is still valid
 */
export function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.expiryMs;
}
