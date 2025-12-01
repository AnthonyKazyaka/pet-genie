import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import {
  CalendarEvent,
  GoogleCalendar,
  AppSettings,
  DEFAULT_SETTINGS,
} from '../../models';

/**
 * DataService
 * Centralized state management with Signals
 * Handles caching, persistence, and data flow
 */
@Injectable({
  providedIn: 'root',
})
export class DataService {
  // Storage keys
  private readonly EVENTS_CACHE_KEY = 'events_cache';
  private readonly SETTINGS_KEY = 'settings';
  private readonly CALENDARS_KEY = 'calendars';
  private readonly IGNORED_EVENTS_KEY = 'ignored_events';
  private readonly CACHE_EXPIRY_MINUTES = 15;

  // Core state signals
  private readonly eventsSignal = signal<CalendarEvent[]>([]);
  private readonly calendarsSignal = signal<GoogleCalendar[]>([]);
  private readonly settingsSignal = signal<AppSettings>(DEFAULT_SETTINGS);
  private readonly ignoredEventIdsSignal = signal<Set<string>>(new Set());
  private readonly isLoadingSignal = signal(false);
  private readonly lastRefreshSignal = signal<Date | null>(null);

  // Public readonly accessors
  readonly events = this.eventsSignal.asReadonly();
  readonly calendars = this.calendarsSignal.asReadonly();
  readonly settings = this.settingsSignal.asReadonly();
  readonly ignoredEventIds = this.ignoredEventIdsSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly lastRefresh = this.lastRefreshSignal.asReadonly();

  // Computed values
  readonly selectedCalendars = computed(() =>
    this.calendarsSignal().filter((c) => c.selected)
  );

  readonly workEvents = computed(() =>
    this.eventsSignal().filter((e) => e.isWorkEvent && !this.ignoredEventIdsSignal().has(e.id))
  );

  readonly visibleEvents = computed(() =>
    this.eventsSignal().filter((e) => !this.ignoredEventIdsSignal().has(e.id))
  );

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  /**
   * Load persisted data from localStorage
   */
  private loadFromStorage(): void {
    // Load settings
    const settings = this.storage.get<AppSettings>(this.SETTINGS_KEY);
    if (settings) {
      this.settingsSignal.set({ ...DEFAULT_SETTINGS, ...settings });
    }

    // Load calendars
    const calendars = this.storage.get<GoogleCalendar[]>(this.CALENDARS_KEY);
    if (calendars) {
      this.calendarsSignal.set(calendars);
    }

    // Load ignored events
    const ignoredIds = this.storage.get<string[]>(this.IGNORED_EVENTS_KEY);
    if (ignoredIds) {
      this.ignoredEventIdsSignal.set(new Set(ignoredIds));
    }

    // Load cached events if valid
    const cachedEvents = this.storage.getCached<CalendarEvent[]>(this.EVENTS_CACHE_KEY);
    if (cachedEvents) {
      // Restore Date objects
      const events = cachedEvents.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      }));
      this.eventsSignal.set(events);
      this.lastRefreshSignal.set(this.storage.getCacheTimestamp(this.EVENTS_CACHE_KEY));
    }
  }

  // ==================== Events ====================

  /**
   * Set events and cache them
   */
  setEvents(events: CalendarEvent[]): void {
    this.eventsSignal.set(events);
    this.storage.setCached(this.EVENTS_CACHE_KEY, events, this.CACHE_EXPIRY_MINUTES);
    this.lastRefreshSignal.set(new Date());
  }

  /**
   * Clear events cache
   */
  clearEventsCache(): void {
    this.storage.remove(this.EVENTS_CACHE_KEY);
    this.eventsSignal.set([]);
    this.lastRefreshSignal.set(null);
  }

  /**
   * Check if events cache is valid
   */
  isEventsCacheValid(): boolean {
    return this.storage.isCacheValid(this.EVENTS_CACHE_KEY);
  }

  /**
   * Get events for a specific date range
   */
  getEventsInRange(start: Date, end: Date): CalendarEvent[] {
    return this.eventsSignal().filter((event) => {
      return event.start >= start && event.start <= end;
    });
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(date: Date): CalendarEvent[] {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.getEventsInRange(start, end);
  }

  // ==================== Calendars ====================

  /**
   * Set available calendars
   */
  setCalendars(calendars: GoogleCalendar[]): void {
    this.calendarsSignal.set(calendars);
    this.storage.set(this.CALENDARS_KEY, calendars);
  }

  /**
   * Toggle calendar selection
   */
  toggleCalendarSelection(calendarId: string): void {
    const calendars = this.calendarsSignal().map((c) =>
      c.id === calendarId ? { ...c, selected: !c.selected } : c
    );
    this.setCalendars(calendars);
  }

  /**
   * Set selected calendar IDs
   */
  setSelectedCalendarIds(ids: string[]): void {
    const calendars = this.calendarsSignal().map((c) => ({
      ...c,
      selected: ids.includes(c.id),
    }));
    this.setCalendars(calendars);
  }

  // ==================== Settings ====================

  /**
   * Update settings
   */
  updateSettings(updates: Partial<AppSettings>): void {
    const newSettings = { ...this.settingsSignal(), ...updates };
    this.settingsSignal.set(newSettings);
    this.storage.set(this.SETTINGS_KEY, newSettings);
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): void {
    this.settingsSignal.set(DEFAULT_SETTINGS);
    this.storage.set(this.SETTINGS_KEY, DEFAULT_SETTINGS);
  }

  // ==================== Ignored Events ====================

  /**
   * Ignore an event (exclude from calculations)
   */
  ignoreEvent(eventId: string): void {
    const ignored = new Set(this.ignoredEventIdsSignal());
    ignored.add(eventId);
    this.ignoredEventIdsSignal.set(ignored);
    this.storage.set(this.IGNORED_EVENTS_KEY, Array.from(ignored));
  }

  /**
   * Unignore an event
   */
  unignoreEvent(eventId: string): void {
    const ignored = new Set(this.ignoredEventIdsSignal());
    ignored.delete(eventId);
    this.ignoredEventIdsSignal.set(ignored);
    this.storage.set(this.IGNORED_EVENTS_KEY, Array.from(ignored));
  }

  /**
   * Check if event is ignored
   */
  isEventIgnored(eventId: string): boolean {
    return this.ignoredEventIdsSignal().has(eventId);
  }

  // ==================== Loading State ====================

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.isLoadingSignal.set(loading);
  }
}
