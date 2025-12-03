import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { CalendarEvent } from '../../../models';
import { ExportOptions, GroupLevel, SortLevel } from '../../../models/export.model';
import { EventExporterService } from '../../../core/services/event-exporter.service';

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
  ],
  templateUrl: './export-dialog.component.html',
  styleUrl: './export-dialog.component.scss',
})
export class ExportDialogComponent {
  private dialogRef = inject(MatDialogRef<ExportDialogComponent>);
  private exporter = inject(EventExporterService);

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

  groupFields: GroupLevel['field'][] = ['date', 'client', 'service', 'week', 'month'];
  sortFields: SortLevel['field'][] = ['date', 'client', 'service', 'time'];

  generatePreview(): void {
    const { content, count } = this.exporter.export(this.events, this.options);
    this.preview = content;
    this.count = count;
  }

  close(): void {
    this.dialogRef.close();
  }
}
