import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  getDay,
  startOfDay,
  endOfDay,
  getWeek,
  differenceInMinutes,
} from 'date-fns';
import { DataService, GoogleCalendarService, WorkloadService, EventProcessorService } from '../../core/services';
import { CalendarEvent, CalendarViewMode, WorkloadLevel, DateRange, getWorkloadLevel } from '../../models';
import { SkeletonLoaderComponent, EmptyStateComponent } from '../../shared';
import { firstValueFrom } from 'rxjs';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  workloadLevel: WorkloadLevel;
  workloadMinutes: number;
  weekNumber?: number;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatChipsModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  styleUrl: './calendar.component.scss',
  templateUrl: './calendar.component.html',
})
export class CalendarComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private workloadService = inject(WorkloadService);
  private eventProcessor = inject(EventProcessorService);
  private dialog = inject(MatDialog);

  // View state
  viewMode: CalendarViewMode = 'month';
  currentDate = signal<Date>(new Date());
  miniCalendarDate = signal<Date>(new Date());
  selectedDate = signal<Date>(new Date());
  isLoading = signal(false);
  isMobile = signal(false);
  selectedEvent = signal<CalendarEvent | null>(null);
  selectedDayForDetails = signal<CalendarDay | null>(null);

  // Events
  events = signal<CalendarEvent[]>([]);

  // Day names for header
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekDaysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Hours of day for time grid
  hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

  // Refresh listener
  private refreshListener: (() => void) | null = null;

  // date-fns format function exposed for template
  format = format;

  // Show week numbers setting
  showWeekNumbers = computed(() => this.dataService.settings().showWeekNumbers);

  // Computed: current view title
  currentTitle = computed(() => {
    const date = this.currentDate();
    switch (this.viewMode) {
      case 'month':
        return format(date, 'MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(date);
        const weekEnd = endOfWeek(date);
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, 'MMMM d') + ' - ' + format(weekEnd, 'd, yyyy');
        }
        return format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy');
      case 'day':
        return format(date, 'MMMM d, yyyy');
      default:
        return format(date, 'MMMM yyyy');
    }
  });

  // Computed: is connected to Google Calendar
  isConnected = computed(() => {
    return this.googleCalendarService.isSignedIn();
  });

  // Computed: calendar days for month view
  calendarDays = computed<CalendarDay[]>(() => {
    const date = this.currentDate();
    const selected = this.selectedDate();
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const allEvents = this.events();
    const thresholds = this.dataService.settings().thresholds;

    return days.map((day, index) => {
      const dayEvents = this.getEventsForDay(allEvents, day);
      const workEvents = dayEvents.filter(e => e.isWorkEvent);
      const workloadMinutes = this.calculateWorkMinutes(workEvents, day);
      const workloadHours = workloadMinutes / 60;
      const workloadLevel = getWorkloadLevel(workloadHours, 'daily', thresholds);

      return {
        date: day,
        isCurrentMonth: isSameMonth(day, date),
        isToday: isToday(day),
        isSelected: isSameDay(day, selected),
        events: dayEvents,
        workloadLevel,
        workloadMinutes,
        weekNumber: index % 7 === 0 ? getWeek(day) : undefined,
      };
    });
  });

  // Computed: mini calendar days
  miniCalendarDays = computed<CalendarDay[]>(() => {
    const date = this.miniCalendarDate();
    const selected = this.selectedDate();
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const allEvents = this.events();
    const thresholds = this.dataService.settings().thresholds;

    return days.map(day => {
      const dayEvents = this.getEventsForDay(allEvents, day);
      const workEvents = dayEvents.filter(e => e.isWorkEvent);
      const workloadMinutes = this.calculateWorkMinutes(workEvents, day);
      const workloadLevel = getWorkloadLevel(workloadMinutes / 60, 'daily', thresholds);

      return {
        date: day,
        isCurrentMonth: isSameMonth(day, date),
        isToday: isToday(day),
        isSelected: isSameDay(day, selected),
        events: dayEvents,
        workloadLevel,
        workloadMinutes,
      };
    });
  });

  // Computed: week view days
  weekViewDays = computed<CalendarDay[]>(() => {
    const date = this.currentDate();
    const selected = this.selectedDate();
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const allEvents = this.events();
    const thresholds = this.dataService.settings().thresholds;

    return days.map(day => {
      const dayEvents = this.getEventsForDay(allEvents, day);
      const workEvents = dayEvents.filter(e => e.isWorkEvent);
      const workloadMinutes = this.calculateWorkMinutes(workEvents, day);
      const workloadHours = workloadMinutes / 60;
      const workloadLevel = getWorkloadLevel(workloadHours, 'daily', thresholds);

      return {
        date: day,
        isCurrentMonth: true,
        isToday: isToday(day),
        isSelected: isSameDay(day, selected),
        events: dayEvents,
        workloadLevel,
        workloadMinutes,
      };
    });
  });

  // Computed: selected day events (for day view)
  selectedDayEvents = computed(() => {
    const date = this.currentDate();
    return this.getEventsForDay(this.events(), date)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  // Computed: selected day workload
  selectedDayWorkload = computed(() => {
    const date = this.currentDate();
    const dayEvents = this.getEventsForDay(this.events(), date);
    const workEvents = dayEvents.filter(e => e.isWorkEvent);
    const minutes = this.calculateWorkMinutes(workEvents, date);
    const thresholds = this.dataService.settings().thresholds;
    const level = getWorkloadLevel(minutes / 60, 'daily', thresholds);
    return { minutes, level };
  });

  // Computed: current day as CalendarDay (for day view)
  dayViewDay = computed<CalendarDay>(() => {
    const date = this.currentDate();
    const dayEvents = this.getEventsForDay(this.events(), date);
    const workEvents = dayEvents.filter(e => e.isWorkEvent);
    const workloadMinutes = this.calculateWorkMinutes(workEvents, date);
    const workloadHours = workloadMinutes / 60;
    const thresholds = this.dataService.settings().thresholds;
    const workloadLevel = getWorkloadLevel(workloadHours, 'daily', thresholds);

    return {
      date,
      isCurrentMonth: true,
      isToday: isToday(date),
      isSelected: true,
      events: dayEvents,
      workloadLevel,
      workloadMinutes,
    };
  });

  /**
   * Calculate total work minutes for events on a specific day
   */
  private calculateWorkMinutes(events: CalendarEvent[], date: Date): number {
    return events.reduce((total, event) => {
      return total + this.eventProcessor.calculateEventDurationForDay(event, date);
    }, 0);
  }

  async ngOnInit(): Promise<void> {
    if (this.googleCalendarService.isSignedIn()) {
      await this.loadEvents();
    }
  }

  async loadEvents(): Promise<void> {
    try {
      this.isLoading.set(true);

      // Ensure Google Calendar is initialized before loading events
      if (!this.googleCalendarService.isInitialized()) {
        const settings = this.dataService.settings();
        if (settings.googleClientId) {
          await this.googleCalendarService.initialize(settings.googleClientId);
        } else {
          console.warn('Cannot load events: Google Client ID not configured');
          return;
        }
      }

      const settings = this.dataService.settings();
      const dateRange = this.getViewDateRange();

      // Fetch events from selected calendars
      const events = await firstValueFrom(
        this.googleCalendarService.fetchEventsFromCalendars(settings.selectedCalendars, dateRange)
      );

      // Process events to add work event metadata
      const processedEvents = this.eventProcessor.processEvents(events ?? []);
      this.events.set(processedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshEvents(): Promise<void> {
    await this.loadEvents();
  }

  navigatePrevious(): void {
    this.navigateByPeriod(this.viewMode, -1);
  }

  navigateNext(): void {
    this.navigateByPeriod(this.viewMode, 1);
  }

  navigateByPeriod(period: 'day' | 'week' | 'month', direction: number): void {
    const date = this.currentDate();
    switch (period) {
      case 'month':
        this.currentDate.set(direction > 0 ? addMonths(date, 1) : subMonths(date, 1));
        break;
      case 'week':
        this.currentDate.set(direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1));
        break;
      case 'day':
      default:
        this.currentDate.set(direction > 0 ? addDays(date, 1) : subDays(date, 1));
        break;
    }
    this.loadEvents();
  }

  goToToday(): void {
    this.currentDate.set(new Date());
    this.loadEvents();
  }

  onViewModeChange(): void {
    // Events are already loaded for the current date range
  }

  selectDay(day: CalendarDay): void {
    // Open day details panel instead of switching view
    this.selectedDayForDetails.set(day);
    this.selectedDate.set(day.date);
  }

  closeDayDetails(): void {
    this.selectedDayForDetails.set(null);
  }

  viewDayFullscreen(day: CalendarDay): void {
    // Switch to full day view
    this.currentDate.set(day.date);
    this.viewMode = 'day';
    this.selectedDayForDetails.set(null);
  }

  getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
    return events.filter(event => {
      const eventStart = startOfDay(event.start);
      const eventEnd = startOfDay(event.end);
      const targetDay = startOfDay(date);

      // Event overlaps with this day
      return eventStart <= targetDay && eventEnd >= targetDay;
    });
  }

  getViewDateRange(): DateRange {
    const date = this.currentDate();
    switch (this.viewMode) {
      case 'month':
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        return {
          start: startOfWeek(monthStart),
          end: endOfWeek(monthEnd),
        };
      case 'week':
        return {
          start: startOfWeek(date),
          end: endOfWeek(date),
        };
      case 'day':
        return {
          start: startOfDay(date),
          end: endOfDay(date),
        };
      default:
        return {
          start: startOfMonth(date),
          end: endOfMonth(date),
        };
    }
  }

  formatWorkloadHours(minutes: number): string {
    const hours = Math.round(minutes / 60 * 10) / 10;
    return `${hours}h`;
  }

  getWorkloadTooltip(day: CalendarDay): string {
    const hours = Math.round(day.workloadMinutes / 60 * 10) / 10;
    const events = day.events.filter(e => e.isWorkEvent).length;
    return `${hours} hours of work (${events} appointments)`;
  }

  getEventTooltip(event: CalendarEvent): string {
    const time = format(event.start, 'h:mm a') + ' - ' + format(event.end, 'h:mm a');
    return `${event.title}\n${time}`;
  }

  ngOnDestroy(): void {
    if (this.refreshListener) {
      window.removeEventListener('refresh-calendar', this.refreshListener);
    }
  }

  // Keyboard navigation
  handleKeydown(event: KeyboardEvent): void {
    const date = this.currentDate();
    
    switch (event.key) {
      case 'ArrowLeft':
        if (event.ctrlKey || event.metaKey) {
          this.navigatePrevious();
        } else {
          this.currentDate.set(subDays(date, 1));
          this.selectedDate.set(subDays(this.selectedDate(), 1));
        }
        event.preventDefault();
        break;
      case 'ArrowRight':
        if (event.ctrlKey || event.metaKey) {
          this.navigateNext();
        } else {
          this.currentDate.set(addDays(date, 1));
          this.selectedDate.set(addDays(this.selectedDate(), 1));
        }
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.currentDate.set(subWeeks(date, 1));
        this.selectedDate.set(subWeeks(this.selectedDate(), 1));
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.currentDate.set(addWeeks(date, 1));
        this.selectedDate.set(addWeeks(this.selectedDate(), 1));
        event.preventDefault();
        break;
      case 'Home':
        this.goToToday();
        event.preventDefault();
        break;
      case 'Escape':
        this.closeEventDetails();
        break;
    }
  }

  // Mini calendar navigation
  navigateMiniPrevious(): void {
    this.miniCalendarDate.set(subMonths(this.miniCalendarDate(), 1));
  }

  navigateMiniNext(): void {
    this.miniCalendarDate.set(addMonths(this.miniCalendarDate(), 1));
  }

  selectMiniDay(day: CalendarDay): void {
    this.selectedDate.set(day.date);
    this.currentDate.set(day.date);
    // Open day details panel instead of switching view
    const calendarDay = this.calendarDays().find(d => isSameDay(d.date, day.date));
    if (calendarDay) {
      this.selectedDayForDetails.set(calendarDay);
    }
  }

  // Week number helper
  getWeekNumber(date: Date): number {
    return getWeek(date);
  }

  // Event details sidebar
  showEventDetails(event: CalendarEvent): void {
    this.selectedEvent.set(event);
  }

  closeEventDetails(): void {
    this.selectedEvent.set(null);
  }

  // Get events for a specific hour (for week/day time grid views)
  getEventsForHour(day: CalendarDay, hour: number): CalendarEvent[] {
    return day.events.filter(event => {
      const eventHour = event.start.getHours();
      return eventHour === hour;
    });
  }

  // Format hour for display
  formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  // Get ARIA label for day cell
  getDayAriaLabel(day: CalendarDay): string {
    const dateStr = format(day.date, 'EEEE, MMMM d, yyyy');
    const eventCount = day.events.length;
    const workHours = Math.round(day.workloadMinutes / 60 * 10) / 10;
    
    let label = dateStr;
    if (eventCount > 0) {
      label += `, ${eventCount} event${eventCount > 1 ? 's' : ''}`;
    }
    if (day.workloadMinutes > 0) {
      label += `, ${workHours} hours of work`;
    }
    if (day.isToday) {
      label = 'Today, ' + label;
    }
    return label;
  }

  // Get ARIA label for event
  getEventAriaLabel(event: CalendarEvent): string {
    const time = format(event.start, 'h:mm a');
    return `${event.title} at ${time}${event.isWorkEvent ? ', work appointment' : ''}`;
  }

  // Get service label from event
  getServiceLabel(serviceType: string): string {
    const labels: Record<string, string> = {
      'drop-in': 'Drop-in Visit',
      'walk': 'Dog Walking',
      'overnight': 'Overnight Stay',
      'housesit': 'House Sitting',
      'meet-greet': 'Meet & Greet',
      'nail-trim': 'Nail Trim',
      'other': 'Other Service',
    };
    return labels[serviceType] || serviceType;
  }

  // Get workload bar width percentage
  getWorkloadBarWidth(minutes: number): number {
    const maxMinutes = 8 * 60; // 8 hours
    return Math.min((minutes / maxMinutes) * 100, 100);
  }

  // Select day from week view
  selectDayFromWeek(day: CalendarDay): void {
    this.selectDay(day);
  }

  // Event position calculation for time grid (week/day views)
  getEventTop(event: CalendarEvent): string {
    const hours = event.start.getHours();
    const minutes = event.start.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const pixelsPerMinute = 48 / 60; // 48px per hour slot
    return `${totalMinutes * pixelsPerMinute}px`;
  }

  getEventHeight(event: CalendarEvent): string {
    const duration = differenceInMinutes(event.end, event.start);
    const pixelsPerMinute = 48 / 60;
    return `${Math.max(duration * pixelsPerMinute, 24)}px`; // Minimum 24px height
  }
}
