/**
 * Event Processor Service
 * Classifies events as work vs personal, extracts client/service info
 * Pure functions - no framework dependencies
 */

import {
  CalendarEvent,
  ServiceInfo,
  ServiceType,
  RawGoogleCalendarEvent,
} from '../models';
import {
  startOfDay,
  endOfDay,
  differenceInMinutes,
  isSameDay,
  isAfter,
  isBefore,
  differenceInCalendarDays,
} from 'date-fns';

// Work event patterns - indicates pet sitting work
const workEventPatterns = {
  // Duration suffixes (common naming: "Fluffy - 30")
  minutesSuffix: /\b(15|20|30|45|60)\b/i,
  // Meet and greet variations
  meetAndGreet: /\b(MG|M&G|Meet\s*&?\s*Greet)\b/i,
  // Housesit/overnight indicators
  housesitSuffix: /\b(HS|Housesit|House\s*sit)\b/i,
  overnight: /\b(ON|Overnight|Over\s*night)\b/i,
  // Specific services
  nailTrim: /\b(nail\s*trim|NT)\b/i,
  walk: /\b(walk|walking)\b/i,
  dropIn: /\b(drop[\s-]?in|visit)\b/i,
  // Pet/client name patterns (Name - Duration)
  petNamePattern: /^([A-Za-z]+(?:\s*(?:&|and|,)\s*[A-Za-z]+)*)\s*[-–—]\s*/i,
};

// Personal event patterns - definitely NOT work
const personalEventPatterns = {
  // Admin/business time (not client appointments)
  admin: /\b(admin|administration|administrative|paperwork|bookkeeping|billing)\b/i,
  // Off day markers
  offDay: /^\s*✨\s*off\s*✨/i,
  dayOff: /\b(day\s*off|off\s*day|no\s*work)\b/i,
  // Personal appointments
  doctor: /\b(doctor|dr\.|dentist|medical|appointment|appt)\b/i,
  personal: /\b(personal|private|family)\b/i,
  // Blocked time
  blocked: /\b(blocked|busy|unavailable|break)\b/i,
  // Holidays
  holiday: /\b(holiday|vacation|pto|time\s*off)\b/i,
  // Meals/breaks
  meals: /\b(lunch|dinner|breakfast|meal)\b/i,
  // Transportation
  travel: /\b(flight|airport|travel(?!.*time))\b/i,
  // Entertainment
  entertainment: /\b(movie|concert|show|game|party)\b/i,
  // Generic personal
  me: /\b(me time|self care|gym|workout|exercise)\b/i,
};

/**
 * Check if event is definitely personal (not work)
 */
export function isDefinitelyPersonal(title: string): boolean {
  for (const pattern of Object.values(personalEventPatterns)) {
    if (pattern.test(title)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if event title likely represents work (pet-sitting) based on patterns.
 */
function matchesWorkPattern(title: string): boolean {
  if (workEventPatterns.minutesSuffix.test(title)) return true;
  if (workEventPatterns.meetAndGreet.test(title)) return true;
  if (workEventPatterns.housesitSuffix.test(title)) return true;
  if (workEventPatterns.overnight.test(title)) return true;
  if (workEventPatterns.nailTrim.test(title)) return true;
  if (workEventPatterns.walk.test(title)) return true;
  if (workEventPatterns.dropIn.test(title)) return true;
  if (workEventPatterns.petNamePattern.test(title)) return true;
  return false;
}

/**
 * Determine if an event is a work event
 */
export function isWorkEvent(eventOrTitle: CalendarEvent | string): boolean {
  const title = typeof eventOrTitle === 'string' ? eventOrTitle : eventOrTitle.title;

  if (!title || title.trim().length === 0) {
    return false;
  }

  // First check if it's definitely personal
  if (isDefinitelyPersonal(title)) {
    return false;
  }

  // Check for work patterns
  return matchesWorkPattern(title);
}

/**
 * Determine if event is an overnight/housesit event
 */
export function isOvernightEvent(event: CalendarEvent): boolean {
  const title = event.title.toLowerCase();

  // Check by pattern
  if (
    workEventPatterns.housesitSuffix.test(title) ||
    workEventPatterns.overnight.test(title)
  ) {
    return true;
  }

  // Check by duration (events > 8 hours are likely overnight)
  const durationHours = differenceInMinutes(event.end, event.start) / 60;
  if (durationHours >= 8 && !isSameDay(event.start, event.end)) {
    return true;
  }

  return false;
}

/**
 * Calculate number of nights for an overnight event (min 1 when crossing midnight)
 */
export function calculateOvernightNights(event: CalendarEvent): number {
  if (!isOvernightEvent(event)) {
    return 0;
  }
  const nights = differenceInCalendarDays(event.end, event.start);
  return Math.max(1, nights);
}

/**
 * Calculate event duration for a specific day (handles multi-day events)
 * Overnight events are capped at 12 hours per day
 */
export function calculateEventDurationForDay(event: CalendarEvent, date: Date): number {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Event doesn't overlap with this day
  if (isAfter(event.start, dayEnd) || isBefore(event.end, dayStart)) {
    return 0;
  }

  // Calculate overlap
  const effectiveStart = isAfter(event.start, dayStart) ? event.start : dayStart;
  const effectiveEnd = isBefore(event.end, dayEnd) ? event.end : dayEnd;

  let minutes = differenceInMinutes(effectiveEnd, effectiveStart);

  // Cap overnight events at 12 hours per day
  if (isOvernightEvent(event)) {
    minutes = Math.min(minutes, 12 * 60);
  }

  return Math.max(0, minutes);
}

/**
 * Extract client/pet name from event title
 */
export function extractClientName(title: string): string {
  // Pattern: "PetName - Duration" or "PetName & PetName - Duration"
  const match = title.match(workEventPatterns.petNamePattern);
  if (match) {
    return match[1].trim();
  }

  // If no pattern match, use the whole title up to common separators
  const separators = [' - ', ' – ', ' — ', ' | ', ' @ '];
  for (const sep of separators) {
    const idx = title.indexOf(sep);
    if (idx > 0) {
      return title.substring(0, idx).trim();
    }
  }

  return title.trim();
}

/**
 * Extract service information from event title
 */
export function extractServiceInfo(title: string): ServiceInfo {
  const info: ServiceInfo = {
    type: 'other',
    duration: 30, // default
  };

  // Extract duration from title
  const durationMatch = title.match(/\b(15|20|30|45|60)\b/);
  if (durationMatch) {
    info.duration = parseInt(durationMatch[1], 10);
  }

  // Determine service type
  if (workEventPatterns.meetAndGreet.test(title)) {
    info.type = 'meet-greet';
    info.duration = info.duration || 30;
  } else if (workEventPatterns.housesitSuffix.test(title)) {
    info.type = 'housesit';
    info.duration = 1440; // 24 hours
  } else if (workEventPatterns.overnight.test(title)) {
    info.type = 'overnight';
    info.duration = 720; // 12 hours
  } else if (workEventPatterns.nailTrim.test(title)) {
    info.type = 'nail-trim';
    info.duration = info.duration || 15;
  } else if (workEventPatterns.walk.test(title)) {
    info.type = 'walk';
  } else if (workEventPatterns.dropIn.test(title)) {
    info.type = 'drop-in';
  } else if (durationMatch) {
    // Has duration, likely a drop-in
    info.type = 'drop-in';
  }

  // Extract pet name
  info.petName = extractClientName(title);

  return info;
}

/**
 * Process a raw event and add pet-genie metadata
 */
export function processEvent(event: CalendarEvent): CalendarEvent {
  const isWork = isWorkEvent(event);

  return {
    ...event,
    isWorkEvent: isWork,
    isOvernightEvent: isWork ? isOvernightEvent(event) : false,
    clientName: isWork ? extractClientName(event.title) : undefined,
    serviceInfo: isWork ? extractServiceInfo(event.title) : undefined,
  };
}

/**
 * Process multiple events
 */
export function processEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.map((event) => processEvent(event));
}

/**
 * Get service type display label
 */
export function getServiceTypeLabel(type: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    'drop-in': 'Drop-In Visit',
    walk: 'Walk',
    overnight: 'Overnight',
    housesit: 'Housesit',
    'meet-greet': 'Meet & Greet',
    'nail-trim': 'Nail Trim',
    other: 'Other',
  };
  return labels[type] || 'Other';
}

/**
 * Convert raw Google Calendar event to CalendarEvent
 */
export function parseRawGoogleEvent(
  raw: RawGoogleCalendarEvent,
  calendarId: string
): CalendarEvent {
  const isAllDay = !raw.start.dateTime;
  
  const start = isAllDay
    ? new Date(raw.start.date + 'T00:00:00')
    : new Date(raw.start.dateTime!);
    
  const end = isAllDay
    ? new Date(raw.end.date + 'T23:59:59')
    : new Date(raw.end.dateTime!);

  const event: CalendarEvent = {
    id: raw.id,
    calendarId,
    title: raw.summary || 'Untitled Event',
    description: raw.description,
    location: raw.location,
    start,
    end,
    allDay: isAllDay,
    recurringEventId: raw.recurringEventId,
    status: (raw.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
  };

  return processEvent(event);
}
