import { Injectable } from '@angular/core';
import { addDays, isWeekend, isBefore, isAfter, isEqual, set } from 'date-fns';
import { CalendarEvent } from '../../models/event.model';
import {
  DropinConfig,
  GeneratedEvent,
  MultiEventConfig,
  OvernightConfig,
  VisitSlot,
} from '../../models/multi-event.model';
import { Template } from '../../models/template.model';

/**
 * MultiEventService
 * Generates multiple events (daily visits / overnight stays with drop-ins) from a config.
 * Based on gps-admin multi-scheduling feature.
 */
@Injectable({
  providedIn: 'root',
})
export class MultiEventService {
  generateEvents(config: MultiEventConfig, templates: Template[]): GeneratedEvent[] {
    const events: GeneratedEvent[] = [];

    const validationErrors = this.validateConfig(config);
    if (validationErrors.length) {
      throw new Error(`Invalid multi-event config: ${validationErrors.join('; ')}`);
    }

    for (
      let date = new Date(config.startDate);
      date <= config.endDate;
      date = addDays(date, 1)
    ) {
      const dayVisits = this.getVisitSlotsForDate(config, date);

      // Daily visits
      for (const slot of dayVisits) {
        const template = templates.find((t) => t.id === slot.templateId);
        const start = this.combineDateTime(date, slot.time);
        const duration = slot.duration || template?.duration || 30;
        const end = addMinutes(start, duration);
        events.push({
          title: this.buildTitle(config.clientName, template),
          start,
          end,
          templateId: slot.templateId,
        });
      }

      // Overnight/housesit
      if (config.bookingType === 'overnight-stay' && config.overnightConfig) {
        events.push(this.buildOvernightEvent(date, config.clientName, config.overnightConfig, templates));
        if (config.dropinConfig) {
          const drop = this.buildDropinDuringOvernight(date, config.dropinConfig, templates, config.clientName);
          events.push(...drop);
        }
      }
    }

    return events;
  }

  validateConfig(config: MultiEventConfig): string[] {
    const errors: string[] = [];
    if (!config.clientName?.trim()) errors.push('Client name is required');
    if (!config.startDate || !config.endDate) errors.push('Start and end dates are required');
    if (config.startDate && config.endDate && isAfter(config.startDate, config.endDate)) {
      errors.push('Start date must be before end date');
    }
    if (!config.visits?.length && config.bookingType === 'daily-visits') {
      errors.push('At least one visit slot is required');
    }
    if (config.bookingType === 'overnight-stay' && !config.overnightConfig) {
      errors.push('Overnight configuration is required for overnight stay');
    }
    return errors;
  }

  detectConflicts(existingEvents: CalendarEvent[], generated: GeneratedEvent[]): GeneratedEvent[] {
    return generated.filter((gen) =>
      existingEvents.some((evt) => this.overlaps(evt.start, evt.end, gen.start, gen.end))
    );
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return (
      isBefore(aStart, bEnd) &&
      isAfter(aEnd, bStart) ||
      isEqual(aStart, bStart) ||
      isEqual(aEnd, bEnd)
    );
  }

  private getVisitSlotsForDate(config: MultiEventConfig, date: Date): VisitSlot[] {
    const isWeekendDay = isWeekend(date);
    if (isWeekendDay && config.weekendVisits?.length) {
      return config.weekendVisits;
    }
    return config.visits;
  }

  private buildTitle(clientName: string, template?: Template): string {
    return template ? `${clientName} - ${template.name}` : clientName;
  }

  private buildOvernightEvent(
    date: Date,
    clientName: string,
    overnight: OvernightConfig,
    templates: Template[]
  ): GeneratedEvent {
    const template = templates.find((t) => t.id === overnight.templateId);
    const start = this.combineDateTime(date, overnight.arrivalTime);
    const end = this.combineDateTime(addDays(date, 1), overnight.departureTime);

    return {
      title: this.buildTitle(clientName, template),
      start,
      end,
      templateId: overnight.templateId,
    };
  }

  private buildDropinDuringOvernight(
    date: Date,
    drop: DropinConfig,
    templates: Template[],
    clientName: string
  ): GeneratedEvent[] {
    const template = templates.find((t) => t.id === drop.templateId);
    const start = this.combineDateTime(date, drop.time);
    const end = addMinutes(start, drop.duration || template?.duration || 30);
    return [
      {
        title: this.buildTitle(clientName, template),
        start,
        end,
        templateId: drop.templateId,
      },
    ];
  }

  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map((n) => parseInt(n, 10));
    return set(new Date(date), { hours, minutes, seconds: 0, milliseconds: 0 });
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
