import { TestBed } from '@angular/core/testing';
import { RulesEngineService, RuleViolation, BurnoutRisk, DEFAULT_RULES } from './rules-engine.service';
import { DataService } from './data.service';
import { WorkloadService } from './workload.service';
import { EventProcessorService } from './event-processor.service';
import { CalendarEvent } from '../../models/event.model';
import { startOfWeek, endOfWeek, addHours, setHours } from 'date-fns';

describe('RulesEngineService', () => {
  let service: RulesEngineService;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let workloadServiceSpy: jasmine.SpyObj<WorkloadService>;
  let eventProcessorSpy: jasmine.SpyObj<EventProcessorService>;

  const mockSettings = {
    thresholds: {
      daily: { comfortable: 4, busy: 6, high: 8 },
      weekly: { comfortable: 25, busy: 35, high: 45 },
      monthly: { comfortable: 100, busy: 140, high: 180 },
    },
  };

  const mockWorkloadSummary = {
    period: 'weekly' as const,
    startDate: new Date(),
    endDate: new Date(),
    totalWorkHours: 20,
    totalTravelHours: 5,
    averageDailyHours: 3.5,
    busiestDay: { date: new Date(), hours: 6 },
    level: 'comfortable' as const,
    eventCount: 10,
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
    dataServiceSpy = jasmine.createSpyObj('DataService', ['settings']);
    workloadServiceSpy = jasmine.createSpyObj('WorkloadService', ['getThisWeekSummary']);
    eventProcessorSpy = jasmine.createSpyObj('EventProcessorService', ['calculateEventDurationForDay']);

    dataServiceSpy.settings.and.returnValue(mockSettings as any);
    workloadServiceSpy.getThisWeekSummary.and.returnValue(mockWorkloadSummary);
    eventProcessorSpy.calculateEventDurationForDay.and.callFake((event: CalendarEvent) => {
      return (event.end.getTime() - event.start.getTime()) / (1000 * 60);
    });

    TestBed.configureTestingModule({
      providers: [
        RulesEngineService,
        { provide: DataService, useValue: dataServiceSpy },
        { provide: WorkloadService, useValue: workloadServiceSpy },
        { provide: EventProcessorService, useValue: eventProcessorSpy },
      ],
    });

    service = TestBed.inject(RulesEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkDay', () => {
    it('should detect too many visits in a day', () => {
      const baseDate = new Date('2025-01-20T08:00:00');
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          start: addHours(baseDate, i),
          end: addHours(baseDate, i + 0.5),
        })
      );

      const violations = service.checkDay(events, baseDate, { ...DEFAULT_RULES, maxVisitsPerDay: 8 });

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.type === 'max-visits-day')).toBeTrue();
    });

    it('should detect long working day', () => {
      const baseDate = new Date('2025-01-20T08:00:00');
      // Create 6 events of 2 hours each = 12 hours total
      const events = Array.from({ length: 6 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          start: addHours(baseDate, i * 2),
          end: addHours(baseDate, i * 2 + 2),
        })
      );

      const violations = service.checkDay(events, baseDate, { ...DEFAULT_RULES, maxHoursPerDay: 10 });

      expect(violations.some(v => v.type === 'max-hours-day')).toBeTrue();
    });

    it('should return no violations for light day', () => {
      const baseDate = new Date('2025-01-20T10:00:00');
      const events = [
        createMockEvent({ id: '1', start: baseDate, end: addHours(baseDate, 1) }),
        createMockEvent({ id: '2', start: addHours(baseDate, 2), end: addHours(baseDate, 3) }),
      ];

      const violations = service.checkDay(events, baseDate, DEFAULT_RULES);

      expect(violations.filter(v => v.severity === 'critical' || v.severity === 'warning').length).toBe(0);
    });
  });

  describe('wouldViolateRules', () => {
    it('should predict violations when adding new event', () => {
      const baseDate = new Date('2025-01-20T08:00:00');
      const existingEvents = Array.from({ length: 8 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          start: addHours(baseDate, i),
          end: addHours(baseDate, i + 0.5),
        })
      );

      const newEvent = createMockEvent({
        id: 'new-event',
        start: addHours(baseDate, 8),
        end: addHours(baseDate, 8.5),
      });

      const violations = service.wouldViolateRules(existingEvents, newEvent, { ...DEFAULT_RULES, maxVisitsPerDay: 8 });

      expect(violations.some(v => v.type === 'max-visits-day')).toBeTrue();
    });
  });

  describe('getBurnoutIndicators', () => {
    it('should return burnout indicators', () => {
      const events: CalendarEvent[] = [];
      const indicators = service.getBurnoutIndicators(events);

      expect(indicators).toBeDefined();
      expect(indicators.weeklyHours).toBeDefined();
      expect(indicators.level).toBeDefined();
      expect(indicators.message).toBeDefined();
      expect(indicators.color).toBeDefined();
    });

    it('should report high load when workload is heavy', () => {
      workloadServiceSpy.getThisWeekSummary.and.returnValue({
        ...mockWorkloadSummary,
        level: 'high',
        totalWorkHours: 45,
        totalTravelHours: 5,
      });

      const events: CalendarEvent[] = [];
      const indicators = service.getBurnoutIndicators(events);

      expect(indicators.isHighLoad).toBeTrue();
      expect(indicators.level).toBe('high');
    });
  });

  describe('getThresholdStatus', () => {
    it('should return comfortable status for low hours', () => {
      const status = service.getThresholdStatus(3, 'daily');
      expect(status.level).toBe('comfortable');
      expect(status.percentage).toBeLessThan(50);
    });

    it('should return high status for many hours', () => {
      const status = service.getThresholdStatus(9, 'daily');
      expect(status.level).toBe('burnout');
      expect(status.percentage).toBe(100);
    });

    it('should calculate remaining hours correctly', () => {
      const status = service.getThresholdStatus(6, 'daily');
      expect(status.remaining).toBe(2); // high threshold is 8
    });
  });

  describe('evaluateRules', () => {
    it('should update signals after evaluation', () => {
      const events: CalendarEvent[] = [];
      const range = {
        start: startOfWeek(new Date()),
        end: endOfWeek(new Date()),
      };

      service.evaluateRules(events, range);

      expect(service.currentViolations()).toBeDefined();
      expect(service.currentBurnoutRisk()).toBeDefined();
    });

    it('should detect weekly overload', () => {
      const baseDate = new Date('2025-01-20');
      // Create events that total more than 50 hours in a week
      const events: CalendarEvent[] = [];
      for (let day = 0; day < 5; day++) {
        for (let hour = 0; hour < 11; hour++) {
          const start = setHours(addHours(baseDate, day * 24), 8 + hour);
          events.push(createMockEvent({
            id: `event-${day}-${hour}`,
            start,
            end: addHours(start, 1),
          }));
        }
      }

      const range = {
        start: startOfWeek(baseDate),
        end: endOfWeek(baseDate),
      };

      const violations = service.evaluateRules(events, range, { ...DEFAULT_RULES, maxHoursPerWeek: 50 });

      // Should have multiple daily violations and possibly weekly
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('computed signals', () => {
    it('should correctly compute hasWarnings', () => {
      // Initially no violations
      expect(service.hasWarnings()).toBeFalse();
    });

    it('should correctly compute hasCritical', () => {
      expect(service.hasCritical()).toBeFalse();
    });

    it('should correctly compute warning count', () => {
      expect(service.warningCount()).toBe(0);
    });

    it('should correctly compute critical count', () => {
      expect(service.criticalCount()).toBe(0);
    });
  });
});
