import { EventExporterService } from './event-exporter.service';
import { EventProcessorService } from './event-processor.service';
import { CalendarEvent } from '../../models/event.model';
import { ExportOptions } from '../../models/export.model';

describe('EventExporterService', () => {
  let service: EventExporterService;
  let processor: EventProcessorService;

  const baseEvents: CalendarEvent[] = [
    {
      id: '1',
      calendarId: 'c1',
      title: 'Fluffy - 30',
      start: new Date('2024-01-01T09:00:00Z'),
      end: new Date('2024-01-01T09:30:00Z'),
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      clientName: 'Fluffy',
      serviceInfo: { type: 'drop-in', duration: 30 },
      location: 'Home',
    },
    {
      id: '2',
      calendarId: 'c1',
      title: 'Bruno Walk',
      start: new Date('2024-01-02T10:00:00Z'),
      end: new Date('2024-01-02T11:00:00Z'),
      allDay: false,
      status: 'confirmed',
      isWorkEvent: true,
      clientName: 'Bruno',
      serviceInfo: { type: 'walk', duration: 60 },
      location: 'Park',
    },
  ];

  const defaultOptions: ExportOptions = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-03'),
    includeTime: true,
    includeLocation: true,
    groupLevels: [],
    sortLevels: [],
    workEventsOnly: true,
  };

  beforeEach(() => {
    processor = new EventProcessorService();
    service = new EventExporterService(processor);
  });

  it('filters out non-work events when workEventsOnly is true', () => {
    const events = [...baseEvents, { ...baseEvents[0], id: '3', title: 'Personal', isWorkEvent: false }];
    const result = service.export(events, defaultOptions);
    expect(result.count).toBe(2);
    expect(result.content).toContain('Fluffy');
    expect(result.content).not.toContain('Personal');
  });

  it('sorts by client then date when sort levels provided', () => {
    const options: ExportOptions = {
      ...defaultOptions,
      sortLevels: [
        { field: 'client', direction: 'asc' },
        { field: 'date', direction: 'asc' },
      ],
    };
    const result = service.export(baseEvents, options).content.split('\n').filter(Boolean);
    expect(result[0]).toContain('Bruno');
    expect(result[1]).toContain('Fluffy');
  });

  it('groups by date and includes group headers', () => {
    const options: ExportOptions = {
      ...defaultOptions,
      groupLevels: [{ field: 'date', order: 1 }],
    };
    const content = service.export(baseEvents, options).content;
    expect(content).toContain('Mon, Jan 1');
    expect(content).toContain('Tue, Jan 2');
  });
});
