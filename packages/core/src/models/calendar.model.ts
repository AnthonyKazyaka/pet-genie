/**
 * Calendar View Models
 * For rendering calendar grids and managing view state
 */

import { CalendarEvent } from './event.model';
import { WorkloadLevel } from './workload.model';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  events: CalendarEvent[];
  workloadLevel: WorkloadLevel;
  totalWorkMinutes: number;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
  startDate: Date;
  endDate: Date;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-indexed
  name: string;
  weeks: CalendarWeek[];
}

export interface CalendarViewState {
  viewType: 'month' | 'week' | 'day' | 'list';
  currentDate: Date;
  selectedDate: Date | null;
  visibleRange: {
    start: Date;
    end: Date;
  };
}

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
  events: CalendarEvent[];
}

export interface DaySchedule {
  date: Date;
  timeSlots: TimeSlot[];
  allDayEvents: CalendarEvent[];
}

/**
 * Multi-day event rendering info
 */
export interface MultiDayEventSpan {
  event: CalendarEvent;
  startColumn: number; // 0-6 for week view
  columnSpan: number;
  isStart: boolean;
  isEnd: boolean;
  row: number; // For stacking multiple events
}
