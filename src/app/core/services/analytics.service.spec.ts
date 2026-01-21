import { TestBed } from '@angular/core/testing';
import { AnalyticsService, SummaryStats, DailyStats, ServiceBreakdown, ClientStats } from './analytics.service';
import { VisitRecordDataService } from './visit-record-data.service';
import { DataService } from './data.service';
import { EventProcessorService } from './event-processor.service';
import { CalendarEvent } from '../../models/event.model';
import { of } from 'rxjs';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let visitRecordServiceSpy: jasmine.SpyObj<VisitRecordDataService>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let eventProcessorSpy: jasmine.SpyObj<EventProcessorService>;

  const mockSettings = {
    thresholds: {
      daily: { comfortable: 4, busy: 6, high: 8 },
      weekly: { comfortable: 25, busy: 35, high: 45 },
      monthly: { comfortable: 100, busy: 140, high: 180 },
    },
  };

  const createMockEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: 'test-event-1',
    calendarId: 'cal-1',
    title: 'Test Visit',
    start: new Date('2025-01-20T10:00:00'),
    end: new Date('2025-01-20T11:00:00'),
    isWorkEvent: true,
    clientName: 'Test Client',
    serviceInfo: { type: 'drop-in', duration: 60 },
    ...overrides,
  });

  beforeEach(() => {
    visitRecordServiceSpy = jasmine.createSpyObj('VisitRecordDataService', ['getByEventId']);
    dataServiceSpy = jasmine.createSpyObj('DataService', ['settings']);
    eventProcessorSpy = jasmine.createSpyObj('EventProcessorService', ['calculateEventDurationForDay']);

    visitRecordServiceSpy.getByEventId.and.returnValue(of(null));
    dataServiceSpy.settings.and.returnValue(mockSettings as any);
    eventProcessorSpy.calculateEventDurationForDay.and.callFake((event: CalendarEvent) => {
      return (event.end.getTime() - event.start.getTime()) / (1000 * 60);
    });

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: VisitRecordDataService, useValue: visitRecordServiceSpy },
        { provide: DataService, useValue: dataServiceSpy },
        { provide: EventProcessorService, useValue: eventProcessorSpy },
      ],
    });

    service = TestBed.inject(AnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateSummaryStats', () => {
    it('should calculate summary stats for work events', async () => {
      const events = [
        createMockEvent({ id: '1', clientName: 'Client A' }),
        createMockEvent({ id: '2', clientName: 'Client B' }),
        createMockEvent({ id: '3', clientName: 'Client A' }),
      ];

      const dateRange = {
        start: new Date('2025-01-20T00:00:00'),
        end: new Date('2025-01-21T00:00:00'),
      };

      const stats = await service.calculateSummaryStats(events, dateRange, false);

      expect(stats.totalEvents).toBe(3);
      expect(stats.uniqueClients).toBe(2);
      expect(stats.totalMinutes).toBe(180); // 3 events * 60 min
    });

    it('should exclude non-work events', async () => {
      const events = [
        createMockEvent({ id: '1', isWorkEvent: true }),
        createMockEvent({ id: '2', isWorkEvent: false }),
      ];

      const dateRange = {
        start: new Date('2025-01-20T00:00:00'),
        end: new Date('2025-01-21T00:00:00'),
      };

      const stats = await service.calculateSummaryStats(events, dateRange, false);

      expect(stats.totalEvents).toBe(1);
    });
  });

  describe('calculateServiceBreakdown', () => {
    it('should group events by service type', () => {
      const events = [
        createMockEvent({ id: '1', serviceInfo: { type: 'drop-in', duration: 30 } }),
        createMockEvent({ id: '2', serviceInfo: { type: 'walk', duration: 60 } }),
        createMockEvent({ id: '3', serviceInfo: { type: 'drop-in', duration: 30 } }),
      ];

      const breakdown = service.calculateServiceBreakdown(events);

      expect(breakdown.length).toBe(2);
      const dropIn = breakdown.find(b => b.type === 'Drop-In');
      const walk = breakdown.find(b => b.type === 'Walk');

      expect(dropIn?.count).toBe(2);
      expect(walk?.count).toBe(1);
    });

    it('should calculate percentages correctly', () => {
      const events = [
        createMockEvent({ id: '1' }),
        createMockEvent({ id: '2' }),
        createMockEvent({ id: '3' }),
        createMockEvent({ id: '4' }),
      ];

      const breakdown = service.calculateServiceBreakdown(events);

      const totalPercentage = breakdown.reduce((sum, b) => sum + b.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });
  });

  describe('calculateDayOfWeekStats', () => {
    it('should return stats for all 7 days', () => {
      const events: CalendarEvent[] = [];
      const dateRange = {
        start: new Date('2025-01-13T00:00:00'), // Monday
        end: new Date('2025-01-19T23:59:59'),   // Sunday
      };

      const stats = service.calculateDayOfWeekStats(events, dateRange);

      expect(stats.length).toBe(7);
      expect(stats[0].day).toBe('Sun');
      expect(stats[1].day).toBe('Mon');
    });
  });

  describe('getDateRange', () => {
    it('should return correct range for week', () => {
      const range = service.getDateRange('week');
      expect(range.start).toBeDefined();
      expect(range.end).toBeDefined();
      expect(range.end > range.start).toBeTrue();
    });

    it('should return correct range for month', () => {
      const range = service.getDateRange('month');
      const daysDiff = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(28);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });

    it('should return correct range for 3 months', () => {
      const range = service.getDateRange('3months');
      const daysDiff = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(80);
    });
  });

  describe('formatMinutes', () => {
    it('should format minutes as hours', () => {
      expect(service.formatMinutes(60)).toBe('1h');
      expect(service.formatMinutes(90)).toBe('1.5h');
      expect(service.formatMinutes(120)).toBe('2h');
    });
  });

  describe('getServiceLabel', () => {
    it('should return correct labels', () => {
      expect(service.getServiceLabel('drop-in')).toBe('Drop-In');
      expect(service.getServiceLabel('walk')).toBe('Walk');
      expect(service.getServiceLabel('overnight')).toBe('Overnight');
      expect(service.getServiceLabel('unknown')).toBe('Other');
    });
  });
});
