import { TestBed } from '@angular/core/testing';
import { WorkloadService } from './workload.service';
import { DataService } from './data.service';
import { EventProcessorService } from './event-processor.service';
import { CalendarEvent, DEFAULT_SETTINGS } from '../../models';

describe('WorkloadService', () => {
  let service: WorkloadService;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('DataService', ['getEventsForDate', 'settings', 'events']);
    spy.settings.and.returnValue(DEFAULT_SETTINGS);
    spy.events.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        WorkloadService,
        EventProcessorService,
        { provide: DataService, useValue: spy },
      ],
    });

    service = TestBed.inject(WorkloadService);
    dataServiceSpy = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateDailyMetrics', () => {
    it('should return zero metrics for empty events', () => {
      dataServiceSpy.getEventsForDate.and.returnValue([]);

      const metrics = service.calculateDailyMetrics(new Date());

      expect(metrics.workTime).toBe(0);
      expect(metrics.eventCount).toBe(0);
      expect(metrics.level).toBe('comfortable');
    });

    it('should calculate work time from work events', () => {
      const events = [
        createWorkEvent('Fluffy - 30', 10, 10.5), // 30 min
        createWorkEvent('Max - 45', 14, 14.75), // 45 min
      ];
      dataServiceSpy.getEventsForDate.and.returnValue(events);

      const metrics = service.calculateDailyMetrics(new Date(), events);

      expect(metrics.workTime).toBe(75); // 30 + 45
      expect(metrics.eventCount).toBe(2);
    });

    it('should add travel time when enabled', () => {
      const events = [
        createWorkEvent('Fluffy - 30', 10, 10.5),
        createWorkEvent('Max - 45', 14, 14.75),
      ];
      dataServiceSpy.getEventsForDate.and.returnValue(events);

      const metrics = service.calculateDailyMetrics(new Date(), events);

      // 2 events = 4 trips (to and from each) = 60 min travel
      expect(metrics.travelTime).toBe(60);
      expect(metrics.totalTime).toBe(75 + 60);
    });

    it('should determine workload level correctly', () => {
      // Create events totaling 5 hours of work (busy level for daily)
      const events: CalendarEvent[] = [];
      for (let i = 0; i < 10; i++) {
        events.push(createWorkEvent(`Pet ${i} - 30`, 8 + i * 0.5, 8.5 + i * 0.5));
      }
      dataServiceSpy.getEventsForDate.and.returnValue(events);

      const metrics = service.calculateDailyMetrics(new Date(), events);

      // 10 events * 30 min = 300 min = 5 hours work
      // + 10 events * 30 min travel = 300 min
      // Total = 600 min = 10 hours -> 'burnout' level
      expect(metrics.level).toBe('burnout');
    });
  });

  describe('calculateEstimatedTravelTime', () => {
    it('should return 0 for no events', () => {
      const travelTime = service.calculateEstimatedTravelTime([]);
      expect(travelTime).toBe(0);
    });

    it('should calculate 2 trips per event (to and from)', () => {
      const events = [createWorkEvent('Fluffy - 30', 10, 10.5)];
      const travelTime = service.calculateEstimatedTravelTime(events);

      // 1 event = 2 trips * 15 min = 30 min
      expect(travelTime).toBe(30);
    });

    it('should reduce travel for same-location consecutive events', () => {
      const events = [
        createWorkEvent('Fluffy - 30', 10, 10.5, '123 Main St'),
        createWorkEvent('Max - 30', 11, 11.5, '123 Main St'), // Same location
      ];
      const travelTime = service.calculateEstimatedTravelTime(events);

      // First event: 2 trips, second event: 1 trip (no travel to)
      // 3 trips * 15 min = 45 min
      expect(travelTime).toBe(45);
    });
  });

  describe('getWorkloadSummary', () => {
    it('should calculate weekly summary', () => {
      dataServiceSpy.events.and.returnValue([]);

      const summary = service.getWorkloadSummary('weekly');

      expect(summary.period).toBe('weekly');
      expect(summary.totalWorkHours).toBe(0);
      expect(summary.eventCount).toBe(0);
    });

    it('should calculate monthly summary', () => {
      dataServiceSpy.events.and.returnValue([]);

      const summary = service.getWorkloadSummary('monthly');

      expect(summary.period).toBe('monthly');
    });
  });

  describe('formatHours', () => {
    it('should format minutes for less than 1 hour', () => {
      expect(service.formatHours(0.5)).toBe('30 min');
    });

    it('should format whole hours', () => {
      expect(service.formatHours(2)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(service.formatHours(2.5)).toBe('2h 30m');
    });
  });

  describe('getWorkloadColor', () => {
    it('should return correct colors for each level', () => {
      expect(service.getWorkloadColor('comfortable')).toBe('#10B981');
      expect(service.getWorkloadColor('busy')).toBe('#F59E0B');
      expect(service.getWorkloadColor('high')).toBe('#F97316');
      expect(service.getWorkloadColor('burnout')).toBe('#EF4444');
    });
  });

  describe('getWorkloadLabel', () => {
    it('should return correct labels for each level', () => {
      expect(service.getWorkloadLabel('comfortable')).toBe('Comfortable');
      expect(service.getWorkloadLabel('busy')).toBe('Busy');
      expect(service.getWorkloadLabel('high')).toBe('High');
      expect(service.getWorkloadLabel('burnout')).toBe('Burnout Risk');
    });
  });

  // Helper function to create work events
  function createWorkEvent(
    title: string,
    startHour: number,
    endHour: number,
    location?: string
  ): CalendarEvent {
    const start = new Date();
    start.setHours(startHour, 0, 0, 0);

    const end = new Date();
    end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

    return {
      id: Math.random().toString(),
      calendarId: 'primary',
      title,
      location,
      start,
      end,
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
    };
  }
});
