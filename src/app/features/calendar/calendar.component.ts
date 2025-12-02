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
  styleUrl: './calendar.component.css',
  template: `
    <div class="calendar-container" (keydown)="handleKeydown($event)">
      <header class="calendar-header">
        <div class="header-left">
          <button mat-icon-button (click)="navigatePrevious()" aria-label="Previous">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button mat-icon-button (click)="navigateNext()" aria-label="Next">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <h1>{{ currentTitle() }}</h1>
          <button mat-stroked-button (click)="goToToday()">Today</button>
        </div>
        <div class="header-right">
          <mat-button-toggle-group [(ngModel)]="viewMode" (change)="onViewModeChange()" aria-label="Calendar view">
            <mat-button-toggle value="month">Month</mat-button-toggle>
            <mat-button-toggle value="week">Week</mat-button-toggle>
            <mat-button-toggle value="day">Day</mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-icon-button (click)="refreshEvents()" [disabled]="isLoading()" aria-label="Refresh">
            <mat-icon [class.spinning]="isLoading()">refresh</mat-icon>
          </button>
        </div>
      </header>

      @if (!isConnected()) {
        <app-empty-state
          icon="cloud_off"
          title="Connect Google Calendar"
          description="Connect your Google Calendar to view your pet sitting appointments."
          actionLabel="Go to Settings"
          actionLink="/settings"
          actionIcon="settings"
        ></app-empty-state>
      } @else if (isLoading()) {
        <div class="loading-overlay">
          <app-skeleton-loader type="calendar"></app-skeleton-loader>
        </div>
      } @else {
        <div class="calendar-layout">
          <!-- Mini Calendar (sidebar) -->
          <aside class="mini-calendar-sidebar" *ngIf="viewMode !== 'month' && !isMobile()">
            <div class="mini-calendar">
              <div class="mini-header">
                <button mat-icon-button (click)="navigateMiniPrevious()" aria-label="Previous month">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <span>{{ format(miniCalendarDate(), 'MMM yyyy') }}</span>
                <button mat-icon-button (click)="navigateMiniNext()" aria-label="Next month">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
              <div class="mini-weekdays">
                @for (day of weekDaysShort; track day) {
                  <span>{{ day }}</span>
                }
              </div>
              <div class="mini-days">
                @for (day of miniCalendarDays(); track day.date.toISOString()) {
                  <button
                    class="mini-day"
                    [class.other-month]="!day.isCurrentMonth"
                    [class.today]="day.isToday"
                    [class.selected]="day.isSelected"
                    [class.has-events]="day.events.length > 0"
                    (click)="selectMiniDay(day)"
                  >
                    {{ format(day.date, 'd') }}
                  </button>
                }
              </div>
            </div>

            <!-- Workload Summary -->
            <div class="workload-summary">
              <h3>Workload Summary</h3>
              <div class="workload-legend">
                <div class="legend-item">
                  <span class="legend-color comfortable"></span>
                  <span>Comfortable</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color busy"></span>
                  <span>Busy</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color high"></span>
                  <span>High</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color burnout"></span>
                  <span>Burnout</span>
                </div>
              </div>
            </div>
          </aside>

          <!-- Main Calendar View -->
          <div class="calendar-main">
            @switch (viewMode) {
              @case ('month') {
                <div class="month-view" role="grid" aria-label="Calendar month view">
                  <div class="weekday-headers" role="row">
                    @if (showWeekNumbers()) {
                      <div class="week-number-header" role="columnheader">Wk</div>
                    }
                    @for (day of weekDays; track day) {
                      <div class="weekday-header" role="columnheader">{{ day }}</div>
                    }
                  </div>
                  <div class="days-grid">
                    @for (day of calendarDays(); track day.date.toISOString(); let i = $index) {
                      @if (showWeekNumbers() && i % 7 === 0) {
                        <div class="week-number">{{ getWeekNumber(day.date) }}</div>
                      }
                      <div
                        class="calendar-day"
                        [class.other-month]="!day.isCurrentMonth"
                        [class.today]="day.isToday"
                        [class.selected]="day.isSelected"
                        [class.has-events]="day.events.length > 0"
                        [class.workload-comfortable]="day.workloadLevel === 'comfortable' && day.workloadMinutes > 0"
                        [class.workload-busy]="day.workloadLevel === 'busy'"
                        [class.workload-high]="day.workloadLevel === 'high'"
                        [class.workload-burnout]="day.workloadLevel === 'burnout'"
                        (click)="selectDay(day)"
                        (keydown.enter)="selectDay(day)"
                        (keydown.space)="selectDay(day); $event.preventDefault()"
                        tabindex="0"
                        role="gridcell"
                        [attr.aria-label]="getDayAriaLabel(day)"
                        [attr.aria-selected]="day.isSelected"
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
                              [class.overnight]="event.isOvernightEvent"
                              [matTooltip]="getEventTooltip(event)"
                              (click)="showEventDetails(event)"
                            >
                              <mat-icon class="chip-icon">{{ event.isWorkEvent ? 'pets' : 'event' }}</mat-icon>
                              <span class="event-time">{{ format(event.start, 'h:mma').toLowerCase() }}</span>
                              <span class="event-title">{{ event.title }}</span>
                              @if (event.clientName) {
                                <span class="event-client">· {{ event.clientName }}</span>
                              }
                            </div>
                          }
                          @if (day.events.length > 3) {
                            <div class="more-events" (click)="selectDay(day); $event.stopPropagation()">
                              +{{ day.events.length - 3 }} more
                            </div>
                          }
                        </div>
                        <!-- Workload bar indicator -->
                        @if (day.workloadMinutes > 0) {
                          <div 
                            class="workload-bar" 
                            [class]="'workload-' + day.workloadLevel"
                            [style.width.%]="getWorkloadBarWidth(day.workloadMinutes)"
                          ></div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              @case ('week') {
                <div class="week-view" role="grid" aria-label="Calendar week view">
                  <div class="week-header" role="row">
                    @if (showWeekNumbers()) {
                      <div class="week-number-header">Wk {{ getWeekNumber(currentDate()) }}</div>
                    }
                    @for (day of weekViewDays(); track day.date.toISOString()) {
                      <div 
                        class="week-day-header" 
                        [class.today]="day.isToday"
                        [class.selected]="day.isSelected"
                        role="columnheader"
                      >
                        <span class="day-name">{{ format(day.date, 'EEE') }}</span>
                        <span class="day-number" [class.today-number]="day.isToday">{{ format(day.date, 'd') }}</span>
                        @if (day.workloadMinutes > 0) {
                          <span class="workload-badge" [class]="'workload-' + day.workloadLevel">
                            {{ formatWorkloadHours(day.workloadMinutes) }}
                          </span>
                        }
                      </div>
                    }
                  </div>
                  
                  <!-- Time grid -->
                  <div class="week-time-grid">
                    <div class="time-column">
                      @for (hour of hoursOfDay; track hour) {
                        <div class="time-slot">
                          <span class="time-label">{{ formatHour(hour) }}</span>
                        </div>
                      }
                    </div>
                    <div class="week-body">
                      @for (day of weekViewDays(); track day.date.toISOString()) {
                        <div 
                          class="week-day-column"
                          [class.today]="day.isToday"
                          (click)="selectDayFromWeek(day)"
                        >
                          <!-- Time slots background -->
                          @for (hour of hoursOfDay; track hour) {
                            <div class="hour-slot"></div>
                          }
                          <!-- Events positioned by time -->
                          @for (event of day.events; track event.id) {
                            <div
                              class="week-event"
                              [class.work-event]="event.isWorkEvent"
                              [class.overnight-event]="event.isOvernightEvent"
                              [style.top.px]="getEventTop(event)"
                              [style.height.px]="getEventHeight(event)"
                              [matTooltip]="getEventTooltip(event)"
                              (click)="showEventDetails(event)"
                            >
                              <div class="event-time">{{ format(event.start, 'h:mm a') }}</div>
                              <div class="event-title">{{ event.title }}</div>
                              @if (event.clientName) {
                                <div class="event-client">{{ event.clientName }}</div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }

              @case ('day') {
                <div class="day-view">
                  <div class="day-view-header">
                    <h2>{{ format(currentDate(), 'EEEE, MMMM d, yyyy') }}</h2>
                    @if (selectedDayWorkload()) {
                      <mat-chip-set>
                        <mat-chip [class]="'workload-chip workload-' + selectedDayWorkload()!.level">
                          <mat-icon>schedule</mat-icon>
                          {{ formatWorkloadHours(selectedDayWorkload()!.minutes) }} scheduled
                        </mat-chip>
                        <mat-chip>
                          <mat-icon>event</mat-icon>
                          {{ selectedDayEvents().length }} {{ selectedDayEvents().length === 1 ? 'event' : 'events' }}
                        </mat-chip>
                      </mat-chip-set>
                    }
                  </div>
                  
                  <!-- Time-based day view -->
                  <div class="day-time-grid">
                    @for (hour of hoursOfDay; track hour) {
                      <div class="day-hour-row">
                        <div class="hour-label">{{ formatHour(hour) }}</div>
                        <div class="hour-content">
                          @for (event of getEventsForHour(dayViewDay(), hour); track event.id) {
                            <mat-card 
                              class="day-event-card" 
                              [class.work-event]="event.isWorkEvent"
                              (click)="showEventDetails(event)"
                              tabindex="0"
                              role="article"
                              [attr.aria-label]="getEventAriaLabel(event)"
                            >
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
                          }
                        </div>
                      </div>
                    }
                  </div>

                  @if (selectedDayEvents().length === 0) {
                    <app-empty-state
                      icon="event_busy"
                      title="No events scheduled"
                      description="You have no appointments scheduled for this day."
                      [compact]="true"
                    ></app-empty-state>
                  }
                </div>
              }
            }
          </div>

          <!-- Event Details Sidebar -->
          @if (selectedEvent()) {
            <aside class="event-details-sidebar" role="complementary" aria-label="Event details">
              <div class="sidebar-header">
                <h3>Event Details</h3>
                <button mat-icon-button (click)="closeEventDetails()" aria-label="Close">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <div class="sidebar-content">
                <div class="event-detail-title">
                  <mat-icon [class.work-icon]="selectedEvent()!.isWorkEvent">
                    {{ selectedEvent()!.isWorkEvent ? 'pets' : 'event' }}
                  </mat-icon>
                  <h4>{{ selectedEvent()!.title }}</h4>
                </div>

                <div class="event-detail-row">
                  <mat-icon>schedule</mat-icon>
                  <div>
                    <div>{{ format(selectedEvent()!.start, 'EEEE, MMMM d, yyyy') }}</div>
                    <div class="detail-secondary">
                      {{ format(selectedEvent()!.start, 'h:mm a') }} - {{ format(selectedEvent()!.end, 'h:mm a') }}
                    </div>
                  </div>
                </div>

                @if (selectedEvent()!.clientName) {
                  <div class="event-detail-row">
                    <mat-icon>person</mat-icon>
                    <div>{{ selectedEvent()!.clientName }}</div>
                  </div>
                }

                @if (selectedEvent()!.location) {
                  <div class="event-detail-row">
                    <mat-icon>location_on</mat-icon>
                    <div>{{ selectedEvent()!.location }}</div>
                  </div>
                }

                @if (selectedEvent()!.serviceInfo) {
                  <div class="event-detail-row">
                    <mat-icon>category</mat-icon>
                    <div>
                      <div>{{ getServiceLabel(selectedEvent()!.serviceInfo!.type) }}</div>
                      <div class="detail-secondary">{{ selectedEvent()!.serviceInfo!.duration }} minutes</div>
                    </div>
                  </div>
                }

                @if (selectedEvent()!.description) {
                  <div class="event-detail-row description">
                    <mat-icon>notes</mat-icon>
                    <div>{{ selectedEvent()!.description }}</div>
                  </div>
                }
              </div>
            </aside>
          }

          @if (selectedDayForDetails()) {
            <aside class="day-details-sidebar" role="complementary" aria-label="Day details">
              <div class="sidebar-header">
                <h3>{{ format(selectedDayForDetails()!.date, 'EEEE, MMMM d') }}</h3>
                <div class="header-actions">
                  <button mat-icon-button (click)="viewDayFullscreen(selectedDayForDetails()!)" 
                          aria-label="View full day" matTooltip="Full day view">
                    <mat-icon>open_in_full</mat-icon>
                  </button>
                  <button mat-icon-button (click)="closeDayDetails()" aria-label="Close">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
              <div class="sidebar-content">
                @if (selectedDayForDetails()!.events.length === 0) {
                  <div class="empty-day">
                    <mat-icon>event_available</mat-icon>
                    <p>No appointments scheduled</p>
                  </div>
                } @else {
                  <div class="day-summary">
                    <div class="summary-stat">
                      <mat-icon>event</mat-icon>
                      <span>{{ selectedDayForDetails()!.events.length }} appointment{{ selectedDayForDetails()!.events.length !== 1 ? 's' : '' }}</span>
                    </div>
                    @if (selectedDayForDetails()!.workloadMinutes > 0) {
                      <div class="summary-stat">
                        <mat-icon>schedule</mat-icon>
                        <span>{{ (selectedDayForDetails()!.workloadMinutes / 60).toFixed(1) }} hours</span>
                      </div>
                    }
                  </div>

                  <div class="day-events-list">
                    @for (event of selectedDayForDetails()!.events; track event.id) {
                      <div class="day-event-item" (click)="showEventDetails(event)">
                        <div class="event-time">
                          {{ format(event.start, 'h:mm a') }}
                        </div>
                        <div class="event-info">
                          <div class="event-title">
                            <mat-icon class="event-icon" [class.work-icon]="event.isWorkEvent">
                              {{ event.isWorkEvent ? 'pets' : 'event' }}
                            </mat-icon>
                            {{ event.title }}
                          </div>
                          @if (event.clientName) {
                            <div class="event-client">{{ event.clientName }}</div>
                          }
                          @if (event.serviceInfo) {
                            <div class="event-service">
                              {{ getServiceLabel(event.serviceInfo.type) }} · {{ event.serviceInfo.duration }}min
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </aside>
          }
        </div>
      }
    </div>
  `,
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
