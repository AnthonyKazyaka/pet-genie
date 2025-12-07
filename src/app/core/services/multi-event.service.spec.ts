import { MultiEventService } from './multi-event.service';
import { MultiEventConfig, BookingType } from '../../models/multi-event.model';
import { Template } from '../../models/template.model';
import { CalendarEvent } from '../../models/event.model';

describe('MultiEventService', () => {
  let service: MultiEventService;
  const templates: Template[] = [
    { id: 't1', userId: 'u', name: 'Visit', icon: '🐾', type: 'drop-in', duration: 30, includeTravel: true, travelBuffer: 0, isDefault: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 't2', userId: 'u', name: 'Overnight', icon: '🌙', type: 'overnight', duration: 720, includeTravel: true, travelBuffer: 0, isDefault: false, createdAt: new Date(), updatedAt: new Date() },
  ];

  beforeEach(() => {
    service = new MultiEventService();
  });

  it('validates required fields', () => {
    const config: MultiEventConfig = {
      clientName: '',
      location: '',
      startDate: new Date('2024-01-02'),
      endDate: new Date('2024-01-01'),
      bookingType: 'daily-visits',
      visits: [],
    };
    const errors = service.validateConfig(config);
    expect(errors).toContain('Client name is required');
    expect(errors).toContain('Start date must be before end date');
    expect(errors).toContain('At least one visit slot is required');
  });

  it('detects conflicts with existing events', () => {
    const generated = [
      { title: 'Test', start: new Date('2024-01-01T10:00:00Z'), end: new Date('2024-01-01T11:00:00Z') },
    ];
    const existing: CalendarEvent[] = [
      { id: '1', calendarId: 'c', title: 'Existing', start: new Date('2024-01-01T10:30:00Z'), end: new Date('2024-01-01T11:30:00Z'), allDay: false, status: 'confirmed' },
    ];
    const conflicts = service.detectConflicts(existing, generated);
    expect(conflicts.length).toBe(1);
  });

  it('generates weekday and weekend visits with template duration fallback', () => {
    const config: MultiEventConfig = {
      clientName: 'Fluffy',
      location: 'Home',
      startDate: new Date(2024, 0, 7), // Sunday
      endDate: new Date(2024, 0, 8),   // Monday
      bookingType: 'daily-visits',
      visits: [{ templateId: 't1', time: '09:00', duration: 0 }], // weekday uses template duration
      weekendVisits: [{ templateId: 't1', time: '10:00', duration: 45 }],
    };

    const events = service.generateEvents(config, templates);
    expect(events.length).toBe(2);
    const durations = events
      .map(e => (e.end.getTime() - e.start.getTime()) / 60000)
      .sort((a, b) => a - b);
    expect(durations).toEqual([30, 45]);
  });

  it('builds overnight plus drop-in events', () => {
    const config: MultiEventConfig = {
      clientName: 'Buddy',
      location: 'Home',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-01'),
      bookingType: 'overnight-stay',
      visits: [],
      overnightConfig: { templateId: 't2', arrivalTime: '18:00', departureTime: '08:00' },
      dropinConfig: { templateId: 't1', time: '12:00', duration: 30 },
    };

    const events = service.generateEvents(config, templates);
    expect(events.length).toBe(2);
    const overnight = events.find(e => e.title.includes('Overnight'))!;
    expect((overnight.end.getTime() - overnight.start.getTime()) / 60000).toBe(14 * 60); // spans midnight
  });
});
