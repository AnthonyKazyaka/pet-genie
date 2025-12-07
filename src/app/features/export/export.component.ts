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
  ExportTemplate,
} from '../../models/export.model';
import { EventExporterService } from '../../core/services/event-exporter.service';
import { DataService, EventProcessorService, GoogleCalendarService } from '../../core/services';
import { ExportContextService } from './export-context.service';
import { ExportTemplateService } from './export-template.service';

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
  private templateService = inject(ExportTemplateService);

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
  templates: ExportTemplate[] = [];
  selectedTemplateId: string | null = null;
  appliedTemplateId: string | null = null;
  templateName = '';
  includeDateRange = true;

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

  get selectedTemplate(): ExportTemplate | undefined {
    return this.templates.find((tpl) => tpl.id === this.selectedTemplateId);
  }

  async ngOnInit(): Promise<void> {
    this.refreshTemplates();
    this.applyContext();
    this.autoReloadFromCalendar = !this.events.length;
    this.applyPreferredTemplate();
    if (this.autoReloadFromCalendar) {
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

  onTemplateSelectionChange(templateId: string | null): void {
    this.selectedTemplateId = templateId;
    const template = this.templates.find((tpl) => tpl.id === templateId);
    if (template) {
      this.templateName = template.name;
      this.includeDateRange = template.includeDateRange;
    } else {
      this.templateName = '';
      this.includeDateRange = true;
    }
  }

  applySelectedTemplate(): void {
    if (!this.selectedTemplateId) return;
    const template = this.templates.find((tpl) => tpl.id === this.selectedTemplateId);
    if (!template) return;
    this.applyTemplate(template, true);
  }

  saveTemplate(updateExisting: boolean = false): void {
    const name = this.templateName?.trim();
    if (!name) {
      this.snackBar.open('Name your preset before saving.', 'Dismiss', { duration: 2500 });
      return;
    }

    const payloadId = updateExisting ? this.selectedTemplateId || undefined : undefined;
    const saved = this.templateService.save({
      id: payloadId,
      name,
      includeDateRange: this.includeDateRange,
      options: this.cloneOptions(this.options),
    });

    this.appliedTemplateId = saved.id;
    this.selectedTemplateId = saved.id;
    this.templateService.markLastUsed(saved.id);
    this.refreshTemplates();
    this.snackBar.open(`Preset "${saved.name}" saved`, 'OK', { duration: 2000 });
  }

  deleteTemplate(): void {
    if (!this.selectedTemplateId) return;
    const template = this.templates.find((tpl) => tpl.id === this.selectedTemplateId);
    if (!template) return;
    const confirmed = confirm(`Delete preset "${template.name}"?`);
    if (!confirmed) return;

    this.templateService.delete(template.id);
    this.refreshTemplates();
    if (this.selectedTemplateId === template.id) {
      this.selectedTemplateId = null;
      this.appliedTemplateId = this.appliedTemplateId === template.id ? null : this.appliedTemplateId;
    }
    this.templateName = '';
  }

  toggleDefaultTemplate(): void {
    if (!this.selectedTemplateId) return;
    const currentlyDefault = this.templates.find((tpl) => tpl.id === this.selectedTemplateId)?.isDefault;
    this.templateService.setDefault(currentlyDefault ? null : this.selectedTemplateId);
    this.refreshTemplates();
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

  private refreshTemplates(): void {
    this.templates = this.templateService.list();
    const defaultTemplate = this.templates.find((tpl) => tpl.isDefault);
    if (defaultTemplate && !this.selectedTemplateId) {
      this.selectedTemplateId = defaultTemplate.id;
      this.templateName = defaultTemplate.name;
      this.includeDateRange = defaultTemplate.includeDateRange;
    }
  }

  private applyPreferredTemplate(): void {
    const preferred = this.templateService.getPreferred();
    if (!preferred) return;
    this.selectedTemplateId = preferred.id;
    this.templateName = preferred.name;
    this.includeDateRange = preferred.includeDateRange;
    this.applyTemplate(preferred, false, false);
  }

  private applyTemplate(template: ExportTemplate, notify: boolean, triggerLoad: boolean = true): void {
    this.options = this.mergeOptionsFromTemplate(template);
    this.appliedTemplateId = template.id;
    this.templateService.markLastUsed(template.id);
    this.syncRangePresetFromOptions();

    const shouldLoad = triggerLoad && (this.autoReloadFromCalendar || template.includeDateRange);
    if (shouldLoad) {
      this.autoReloadFromCalendar = true;
      this.loadEventsForRange({ start: this.options.startDate, end: this.options.endDate });
    } else {
      this.generatePreview();
    }

    if (notify) {
      this.snackBar.open(`Applied "${template.name}"`, 'OK', { duration: 2000 });
    }
  }

  private mergeOptionsFromTemplate(template: ExportTemplate): ExportOptions {
    const baseDates = template.includeDateRange
      ? { startDate: new Date(template.options.startDate), endDate: new Date(template.options.endDate) }
      : { startDate: this.options.startDate, endDate: this.options.endDate };

    return {
      ...this.options,
      ...template.options,
      ...baseDates,
      groupLevels: template.options.groupLevels.map((group) => ({ ...group })),
      sortLevels: template.options.sortLevels.map((sort) => ({ ...sort })),
    };
  }

  private cloneOptions(options: ExportOptions): ExportOptions {
    return {
      ...options,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
      groupLevels: options.groupLevels.map((group) => ({ ...group })),
      sortLevels: options.sortLevels.map((sort) => ({ ...sort })),
    };
  }

  private syncRangePresetFromOptions(): void {
    (['week', 'next7', 'month'] as RangePreset[]).forEach((preset) => {
      const range = this.getRangeForPreset(preset);
      if (this.datesMatchRange(this.options.startDate, this.options.endDate, range)) {
        this.rangePreset = preset;
      }
    });
  }
}
