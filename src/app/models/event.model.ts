/**
 * Calendar Event Models
 * Based on Google Calendar API event structure with pet-genie extensions
 */

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  recurringEventId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  // Pet-genie extensions
  isWorkEvent?: boolean;
  isOvernightEvent?: boolean;
  clientName?: string;
  serviceInfo?: ServiceInfo;
  color?: string;
}

export interface ServiceInfo {
  type: ServiceType;
  duration: number; // in minutes
  petName?: string;
  notes?: string;
}

export type ServiceType =
  | 'drop-in'
  | 'walk'
  | 'overnight'
  | 'housesit'
  | 'meet-greet'
  | 'nail-trim'
  | 'other';

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  selected?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface EventFilter {
  calendarIds?: string[];
  dateRange?: DateRange;
  workEventsOnly?: boolean;
  excludeIgnored?: boolean;
}

/**
 * Raw Google Calendar API event structure
 */
export interface RawGoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  recurringEventId?: string;
  colorId?: string;
}
