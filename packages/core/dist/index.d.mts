export { addDays, addMonths, addWeeks, differenceInDays, differenceInHours, differenceInMinutes, eachDayOfInterval, endOfDay, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isSameWeek, isToday, isTomorrow, isYesterday, parseISO, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';

/**
 * Calendar Event Models
 * Based on Google Calendar API event structure with pet-genie extensions
 */
interface CalendarEvent {
    id: string;
    calendarId: string;
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay: boolean;
    recurringEventId?: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    isWorkEvent?: boolean;
    isOvernightEvent?: boolean;
    clientName?: string;
    serviceInfo?: ServiceInfo;
    color?: string;
}
interface ServiceInfo {
    type: ServiceType;
    duration: number;
    petName?: string;
    notes?: string;
}
type ServiceType = 'drop-in' | 'walk' | 'overnight' | 'housesit' | 'meet-greet' | 'nail-trim' | 'other';
interface GoogleCalendar {
    id: string;
    summary: string;
    description?: string;
    primary?: boolean;
    backgroundColor?: string;
    foregroundColor?: string;
    accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
    selected?: boolean;
}
interface DateRange {
    start: Date;
    end: Date;
}
interface EventFilter {
    calendarIds?: string[];
    dateRange?: DateRange;
    workEventsOnly?: boolean;
    excludeIgnored?: boolean;
}
/**
 * Raw Google Calendar API event structure
 */
interface RawGoogleCalendarEvent {
    id: string;
    summary?: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    status?: string;
    recurringEventId?: string;
    colorId?: string;
}

/**
 * Workload Models
 * For calculating and displaying workload metrics and burnout analysis
 */
interface WorkloadMetrics {
    date: Date;
    workTime: number;
    travelTime: number;
    totalTime: number;
    eventCount: number;
    level: WorkloadLevel;
}
type WorkloadLevel = 'comfortable' | 'busy' | 'high' | 'burnout';
interface WorkloadThresholds {
    daily: ThresholdConfig;
    weekly: ThresholdConfig;
    monthly: ThresholdConfig;
}
interface ThresholdConfig {
    comfortable: number;
    busy: number;
    high: number;
}
declare const DEFAULT_THRESHOLDS: WorkloadThresholds;
interface WorkloadSummary {
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
interface TrendData {
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
declare const WORKLOAD_COLORS: Record<WorkloadLevel, string>;
/**
 * Get workload level based on hours and thresholds
 */
declare function getWorkloadLevel(hours: number, period: 'daily' | 'weekly' | 'monthly', thresholds?: WorkloadThresholds): WorkloadLevel;

/**
 * Settings Models
 * User preferences and application configuration
 */

interface AppSettings {
    thresholds: WorkloadThresholds;
    includeTravelTime: boolean;
    defaultTravelBuffer: number;
    googleClientId: string;
    selectedCalendars: string[];
    firebaseConfig?: FirebaseConfig;
    defaultCalendarView: CalendarViewType;
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    timeFormat: '12h' | '24h';
    showWeekNumbers: boolean;
    businessName?: string;
    homeAddress?: string;
    cacheExpiryMinutes: number;
    autoRefreshMinutes: number;
    enableAnalytics: boolean;
    enableNotifications: boolean;
}
interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
}
type CalendarViewType = 'month' | 'week' | 'day' | 'list';
declare const DEFAULT_SETTINGS: AppSettings;
interface UserProfile {
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
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiryMs: number;
}
/**
 * Check if cache entry is still valid
 */
declare function isCacheValid<T>(entry: CacheEntry<T> | null): boolean;

/**
 * Client Model
 * Represents a pet sitting client with contact and location information
 */
interface Client {
    id: string;
    name: string;
    address: string;
    phone?: string;
    email?: string;
    emergencyContact?: EmergencyContact;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
interface EmergencyContact {
    name: string;
    phone: string;
    relationship?: string;
}
interface CreateClientDto {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    emergencyContact?: EmergencyContact;
    notes?: string;
}
interface UpdateClientDto extends Partial<CreateClientDto> {
    id: string;
}

/**
 * Pet Model
 * Represents a pet belonging to a client with care instructions
 */
interface Pet {
    id: string;
    clientId: string;
    name: string;
    species: string;
    breed?: string;
    age?: number;
    careNotes?: string;
    medications?: Medication[];
    vetInfo?: VetInfo;
    feedingInstructions?: string;
    specialNeeds?: string;
    createdAt: Date;
    updatedAt: Date;
}
interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string;
}
interface VetInfo {
    clinicName: string;
    phone: string;
    address?: string;
    emergencyPhone?: string;
}
interface CreatePetDto {
    clientId: string;
    name: string;
    species: string;
    breed?: string;
    age?: number;
    careNotes?: string;
    medications?: Medication[];
    vetInfo?: VetInfo;
    feedingInstructions?: string;
    specialNeeds?: string;
}
interface UpdatePetDto extends Partial<Omit<CreatePetDto, 'clientId'>> {
    id: string;
}

/**
 * Visit Record Model
 * Tracks the lifecycle and details of individual pet sitting visits
 * Links calendar events to actual visit completion status
 */
type VisitStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
interface VisitRecord {
    id: string;
    eventId: string;
    calendarId: string;
    clientId?: string;
    petIds?: string[];
    status: VisitStatus;
    notes?: string;
    checkInAt?: Date;
    checkOutAt?: Date;
    lastSummarySentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
interface CreateVisitRecordDto {
    eventId: string;
    calendarId: string;
    clientId?: string;
    petIds?: string[];
    status?: VisitStatus;
    notes?: string;
}
interface UpdateVisitRecordDto {
    id: string;
    status?: VisitStatus;
    notes?: string;
    checkInAt?: Date;
    checkOutAt?: Date;
    lastSummarySentAt?: Date;
    clientId?: string;
    petIds?: string[];
}
interface VisitCheckInDto {
    id: string;
    checkInAt: Date;
}
interface VisitCheckOutDto {
    id: string;
    checkOutAt: Date;
    notes?: string;
}

/**
 * Template Models
 * For appointment templates used to quickly create calendar events
 */
interface Template {
    id: string;
    userId: string;
    name: string;
    icon: string;
    type: TemplateType;
    duration: number;
    includeTravel: boolean;
    travelBuffer: number;
    defaultNotes?: string;
    color?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
type TemplateType = 'overnight' | 'housesit' | 'drop-in' | 'walk' | 'meet-greet' | 'nail-trim' | 'other';
interface CreateTemplateDto {
    name: string;
    icon?: string;
    type: TemplateType;
    duration: number;
    includeTravel?: boolean;
    travelBuffer?: number;
    defaultNotes?: string;
    color?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
}
interface UpdateTemplateDto {
    name?: string;
    icon?: string;
    type?: TemplateType;
    duration?: number;
    includeTravel?: boolean;
    travelBuffer?: number;
    defaultNotes?: string;
    color?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
}
/**
 * Default templates for new users
 */
declare const DEFAULT_TEMPLATES: Omit<Template, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[];

/**
 * Analytics Models
 * For workload analysis, insights, and recommendations
 */

interface AnalyticsOverview {
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
type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';
interface ClientStats {
    clientName: string;
    eventCount: number;
    totalHours: number;
    percentage: number;
    lastVisit: Date;
}
interface ServiceStats {
    serviceType: string;
    eventCount: number;
    totalHours: number;
    percentage: number;
    averageDuration: number;
}
interface DayStats {
    dayOfWeek: number;
    dayName: string;
    eventCount: number;
    averageHours: number;
    percentage: number;
}
interface TimeStats {
    hour: number;
    label: string;
    eventCount: number;
    percentage: number;
}
interface DurationStats {
    range: string;
    eventCount: number;
    percentage: number;
}
interface Insight {
    id: string;
    type: InsightType;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    metric?: number;
    recommendation?: string;
    icon: string;
}
type InsightType = 'burnout-risk' | 'workload-trend' | 'client-concentration' | 'scheduling-gap' | 'peak-time' | 'efficiency' | 'recommendation';
interface Recommendation {
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
interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}
interface TimeSeriesDataPoint {
    date: Date;
    value: number;
    label?: string;
}

/**
 * Calendar View Models
 * For rendering calendar grids and managing view state
 */

type CalendarViewMode = 'month' | 'week' | 'day' | 'list';
interface CalendarDay {
    date: Date;
    dayOfMonth: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    isPast: boolean;
    events: CalendarEvent[];
    workloadLevel: WorkloadLevel;
    totalWorkMinutes: number;
}
interface CalendarWeek {
    weekNumber: number;
    days: CalendarDay[];
    startDate: Date;
    endDate: Date;
}
interface CalendarMonth {
    year: number;
    month: number;
    name: string;
    weeks: CalendarWeek[];
}
interface CalendarViewState {
    viewType: 'month' | 'week' | 'day' | 'list';
    currentDate: Date;
    selectedDate: Date | null;
    visibleRange: {
        start: Date;
        end: Date;
    };
}
interface TimeSlot {
    hour: number;
    minute: number;
    label: string;
    events: CalendarEvent[];
}
interface DaySchedule {
    date: Date;
    timeSlots: TimeSlot[];
    allDayEvents: CalendarEvent[];
}
/**
 * Multi-day event rendering info
 */
interface MultiDayEventSpan {
    event: CalendarEvent;
    startColumn: number;
    columnSpan: number;
    isStart: boolean;
    isEnd: boolean;
    row: number;
}

type GroupField = 'date' | 'client' | 'service' | 'week' | 'month';
type SortField = 'date' | 'client' | 'service' | 'time';
type SortDirection = 'asc' | 'desc';
interface GroupLevel {
    field: GroupField;
    order: number;
}
interface SortLevel {
    field: SortField;
    direction: SortDirection;
}
interface ExportOptions {
    startDate: Date;
    endDate: Date;
    includeTime: boolean;
    includeLocation: boolean;
    groupLevels: GroupLevel[];
    sortLevels: SortLevel[];
    workEventsOnly: boolean;
    searchTerm?: string;
}
interface ExportResult {
    content: string;
    csv: string;
    count: number;
    rows: ExportRow[];
    groups: ExportGroup[];
}
interface ExportRow {
    id: string;
    date: string;
    dateLabel: string;
    timeLabel: string;
    client: string;
    service: string;
    durationMinutes: number;
    location?: string;
    isWorkEvent: boolean;
    groupPath: string[];
}
interface ExportGroup {
    key: string;
    label: string;
    depth: number;
    count: number;
    totalDurationMinutes: number;
}
interface ExportTemplate {
    id: string;
    name: string;
    includeDateRange: boolean;
    options: ExportOptions;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt?: Date;
    isDefault?: boolean;
}

type BookingType = 'daily-visits' | 'overnight-stay';
interface VisitSlot {
    templateId: string;
    time: string;
    duration: number;
}
interface OvernightConfig {
    templateId: string;
    arrivalTime: string;
    departureTime: string;
}
interface DropinConfig {
    templateId: string;
    time: string;
    duration: number;
}
interface MultiEventConfig {
    clientName: string;
    location: string;
    startDate: Date;
    endDate: Date;
    bookingType: BookingType;
    visits: VisitSlot[];
    weekendVisits?: VisitSlot[];
    overnightConfig?: OvernightConfig;
    dropinConfig?: DropinConfig;
}
interface GeneratedEvent {
    title: string;
    start: Date;
    end: Date;
    templateId?: string;
}

/**
 * Event Processor Service
 * Classifies events as work vs personal, extracts client/service info
 * Pure functions - no framework dependencies
 */

/**
 * Check if event is definitely personal (not work)
 */
declare function isDefinitelyPersonal(title: string): boolean;
/**
 * Determine if an event is a work event
 */
declare function isWorkEvent(eventOrTitle: CalendarEvent | string): boolean;
/**
 * Determine if event is an overnight/housesit event
 */
declare function isOvernightEvent(event: CalendarEvent): boolean;
/**
 * Calculate number of nights for an overnight event (min 1 when crossing midnight)
 */
declare function calculateOvernightNights(event: CalendarEvent): number;
/**
 * Calculate event duration for a specific day (handles multi-day events)
 * Overnight events are capped at 12 hours per day
 */
declare function calculateEventDurationForDay(event: CalendarEvent, date: Date): number;
/**
 * Extract client/pet name from event title
 */
declare function extractClientName(title: string): string;
/**
 * Extract service information from event title
 */
declare function extractServiceInfo(title: string): ServiceInfo;
/**
 * Process a raw event and add pet-genie metadata
 */
declare function processEvent(event: CalendarEvent): CalendarEvent;
/**
 * Process multiple events
 */
declare function processEvents(events: CalendarEvent[]): CalendarEvent[];
/**
 * Get service type display label
 */
declare function getServiceTypeLabel(type: ServiceType): string;
/**
 * Convert raw Google Calendar event to CalendarEvent
 */
declare function parseRawGoogleEvent(raw: RawGoogleCalendarEvent, calendarId: string): CalendarEvent;

/**
 * Workload Calculator Service
 * Calculates workload metrics, levels, and burnout analysis
 * Pure functions - no framework dependencies
 */

/**
 * Check if an event overlaps with a specific day
 */
declare function eventOverlapsDay(event: CalendarEvent, date: Date): boolean;
/**
 * Calculate estimated travel time for work events
 * Uses 15-minute estimate per travel leg (to and from each unique location)
 */
declare function calculateEstimatedTravelTime(workEvents: CalendarEvent[], travelTimePerLeg?: number): number;
/**
 * Get events for a specific date from a list of events
 */
declare function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[];
/**
 * Calculate workload metrics for a specific date
 */
declare function calculateDailyMetrics(date: Date, events: CalendarEvent[], options?: {
    includeTravelTime?: boolean;
    thresholds?: WorkloadThresholds;
    travelBuffer?: number;
}): WorkloadMetrics;
/**
 * Calculate workload metrics for a date range
 */
declare function calculateRangeMetrics(startDate: Date, endDate: Date, events: CalendarEvent[], options?: {
    includeTravelTime?: boolean;
    thresholds?: WorkloadThresholds;
    travelBuffer?: number;
}): WorkloadMetrics[];
/**
 * Get period date range
 */
declare function getPeriodRange(period: 'daily' | 'weekly' | 'monthly', referenceDate?: Date, weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6): {
    startDate: Date;
    endDate: Date;
};
/**
 * Get workload summary for a period
 */
declare function getWorkloadSummary(period: 'daily' | 'weekly' | 'monthly', events: CalendarEvent[], options?: {
    referenceDate?: Date;
    includeTravelTime?: boolean;
    thresholds?: WorkloadThresholds;
    travelBuffer?: number;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}): WorkloadSummary;
/**
 * Get workload level color
 */
declare function getWorkloadColor(level: WorkloadLevel): string;
/**
 * Get workload level label
 */
declare function getWorkloadLabel(level: WorkloadLevel): string;
/**
 * Format hours for display
 */
declare function formatHours(hours: number): string;

/**
 * Client Matching Utilities
 * Handles automatic and assisted client association for visit records
 */

/**
 * Normalize a name for case-insensitive comparison
 */
declare function normalizeName(name: string): string;
/**
 * Find all clients that match a candidate name
 * Returns exact matches (case-insensitive)
 */
declare function findClientMatches(clients: Client[], candidate: string): Client[];
/**
 * Extract a client name candidate from a calendar event
 * Priority:
 * 1. event.clientName (if set by event processor)
 * 2. Parse from event.title (format: "ClientName - ServiceType" or just "ClientName")
 */
declare function getClientCandidateFromEvent(event: CalendarEvent): string | null;
/**
 * Determine if we have exactly one confident match
 * Returns the client ID if confident, null otherwise
 */
declare function getConfidentClientMatch(clients: Client[], event: CalendarEvent): string | null;
/**
 * Find clients whose names partially match a search term
 */
declare function searchClients(clients: Client[], searchTerm: string): Client[];

/**
 * Date and Time Utilities
 * Common date formatting and manipulation functions
 */

/**
 * Format a date for display with relative labels
 */
declare function formatDateRelative(date: Date): string;
/**
 * Format a date with full weekday and date
 */
declare function formatDateFull(date: Date): string;
/**
 * Format a date short (e.g., "Jan 15")
 */
declare function formatDateShort(date: Date): string;
/**
 * Format a time (12h or 24h based on preference)
 */
declare function formatTime(date: Date, use24Hour?: boolean): string;
/**
 * Format a time range
 */
declare function formatTimeRange(start: Date, end: Date, use24Hour?: boolean): string;
/**
 * Format duration in a human-readable way
 */
declare function formatDuration(minutes: number): string;
/**
 * Format hours in a human-readable way
 */
declare function formatHoursDisplay(hours: number): string;
/**
 * Get relative time string (e.g., "2 hours ago", "in 30 minutes")
 */
declare function getRelativeTimeString(date: Date): string;
/**
 * Get date range for a period
 */
declare function getDateRange(period: 'day' | 'week' | 'month', referenceDate?: Date, weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6): {
    start: Date;
    end: Date;
};
/**
 * Navigate date forward/backward by period
 */
declare function navigateDate(date: Date, period: 'day' | 'week' | 'month', direction: 'forward' | 'backward'): Date;
/**
 * Check if two dates are in the same period
 */
declare function isSamePeriod(date1: Date, date2: Date, period: 'day' | 'week' | 'month', weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6): boolean;
/**
 * Parse an ISO date string safely
 */
declare function parseDate(dateString: string): Date | null;

export { type AnalyticsOverview, type AnalyticsPeriod, type AppSettings, type BookingType, type CacheEntry, type CalendarDay, type CalendarEvent, type CalendarMonth, type CalendarViewMode, type CalendarViewState, type CalendarViewType, type CalendarWeek, type ChartDataPoint, type Client, type ClientStats, type CreateClientDto, type CreatePetDto, type CreateTemplateDto, type CreateVisitRecordDto, DEFAULT_SETTINGS, DEFAULT_TEMPLATES, DEFAULT_THRESHOLDS, type DateRange, type DaySchedule, type DayStats, type DropinConfig, type DurationStats, type EmergencyContact, type EventFilter, type ExportGroup, type ExportOptions, type ExportResult, type ExportRow, type ExportTemplate, type FirebaseConfig, type GeneratedEvent, type GoogleCalendar, type GroupField, type GroupLevel, type Insight, type InsightType, type Medication, type MultiDayEventSpan, type MultiEventConfig, type OvernightConfig, type Pet, type RawGoogleCalendarEvent, type Recommendation, type ServiceInfo, type ServiceStats, type ServiceType, type SortDirection, type SortField, type SortLevel, type Template, type TemplateType, type ThresholdConfig, type TimeSeriesDataPoint, type TimeSlot, type TimeStats, type TrendData, type UpdateClientDto, type UpdatePetDto, type UpdateTemplateDto, type UpdateVisitRecordDto, type UserProfile, type VetInfo, type VisitCheckInDto, type VisitCheckOutDto, type VisitRecord, type VisitSlot, type VisitStatus, WORKLOAD_COLORS, type WorkloadLevel, type WorkloadMetrics, type WorkloadSummary, type WorkloadThresholds, calculateDailyMetrics, calculateEstimatedTravelTime, calculateEventDurationForDay, calculateOvernightNights, calculateRangeMetrics, eventOverlapsDay, extractClientName, extractServiceInfo, findClientMatches, formatDateFull, formatDateRelative, formatDateShort, formatDuration, formatHours, formatHoursDisplay, formatTime, formatTimeRange, getClientCandidateFromEvent, getConfidentClientMatch, getDateRange, getEventsForDate, getPeriodRange, getRelativeTimeString, getServiceTypeLabel, getWorkloadColor, getWorkloadLabel, getWorkloadLevel, getWorkloadSummary, isCacheValid, isDefinitelyPersonal, isOvernightEvent, isSamePeriod, isWorkEvent, navigateDate, normalizeName, parseDate, parseRawGoogleEvent, processEvent, processEvents, searchClients };
