import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataService, WorkloadService, GoogleCalendarService, EventProcessorService } from '../../core/services';
import { CalendarEvent, DateRange } from '../../models';
import { firstValueFrom } from 'rxjs';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';

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
  ],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1>Dashboard</h1>
        <p class="subtitle">Welcome to Pet Genie - Your pet sitting business assistant</p>
      </header>

      <!-- Quick Stats -->
      <section class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>event</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ todayStats().eventCount }}</span>
              <span class="stat-label">Today's Appointments</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ todayStats().hoursFormatted }}</span>
              <span class="stat-label">Work Hours Today</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card" [style.--accent-color]="weekStats().levelColor">
          <mat-card-content>
            <div class="stat-icon" [style.background]="weekStats().levelColor">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ weekStats().hoursFormatted }}</span>
              <span class="stat-label">This Week ({{ weekStats().levelLabel }})</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>pets</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ weekStats().eventCount }}</span>
              <span class="stat-label">Visits This Week</span>
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      <!-- Getting Started -->
      <section class="getting-started">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Getting Started</mat-card-title>
            <mat-card-subtitle>Connect your Google Calendar to begin</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="setup-steps">
              <div class="setup-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Connect Google Calendar</h3>
                  <p>Link your Google Calendar to import your pet sitting appointments</p>
                </div>
                <button mat-raised-button color="primary" routerLink="/settings">
                  <mat-icon>link</mat-icon>
                  Connect
                </button>
              </div>
              <div class="setup-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Configure Templates</h3>
                  <p>Set up appointment templates for quick scheduling</p>
                </div>
                <button mat-stroked-button routerLink="/templates">
                  <mat-icon>description</mat-icon>
                  Configure
                </button>
              </div>
              <div class="setup-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Set Workload Thresholds</h3>
                  <p>Customize your comfort levels for workload monitoring</p>
                </div>
                <button mat-stroked-button routerLink="/settings">
                  <mat-icon>tune</mat-icon>
                  Customize
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      <!-- Upcoming Appointments Placeholder -->
      <section class="upcoming-section">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Upcoming Appointments</mat-card-title>
            <mat-card-subtitle>Your schedule for the next 7 days</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (isLoading()) {
              <div class="loading-container">
                <mat-spinner diameter="40"></mat-spinner>
              </div>
            } @else if (upcomingEvents().length === 0) {
              <div class="empty-state">
                <mat-icon>event_available</mat-icon>
                <p>No upcoming appointments</p>
                <span>Connect your calendar to see your schedule</span>
              </div>
            } @else {
              <div class="events-list">
                @for (event of upcomingEvents(); track event.id) {
                  <div class="event-item">
                    <div class="event-time">
                      {{ formatEventTime(event.start) }}
                    </div>
                    <div class="event-details">
                      <span class="event-title">{{ event.title }}</span>
                      <span class="event-client" *ngIf="event.clientName">{{ event.clientName }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      margin-bottom: 24px;
    }

    .dashboard-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--on-surface-variant);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      color: var(--on-primary-container);
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--on-surface);
    }

    .stat-label {
      font-size: 14px;
      color: var(--on-surface-variant);
    }

    .getting-started {
      margin-bottom: 24px;
    }

    .setup-steps {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .setup-step {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 12px;
      background: var(--surface-container-low);
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary);
      color: var(--on-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-content {
      flex: 1;
    }

    .step-content h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .step-content p {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--on-surface-variant);
    }

    .upcoming-section mat-card-content {
      min-height: 200px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--on-surface-variant);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .empty-state span {
      font-size: 14px;
      opacity: 0.7;
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .event-item {
      display: flex;
      gap: 16px;
      padding: 12px;
      border-radius: 8px;
      background: var(--surface-container-low);
    }

    .event-time {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary);
      white-space: nowrap;
    }

    .event-details {
      display: flex;
      flex-direction: column;
    }

    .event-title {
      font-size: 14px;
      font-weight: 500;
    }

    .event-client {
      font-size: 12px;
      color: var(--on-surface-variant);
    }
  `],
})
export class DashboardComponent implements OnInit {
  private dataService = inject(DataService);
  private workloadService = inject(WorkloadService);
  private googleCalendarService = inject(GoogleCalendarService);
  private eventProcessor = inject(EventProcessorService);

  isLoading = signal(false);
  events = signal<CalendarEvent[]>([]);

  // Connection status
  isConnected = computed(() => this.googleCalendarService.isSignedIn());

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
      .slice(0, 10);
  });

  async ngOnInit(): Promise<void> {
    if (this.googleCalendarService.isSignedIn()) {
      await this.loadEvents();
    }
  }

  async loadEvents(): Promise<void> {
    try {
      this.isLoading.set(true);

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

  formatEventTime(date: Date): string {
    return format(date, 'EEE, MMM d, h:mm a');
  }
}
