/**
 * Multi-Event Service for Mobile
 * Generates multiple events (daily visits / overnight stays) from a config
 */

import { Template } from '@/models/template.model';

export type BookingType = 'daily-visits' | 'overnight-stay';

export interface VisitSlot {
  templateId: string;
  time: string; // HH:mm format
  duration: number; // minutes
}

export interface OvernightConfig {
  templateId: string;
  arrivalTime: string; // HH:mm
  departureTime: string; // HH:mm
}

export interface MultiEventConfig {
  clientName: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  bookingType: BookingType;
  visits: VisitSlot[];
  weekendVisits?: VisitSlot[];
  overnightConfig?: OvernightConfig;
}

export interface GeneratedEvent {
  title: string;
  start: Date;
  end: Date;
  templateId?: string;
  location?: string;
}

/**
 * Check if date is a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add minutes to a date
 */
function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Combine a date and time string into a single Date
 */
function combineDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map((n) => parseInt(n, 10));
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Build event title from client name and template
 */
function buildTitle(clientName: string, template?: Template): string {
  return template ? `${clientName} - ${template.name}` : clientName;
}

/**
 * Validate multi-event configuration
 */
export function validateMultiEventConfig(config: MultiEventConfig): string[] {
  const errors: string[] = [];
  
  if (!config.clientName?.trim()) {
    errors.push('Client name is required');
  }
  
  if (!config.startDate || !config.endDate) {
    errors.push('Start and end dates are required');
  }
  
  if (config.startDate && config.endDate && config.startDate > config.endDate) {
    errors.push('Start date must be before end date');
  }
  
  if (!config.visits?.length && config.bookingType === 'daily-visits') {
    errors.push('At least one visit slot is required');
  }
  
  if (config.bookingType === 'overnight-stay' && !config.overnightConfig) {
    errors.push('Overnight configuration is required for overnight stay');
  }
  
  return errors;
}

/**
 * Get visit slots for a specific date (handles weekday vs weekend)
 */
function getVisitSlotsForDate(config: MultiEventConfig, date: Date): VisitSlot[] {
  const isWeekendDay = isWeekend(date);
  if (isWeekendDay && config.weekendVisits?.length) {
    return config.weekendVisits;
  }
  return config.visits;
}

/**
 * Generate all events from a multi-event configuration
 */
export function generateMultiEvents(
  config: MultiEventConfig,
  templates: Template[]
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  
  const validationErrors = validateMultiEventConfig(config);
  if (validationErrors.length) {
    throw new Error(`Invalid config: ${validationErrors.join('; ')}`);
  }
  
  // Iterate through each day in the range
  for (
    let date = new Date(config.startDate);
    date <= config.endDate;
    date = addDays(date, 1)
  ) {
    // Get visit slots for this day
    const dayVisits = getVisitSlotsForDate(config, date);
    
    // Generate daily visits
    for (const slot of dayVisits) {
      const template = templates.find((t) => t.id === slot.templateId);
      const start = combineDateTime(date, slot.time);
      const duration = slot.duration || template?.duration || 30;
      const end = addMinutes(start, duration);
      
      events.push({
        title: buildTitle(config.clientName, template),
        start,
        end,
        templateId: slot.templateId,
        location: config.location,
      });
    }
    
    // Generate overnight stay events
    if (config.bookingType === 'overnight-stay' && config.overnightConfig) {
      const overnight = config.overnightConfig;
      const template = templates.find((t) => t.id === overnight.templateId);
      const start = combineDateTime(date, overnight.arrivalTime);
      const end = combineDateTime(addDays(date, 1), overnight.departureTime);
      
      events.push({
        title: buildTitle(config.clientName, template),
        start,
        end,
        templateId: overnight.templateId,
        location: config.location,
      });
    }
  }
  
  return events;
}

/**
 * Detect conflicts between generated events and existing events
 */
export function detectConflicts(
  existingEvents: Array<{ start: string | Date; end: string | Date }>,
  generatedEvents: GeneratedEvent[]
): GeneratedEvent[] {
  return generatedEvents.filter((gen) =>
    existingEvents.some((evt) => {
      const evtStart = new Date(evt.start);
      const evtEnd = new Date(evt.end);
      
      // Check for overlap
      return (
        gen.start < evtEnd && gen.end > evtStart
      );
    })
  );
}

/**
 * Format generated events for preview
 */
export function formatGeneratedEventsPreview(events: GeneratedEvent[]): string {
  const grouped = events.reduce((acc, event) => {
    const dateKey = event.start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, GeneratedEvent[]>);
  
  let preview = '';
  for (const [date, dayEvents] of Object.entries(grouped)) {
    preview += `${date}:\n`;
    for (const event of dayEvents) {
      const startTime = event.start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const endTime = event.end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      preview += `  • ${event.title} (${startTime} - ${endTime})\n`;
    }
  }
  
  return preview;
}

/**
 * Calculate total duration of all generated events
 */
export function calculateTotalDuration(events: GeneratedEvent[]): number {
  return events.reduce((total, event) => {
    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
    return total + duration;
  }, 0);
}

/**
 * Get summary statistics for generated events
 */
export function getMultiEventSummary(events: GeneratedEvent[]): {
  totalEvents: number;
  totalDays: number;
  totalMinutes: number;
  uniqueDates: string[];
} {
  const uniqueDates = [...new Set(
    events.map(e => e.start.toISOString().split('T')[0])
  )];
  
  return {
    totalEvents: events.length,
    totalDays: uniqueDates.length,
    totalMinutes: calculateTotalDuration(events),
    uniqueDates,
  };
}
