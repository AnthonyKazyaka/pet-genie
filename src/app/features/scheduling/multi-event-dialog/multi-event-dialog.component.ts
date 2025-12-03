import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Template } from '../../../models/template.model';
import {
  MultiEventConfig,
  VisitSlot,
  BookingType,
  GeneratedEvent,
} from '../../../models/multi-event.model';
import { MultiEventService } from '../../../core/services/multi-event.service';
import { CalendarEvent } from '../../../models/event.model';

export interface MultiEventDialogData {
  templates: Template[];
  existingEvents?: CalendarEvent[];
}

@Component({
  selector: 'app-multi-event-dialog',
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
    MatSlideToggleModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './multi-event-dialog.component.html',
  styleUrl: './multi-event-dialog.component.scss',
})
export class MultiEventDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<MultiEventDialogComponent>);
  private generator = inject(MultiEventService);
  private snackBar = inject(MatSnackBar);
  private data = inject<MultiEventDialogData>(MAT_DIALOG_DATA);

  templates: Template[] = [];
  existingEvents: CalendarEvent[] = [];
  validationErrors = signal<string[]>([]);

  config: MultiEventConfig = {
    clientName: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(),
    bookingType: 'daily-visits',
    visits: [],
  };

  weekendSameAsWeekday = true;

  conflicts = signal<GeneratedEvent[]>([]);
  hasConflicts = computed(() => this.conflicts().length > 0);

  ngOnInit(): void {
    this.templates = this.data?.templates || [];
    this.existingEvents = this.data?.existingEvents || [];
    if (!this.config.visits.length && this.templates.length) {
      this.addVisitSlot('weekday');
    }
  }

  addVisitSlot(target: 'weekday' | 'weekend'): void {
    const slot: VisitSlot = { templateId: this.templates[0]?.id || '', time: '09:00', duration: 30 };
    if (target === 'weekday') {
      this.config.visits = [...this.config.visits, slot];
    } else {
      this.config.weekendVisits = [...(this.config.weekendVisits || []), slot];
    }
  }

  removeVisitSlot(target: 'weekday' | 'weekend', index: number): void {
    if (target === 'weekday') {
      this.config.visits = this.config.visits.filter((_, i) => i !== index);
    } else {
      this.config.weekendVisits = (this.config.weekendVisits || []).filter((_, i) => i !== index);
    }
  }

  toggleWeekendSame(): void {
    if (this.weekendSameAsWeekday) {
      this.config.weekendVisits = undefined;
    } else {
      this.config.weekendVisits = [...this.config.visits];
    }
  }

  onBookingTypeChange(type: BookingType): void {
    this.config.bookingType = type;
    if (type === 'overnight-stay' && !this.config.overnightConfig) {
      this.config.overnightConfig = {
        templateId: this.templates[0]?.id || '',
        arrivalTime: '18:00',
        departureTime: '08:00',
      };
    }
  }

  generate(): void {
    const errors = this.generator.validateConfig(this.config);
    this.validationErrors.set(errors);
    if (errors.length) {
      this.snackBar.open(errors[0], 'OK', { duration: 3000 });
      return;
    }

    const events = this.generator.generateEvents(this.config, this.templates);
    this.conflicts.set(this.generator.detectConflicts(this.existingEvents, events));

    if (this.conflicts().length) {
      this.snackBar.open('Conflicts detected. Resolve before continuing.', 'OK', { duration: 4000 });
      return;
    }

    this.dialogRef.close(events);
  }

  close(): void {
    this.dialogRef.close();
  }
}
