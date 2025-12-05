import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CalendarEvent } from '../../../models';
import {
  ExportOptions,
  GroupLevel,
  GroupField,
  SortLevel,
  SortField,
  SortDirection,
} from '../../../models/export.model';
import { EventExporterService } from '../../../core/services/event-exporter.service';

export interface ExportDialogData {
  events: CalendarEvent[];
  defaultOptions?: Partial<ExportOptions>;
}

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './export-dialog.component.html',
  styleUrl: './export-dialog.component.scss',
})
export class ExportDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ExportDialogComponent>);
  private exporter = inject(EventExporterService);
  private snackBar = inject(MatSnackBar);
  data = inject<ExportDialogData>(MAT_DIALOG_DATA);

  events: CalendarEvent[] = [];

  options: ExportOptions = {
    startDate: new Date(),
    endDate: new Date(),
    includeTime: true,
    includeLocation: false,
    groupLevels: [],
    sortLevels: [],
    workEventsOnly: false,
  };

  preview = '';
  count = 0;

  groupFields: GroupField[] = ['date', 'client', 'service', 'week', 'month'];
  sortFields: SortField[] = ['date', 'client', 'service', 'time'];

  get groupLevelsOrdered(): GroupLevel[] {
    return [...this.options.groupLevels].sort((a, b) => a.order - b.order);
  }

  ngOnInit(): void {
    this.events = this.data?.events || [];
    if (this.data?.defaultOptions) {
      this.options = { ...this.options, ...this.data.defaultOptions };
    }
    this.generatePreview();
  }

  generatePreview(): void {
    const { content, count } = this.exporter.export(this.events, this.options);
    this.preview = content;
    this.count = count;
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

  copyToClipboard(): void {
    if (!this.preview) return;
    navigator.clipboard?.writeText(this.preview).then(() => {
      this.snackBar.open('Export copied to clipboard', 'OK', { duration: 2500 });
    });
  }

  download(): void {
    if (!this.preview) return;
    const blob = new Blob([this.preview], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'events-export.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  close(): void {
    this.dialogRef.close();
  }

  isFieldInGroups(field: GroupField): boolean {
    return this.options.groupLevels.some((g) => g.field === field);
  }

  isFieldInSorts(field: SortField): boolean {
    return this.options.sortLevels.some((s) => s.field === field);
  }
}
