import { Component, inject, computed, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataService, WorkloadService, GoogleCalendarService, EventProcessorService } from '../../core/services';
import { CalendarEvent, DateRange } from '../../models';
import { SkeletonLoaderComponent, EmptyStateComponent } from '../../shared';
import { firstValueFrom } from 'rxjs';
import { format, startOfDay, endOfDay, addDays, isToday, isTomorrow } from 'date-fns';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatStepperModule,
    MatTooltipModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  styleUrl: './dashboard.component.scss',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  private workloadService = inject(WorkloadService);
  private googleCalendarService = inject(GoogleCalendarService);
  private eventProcessor = inject(EventProcessorService);
  private router = inject(Router);

  isLoading = signal(false);
  events = signal<CalendarEvent[]>([]);
  private refreshListener: (() => void) | null = null;

  // Connection status
  isConnected = computed(() => this.googleCalendarService.isSignedIn());

  // Setup progress tracking
  hasCalendarsSelected = computed(() => {
    const settings = this.dataService.settings();
    return settings.selectedCalendars.length > 0;
  });

  hasTemplates = computed(() => {
    // For now, we assume templates exist if connected
    return true;
  });

  hasCustomThresholds = computed(() => {
    const settings = this.dataService.settings();
    // Check if thresholds differ from defaults
    return settings.thresholds.daily.comfortable !== 4 || 
           settings.thresholds.weekly.comfortable !== 20;
  });

  hasCompletedSetup = computed(() => {
    return this.isConnected() && 
           this.hasCalendarsSelected() && 
           this.hasTemplates() && 
           this.hasCustomThresholds();
  });

  setupProgress = computed(() => {
    let progress = 0;
    if (this.isConnected()) progress += 25;
    if (this.hasCalendarsSelected()) progress += 25;
    if (this.hasTemplates()) progress += 25;
    if (this.hasCustomThresholds()) progress += 25;
    return progress;
  });

  todayStats = computed(() => {
    const todayEvents = this.events().filter(e => {
      const today = startOfDay(new Date());
      const tomorrow = startOfDay(addDays(new Date(), 1));
      return e.start >= today && e.start < tomorrow;
    });
    const workEvents = todayEvents.filter(e => e.isWorkEvent);
    const totalMinutes = workEvents.reduce((sum, e) => {
      return sum + this.eventProcessor.calculateEventDurationForDay(e, new Date());
    }, 0);

    return {
      eventCount: workEvents.length,
      hoursFormatted: this.workloadService.formatHours(totalMinutes / 60),
    };
  });

  weekStats = computed(() => {
    const summary = this.workloadService.getThisWeekSummary();
    return {
      eventCount: summary.eventCount,
      hoursFormatted: this.workloadService.formatHours(
        summary.totalWorkHours + summary.totalTravelHours
      ),
      levelLabel: this.workloadService.getWorkloadLabel(summary.level),
      levelColor: this.workloadService.getWorkloadColor(summary.level),
    };
  });

  upcomingEvents = computed(() => {
    const allEvents = this.events();
    const now = new Date();
    const weekFromNow = addDays(now, 7);

    return allEvents
      .filter((e) => e.isWorkEvent && e.start >= now && e.start <= weekFromNow)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 15);
  });

  // Group events by day for display
  groupedEvents = computed(() => {
    const events = this.upcomingEvents();
    const groups: { label: string; date: Date; events: CalendarEvent[] }[] = [];

    events.forEach(event => {
      const eventDate = startOfDay(event.start);
      let label = format(eventDate, 'EEEE, MMMM d');
      
      if (isToday(eventDate)) {
        label = 'Today';
      } else if (isTomorrow(eventDate)) {
        label = 'Tomorrow';
      }

      const existingGroup = groups.find(g => 
        startOfDay(g.date).getTime() === eventDate.getTime()
      );

      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ label, date: eventDate, events: [event] });
      }
    });

    return groups;
  });

  // date-fns format exposed for template
  format = format;

  async ngOnInit(): Promise<void> {
    if (this.googleCalendarService.isSignedIn()) {
      await this.loadEvents();
    }

    // Listen for refresh events from app shell
    this.refreshListener = () => this.loadEvents();
    window.addEventListener('pet-genie:refresh', this.refreshListener);
  }

  ngOnDestroy(): void {
    if (this.refreshListener) {
      window.removeEventListener('pet-genie:refresh', this.refreshListener);
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
      const dateRange: DateRange = {
        start: startOfDay(new Date()),
        end: endOfDay(addDays(new Date(), 14)), // Next 2 weeks
      };

      const events = await firstValueFrom(
        this.googleCalendarService.fetchEventsFromCalendars(settings.selectedCalendars, dateRange)
      );

      const processedEvents = this.eventProcessor.processEvents(events ?? []);
      this.events.set(processedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  navigateToCalendar(view: 'today' | 'week'): void {
    this.router.navigate(['/calendar']);
  }

  navigateToAnalytics(): void {
    this.router.navigate(['/analytics']);
  }

  getEventDuration(event: CalendarEvent): string {
    const durationMs = event.end.getTime() - event.start.getTime();
    const minutes = Math.round(durationMs / (1000 * 60));
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  getEventAriaLabel(event: CalendarEvent): string {
    const time = format(event.start, 'h:mm a');
    const duration = this.getEventDuration(event);
    let label = `${event.title} at ${time}, ${duration}`;
    if (event.clientName) {
      label += `, client: ${event.clientName}`;
    }
    return label;
  }

  getTodayAriaLabel(): string {
    return `Today's appointments: ${this.todayStats().eventCount}. Click to view in calendar.`;
  }
}
