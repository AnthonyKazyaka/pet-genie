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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { Template } from '../../../models/template.model';
import { MultiEventConfig, VisitSlot, BookingType } from '../../../models/multi-event.model';
import { MultiEventService } from '../../../core/services/multi-event.service';

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
  ],
  templateUrl: './multi-event-dialog.component.html',
  styleUrl: './multi-event-dialog.component.scss',
})
export class MultiEventDialogComponent {
  private dialogRef = inject(MatDialogRef<MultiEventDialogComponent>);
  private generator = inject(MultiEventService);

  templates: Template[] = [];

  config: MultiEventConfig = {
    clientName: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(),
    bookingType: 'daily-visits',
    visits: [],
  };

  weekendSameAsWeekday = true;

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
  }

  generate(): void {
    const events = this.generator.generateEvents(this.config, this.templates);
    this.dialogRef.close(events);
  }

  close(): void {
    this.dialogRef.close();
  }
}
