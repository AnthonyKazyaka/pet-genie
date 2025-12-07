import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
import { ExportContextService } from '../export/export-context.service';
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
  styleUrl: './analytics.component.scss',
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit {
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private workloadService = inject(WorkloadService);
  private eventProcessor = inject(EventProcessorService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private exportContext = inject(ExportContextService);

  timeRange: 'week' | 'month' | '3months' = 'month';
  isLoading = signal(false);
  events = signal<CalendarEvent[]>([]);

  isConnected = computed(() => this.googleCalendarService.isSignedIn());

  // Max day minutes for highlighting
  maxDayMinutes = computed(() => {
    const stats = this.dayOfWeekStats();
    return Math.max(...stats.map(d => d.averageMinutes));
  });

  // Check if there are work events
  hasWorkEvents = computed(() => {
    return this.events().some(e => e.isWorkEvent);
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

  openExportDialog(): void {
    const dateRange = this.getDateRange();
    this.exportContext.setContext({
      events: this.events(),
      defaultOptions: {
        startDate: dateRange.start,
        endDate: dateRange.end,
        includeTime: true,
        includeLocation: true,
        workEventsOnly: true,
      },
      source: 'analytics',
    });
    this.router.navigate(['/export']);
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

  getStrokeDasharray(percentage: number): string {
    const circumference = 2 * Math.PI * 40; // radius = 40
    const fillLength = (percentage / 100) * circumference;
    return `${fillLength} ${circumference - fillLength}`;
  }

  getStrokeDashoffset(index: number): number {
    const circumference = 2 * Math.PI * 40;
    const offset = this.getSegmentOffset(index);
    return -((offset / 100) * circumference);
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

}
