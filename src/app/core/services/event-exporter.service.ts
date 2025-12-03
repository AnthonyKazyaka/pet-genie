import { Injectable } from '@angular/core';
import { differenceInMinutes, format, isWithinInterval } from 'date-fns';
import { CalendarEvent, ServiceInfo } from '../../models/event.model';
import {
  ExportOptions,
  ExportResult,
  GroupField,
  GroupLevel,
  SortLevel,
} from '../../models/export.model';
import { EventProcessorService } from './event-processor.service';

/**
 * EventExporterService
 * Handles grouping, sorting, and formatting of events for export (text/clipboard/file).
 * Structure based on gps-admin export feature; formatting kept lightweight for now.
 */
@Injectable({
  providedIn: 'root',
})
export class EventExporterService {
  constructor(private eventProcessor: EventProcessorService) {}

  export(events: CalendarEvent[], options: ExportOptions): ExportResult {
    const filtered = this.filterEvents(events, options);
    const sorted = this.sortEvents(filtered, options.sortLevels);
    const grouped = this.groupEvents(sorted, options.groupLevels);
    const content = this.formatGroups(grouped, options);
    return { content, count: filtered.length };
  }

  private filterEvents(events: CalendarEvent[], options: ExportOptions): CalendarEvent[] {
    return events.filter((event) => {
      if (options.workEventsOnly && !this.eventProcessor.isWorkEvent(event)) {
        return false;
      }

      return isWithinInterval(event.start, {
        start: options.startDate,
        end: options.endDate,
      });
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
      case 'time':
        return (a.start.getHours() * 60 + a.start.getMinutes() - (b.start.getHours() * 60 + b.start.getMinutes())) * dir;
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

  private groupEvents(
    events: CalendarEvent[],
    groupLevels: GroupLevel[]
  ): Map<string, CalendarEvent[]> {
    if (!groupLevels.length) {
      return new Map([['', events]]);
    }

    const [current, ...rest] = groupLevels.sort((a, b) => a.order - b.order);
    const groups = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const key = this.getGroupKey(event, current.field);
      const list = groups.get(key) ?? [];
      list.push(event);
      groups.set(key, list);
    }

    if (!rest.length) {
      return groups;
    }

    // Recursively group deeper levels
    const nested = new Map<string, CalendarEvent[]>();
    for (const [key, groupEvents] of groups.entries()) {
      const subgroup = this.groupEvents(groupEvents, rest.map((g) => ({ ...g, order: g.order - 1 })));
      for (const [subKey, subEvents] of subgroup.entries()) {
        nested.set(`${key}::${subKey}`, subEvents);
      }
    }

    return nested;
  }

  private getGroupKey(event: CalendarEvent, field: GroupField): string {
    switch (field) {
      case 'date':
        return format(event.start, 'yyyy-MM-dd');
      case 'week':
        return format(event.start, 'yyyy-ww');
      case 'month':
        return format(event.start, 'yyyy-MM');
      case 'client':
        return event.clientName || 'Unknown Client';
      case 'service':
        return event.serviceInfo?.type || 'Other';
      default:
        return 'Other';
    }
  }

  private formatGroups(groups: Map<string, CalendarEvent[]>, options: ExportOptions): string {
    const lines: string[] = [];

    for (const [key, events] of groups.entries()) {
      if (key) {
        lines.push(this.formatGroupHeader(key, options));
      }
      for (const event of events) {
        lines.push(this.formatEventLine(event, options));
      }
      lines.push(''); // spacer between groups
    }

    return lines.join('\n').trim();
  }

  private formatGroupHeader(key: string, options: ExportOptions): string {
    // For multi-level grouping keys encoded with '::', show readable breadcrumb.
    const parts = key.split('::').filter(Boolean);
    const labels = parts.map((part) => this.formatGroupLabel(part));
    return labels.join(' / ');
  }

  private formatGroupLabel(raw: string): string {
    // Try to detect date-like keys
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(raw)) {
      return format(new Date(raw), 'EEE, MMM d');
    }
    if (/^\\d{4}-\\d{2}$/.test(raw)) {
      return format(new Date(raw + '-01'), 'MMMM yyyy');
    }
    if (/^\\d{4}-\\d{2}$/.test(raw)) {
      return raw;
    }
    return raw;
  }

  private formatEventLine(event: CalendarEvent, options: ExportOptions): string {
    const parts: string[] = [];
    const serviceInfo: ServiceInfo | undefined = event.serviceInfo;

    // Time & date
    if (options.includeTime) {
      parts.push(format(event.start, 'MMM d, h:mma'));
    } else {
      parts.push(format(event.start, 'MMM d'));
    }

    // Client / title
    parts.push(event.clientName || event.title);

    // Service
    if (serviceInfo?.type) {
      parts.push(this.eventProcessor.getServiceTypeLabel(serviceInfo.type));
    }

    // Duration
    const durationMinutes = serviceInfo?.duration ?? differenceInMinutes(event.end, event.start);
    parts.push(`${durationMinutes} min`);

    // Location
    if (options.includeLocation && event.location) {
      parts.push(`@ ${event.location}`);
    }

    return parts.join(' | ');
  }
}
