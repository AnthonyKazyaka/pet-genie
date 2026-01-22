/**
 * App Settings Model
 * User preferences and configurable thresholds
 */

export interface AppSettings {
  // Work limits (burnout protection)
  maxVisitsPerDay: number;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  
  // Warning thresholds (show warnings when approaching limits)
  warningThresholdPercent: number; // e.g., 80 = warn at 80% of limit
  
  // Default work hours
  workStartHour: number; // 0-23
  workEndHour: number; // 0-23
  
  // Display preferences
  defaultViewDays: number; // days to show in calendar view
  showCompletedVisits: boolean;
  
  // Summary preferences
  includeTimestampsInSummary: boolean;
  includeDurationInSummary: boolean;
  includePetDetailsInSummary: boolean;
  
  // Notification preferences (for future use)
  enableReminders: boolean;
  reminderMinutesBefore: number;
  
  // Demo mode (uses mock data throughout the app)
  demoMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // Work limits
  maxVisitsPerDay: 8,
  maxHoursPerDay: 10,
  maxHoursPerWeek: 45,
  
  // Warning threshold
  warningThresholdPercent: 80,
  
  // Default work hours (8am to 8pm)
  workStartHour: 8,
  workEndHour: 20,
  
  // Display
  defaultViewDays: 7,
  showCompletedVisits: true,
  
  // Summary
  includeTimestampsInSummary: true,
  includeDurationInSummary: true,
  includePetDetailsInSummary: true,
  
  // Notifications
  enableReminders: false,
  reminderMinutesBefore: 30,
  
  // Demo mode
  demoMode: false,
};

export type SettingsUpdateDto = Partial<AppSettings>;
