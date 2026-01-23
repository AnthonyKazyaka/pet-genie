/**
 * Tests for metrics calculation utilities
 * 
 * These tests verify the accuracy of visit statistics calculations,
 * particularly around date boundary handling and work event filtering.
 */

import {
  calculateEventHoursInRange,
  eventOverlapsRange,
  filterWorkEvents,
  filterEventsInMonth,
  filterEventsOverlappingMonth,
  getUniqueClients,
  calculateMonthlyMetrics,
  calculateDateRangeMetrics,
  calculateWeeklyHours,
} from '../metrics.model';
import { CalendarEvent } from '../event.model';

// Helper to create test events
function createEvent(
  overrides: Partial<CalendarEvent> & { start: string; end: string }
): CalendarEvent {
  return {
    id: `event-${Math.random().toString(36).substring(7)}`,
    calendarId: 'test-calendar',
    title: 'Test Event',
    allDay: false,
    status: 'confirmed',
    isWorkEvent: true,
    ...overrides,
  };
}

describe('eventOverlapsRange', () => {
  const rangeStart = new Date('2026-01-15T00:00:00');
  const rangeEnd = new Date('2026-01-31T23:59:59');

  it('returns true for event fully within range', () => {
    const eventStart = new Date('2026-01-20T09:00:00');
    const eventEnd = new Date('2026-01-20T10:00:00');
    expect(eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(true);
  });

  it('returns true for event starting before and ending within range', () => {
    const eventStart = new Date('2026-01-10T09:00:00');
    const eventEnd = new Date('2026-01-20T10:00:00');
    expect(eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(true);
  });

  it('returns true for event starting within and ending after range', () => {
    const eventStart = new Date('2026-01-20T09:00:00');
    const eventEnd = new Date('2026-02-05T10:00:00');
    expect(eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(true);
  });

  it('returns true for event spanning entire range', () => {
    const eventStart = new Date('2026-01-01T00:00:00');
    const eventEnd = new Date('2026-02-28T23:59:59');
    expect(eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(true);
  });

  it('returns false for event entirely before range', () => {
    const eventStart = new Date('2026-01-01T09:00:00');
    const eventEnd = new Date('2026-01-10T10:00:00');
    expect(eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(false);
  });

  it('returns false for event entirely after range', () => {
    const eventStart = new Date('2026-02-05T09:00:00');
    const eventEnd = new Date('2026-02-10T10:00:00');
    expect(eventOverlapsRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(false);
  });
});

describe('calculateEventHoursInRange', () => {
  const monthStart = new Date('2026-01-01T00:00:00');
  const monthEnd = new Date('2026-01-31T23:59:59.999');

  it('calculates full duration for event within range', () => {
    const event = createEvent({
      start: '2026-01-15T09:00:00',
      end: '2026-01-15T11:00:00',
    });
    const hours = calculateEventHoursInRange(event, monthStart, monthEnd);
    expect(hours).toBe(2);
  });

  it('returns 0 for event outside range', () => {
    const event = createEvent({
      start: '2026-02-15T09:00:00',
      end: '2026-02-15T11:00:00',
    });
    const hours = calculateEventHoursInRange(event, monthStart, monthEnd);
    expect(hours).toBe(0);
  });

  it('clamps event starting before range', () => {
    // Event: Dec 30 9am to Jan 2 9am (4 days = 96 hours total)
    // Only Jan 1 00:00 to Jan 2 9am should count = 33 hours
    const event = createEvent({
      start: '2025-12-30T09:00:00',
      end: '2026-01-02T09:00:00',
    });
    const hours = calculateEventHoursInRange(event, monthStart, monthEnd);
    expect(hours).toBe(33); // Jan 1 00:00 to Jan 2 09:00
  });

  it('clamps event ending after range', () => {
    // Event: Jan 30 9am to Feb 2 9am 
    // Only Jan 30 9am to Jan 31 23:59:59.999 should count
    const event = createEvent({
      start: '2026-01-30T09:00:00',
      end: '2026-02-02T09:00:00',
    });
    const hours = calculateEventHoursInRange(event, monthStart, monthEnd);
    // Jan 30 9am to Jan 31 midnight = 15 hours + ~24 hours = ~39 hours
    expect(hours).toBeCloseTo(38.999, 1); // ~39 hours within January
  });

  it('clamps event spanning entire range', () => {
    // Event spans Dec 15 to Feb 15
    // Only the January portion should count
    const event = createEvent({
      start: '2025-12-15T00:00:00',
      end: '2026-02-15T00:00:00',
    });
    const hours = calculateEventHoursInRange(event, monthStart, monthEnd);
    // January has 31 days * 24 hours - tiny bit for the millisecond boundary
    expect(hours).toBeCloseTo(31 * 24, 0);
  });

  it('handles 30-minute events correctly', () => {
    const event = createEvent({
      start: '2026-01-15T14:00:00',
      end: '2026-01-15T14:30:00',
    });
    const hours = calculateEventHoursInRange(event, monthStart, monthEnd);
    expect(hours).toBe(0.5);
  });

  it('handles overnight events correctly', () => {
    // 12 hour overnight: 8pm to 8am next day
    const event = createEvent({
      start: '2026-01-15T20:00:00',
      end: '2026-01-16T08:00:00',
    });
    const hours = calculateEventHoursInRange(event, monthStart, monthEnd);
    expect(hours).toBe(12);
  });
});

describe('filterWorkEvents', () => {
  it('filters out non-work events', () => {
    const events = [
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00', isWorkEvent: true }),
      createEvent({ start: '2026-01-15T11:00:00', end: '2026-01-15T12:00:00', isWorkEvent: false }),
      createEvent({ start: '2026-01-15T13:00:00', end: '2026-01-15T14:00:00', isWorkEvent: true }),
    ];
    const workEvents = filterWorkEvents(events);
    expect(workEvents).toHaveLength(2);
    expect(workEvents.every(e => e.isWorkEvent === true)).toBe(true);
  });

  it('includes events with undefined isWorkEvent (default to work)', () => {
    const events = [
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00', isWorkEvent: true }),
      { ...createEvent({ start: '2026-01-15T11:00:00', end: '2026-01-15T12:00:00' }), isWorkEvent: undefined },
    ];
    const workEvents = filterWorkEvents(events);
    expect(workEvents).toHaveLength(2);
  });

  it('returns empty array for all non-work events', () => {
    const events = [
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00', isWorkEvent: false }),
      createEvent({ start: '2026-01-15T11:00:00', end: '2026-01-15T12:00:00', isWorkEvent: false }),
    ];
    const workEvents = filterWorkEvents(events);
    expect(workEvents).toHaveLength(0);
  });
});

describe('filterEventsInMonth', () => {
  it('filters events that start in the specified month', () => {
    const events = [
      createEvent({ start: '2025-12-31T23:00:00', end: '2026-01-01T01:00:00' }), // Dec
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00' }), // Jan
      createEvent({ start: '2026-01-31T23:00:00', end: '2026-02-01T01:00:00' }), // Jan
      createEvent({ start: '2026-02-01T09:00:00', end: '2026-02-01T10:00:00' }), // Feb
    ];
    const januaryEvents = filterEventsInMonth(events, 2026, 0); // January
    expect(januaryEvents).toHaveLength(2);
  });
});

describe('filterEventsOverlappingMonth', () => {
  it('includes events that overlap with the month', () => {
    const events = [
      createEvent({ start: '2025-12-31T23:00:00', end: '2026-01-01T01:00:00' }), // Overlaps
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00' }), // Within
      createEvent({ start: '2026-01-31T23:00:00', end: '2026-02-01T01:00:00' }), // Overlaps
      createEvent({ start: '2026-02-05T09:00:00', end: '2026-02-05T10:00:00' }), // Outside
    ];
    const overlappingEvents = filterEventsOverlappingMonth(events, 2026, 0); // January
    expect(overlappingEvents).toHaveLength(3);
  });
});

describe('getUniqueClients', () => {
  it('returns unique client names', () => {
    const events = [
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00', clientName: 'Client A' }),
      createEvent({ start: '2026-01-15T11:00:00', end: '2026-01-15T12:00:00', clientName: 'Client B' }),
      createEvent({ start: '2026-01-15T13:00:00', end: '2026-01-15T14:00:00', clientName: 'Client A' }),
    ];
    const clients = getUniqueClients(events);
    expect(clients).toHaveLength(2);
    expect(clients).toContain('Client A');
    expect(clients).toContain('Client B');
  });

  it('ignores events without clientName', () => {
    const events = [
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00', clientName: 'Client A' }),
      createEvent({ start: '2026-01-15T11:00:00', end: '2026-01-15T12:00:00' }), // No clientName
    ];
    const clients = getUniqueClients(events);
    expect(clients).toHaveLength(1);
    expect(clients).toContain('Client A');
  });

  it('returns empty array for no clients', () => {
    const events = [
      createEvent({ start: '2026-01-15T09:00:00', end: '2026-01-15T10:00:00' }),
    ];
    const clients = getUniqueClients(events);
    expect(clients).toHaveLength(0);
  });
});

describe('calculateMonthlyMetrics', () => {
  it('calculates correct metrics for events in a month', () => {
    const events = [
      createEvent({ 
        start: '2026-01-15T09:00:00', 
        end: '2026-01-15T11:00:00', 
        clientName: 'Client A',
        isWorkEvent: true,
      }),
      createEvent({ 
        start: '2026-01-16T09:00:00', 
        end: '2026-01-16T10:30:00',
        clientName: 'Client B',
        isWorkEvent: true,
      }),
      createEvent({ 
        start: '2026-01-17T09:00:00', 
        end: '2026-01-17T09:30:00',
        clientName: 'Client A',
        isWorkEvent: true,
      }),
    ];
    const metrics = calculateMonthlyMetrics(events, 2026, 0);
    expect(metrics.totalVisits).toBe(3);
    expect(metrics.totalHours).toBe(4); // 2 + 1.5 + 0.5
    expect(metrics.uniqueClients).toBe(2);
  });

  it('excludes non-work events from all calculations', () => {
    const events = [
      createEvent({ 
        start: '2026-01-15T09:00:00', 
        end: '2026-01-15T11:00:00',
        clientName: 'Client A',
        isWorkEvent: true,
      }),
      createEvent({ 
        start: '2026-01-16T09:00:00', 
        end: '2026-01-16T17:00:00', // 8 hours personal
        clientName: 'Personal Event',
        isWorkEvent: false,
      }),
    ];
    const metrics = calculateMonthlyMetrics(events, 2026, 0);
    expect(metrics.totalVisits).toBe(1);
    expect(metrics.totalHours).toBe(2);
    expect(metrics.uniqueClients).toBe(1);
  });

  it('handles multi-day events that span month boundaries correctly', () => {
    // Event that starts Jan 30 and ends Feb 2
    // Should only count the January portion for hours
    const events = [
      createEvent({ 
        start: '2026-01-30T18:00:00', // Jan 30 6pm
        end: '2026-02-02T09:00:00',   // Feb 2 9am
        clientName: 'Client A',
        isWorkEvent: true,
      }),
    ];
    const metrics = calculateMonthlyMetrics(events, 2026, 0); // January
    
    // Visit count: 1 (starts in January)
    expect(metrics.totalVisits).toBe(1);
    
    // Hours: Jan 30 6pm to Jan 31 23:59:59 = ~30 hours
    // 6 hours on Jan 30 (6pm to midnight) + ~24 hours on Jan 31
    expect(metrics.totalHours).toBeCloseTo(30, 0);
    
    expect(metrics.uniqueClients).toBe(1);
  });

  it('handles events from previous month extending into current month', () => {
    // Event starts Dec 31 11pm and ends Jan 1 3am
    const events = [
      createEvent({ 
        start: '2025-12-31T23:00:00', 
        end: '2026-01-01T03:00:00',
        clientName: 'Client A',
        isWorkEvent: true,
      }),
    ];
    const metrics = calculateMonthlyMetrics(events, 2026, 0); // January
    
    // Visit count: 0 (starts in December, not January)
    expect(metrics.totalVisits).toBe(0);
    
    // Hours: 3 hours in January (midnight to 3am)
    expect(metrics.totalHours).toBe(3);
    
    // No clients since visit doesn't start in January
    expect(metrics.uniqueClients).toBe(0);
  });

  it('returns zeros for month with no events', () => {
    const events: CalendarEvent[] = [];
    const metrics = calculateMonthlyMetrics(events, 2026, 0);
    expect(metrics.totalVisits).toBe(0);
    expect(metrics.totalHours).toBe(0);
    expect(metrics.uniqueClients).toBe(0);
  });

  it('handles events entirely outside the month', () => {
    const events = [
      createEvent({ 
        start: '2026-02-15T09:00:00', 
        end: '2026-02-15T11:00:00',
        clientName: 'Client A',
        isWorkEvent: true,
      }),
    ];
    const metrics = calculateMonthlyMetrics(events, 2026, 0); // January
    expect(metrics.totalVisits).toBe(0);
    expect(metrics.totalHours).toBe(0);
    expect(metrics.uniqueClients).toBe(0);
  });
});

describe('calculateDateRangeMetrics', () => {
  it('calculates correct metrics for a week range', () => {
    const weekStart = new Date('2026-01-12T00:00:00');
    const weekEnd = new Date('2026-01-18T23:59:59.999');
    
    const events = [
      createEvent({ 
        start: '2026-01-13T09:00:00', 
        end: '2026-01-13T11:00:00',
        clientName: 'Client A',
        isWorkEvent: true,
      }),
      createEvent({ 
        start: '2026-01-15T14:00:00', 
        end: '2026-01-15T15:30:00',
        clientName: 'Client B',
        isWorkEvent: true,
      }),
      // Outside range
      createEvent({ 
        start: '2026-01-20T09:00:00', 
        end: '2026-01-20T10:00:00',
        clientName: 'Client C',
        isWorkEvent: true,
      }),
    ];
    
    const metrics = calculateDateRangeMetrics(events, weekStart, weekEnd);
    expect(metrics.totalVisits).toBe(2);
    expect(metrics.totalHours).toBe(3.5);
    expect(metrics.uniqueClients).toBe(2);
  });
});

describe('calculateWeeklyHours', () => {
  it('calculates total work hours for a week', () => {
    const weekStart = new Date('2026-01-12T00:00:00');
    const weekEnd = new Date('2026-01-18T23:59:59.999');
    
    const events = [
      createEvent({ 
        start: '2026-01-13T09:00:00', 
        end: '2026-01-13T12:00:00', // 3 hours
        isWorkEvent: true,
      }),
      createEvent({ 
        start: '2026-01-14T10:00:00', 
        end: '2026-01-14T14:00:00', // 4 hours
        isWorkEvent: true,
      }),
      createEvent({ 
        start: '2026-01-15T09:00:00', 
        end: '2026-01-15T17:00:00', // 8 hours, but personal
        isWorkEvent: false,
      }),
    ];
    
    const hours = calculateWeeklyHours(events, weekStart, weekEnd);
    expect(hours).toBe(7); // Only work events: 3 + 4
  });

  it('clamps events that extend beyond week boundaries', () => {
    const weekStart = new Date('2026-01-12T00:00:00');
    const weekEnd = new Date('2026-01-18T23:59:59.999');
    
    const events = [
      createEvent({ 
        start: '2026-01-17T20:00:00', // Starts Friday evening
        end: '2026-01-19T08:00:00',   // Ends Sunday morning
        isWorkEvent: true,
      }),
    ];
    
    const hours = calculateWeeklyHours(events, weekStart, weekEnd);
    // Should only count Friday 8pm to Saturday midnight (end of week)
    // ~28 hours within the week boundary
    expect(hours).toBeCloseTo(28, 0);
  });
});

describe('Real-world scenario: Month with 124 visits', () => {
  it('calculates accurate hours for typical pet-sitting schedule', () => {
    // Simulate a busy month with various visit types
    const events: CalendarEvent[] = [];
    
    // Add 30-minute drop-ins (most common)
    for (let i = 0; i < 80; i++) {
      const day = (i % 28) + 1;
      const hour = 8 + (i % 8);
      events.push(createEvent({
        start: `2026-01-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`,
        end: `2026-01-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:30:00`,
        clientName: `Client ${(i % 20) + 1}`,
        isWorkEvent: true,
      }));
    }
    
    // Add 1-hour walks
    for (let i = 0; i < 30; i++) {
      const day = (i % 28) + 1;
      events.push(createEvent({
        start: `2026-01-${String(day).padStart(2, '0')}T10:00:00`,
        end: `2026-01-${String(day).padStart(2, '0')}T11:00:00`,
        clientName: `Client ${(i % 15) + 1}`,
        isWorkEvent: true,
      }));
    }
    
    // Add some overnight events (12 hours each)
    for (let i = 0; i < 10; i++) {
      const day = (i * 2) + 1;
      if (day <= 28) {
        events.push(createEvent({
          start: `2026-01-${String(day).padStart(2, '0')}T20:00:00`,
          end: `2026-01-${String(day + 1).padStart(2, '0')}T08:00:00`,
          clientName: `Client ${i + 1}`,
          isWorkEvent: true,
        }));
      }
    }
    
    // Add some non-work events that should NOT be counted
    for (let i = 0; i < 10; i++) {
      const day = (i % 28) + 1;
      events.push(createEvent({
        start: `2026-01-${String(day).padStart(2, '0')}T12:00:00`,
        end: `2026-01-${String(day).padStart(2, '0')}T13:00:00`,
        clientName: 'Lunch Break',
        isWorkEvent: false,
      }));
    }
    
    const metrics = calculateMonthlyMetrics(events, 2026, 0);
    
    // Should count only work events
    expect(metrics.totalVisits).toBe(120); // 80 + 30 + 10 work events
    
    // Hours: 80 * 0.5 + 30 * 1 + 10 * 12 = 40 + 30 + 120 = 190 hours
    expect(metrics.totalHours).toBe(190);
    
    // NOT 200 hours (which would include the 10 non-work events)
    expect(metrics.totalHours).not.toBe(200);
  });
});
