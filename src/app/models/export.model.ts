export type GroupField = 'date' | 'client' | 'service' | 'week' | 'month';
export type SortField = 'date' | 'client' | 'service' | 'time';
export type SortDirection = 'asc' | 'desc';

export interface GroupLevel {
  field: GroupField;
  order: number;
}

export interface SortLevel {
  field: SortField;
  direction: SortDirection;
}

export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  includeTime: boolean;
  includeLocation: boolean;
  groupLevels: GroupLevel[];
  sortLevels: SortLevel[];
  workEventsOnly: boolean;
}

export interface ExportResult {
  content: string;
  count: number;
}
