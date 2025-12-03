export type BookingType = 'daily-visits' | 'overnight-stay';

export interface VisitSlot {
  templateId: string;
  time: string; // HH:mm
  duration: number; // minutes
}

export interface OvernightConfig {
  templateId: string;
  arrivalTime: string; // HH:mm
  departureTime: string; // HH:mm
}

export interface DropinConfig {
  templateId: string;
  time: string; // HH:mm
  duration: number; // minutes
}

export interface MultiEventConfig {
  clientName: string;
  location: string;
  startDate: Date;
  endDate: Date;
  bookingType: BookingType;
  visits: VisitSlot[];
  weekendVisits?: VisitSlot[];
  overnightConfig?: OvernightConfig;
  dropinConfig?: DropinConfig;
}

export interface GeneratedEvent {
  title: string;
  start: Date;
  end: Date;
  templateId?: string;
}
