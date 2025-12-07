import { Injectable } from '@angular/core';
import { CalendarEvent } from '../../models';
import { ExportOptions } from '../../models/export.model';

export interface ExportContext {
  events: CalendarEvent[];
  defaultOptions?: Partial<ExportOptions>;
  source?: 'calendar' | 'analytics' | 'manual';
}

@Injectable({
  providedIn: 'root',
})
export class ExportContextService {
  private context: ExportContext | null = null;

  setContext(context: ExportContext): void {
    this.context = {
      ...context,
      events: [...(context.events || [])],
      defaultOptions: context.defaultOptions ? { ...context.defaultOptions } : undefined,
    };
  }

  getContext(): ExportContext | null {
    return this.context;
  }

  clear(): void {
    this.context = null;
  }
}
