/**
 * EventProcessorService
 * Classifies events as work vs personal, extracts client/service info
 * 
 * CRITICAL: All regex patterns preserved from website EventProcessor
 * to ensure consistent event categorization across platforms
 */

import { CalendarEvent, ServiceInfo, ServiceType } from '@/models';

// Helper functions (avoiding date-fns dependency)
function differenceInMinutes(dateLeft: Date, dateRight: Date): number {
  return Math.round((dateLeft.getTime() - dateRight.getTime()) / (1000 * 60));
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function isSameDay(dateLeft: Date, dateRight: Date): boolean {
  return (
    dateLeft.getFullYear() === dateRight.getFullYear() &&
    dateLeft.getMonth() === dateRight.getMonth() &&
    dateLeft.getDate() === dateRight.getDate()
  );
}

/**
 * Work event patterns - indicates pet sitting work
 */
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

/**
 * Personal event patterns - definitely NOT work
 */
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
 * Event Processor Service
 */
export const EventProcessorService = {
  /**
   * Determine if an event is a work event
   */
  isWorkEvent(event: CalendarEvent | string): boolean {
    const title = typeof event === 'string' ? event : event.title;

    if (!title || title.trim().length === 0) {
      return false;
    }

    // First check if it's definitely personal
    if (this.isDefinitelyPersonal(title)) {
      return false;
    }

    // Check for work patterns
    return this.matchesWorkPattern(title);
  },

  /**
   * Check if event is definitely personal (not work)
   */
  isDefinitelyPersonal(title: string): boolean {
    for (const pattern of Object.values(personalEventPatterns)) {
      if (pattern.test(title)) {
        return true;
      }
    }
    return false;
  },

  /**
   * Returns true if event title likely represents work (pet-sitting) based on patterns.
   * This covers multi-pet names, duration suffixes, and explicit service markers.
   */
  matchesWorkPattern(title: string): boolean {
    if (workEventPatterns.minutesSuffix.test(title)) return true;
    if (workEventPatterns.meetAndGreet.test(title)) return true;
    if (workEventPatterns.housesitSuffix.test(title)) return true;
    if (workEventPatterns.overnight.test(title)) return true;
    if (workEventPatterns.nailTrim.test(title)) return true;
    if (workEventPatterns.walk.test(title)) return true;
    if (workEventPatterns.dropIn.test(title)) return true;
    if (workEventPatterns.petNamePattern.test(title)) return true;
    return false;
  },

  /**
   * Determine if event is an overnight/housesit event
   */
  isOvernightEvent(event: CalendarEvent): boolean {
    const title = event.title.toLowerCase();

    // Check by pattern
    if (
      workEventPatterns.housesitSuffix.test(title) ||
      workEventPatterns.overnight.test(title)
    ) {
      return true;
    }

    // Check by duration (events > 8 hours are likely overnight)
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const durationHours = differenceInMinutes(endDate, startDate) / 60;
    if (durationHours >= 8 && !isSameDay(startDate, endDate)) {
      return true;
    }

    return false;
  },

  /**
   * Calculate number of nights for an overnight event (min 1 when crossing midnight)
   */
  calculateOvernightNights(event: CalendarEvent): number {
    if (!this.isOvernightEvent(event)) {
      return 0;
    }
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const msPerDay = 24 * 60 * 60 * 1000;
    const nights = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
    return Math.max(1, nights);
  },

  /**
   * Calculate event duration for a specific day (handles multi-day events)
   * Overnight events are capped at 12 hours per day
   */
  calculateEventDurationForDay(event: CalendarEvent, date: Date): number {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Event doesn't overlap with this day
    if (eventStart > dayEnd || eventEnd < dayStart) {
      return 0;
    }

    // Calculate overlap
    const effectiveStart = eventStart > dayStart ? eventStart : dayStart;
    const effectiveEnd = eventEnd < dayEnd ? eventEnd : dayEnd;

    let minutes = differenceInMinutes(effectiveEnd, effectiveStart);

    // Cap overnight events at 12 hours per day
    if (this.isOvernightEvent(event)) {
      minutes = Math.min(minutes, 12 * 60);
    }

    return Math.max(0, minutes);
  },

  /**
   * Extract client/pet name from event title
   */
  extractClientName(title: string): string {
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
  },

  /**
   * Extract service information from event title
   */
  extractServiceInfo(title: string): ServiceInfo {
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
    info.petName = this.extractClientName(title);

    return info;
  },

  /**
   * Process a raw event and add pet-genie metadata
   */
  processEvent(event: CalendarEvent): CalendarEvent {
    const isWork = this.isWorkEvent(event);

    return {
      ...event,
      isWorkEvent: isWork,
      isOvernightEvent: isWork ? this.isOvernightEvent(event) : false,
      clientName: isWork ? this.extractClientName(event.title) : undefined,
      serviceInfo: isWork ? this.extractServiceInfo(event.title) : undefined,
    };
  },

  /**
   * Process multiple events
   */
  processEvents(events: CalendarEvent[]): CalendarEvent[] {
    return events.map((event) => this.processEvent(event));
  },

  /**
   * Get service type display label
   */
  getServiceTypeLabel(type: ServiceType): string {
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
  },
};

export default EventProcessorService;
