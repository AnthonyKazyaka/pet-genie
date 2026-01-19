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
  checkInAt?: Date;
  checkOutAt?: Date;
  lastSummarySentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  checkInAt?: Date;
  checkOutAt?: Date;
  lastSummarySentAt?: Date;
  clientId?: string;
  petIds?: string[];
}

export interface VisitCheckInDto {
  id: string;
  checkInAt: Date;
}

export interface VisitCheckOutDto {
  id: string;
  checkOutAt: Date;
  notes?: string;
}
