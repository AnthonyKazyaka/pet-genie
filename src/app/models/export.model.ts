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
  searchTerm?: string;
}

export interface ExportResult {
  content: string;
  csv: string;
  count: number;
  rows: ExportRow[];
  groups: ExportGroup[];
}

export interface ExportRow {
  id: string;
  date: string;
  dateLabel: string;
  timeLabel: string;
  client: string;
  service: string;
  durationMinutes: number;
  location?: string;
  isWorkEvent: boolean;
  groupPath: string[];
}

export interface ExportGroup {
  key: string;
  label: string;
  depth: number;
  count: number;
  totalDurationMinutes: number;
}

export interface ExportTemplate {
  id: string;
  name: string;
  includeDateRange: boolean;
  options: ExportOptions;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  isDefault?: boolean;
}
