import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addDays,
} from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { CalendarEvent, DateRange } from '../../models';
import {
  ExportOptions,
  ExportGroup,
  ExportRow,
  GroupLevel,
  GroupField,
  SortLevel,
  SortField,
  SortDirection,
} from '../../models/export.model';
import { EventExporterService } from '../../core/services/event-exporter.service';
import { DataService, EventProcessorService, GoogleCalendarService } from '../../core/services';
import { ExportContextService } from './export-context.service';

type RangePreset = 'week' | 'next7' | 'month';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './export.component.html',
  styleUrl: './export.component.scss',
})
export class ExportComponent implements OnInit {
  private exporter = inject(EventExporterService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private context = inject(ExportContextService);
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private eventProcessor = inject(EventProcessorService);

  events: CalendarEvent[] = [];
  contextSource: 'calendar' | 'analytics' | 'manual' | null = null;
  isLoadingEvents = false;
  autoReloadFromCalendar = false;
  rangePreset: RangePreset = 'month';

  options: ExportOptions = {
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    includeTime: true,
    includeLocation: false,
    groupLevels: [],
    sortLevels: [],
    workEventsOnly: false,
    searchTerm: '',
  };

  preview = '';
  csvContent = '';
  count = 0;
  rows: ExportRow[] = [];
  groups: ExportGroup[] = [];
  exportFormat: 'text' | 'csv' = 'csv';

  groupFields: GroupField[] = ['date', 'client', 'service', 'week', 'month'];
  sortFields: SortField[] = ['date', 'client', 'service', 'time'];

  get groupLevelsOrdered(): GroupLevel[] {
    return [...this.options.groupLevels].sort((a, b) => a.order - b.order);
  }

  async ngOnInit(): Promise<void> {
    this.applyContext();
    if (!this.events.length) {
      this.autoReloadFromCalendar = true;
      await this.loadEventsForRange({ start: this.options.startDate, end: this.options.endDate });
    } else {
      this.generatePreview();
    }
  }

  applyContext(): void {
    const context = this.context.getContext();
    if (!context) return;

    if (context.defaultOptions) {
      this.options = { ...this.options, ...context.defaultOptions };
    }

    if (context.events?.length) {
      this.events = context.events;
    }

    if (context.source) {
      this.contextSource = context.source;
    }

    // Align preset to context dates when possible
    const now = new Date();
    const thisWeek = { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    if (
      context.defaultOptions?.startDate &&
      context.defaultOptions?.endDate &&
      this.datesMatchRange(context.defaultOptions.startDate, context.defaultOptions.endDate, thisWeek)
    ) {
      this.rangePreset = 'week';
    }
  }

  async loadEventsForRange(range: DateRange): Promise<void> {
    try {
      this.isLoadingEvents = true;

      const settings = this.dataService.settings();
      if (!settings.googleClientId) {
        this.snackBar.open('Connect Google Calendar to pull events directly.', 'Dismiss', { duration: 3500 });
        this.generatePreview();
        return;
      }

      if (!this.googleCalendarService.isInitialized()) {
        await this.googleCalendarService.initialize(settings.googleClientId);
      }

      const rawEvents = await firstValueFrom(
        this.googleCalendarService.fetchEventsFromCalendars(settings.selectedCalendars, range)
      );
      this.events = this.eventProcessor.processEvents(rawEvents ?? []);
      this.generatePreview();
    } catch (error) {
      console.error('Failed to load events for export', error);
      this.snackBar.open('Could not load events for export. Try again or adjust your connection.', 'Dismiss', {
        duration: 4000,
      });
    } finally {
      this.isLoadingEvents = false;
    }
  }

  setRangePreset(preset: RangePreset): void {
    this.rangePreset = preset;
    const range = this.getRangeForPreset(preset);
    this.options = { ...this.options, startDate: range.start, endDate: range.end };
    if (this.autoReloadFromCalendar) {
      this.loadEventsForRange(range);
    } else {
      this.generatePreview();
    }
  }

  onManualDateChange(): void {
    if (this.autoReloadFromCalendar) {
      this.loadEventsForRange({ start: this.options.startDate, end: this.options.endDate });
    } else {
      this.generatePreview();
    }
  }

  generatePreview(): void {
    const result = this.exporter.export(this.events, this.options);
    this.preview = result.content;
    this.csvContent = result.csv;
    this.count = result.count;
    this.rows = result.rows;
    this.groups = result.groups;
  }

  addGroup(field: GroupField): void {
    if (this.options.groupLevels.some((g) => g.field === field)) return;
    const order = this.options.groupLevels.length + 1;
    this.options.groupLevels = [...this.options.groupLevels, { field, order }];
    this.generatePreview();
  }

  removeGroup(group: GroupLevel): void {
    this.options.groupLevels = this.options.groupLevels
      .filter((g) => g.field !== group.field)
      .map((g, idx) => ({ ...g, order: idx + 1 }));
    this.generatePreview();
  }

  moveGroup(group: GroupLevel, direction: number): void {
    const levels = [...this.options.groupLevels].sort((a, b) => a.order - b.order);
    const index = levels.findIndex((g) => g.field === group.field);
    const target = index + direction;
    if (target < 0 || target >= levels.length) return;
    [levels[index], levels[target]] = [levels[target], levels[index]];
    this.options.groupLevels = levels.map((g, idx) => ({ ...g, order: idx + 1 }));
    this.generatePreview();
  }

  addSort(field: SortField, direction: SortDirection = 'asc'): void {
    if (this.options.sortLevels.some((s) => s.field === field)) return;
    this.options.sortLevels = [...this.options.sortLevels, { field, direction }];
    this.generatePreview();
  }

  updateSortDirection(sort: SortLevel, direction: SortDirection): void {
    this.options.sortLevels = this.options.sortLevels.map((s) =>
      s.field === sort.field ? { ...s, direction } : s
    );
    this.generatePreview();
  }

  removeSort(sort: SortLevel): void {
    this.options.sortLevels = this.options.sortLevels.filter((s) => s.field !== sort.field);
    this.generatePreview();
  }

  copyCurrent(): void {
    const content = this.exportFormat === 'csv' ? this.csvContent : this.preview;
    if (!content) return;
    navigator.clipboard?.writeText(content).then(() => {
      const label = this.exportFormat === 'csv' ? 'CSV copied to clipboard' : 'Export copied to clipboard';
      this.snackBar.open(label, 'OK', { duration: 2500 });
    });
  }

  downloadCurrent(): void {
    const isCsv = this.exportFormat === 'csv';
    const content = isCsv ? this.csvContent : this.preview;
    if (!content) return;
    const mime = isCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    const extension = isCsv ? 'csv' : 'txt';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events-export.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  updateSearch(term: string): void {
    this.options = { ...this.options, searchTerm: term };
    this.generatePreview();
  }

  applySortFromTable(field: SortField): void {
    const [primary, ...rest] = this.options.sortLevels;
    if (primary?.field === field) {
      const toggled = primary.direction === 'asc' ? 'desc' : 'asc';
      this.options.sortLevels = [{ ...primary, direction: toggled }, ...rest];
    } else {
      this.options.sortLevels = [{ field, direction: 'asc' }, ...(this.options.sortLevels || [])];
    }
    this.generatePreview();
  }

  primarySortDirection(field: SortField): SortDirection | null {
    const primary = this.options.sortLevels[0];
    return primary?.field === field ? primary.direction : null;
  }

  formatDuration(minutes: number): string {
    return `${minutes} min`;
  }

  isFieldInGroups(field: GroupField): boolean {
    return this.options.groupLevels.some((g) => g.field === field);
  }

  isFieldInSorts(field: SortField): boolean {
    return this.options.sortLevels.some((s) => s.field === field);
  }

  setExportFormat(format: 'text' | 'csv'): void {
    this.exportFormat = format;
  }

  navigateBack(): void {
    this.router.navigate(['/calendar']);
  }

  private getRangeForPreset(preset: RangePreset): DateRange {
    const today = new Date();
    switch (preset) {
      case 'week':
        return {
          start: startOfWeek(today, { weekStartsOn: 0 }),
          end: endOfWeek(today, { weekStartsOn: 0 }),
        };
      case 'next7':
        return {
          start: startOfDay(today),
          end: endOfDay(addDays(today, 6)),
        };
      case 'month':
      default:
        return {
          start: startOfMonth(today),
          end: endOfMonth(today),
        };
    }
  }

  private datesMatchRange(start: Date, end: Date, range: DateRange): boolean {
    return (
      startOfDay(start).getTime() === startOfDay(range.start).getTime() &&
      endOfDay(end).getTime() === endOfDay(range.end).getTime()
    );
  }
}
