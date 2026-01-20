/**
 * Visit Record Model
 * Tracks the lifecycle and details of individual pet sitting visits
 * Links calendar events to actual visit completion status
 */
export type VisitStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface VisitRecord {
  id: string;
  eventId: string;
  calendarId: string;
  clientId?: string;
  petIds?: string[];
  status: VisitStatus;
  notes?: string;
  checkInAt?: string; // ISO date string
  checkOutAt?: string; // ISO date string
  lastSummarySentAt?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitRecordDto {
  eventId: string;
  calendarId: string;
  clientId?: string;
  petIds?: string[];
  status?: VisitStatus;
  notes?: string;
}

export interface UpdateVisitRecordDto {
  id: string;
  status?: VisitStatus;
  notes?: string;
  checkInAt?: string;
  checkOutAt?: string;
  lastSummarySentAt?: string;
  clientId?: string;
  petIds?: string[];
}

export interface VisitCheckInDto {
  id: string;
  checkInAt: string;
}

export interface VisitCheckOutDto {
  id: string;
  checkOutAt: string;
  notes?: string;
}
