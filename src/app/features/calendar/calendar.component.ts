import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
} from 'date-fns';
import { DataService, GoogleCalendarService, WorkloadService, EventProcessorService } from '../../core/services';
import { CalendarEvent, CalendarViewMode, WorkloadLevel, DateRange, getWorkloadLevel } from '../../models';
import { firstValueFrom } from 'rxjs';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  workloadLevel: WorkloadLevel;
  workloadMinutes: number;
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
  ],
  template: `
    <div class="calendar-container">
      <header class="calendar-header">
        <div class="header-left">
          <button mat-icon-button (click)="navigatePrevious()">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button mat-icon-button (click)="navigateNext()">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <h1>{{ currentTitle() }}</h1>
          <button mat-stroked-button (click)="goToToday()">Today</button>
        </div>
        <div class="header-right">
          <mat-button-toggle-group [(ngModel)]="viewMode" (change)="onViewModeChange()">
            <mat-button-toggle value="month">Month</mat-button-toggle>
            <mat-button-toggle value="week">Week</mat-button-toggle>
            <mat-button-toggle value="day">Day</mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-icon-button (click)="refreshEvents()" [disabled]="isLoading()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading events...</p>
        </div>
      }

      @if (!isConnected()) {
        <mat-card class="connection-prompt">
          <mat-card-content>
            <mat-icon>cloud_off</mat-icon>
            <h2>Connect Google Calendar</h2>
            <p>Connect your Google Calendar to view your pet sitting appointments.</p>
            <a mat-raised-button color="primary" routerLink="/settings">
              Go to Settings
            </a>
          </mat-card-content>
        </mat-card>
      } @else {
        @switch (viewMode) {
          @case ('month') {
            <div class="month-view">
              <div class="weekday-headers">
                @for (day of weekDays; track day) {
                  <div class="weekday-header">{{ day }}</div>
                }
              </div>
              <div class="days-grid">
                @for (day of calendarDays(); track day.date.toISOString()) {
                  <div
                    class="calendar-day"
                    [class.other-month]="!day.isCurrentMonth"
                    [class.today]="day.isToday"
                    [class.has-events]="day.events.length > 0"
                    [class.workload-comfortable]="day.workloadLevel === 'comfortable'"
                    [class.workload-busy]="day.workloadLevel === 'busy'"
                    [class.workload-high]="day.workloadLevel === 'high'"
                    [class.workload-burnout]="day.workloadLevel === 'burnout'"
                    (click)="selectDay(day)"
                  >
                    <div class="day-header">
                      <span class="day-number">{{ format(day.date, 'd') }}</span>
                      @if (day.workloadMinutes > 0) {
                        <span class="workload-indicator" [matTooltip]="getWorkloadTooltip(day)">
                          {{ formatWorkloadHours(day.workloadMinutes) }}
                        </span>
                      }
                    </div>
                    <div class="day-events">
                      @for (event of day.events.slice(0, 3); track event.id) {
                        <div
                          class="event-chip"
                          [class.work-event]="event.isWorkEvent"
                          [matTooltip]="getEventTooltip(event)"
                        >
                          {{ event.title }}
                        </div>
                      }
                      @if (day.events.length > 3) {
                        <div class="more-events">+{{ day.events.length - 3 }} more</div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @case ('week') {
            <div class="week-view">
              <div class="week-header">
                @for (day of weekViewDays(); track day.date.toISOString()) {
                  <div class="week-day-header" [class.today]="day.isToday">
                    <span class="day-name">{{ format(day.date, 'EEE') }}</span>
                    <span class="day-number">{{ format(day.date, 'd') }}</span>
                    @if (day.workloadMinutes > 0) {
                      <span class="workload-badge" [class]="'workload-' + day.workloadLevel">
                        {{ formatWorkloadHours(day.workloadMinutes) }}
                      </span>
                    }
                  </div>
                }
              </div>
              <div class="week-body">
                @for (day of weekViewDays(); track day.date.toISOString()) {
                  <div class="week-day-column">
                    @for (event of day.events; track event.id) {
                      <div
                        class="week-event"
                        [class.work-event]="event.isWorkEvent"
                        [class.overnight-event]="event.isOvernightEvent"
                      >
                        <div class="event-time">
                          {{ format(event.start, 'h:mm a') }}
                        </div>
                        <div class="event-title">{{ event.title }}</div>
                        @if (event.clientName) {
                          <div class="event-client">{{ event.clientName }}</div>
                        }
                      </div>
                    }
                    @if (day.events.length === 0) {
                      <div class="no-events">No events</div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          @case ('day') {
            <div class="day-view">
              <div class="day-view-header">
                <h2>{{ format(currentDate(), 'EEEE, MMMM d, yyyy') }}</h2>
                @if (selectedDayWorkload()) {
                  <span class="day-workload" [class]="'workload-' + selectedDayWorkload()!.level">
                    {{ formatWorkloadHours(selectedDayWorkload()!.minutes) }} scheduled
                  </span>
                }
              </div>
              <div class="day-events-list">
                @for (event of selectedDayEvents(); track event.id) {
                  <mat-card class="day-event-card" [class.work-event]="event.isWorkEvent">
                    <mat-card-content>
                      <div class="event-time-range">
                        {{ format(event.start, 'h:mm a') }} - {{ format(event.end, 'h:mm a') }}
                      </div>
                      <h3>{{ event.title }}</h3>
                      @if (event.clientName) {
                        <p class="event-client">
                          <mat-icon>pets</mat-icon>
                          {{ event.clientName }}
                        </p>
                      }
                      @if (event.serviceInfo) {
                        <p class="event-service">
                          <mat-icon>schedule</mat-icon>
                          {{ event.serviceInfo.duration }} minutes
                        </p>
                      }
                      @if (event.location) {
                        <p class="event-location">
                          <mat-icon>location_on</mat-icon>
                          {{ event.location }}
                        </p>
                      }
                    </mat-card-content>
                  </mat-card>
                } @empty {
                  <div class="no-events-day">
                    <mat-icon>event_busy</mat-icon>
                    <p>No events scheduled for this day</p>
                  </div>
                }
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .calendar-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-left h1 {
      margin: 0 16px;
      font-size: 24px;
      font-weight: 500;
      min-width: 200px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: var(--on-surface-variant);
    }

    .loading-overlay p {
      margin-top: 16px;
    }

    .connection-prompt {
      text-align: center;
      padding: 48px;
    }

    .connection-prompt mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--outline);
    }

    .connection-prompt h2 {
      margin: 16px 0 8px;
    }

    .connection-prompt p {
      margin-bottom: 24px;
      color: var(--on-surface-variant);
    }

    /* Month View */
    .month-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-radius: 12px;
      border: 1px solid var(--outline-variant);
      overflow: hidden;
    }

    .weekday-headers {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: var(--surface-container);
      border-bottom: 1px solid var(--outline-variant);
    }

    .weekday-header {
      padding: 12px;
      text-align: center;
      font-weight: 500;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--on-surface-variant);
    }

    .days-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-auto-rows: minmax(100px, 1fr);
    }

    .calendar-day {
      border-right: 1px solid var(--outline-variant);
      border-bottom: 1px solid var(--outline-variant);
      padding: 4px;
      cursor: pointer;
      transition: background-color 0.15s;
      min-height: 100px;
    }

    .calendar-day:hover {
      background: var(--surface-container-low);
    }

    .calendar-day:nth-child(7n) {
      border-right: none;
    }

    .calendar-day.other-month {
      background: var(--surface-container-lowest);
    }

    .calendar-day.other-month .day-number {
      color: var(--outline);
    }

    .calendar-day.today .day-number {
      background: var(--primary);
      color: var(--on-primary);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .calendar-day.workload-comfortable { border-left: 3px solid #10B981; }
    .calendar-day.workload-busy { border-left: 3px solid #F59E0B; }
    .calendar-day.workload-high { border-left: 3px solid #F97316; }
    .calendar-day.workload-burnout { border-left: 3px solid #EF4444; }

    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .day-number {
      font-size: 14px;
      font-weight: 500;
      padding: 2px 6px;
    }

    .workload-indicator {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--surface-container);
      color: var(--on-surface-variant);
    }

    .day-events {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .event-chip {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--surface-container-high);
      color: var(--on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-chip.work-event {
      background: var(--primary-container);
      color: var(--on-primary-container);
    }

    .more-events {
      font-size: 11px;
      color: var(--on-surface-variant);
      padding: 2px 6px;
    }

    /* Week View */
    .week-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-radius: 12px;
      border: 1px solid var(--outline-variant);
      overflow: hidden;
    }

    .week-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: var(--surface-container);
      border-bottom: 1px solid var(--outline-variant);
    }

    .week-day-header {
      padding: 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .week-day-header.today {
      background: var(--primary-container);
    }

    .week-day-header .day-name {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--on-surface-variant);
    }

    .week-day-header .day-number {
      font-size: 20px;
      font-weight: 500;
    }

    .workload-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .workload-badge.workload-comfortable { background: #10B981; color: white; }
    .workload-badge.workload-busy { background: #F59E0B; color: white; }
    .workload-badge.workload-high { background: #F97316; color: white; }
    .workload-badge.workload-burnout { background: #EF4444; color: white; }

    .week-body {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      min-height: 400px;
    }

    .week-day-column {
      border-right: 1px solid var(--outline-variant);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
    }

    .week-day-column:last-child {
      border-right: none;
    }

    .week-event {
      padding: 8px;
      border-radius: 8px;
      background: var(--surface-container-high);
      border-left: 3px solid var(--outline);
    }

    .week-event.work-event {
      background: var(--primary-container);
      border-left-color: var(--primary);
    }

    .week-event.overnight-event {
      border-left-color: #8B5CF6;
    }

    .event-time {
      font-size: 11px;
      color: var(--on-surface-variant);
    }

    .event-title {
      font-size: 13px;
      font-weight: 500;
      margin-top: 2px;
    }

    .event-client {
      font-size: 11px;
      color: var(--on-surface-variant);
      margin-top: 2px;
    }

    .no-events {
      text-align: center;
      padding: 24px 8px;
      color: var(--outline);
      font-size: 12px;
    }

    /* Day View */
    .day-view {
      flex: 1;
    }

    .day-view-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .day-view-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .day-workload {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    .day-workload.workload-comfortable { background: #10B981; color: white; }
    .day-workload.workload-busy { background: #F59E0B; color: white; }
    .day-workload.workload-high { background: #F97316; color: white; }
    .day-workload.workload-burnout { background: #EF4444; color: white; }

    .day-events-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .day-event-card {
      border-left: 4px solid var(--outline);
    }

    .day-event-card.work-event {
      border-left-color: var(--primary);
    }

    .day-event-card .event-time-range {
      font-size: 12px;
      color: var(--on-surface-variant);
      margin-bottom: 4px;
    }

    .day-event-card h3 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 500;
    }

    .day-event-card p {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
      font-size: 14px;
      color: var(--on-surface-variant);
    }

    .day-event-card mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .no-events-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: var(--outline);
    }

    .no-events-day mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }
  `],
})
export class CalendarComponent implements OnInit {
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private workloadService = inject(WorkloadService);
  private eventProcessor = inject(EventProcessorService);

  // View state
  viewMode: CalendarViewMode = 'month';
  currentDate = signal<Date>(new Date());
  isLoading = signal(false);

  // Events
  events = signal<CalendarEvent[]>([]);

  // Day names for header
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // date-fns format function exposed for template
  format = format;

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
      const workloadHours = workloadMinutes / 60;
      const workloadLevel = getWorkloadLevel(workloadHours, 'daily', thresholds);

      return {
        date: day,
        isCurrentMonth: isSameMonth(day, date),
        isToday: isToday(day),
        events: dayEvents,
        workloadLevel,
        workloadMinutes,
      };
    });
  });

  // Computed: week view days
  weekViewDays = computed<CalendarDay[]>(() => {
    const date = this.currentDate();
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
    const date = this.currentDate();
    switch (this.viewMode) {
      case 'month':
        this.currentDate.set(subMonths(date, 1));
        break;
      case 'week':
        this.currentDate.set(subWeeks(date, 1));
        break;
      case 'day':
        this.currentDate.set(subDays(date, 1));
        break;
    }
    this.loadEvents();
  }

  navigateNext(): void {
    const date = this.currentDate();
    switch (this.viewMode) {
      case 'month':
        this.currentDate.set(addMonths(date, 1));
        break;
      case 'week':
        this.currentDate.set(addWeeks(date, 1));
        break;
      case 'day':
        this.currentDate.set(addDays(date, 1));
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
    this.currentDate.set(day.date);
    this.viewMode = 'day';
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
}
