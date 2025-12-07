import { Injectable } from '@angular/core';
import { differenceInMinutes, format, isWithinInterval, startOfDay, endOfDay, startOfWeek } from 'date-fns';
import { CalendarEvent } from '../../models/event.model';
import {
  ExportGroup,
  ExportOptions,
  ExportResult,
  ExportRow,
  GroupField,
  GroupLevel,
  SortLevel,
} from '../../models/export.model';
import { EventProcessorService } from './event-processor.service';

interface GroupBucket {
  key: string;
  label: string;
  rows: ExportRow[];
}

@Injectable({
  providedIn: 'root',
})
export class EventExporterService {
  constructor(private eventProcessor: EventProcessorService) {}

  export(events: CalendarEvent[], options: ExportOptions): ExportResult {
    const normalized = this.normalizeOptions(options);
    const filtered = this.filterEvents(events, normalized);
    const sorted = this.sortEvents(filtered, normalized.sortLevels);
    const rows = this.buildRows(sorted, normalized);
    const grouped = this.groupRows(rows, normalized.groupLevels);
    const content = this.formatGroups(grouped, normalized);
    const csv = this.formatCsv(rows, normalized);
    const groups = this.buildGroupSummaries(grouped);

    return {
      content,
      csv,
      count: rows.length,
      rows,
      groups,
    };
  }

  private normalizeOptions(options: ExportOptions): ExportOptions {
    return {
      ...options,
      startDate: startOfDay(options.startDate),
      endDate: endOfDay(options.endDate),
      groupLevels: [...options.groupLevels].sort((a, b) => a.order - b.order),
      sortLevels: [...options.sortLevels],
      searchTerm: options.searchTerm?.trim(),
    };
  }

  private filterEvents(events: CalendarEvent[], options: ExportOptions): CalendarEvent[] {
    const search = options.searchTerm?.toLowerCase();
    return events.filter(event => {
      if (options.workEventsOnly && !this.eventProcessor.isWorkEvent(event)) {
        return false;
      }

      const isWithinRange = isWithinInterval(event.start, {
        start: options.startDate,
        end: options.endDate,
      });

      if (!isWithinRange) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        event.title,
        event.clientName,
        event.serviceInfo?.type,
        event.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  private sortEvents(events: CalendarEvent[], sortLevels: SortLevel[]): CalendarEvent[] {
    if (!sortLevels.length) {
      return [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    return [...events].sort((a, b) => {
      for (const level of sortLevels) {
        const result = this.compareBySortField(a, b, level.field, level.direction);
        if (result !== 0) {
          return result;
        }
      }
      return 0;
    });
  }

  private compareBySortField(
    a: CalendarEvent,
    b: CalendarEvent,
    field: SortLevel['field'],
    direction: SortLevel['direction']
  ): number {
    const dir = direction === 'asc' ? 1 : -1;

    switch (field) {
      case 'date':
        return (a.start.getTime() - b.start.getTime()) * dir;
      case 'time': {
        const minutesA = a.start.getHours() * 60 + a.start.getMinutes();
        const minutesB = b.start.getHours() * 60 + b.start.getMinutes();
        return (minutesA - minutesB) * dir;
      }
      case 'client':
        return this.compareStrings(a.clientName || '', b.clientName || '') * dir;
      case 'service':
        return this.compareStrings(a.serviceInfo?.type || '', b.serviceInfo?.type || '') * dir;
      default:
        return 0;
    }
  }

  private compareStrings(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  }

  private buildRows(events: CalendarEvent[], options: ExportOptions): ExportRow[] {
    return events.map(event => {
      const durationMinutes = event.serviceInfo?.duration ?? differenceInMinutes(event.end, event.start);
      const timeLabel = options.includeTime
        ? `${format(event.start, 'MMM d, h:mma')} - ${format(event.end, 'h:mma')}`
        : '';

      return {
        id: event.id,
        date: format(event.start, 'yyyy-MM-dd'),
        dateLabel: format(event.start, 'EEE, MMM d'),
        timeLabel: timeLabel || format(event.start, 'EEE, MMM d'),
        client: event.clientName || event.title,
        service: event.serviceInfo?.type
          ? this.eventProcessor.getServiceTypeLabel(event.serviceInfo.type)
          : 'Other',
        durationMinutes,
        location: event.location,
        isWorkEvent: !!event.isWorkEvent,
        groupPath: options.groupLevels.map(level =>
          this.formatGroupLabel(this.getGroupKey(event, level.field), level.field)
        ),
      };
    });
  }

  private groupRows(rows: ExportRow[], groupLevels: GroupLevel[]): GroupBucket[] {
    if (!rows.length) {
      return [];
    }

    if (!groupLevels.length) {
      return [{ key: 'All events', label: 'All events', rows }];
    }

    const buckets = new Map<string, ExportRow[]>();
    const orderedLevels = [...groupLevels].sort((a, b) => a.order - b.order);

    rows.forEach(row => {
      const path = orderedLevels.map((_, idx) => row.groupPath[idx] || 'Other');
      const key = path.join(' / ');
      const list = buckets.get(key) ?? [];
      list.push(row);
      buckets.set(key, list);
    });

    return Array.from(buckets.entries()).map(([key, bucketRows]) => ({
      key,
      label: key,
      rows: bucketRows,
    }));
  }

  private buildGroupSummaries(groupedRows: GroupBucket[]): ExportGroup[] {
    return groupedRows.map(group => ({
      key: group.key,
      label: group.label,
      depth: group.label.split('/').length,
      count: group.rows.length,
      totalDurationMinutes: group.rows.reduce((sum, row) => sum + row.durationMinutes, 0),
    }));
  }

  private formatGroups(groups: GroupBucket[], options: ExportOptions): string {
    const lines: string[] = [];

    groups.forEach(group => {
      lines.push(`${group.label} (${group.rows.length})`);
      group.rows.forEach(row => lines.push(this.formatRowLine(row, options)));
      lines.push('');
    });

    return lines.join('\n').trim();
  }

  private formatGroupLabel(raw: string, field: GroupField): string {
    switch (field) {
      case 'date':
        return format(this.parseDateKey(raw), 'EEE, MMM d');
      case 'week': {
        const start = startOfWeek(this.parseDateKey(raw));
        return `Week of ${format(start, 'MMM d')}`;
      }
      case 'month':
        return format(this.parseDateKey(raw), 'MMMM yyyy');
      case 'client':
        return raw || 'Unknown Client';
      case 'service':
        return raw || 'Other';
      default:
        return raw || 'Other';
    }
  }

  private formatRowLine(row: ExportRow, options: ExportOptions): string {
    const parts = [row.dateLabel];
    if (options.includeTime) {
      parts.push(row.timeLabel);
    }
    parts.push(row.client, row.service, `${row.durationMinutes} min`);

    if (options.includeLocation && row.location) {
      parts.push(`@ ${row.location}`);
    }

    return parts.join(' | ');
  }

  private getGroupKey(event: CalendarEvent, field: GroupField): string {
    switch (field) {
      case 'date':
        return format(event.start, 'yyyy-MM-dd');
      case 'week':
        return format(startOfWeek(event.start), 'yyyy-MM-dd');
      case 'month':
        return format(event.start, 'yyyy-MM-01');
      case 'client':
        return event.clientName || 'Unknown Client';
      case 'service':
        return event.serviceInfo?.type || 'Other';
      default:
        return 'Other';
    }
  }

  private formatCsv(rows: ExportRow[], options: ExportOptions): string {
    const headers = ['Date'];
    if (options.includeTime) {
      headers.push('Time');
    }
    headers.push('Client', 'Service', 'Duration (min)');
    if (options.includeLocation) {
      headers.push('Location');
    }

    const csvRows = rows.map(row => {
      const values = [this.escapeCsv(row.dateLabel)];
      if (options.includeTime) {
        values.push(this.escapeCsv(row.timeLabel));
      }
      values.push(
        this.escapeCsv(row.client),
        this.escapeCsv(row.service),
        row.durationMinutes.toString()
      );
      if (options.includeLocation) {
        values.push(this.escapeCsv(row.location || ''));
      }
      return values.join(',');
    });

    return [headers.join(','), ...csvRows].join('\n');
  }

  private escapeCsv(value: string): string {
    if (!value) return '';
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private parseDateKey(raw: string): Date {
    return new Date(`${raw}T12:00:00`);
  }
}
