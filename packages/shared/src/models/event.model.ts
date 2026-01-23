/**
 * Calendar Event Models
 * Based on Google Calendar API event structure with pet-genie extensions
 * 
 * Shared between web and mobile applications
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO date string
  end: string; // ISO date string
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

/**
 * Extended event with visit record for UI display
 */
export interface VisitEvent extends CalendarEvent {
  visitRecord?: {
    id: string;
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    notes?: string;
    checkInAt?: string;
    checkOutAt?: string;
  };
  client?: {
    id: string;
    name: string;
  };
}
