import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import {
  DataService,
  GoogleCalendarService,
  WorkloadService,
  EventProcessorService,
} from '../../core/services';
import {
  CalendarEvent,
  DateRange,
  WorkloadLevel,
  WORKLOAD_COLORS,
  getWorkloadLevel,
} from '../../models';
import { SkeletonLoaderComponent, EmptyStateComponent } from '../../shared';
import { firstValueFrom } from 'rxjs';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  subMonths,
  subWeeks,
  addDays,
  isSameDay,
  getDay,
} from 'date-fns';

interface DailyStats {
  date: Date;
  label: string;
  workMinutes: number;
  eventCount: number;
  level: WorkloadLevel;
}

interface ServiceBreakdown {
  type: string;
  count: number;
  minutes: number;
  percentage: number;
  color: string;
}

interface ClientStats {
  name: string;
  visitCount: number;
  totalMinutes: number;
}

interface DayOfWeekStats {
  day: string;
  dayIndex: number;
  averageMinutes: number;
  averageEvents: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="analytics-container">
      <header class="page-header">
        <div class="header-content">
          <h1>Analytics</h1>
          <p class="subtitle">Insights into your pet sitting business</p>
        </div>
        <div class="header-actions">
          <mat-button-toggle-group [(ngModel)]="timeRange" (change)="onTimeRangeChange()">
            <mat-button-toggle value="week">This Week</mat-button-toggle>
            <mat-button-toggle value="month">This Month</mat-button-toggle>
            <mat-button-toggle value="3months">3 Months</mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-stroked-button (click)="exportToCSV()" [disabled]="isLoading() || events().length === 0">
            <mat-icon>download</mat-icon>
            Export
          </button>
        </div>
      </header>

      @if (!isConnected()) {
        <app-empty-state
          icon="cloud_off"
          title="Connect Google Calendar"
          description="Connect your Google Calendar to view analytics about your pet sitting business."
          actionLabel="Go to Settings"
          actionLink="/settings"
          actionIcon="settings"
        ></app-empty-state>
      } @else if (isLoading()) {
        <!-- Loading Skeleton -->
        <section class="summary-cards">
          @for (i of [1,2,3,4]; track i) {
            <mat-card class="summary-card skeleton">
              <mat-card-content>
                <div class="summary-icon skeleton-icon"></div>
                <div class="summary-info">
                  <div class="skeleton-text large"></div>
                  <div class="skeleton-text small"></div>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </section>
        <mat-card class="chart-card">
          <mat-card-header>
            <div class="skeleton-text medium"></div>
          </mat-card-header>
          <mat-card-content>
            <div class="skeleton-chart"></div>
          </mat-card-content>
        </mat-card>
      } @else if (events().filter(e => e.isWorkEvent).length === 0) {
        <app-empty-state
          icon="bar_chart"
          title="No data yet"
          description="Once you have pet sitting appointments in your calendar, you'll see analytics here."
          actionLabel="View Calendar"
          actionLink="/calendar"
          actionIcon="event"
        ></app-empty-state>
      } @else {
        <!-- Summary Cards -->
        <section class="summary-cards">
          <mat-card class="summary-card">
            <mat-card-content>
              <div class="summary-icon appointments">
                <mat-icon>event</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ summaryStats().totalEvents }}</span>
                <span class="summary-label">Total Appointments</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card">
            <mat-card-content>
              <div class="summary-icon hours">
                <mat-icon>schedule</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ summaryStats().totalHours }}</span>
                <span class="summary-label">Work Hours</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card">
            <mat-card-content>
              <div class="summary-icon clients">
                <mat-icon>pets</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ summaryStats().uniqueClients }}</span>
                <span class="summary-label">Unique Clients</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card">
            <mat-card-content>
              <div class="summary-icon average">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="summary-info">
                <span class="summary-value">{{ summaryStats().avgPerDay }}</span>
                <span class="summary-label">Avg Hours/Day</span>
              </div>
            </mat-card-content>
          </mat-card>
        </section>

        <!-- Workload Trend Chart -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Workload Trend</mat-card-title>
            <mat-card-subtitle>Daily work hours over time</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="bar-chart" role="img" aria-label="Bar chart showing daily workload">
              @for (day of dailyStats(); track day.date.toISOString()) {
                <div
                  class="bar-container"
                  [matTooltip]="getBarTooltip(day)"
                  role="listitem"
                  [attr.aria-label]="getBarTooltip(day)"
                >
                  <div
                    class="bar"
                    [style.height.%]="getBarHeight(day.workMinutes)"
                    [class]="'workload-' + day.level"
                  ></div>
                  <span class="bar-label">{{ day.label }}</span>
                </div>
              }
            </div>
            <div class="chart-legend">
              <div class="legend-item">
                <span class="legend-color workload-comfortable"></span>
                Comfortable
              </div>
              <div class="legend-item">
                <span class="legend-color workload-busy"></span>
                Busy
              </div>
              <div class="legend-item">
                <span class="legend-color workload-high"></span>
                High
              </div>
              <div class="legend-item">
                <span class="legend-color workload-burnout"></span>
                Burnout
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="charts-row">
          <!-- Service Breakdown -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Service Breakdown</mat-card-title>
              <mat-card-subtitle>Types of appointments</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="donut-chart-container">
                <div class="donut-chart" role="img" aria-label="Donut chart showing service breakdown">
                  <svg viewBox="0 0 100 100" class="donut-svg">
                    @for (segment of serviceBreakdown(); track segment.type; let i = $index) {
                      <circle
                        class="donut-segment-circle"
                        [attr.stroke]="segment.color"
                        [attr.stroke-dasharray]="getStrokeDasharray(segment.percentage)"
                        [attr.stroke-dashoffset]="getStrokeDashoffset(i)"
                        fill="transparent"
                        stroke-width="10"
                        cx="50"
                        cy="50"
                        r="40"
                      />
                    }
                  </svg>
                  <div class="donut-center">
                    <span class="donut-total">{{ summaryStats().totalEvents }}</span>
                    <span class="donut-label">visits</span>
                  </div>
                </div>
                <div class="service-legend">
                  @for (service of serviceBreakdown(); track service.type) {
                    <div class="service-item">
                      <span class="service-color" [style.background]="service.color"></span>
                      <span class="service-name">{{ service.type }}</span>
                      <span class="service-percentage">{{ service.percentage | number:'1.0-0' }}%</span>
                      <span class="service-count">{{ service.count }}</span>
                    </div>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Busiest Days -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Busiest Days</mat-card-title>
              <mat-card-subtitle>Average hours by day of week</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="day-chart">
                @for (day of dayOfWeekStats(); track day.day) {
                  <div class="day-bar-container">
                    <span class="day-name">{{ day.day }}</span>
                    <div class="day-bar-wrapper">
                      <div
                        class="day-bar"
                        [style.width.%]="getDayBarWidth(day.averageMinutes)"
                        [class.highlight]="day.averageMinutes === maxDayMinutes()"
                      ></div>
                    </div>
                    <span class="day-hours">{{ formatMinutes(day.averageMinutes) }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Top Clients -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Top Clients</mat-card-title>
            <mat-card-subtitle>Most frequent appointments</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (topClients().length === 0) {
              <div class="empty-clients">
                <mat-icon>person_off</mat-icon>
                <p>No client data available. Client names are extracted from event titles.</p>
              </div>
            } @else {
              <div class="clients-grid">
                @for (client of topClients(); track client.name; let i = $index) {
                  <div class="client-card" [class.top-3]="i < 3">
                    <div class="client-rank" [class]="'rank-' + (i + 1)">
                      @if (i < 3) {
                        <mat-icon>{{ i === 0 ? 'emoji_events' : 'star' }}</mat-icon>
                      } @else {
                        {{ i + 1 }}
                      }
                    </div>
                    <div class="client-info">
                      <span class="client-name">{{ client.name }}</span>
                      <span class="client-stats">
                        <span class="stat">
                          <mat-icon>event</mat-icon>
                          {{ client.visitCount }} visits
                        </span>
                        <span class="stat">
                          <mat-icon>schedule</mat-icon>
                          {{ formatMinutes(client.totalMinutes) }}
                        </span>
                      </span>
                    </div>
                    <div class="client-progress">
                      <div
                        class="progress-bar"
                        [style.width.%]="getClientBarWidth(client.visitCount)"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .analytics-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-content h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--on-surface-variant);
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      border-radius: 16px;
      border: 1px solid var(--outline-variant);
      transition: all var(--transition-normal) ease;
    }

    .summary-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
    }

    .summary-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .summary-icon.appointments {
      background: linear-gradient(135deg, #818CF8, #6366F1);
    }
    .summary-icon.hours {
      background: linear-gradient(135deg, #34D399, #10B981);
    }
    .summary-icon.clients {
      background: linear-gradient(135deg, #F472B6, #EC4899);
    }
    .summary-icon.average {
      background: linear-gradient(135deg, #FBBF24, #F59E0B);
    }

    .summary-icon mat-icon {
      color: white;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .summary-info {
      display: flex;
      flex-direction: column;
    }

    .summary-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
    }

    .summary-label {
      font-size: 14px;
      color: var(--on-surface-variant);
      margin-top: 4px;
    }

    /* Skeleton Loading */
    .summary-card.skeleton mat-card-content {
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--surface-container-high);
    }

    .skeleton-text {
      background: var(--surface-container-high);
      border-radius: 4px;
    }

    .skeleton-text.large {
      width: 80px;
      height: 32px;
    }

    .skeleton-text.medium {
      width: 120px;
      height: 20px;
    }

    .skeleton-text.small {
      width: 100px;
      height: 14px;
      margin-top: 4px;
    }

    .skeleton-chart {
      height: 200px;
      background: var(--surface-container-high);
      border-radius: 8px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Chart Cards */
    .chart-card {
      margin-bottom: 24px;
      border-radius: 16px;
      border: 1px solid var(--outline-variant);
    }

    .chart-card mat-card-header {
      padding: 20px 20px 0;
    }

    .chart-card mat-card-content {
      padding: 20px;
    }

    .charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    /* Bar Chart */
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 200px;
      padding: 16px 0;
      border-bottom: 1px solid var(--outline-variant);
    }

    .bar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      min-width: 20px;
      cursor: pointer;
    }

    .bar {
      width: 100%;
      max-width: 40px;
      border-radius: 6px 6px 0 0;
      transition: all var(--transition-normal) ease;
      margin-top: auto;
    }

    .bar:hover {
      opacity: 0.8;
      transform: scaleY(1.05);
      transform-origin: bottom;
    }

    .bar.workload-none { background: var(--surface-container-high); }
    .bar.workload-comfortable { background: var(--workload-comfortable); }
    .bar.workload-busy { background: var(--workload-busy); }
    .bar.workload-high { background: var(--workload-high); }
    .bar.workload-burnout { background: var(--workload-burnout); }

    .bar-label {
      font-size: 10px;
      color: var(--on-surface-variant);
      margin-top: 8px;
      white-space: nowrap;
    }

    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .legend-color.workload-comfortable { background: var(--workload-comfortable); }
    .legend-color.workload-busy { background: var(--workload-busy); }
    .legend-color.workload-high { background: var(--workload-high); }
    .legend-color.workload-burnout { background: var(--workload-burnout); }

    /* Donut Chart - SVG Version */
    .donut-chart-container {
      display: flex;
      align-items: center;
      gap: 32px;
      padding: 16px 0;
    }

    .donut-chart {
      position: relative;
      width: 180px;
      height: 180px;
      flex-shrink: 0;
    }

    .donut-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .donut-segment-circle {
      transition: stroke-dasharray var(--transition-normal) ease;
    }

    .donut-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--surface);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
    }

    .donut-total {
      font-size: 32px;
      font-weight: 700;
    }

    .donut-label {
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .service-legend {
      flex: 1;
    }

    .service-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--outline-variant);
    }

    .service-item:last-child {
      border-bottom: none;
    }

    .service-color {
      width: 14px;
      height: 14px;
      border-radius: 4px;
    }

    .service-name {
      flex: 1;
      font-size: 14px;
    }

    .service-percentage {
      font-size: 12px;
      color: var(--on-surface-variant);
      min-width: 35px;
      text-align: right;
    }

    .service-count {
      font-weight: 600;
      min-width: 24px;
      text-align: right;
    }

    /* Day of Week Chart */
    .day-chart {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px 0;
    }

    .day-bar-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .day-name {
      width: 40px;
      font-size: 14px;
      font-weight: 500;
    }

    .day-bar-wrapper {
      flex: 1;
      height: 28px;
      background: var(--surface-container);
      border-radius: 6px;
      overflow: hidden;
    }

    .day-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--primary-container));
      border-radius: 6px;
      transition: width var(--transition-normal) ease;
    }

    .day-bar.highlight {
      background: linear-gradient(90deg, #6366F1, #8B5CF6);
    }

    .day-hours {
      width: 50px;
      text-align: right;
      font-size: 14px;
      font-weight: 500;
    }

    /* Clients Grid */
    .empty-clients {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: var(--outline);
      text-align: center;
    }

    .empty-clients mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .clients-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      padding: 16px 0;
    }

    .client-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--surface-container-low);
      border-radius: 12px;
      border: 1px solid var(--outline-variant);
      transition: all var(--transition-fast) ease;
    }

    .client-card:hover {
      background: var(--surface-container);
      border-color: var(--primary);
    }

    .client-card.top-3 {
      background: var(--primary-container);
      border-color: var(--primary);
    }

    .client-rank {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--surface-container);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .client-rank.rank-1 {
      background: linear-gradient(135deg, #FCD34D, #F59E0B);
      color: white;
    }

    .client-rank.rank-2 {
      background: linear-gradient(135deg, #D1D5DB, #9CA3AF);
      color: white;
    }

    .client-rank.rank-3 {
      background: linear-gradient(135deg, #FBBF24, #D97706);
      color: white;
    }

    .client-rank mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .client-info {
      flex: 1;
      min-width: 0;
    }

    .client-name {
      font-weight: 600;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .client-stats {
      display: flex;
      gap: 12px;
      margin-top: 4px;
    }

    .client-stats .stat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .client-stats mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .client-progress {
      width: 60px;
      height: 6px;
      background: var(--surface-container);
      border-radius: 3px;
      overflow: hidden;
    }

    .client-progress .progress-bar {
      height: 100%;
      background: var(--primary);
      border-radius: 3px;
    }

    @media (max-width: 768px) {
      .charts-row {
        grid-template-columns: 1fr;
      }

      .donut-chart-container {
        flex-direction: column;
      }

      .donut-chart {
        margin: 0 auto;
      }

      .bar-label {
        display: none;
      }

      .clients-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AnalyticsComponent implements OnInit {
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private workloadService = inject(WorkloadService);
  private eventProcessor = inject(EventProcessorService);
  private snackBar = inject(MatSnackBar);

  timeRange: 'week' | 'month' | '3months' = 'month';
  isLoading = signal(false);
  events = signal<CalendarEvent[]>([]);

  isConnected = computed(() => this.googleCalendarService.isSignedIn());

  // Max day minutes for highlighting
  maxDayMinutes = computed(() => {
    const stats = this.dayOfWeekStats();
    return Math.max(...stats.map(d => d.averageMinutes));
  });

  // Summary statistics
  summaryStats = computed(() => {
    const allEvents = this.events().filter(e => e.isWorkEvent);
    const totalMinutes = allEvents.reduce((sum, e) => {
      const duration = (e.end.getTime() - e.start.getTime()) / (1000 * 60);
      return sum + Math.min(duration, 12 * 60); // Cap at 12 hours
    }, 0);
    const totalHours = Math.round(totalMinutes / 60);
    const uniqueClients = new Set(allEvents.map(e => e.clientName).filter(Boolean)).size;
    const dateRange = this.getDateRange();
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const avgPerDay = days > 0 ? (totalMinutes / days / 60).toFixed(1) : '0';

    return {
      totalEvents: allEvents.length,
      totalHours: `${totalHours}h`,
      uniqueClients,
      avgPerDay: `${avgPerDay}h`,
    };
  });

  // Daily statistics for bar chart
  dailyStats = computed<DailyStats[]>(() => {
    const dateRange = this.getDateRange();
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const allEvents = this.events();
    const thresholds = this.dataService.settings().thresholds;

    // Limit to last 14-31 days for readability
    const displayDays = days.slice(-31);

    return displayDays.map(date => {
      const dayEvents = allEvents.filter(e => isSameDay(e.start, date) && e.isWorkEvent);
      const workMinutes = dayEvents.reduce((sum, e) => {
        return sum + this.eventProcessor.calculateEventDurationForDay(e, date);
      }, 0);
      const level = getWorkloadLevel(workMinutes / 60, 'daily', thresholds);

      return {
        date,
        label: format(date, 'd'),
        workMinutes,
        eventCount: dayEvents.length,
        level,
      };
    });
  });

  // Service type breakdown
  serviceBreakdown = computed<ServiceBreakdown[]>(() => {
    const allEvents = this.events().filter(e => e.isWorkEvent);
    const serviceMap = new Map<string, { count: number; minutes: number }>();

    const colors: Record<string, string> = {
      'drop-in': '#3B82F6',
      'walk': '#10B981',
      'overnight': '#8B5CF6',
      'housesit': '#EC4899',
      'meet-greet': '#F59E0B',
      'nail-trim': '#6366F1',
      'other': '#6B7280',
    };

    allEvents.forEach(event => {
      const type = event.serviceInfo?.type || 'other';
      const label = this.getServiceLabel(type);
      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);

      if (!serviceMap.has(label)) {
        serviceMap.set(label, { count: 0, minutes: 0 });
      }
      const current = serviceMap.get(label)!;
      current.count++;
      current.minutes += duration;
    });

    const total = allEvents.length || 1;
    return Array.from(serviceMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        minutes: data.minutes,
        percentage: (data.count / total) * 100,
        color: colors[type.toLowerCase().replace(/\s+/g, '-')] || colors['other'],
      }))
      .sort((a, b) => b.count - a.count);
  });

  // Day of week statistics
  dayOfWeekStats = computed<DayOfWeekStats[]>(() => {
    const allEvents = this.events().filter(e => e.isWorkEvent);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = dayNames.map((day, index) => ({
      day,
      dayIndex: index,
      totalMinutes: 0,
      totalEvents: 0,
      dayCount: 0,
    }));

    // Count occurrences and totals for each day of week
    const dateRange = this.getDateRange();
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

    days.forEach(date => {
      const dayIndex = getDay(date);
      dayStats[dayIndex].dayCount++;
    });

    allEvents.forEach(event => {
      const dayIndex = getDay(event.start);
      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
      dayStats[dayIndex].totalMinutes += Math.min(duration, 12 * 60);
      dayStats[dayIndex].totalEvents++;
    });

    return dayStats.map(stat => ({
      day: stat.day,
      dayIndex: stat.dayIndex,
      averageMinutes: stat.dayCount > 0 ? stat.totalMinutes / stat.dayCount : 0,
      averageEvents: stat.dayCount > 0 ? stat.totalEvents / stat.dayCount : 0,
    }));
  });

  // Top clients
  topClients = computed<ClientStats[]>(() => {
    const allEvents = this.events().filter(e => e.isWorkEvent && e.clientName);
    const clientMap = new Map<string, { visitCount: number; totalMinutes: number }>();

    allEvents.forEach(event => {
      const name = event.clientName!;
      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);

      if (!clientMap.has(name)) {
        clientMap.set(name, { visitCount: 0, totalMinutes: 0 });
      }
      const current = clientMap.get(name)!;
      current.visitCount++;
      current.totalMinutes += Math.min(duration, 12 * 60);
    });

    return Array.from(clientMap.entries())
      .map(([name, data]) => ({
        name,
        visitCount: data.visitCount,
        totalMinutes: data.totalMinutes,
      }))
      .sort((a, b) => b.visitCount - a.visitCount)
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
      const dateRange = this.getDateRange();

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

  onTimeRangeChange(): void {
    this.loadEvents();
  }

  getDateRange(): DateRange {
    const now = new Date();
    switch (this.timeRange) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months':
        return { start: subMonths(startOfMonth(now), 2), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }

  getBarHeight(minutes: number): number {
    const maxMinutes = Math.max(...this.dailyStats().map(d => d.workMinutes), 60);
    return (minutes / maxMinutes) * 100;
  }

  getBarTooltip(day: DailyStats): string {
    const hours = Math.round(day.workMinutes / 60 * 10) / 10;
    return `${format(day.date, 'MMM d')}: ${hours}h (${day.eventCount} visits)`;
  }

  getWorkloadColor(level: WorkloadLevel): string {
    return WORKLOAD_COLORS[level];
  }

  getSegmentOffset(index: number): number {
    const segments = this.serviceBreakdown();
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += segments[i].percentage;
    }
    return offset;
  }

  getDayBarWidth(minutes: number): number {
    const maxMinutes = Math.max(...this.dayOfWeekStats().map(d => d.averageMinutes), 60);
    return (minutes / maxMinutes) * 100;
  }

  getClientBarWidth(visitCount: number): number {
    const maxVisits = Math.max(...this.topClients().map(c => c.visitCount), 1);
    return (visitCount / maxVisits) * 100;
  }

  formatMinutes(minutes: number): string {
    const hours = Math.round(minutes / 60 * 10) / 10;
    return `${hours}h`;
  }

  getServiceLabel(type: string): string {
    const labels: Record<string, string> = {
      'drop-in': 'Drop-In',
      'walk': 'Walk',
      'overnight': 'Overnight',
      'housesit': 'Housesit',
      'meet-greet': 'Meet & Greet',
      'nail-trim': 'Nail Trim',
      'other': 'Other',
    };
    return labels[type] || 'Other';
  }

  exportToCSV(): void {
    const events = this.events().filter(e => e.isWorkEvent);
    if (events.length === 0) {
      alert('No events to export');
      return;
    }

    const headers = ['Date', 'Start Time', 'End Time', 'Title', 'Client', 'Service Type', 'Duration (min)'];
    const rows = events.map(e => [
      format(e.start, 'yyyy-MM-dd'),
      format(e.start, 'HH:mm'),
      format(e.end, 'HH:mm'),
      `"${e.title.replace(/"/g, '""')}"`,
      e.clientName || '',
      e.serviceInfo?.type || '',
      Math.round((e.end.getTime() - e.start.getTime()) / (1000 * 60)),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pet-genie-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
