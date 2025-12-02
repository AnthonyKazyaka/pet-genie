import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { StorageService } from './storage.service';
import { CalendarEvent, DEFAULT_SETTINGS, GoogleCalendar } from '../../models';

describe('DataService', () => {
  let service: DataService;
  let storageServiceSpy: jasmine.SpyObj<StorageService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('StorageService', [
      'get',
      'set',
      'remove',
      'getCached',
      'setCached',
      'isCacheValid',
      'getCacheTimestamp',
    ]);

    // Default returns
    spy.get.and.returnValue(null);
    spy.getCached.and.returnValue(null);
    spy.isCacheValid.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        DataService,
        { provide: StorageService, useValue: spy },
      ],
    });

    service = TestBed.inject(DataService);
    storageServiceSpy = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should have default settings', () => {
      const settings = service.settings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should start with empty events', () => {
      expect(service.events()).toEqual([]);
    });

    it('should not be loading initially', () => {
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('events management', () => {
    it('should set events and cache them', () => {
      const events: CalendarEvent[] = [
        createEvent('Test Event', 10, 11),
      ];

      service.setEvents(events);

      expect(service.events()).toEqual(events);
      expect(storageServiceSpy.setCached).toHaveBeenCalled();
    });

    it('should clear events cache', () => {
      service.setEvents([createEvent('Test', 10, 11)]);
      service.clearEventsCache();

      expect(service.events()).toEqual([]);
      expect(storageServiceSpy.remove).toHaveBeenCalled();
    });

    it('should filter events by date range', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const events = [
        createEventOnDate('Today Event', today),
        createEventOnDate('Tomorrow Event', tomorrow),
        createEventOnDate('Next Week Event', nextWeek),
      ];

      service.setEvents(events);

      const todayEvents = service.getEventsForDate(today);
      expect(todayEvents.length).toBe(1);
      expect(todayEvents[0].title).toBe('Today Event');
    });
  });

  describe('calendars management', () => {
    it('should set calendars', () => {
      const calendars: GoogleCalendar[] = [
        { id: '1', summary: 'Work', accessRole: 'owner', selected: true },
        { id: '2', summary: 'Personal', accessRole: 'owner', selected: false },
      ];

      service.setCalendars(calendars);

      expect(service.calendars()).toEqual(calendars);
      expect(storageServiceSpy.set).toHaveBeenCalled();
    });

    it('should toggle calendar selection', () => {
      const calendars: GoogleCalendar[] = [
        { id: '1', summary: 'Work', accessRole: 'owner', selected: true },
        { id: '2', summary: 'Personal', accessRole: 'owner', selected: false },
      ];
      service.setCalendars(calendars);

      service.toggleCalendarSelection('2');

      const updated = service.calendars();
      expect(updated.find((c) => c.id === '2')?.selected).toBe(true);
    });

    it('should compute selected calendars', () => {
      const calendars: GoogleCalendar[] = [
        { id: '1', summary: 'Work', accessRole: 'owner', selected: true },
        { id: '2', summary: 'Personal', accessRole: 'owner', selected: false },
        { id: '3', summary: 'Clients', accessRole: 'owner', selected: true },
      ];
      service.setCalendars(calendars);

      const selected = service.selectedCalendars();
      expect(selected.length).toBe(2);
      expect(selected.map((c) => c.id)).toEqual(['1', '3']);
    });
  });

  describe('settings management', () => {
    it('should update settings', () => {
      service.updateSettings({ includeTravelTime: false });

      const settings = service.settings();
      expect(settings.includeTravelTime).toBe(false);
      expect(storageServiceSpy.set).toHaveBeenCalled();
    });

    it('should reset settings to defaults', () => {
      service.updateSettings({ includeTravelTime: false });
      service.resetSettings();

      expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('ignored events', () => {
    it('should ignore an event', () => {
      service.ignoreEvent('event-123');

      expect(service.isEventIgnored('event-123')).toBe(true);
      expect(storageServiceSpy.set).toHaveBeenCalled();
    });

    it('should unignore an event', () => {
      service.ignoreEvent('event-123');
      service.unignoreEvent('event-123');

      expect(service.isEventIgnored('event-123')).toBe(false);
    });

    it('should filter ignored events from workEvents', () => {
      const events = [
        { ...createEvent('Work 1', 10, 11), isWorkEvent: true },
        { ...createEvent('Work 2', 14, 15), id: 'ignored-id', isWorkEvent: true },
      ];
      service.setEvents(events);
      service.ignoreEvent('ignored-id');

      const workEvents = service.workEvents();
      expect(workEvents.length).toBe(1);
      expect(workEvents[0].title).toBe('Work 1');
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      service.setLoading(true);
      expect(service.isLoading()).toBe(true);

      service.setLoading(false);
      expect(service.isLoading()).toBe(false);
    });
  });

  // Helper functions
  function createEvent(title: string, startHour: number, endHour: number): CalendarEvent {
    const start = new Date();
    start.setHours(startHour, 0, 0, 0);

    const end = new Date();
    end.setHours(endHour, 0, 0, 0);

    return {
      id: Math.random().toString(),
      calendarId: 'primary',
      title,
      start,
      end,
      allDay: false,
      status: 'confirmed',
    };
  }

  function createEventOnDate(title: string, date: Date): CalendarEvent {
    const start = new Date(date);
    start.setHours(10, 0, 0, 0);

    const end = new Date(date);
    end.setHours(11, 0, 0, 0);

    return {
      id: Math.random().toString(),
      calendarId: 'primary',
      title,
      start,
      end,
      allDay: false,
      status: 'confirmed',
    };
  }
});
