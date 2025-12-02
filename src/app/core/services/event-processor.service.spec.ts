import { TestBed } from '@angular/core/testing';
import { EventProcessorService } from './event-processor.service';
import { CalendarEvent } from '../../models';

describe('EventProcessorService', () => {
  let service: EventProcessorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventProcessorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isWorkEvent', () => {
    // Work events - should return true
    const workEventTitles = [
      'Fluffy - 30',
      'Max - 45',
      'Bella & Charlie - 60',
      'Rocky - 15',
      'Luna - 20',
      'Cooper - MG',
      'Sadie - M&G',
      'Duke Meet & Greet',
      'Tucker - HS',
      'Bailey Housesit',
      'Molly - ON',
      'Bear Overnight',
      'Zeus nail trim',
      'Daisy - NT',
      'Buddy - Walk',
      'Rosie - Drop-in',
    ];

    workEventTitles.forEach((title) => {
      it(`should identify "${title}" as a work event`, () => {
        expect(service.isWorkEvent(title)).toBe(true);
      });
    });

    // Personal events - should return false
    const personalEventTitles = [
      '✨ off ✨',
      'Day off',
      'Doctor appointment',
      'Dentist',
      'Personal time',
      'Family dinner',
      'Blocked',
      'Busy - unavailable',
      'Holiday',
      'Vacation',
      'Lunch with friend',
      'Flight to NYC',
      'Movie night',
      'Gym workout',
      'Me time',
    ];

    personalEventTitles.forEach((title) => {
      it(`should identify "${title}" as NOT a work event`, () => {
        expect(service.isWorkEvent(title)).toBe(false);
      });
    });

    it('should return false for empty string', () => {
      expect(service.isWorkEvent('')).toBe(false);
    });

    it('should accept CalendarEvent object', () => {
      const event: CalendarEvent = {
        id: '1',
        calendarId: 'primary',
        title: 'Fluffy - 30',
        start: new Date(),
        end: new Date(),
        allDay: false,
        status: 'confirmed',
      };
      expect(service.isWorkEvent(event)).toBe(true);
    });
  });

  describe('isOvernightEvent', () => {
    it('should identify housesit events', () => {
      const event = createEvent('Fluffy - HS', 0, 24);
      expect(service.isOvernightEvent(event)).toBe(true);
    });

    it('should identify overnight events by pattern', () => {
      const event = createEvent('Max - ON', 0, 12);
      expect(service.isOvernightEvent(event)).toBe(true);
    });

    it('should identify overnight events by duration (> 8 hours, spans days)', () => {
      const start = new Date('2025-01-01T18:00:00');
      const end = new Date('2025-01-02T08:00:00');
      const event: CalendarEvent = {
        id: '1',
        calendarId: 'primary',
        title: 'Bella',
        start,
        end,
        allDay: false,
        status: 'confirmed',
      };
      expect(service.isOvernightEvent(event)).toBe(true);
    });

    it('should NOT identify short events as overnight', () => {
      const event = createEvent('Rocky - 30', 0, 0.5);
      expect(service.isOvernightEvent(event)).toBe(false);
    });
  });

  describe('extractClientName', () => {
    it('should extract client name from "Name - Duration" format', () => {
      expect(service.extractClientName('Fluffy - 30')).toBe('Fluffy');
    });

    it('should extract multiple pet names', () => {
      expect(service.extractClientName('Max & Bella - 45')).toBe('Max & Bella');
    });

    it('should handle names with commas', () => {
      expect(service.extractClientName('Rocky, Luna - 30')).toBe('Rocky, Luna');
    });

    it('should return full title if no pattern match', () => {
      expect(service.extractClientName('Some random event')).toBe('Some random event');
    });
  });

  describe('extractServiceInfo', () => {
    it('should extract drop-in service with duration', () => {
      const info = service.extractServiceInfo('Fluffy - 30');
      expect(info.type).toBe('drop-in');
      expect(info.duration).toBe(30);
      expect(info.petName).toBe('Fluffy');
    });

    it('should extract meet & greet', () => {
      const info = service.extractServiceInfo('Cooper - MG');
      expect(info.type).toBe('meet-greet');
    });

    it('should extract housesit', () => {
      const info = service.extractServiceInfo('Tucker - HS');
      expect(info.type).toBe('housesit');
      expect(info.duration).toBe(1440); // 24 hours
    });

    it('should extract overnight', () => {
      const info = service.extractServiceInfo('Molly - ON');
      expect(info.type).toBe('overnight');
      expect(info.duration).toBe(720); // 12 hours
    });

    it('should extract nail trim', () => {
      const info = service.extractServiceInfo('Zeus nail trim');
      expect(info.type).toBe('nail-trim');
    });

    it('should extract walk', () => {
      const info = service.extractServiceInfo('Buddy - Walk');
      expect(info.type).toBe('walk');
    });
  });

  describe('calculateEventDurationForDay', () => {
    it('should return full duration for single-day event', () => {
      const event = createEvent('Test', 10, 11); // 1 hour
      const date = new Date();
      date.setHours(12, 0, 0, 0);

      const minutes = service.calculateEventDurationForDay(event, date);
      expect(minutes).toBe(60);
    });

    it('should cap overnight events at 12 hours per day', () => {
      const start = new Date('2025-01-01T08:00:00');
      const end = new Date('2025-01-02T20:00:00'); // 36 hours total
      const event: CalendarEvent = {
        id: '1',
        calendarId: 'primary',
        title: 'Long housesit - HS',
        start,
        end,
        allDay: false,
        status: 'confirmed',
      };

      // Use the same date format as the event for consistency
      const day1 = new Date('2025-01-01T12:00:00'); // Midday to avoid timezone issues
      const day1Minutes = service.calculateEventDurationForDay(event, day1);
      expect(day1Minutes).toBe(12 * 60); // Capped at 12 hours
    });

    it('should return 0 for non-overlapping day', () => {
      const event = createEvent('Test', 10, 11);
      const differentDay = new Date();
      differentDay.setDate(differentDay.getDate() + 5);

      const minutes = service.calculateEventDurationForDay(event, differentDay);
      expect(minutes).toBe(0);
    });
  });

  describe('processEvent', () => {
    it('should add isWorkEvent flag', () => {
      const event = createEvent('Fluffy - 30', 10, 10.5);
      const processed = service.processEvent(event);

      expect(processed.isWorkEvent).toBe(true);
      expect(processed.clientName).toBe('Fluffy');
      expect(processed.serviceInfo).toBeDefined();
    });

    it('should not add client info for personal events', () => {
      const event = createEvent('Doctor appointment', 10, 11);
      const processed = service.processEvent(event);

      expect(processed.isWorkEvent).toBe(false);
      expect(processed.clientName).toBeUndefined();
      expect(processed.serviceInfo).toBeUndefined();
    });
  });

  // Helper function to create test events
  function createEvent(
    title: string,
    startHour: number,
    endHour: number
  ): CalendarEvent {
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
});
