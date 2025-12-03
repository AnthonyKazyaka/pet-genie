import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { Template, TemplateType } from '../../models';

export interface TemplateDialogData {
  template?: Template;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-template-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDividerModule,
  ],
  styleUrl: './template-dialog.component.scss',
  templateUrl: './template-dialog.component.html',
})
export class TemplateDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TemplateDialogComponent>);
  public data: TemplateDialogData = inject(MAT_DIALOG_DATA);

  availableIcons = ['🐕', '🐈', '🦮', '🐾', '🏠', '✂️', '🚗', '🌙', '☀️', '🎾', '🦴', '💊', '📋', '👋', '⭐'];

  serviceTypes = [
    { value: 'drop-in', label: 'Drop-In Visit' },
    { value: 'walk', label: 'Walk' },
    { value: 'overnight', label: 'Overnight' },
    { value: 'housesit', label: 'Housesit' },
    { value: 'meet-greet', label: 'Meet & Greet' },
    { value: 'nail-trim', label: 'Nail Trim' },
    { value: 'other', label: 'Other' },
  ];

  durations = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '1 day' },
    { value: 2880, label: '2 days' },
    { value: 4320, label: '3 days' },
    { value: 7200, label: '5 days' },
    { value: 10080, label: '7 days' },
  ];

  form: FormGroup = this.fb.group({
    name: [this.data.template?.name || '', Validators.required],
    icon: [this.data.template?.icon || '🐕'],
    type: [this.data.template?.type || 'drop-in'],
    duration: [this.data.template?.duration || 30],
    includeTravel: [this.data.template?.includeTravel ?? true],
    travelBuffer: [this.data.template?.travelBuffer || 15],
    defaultNotes: [this.data.template?.defaultNotes || ''],
    defaultStartTime: [this.data.template?.defaultStartTime || ''],
    defaultEndTime: [this.data.template?.defaultEndTime || ''],
  });

  selectIcon(emoji: string): void {
    this.form.patchValue({ icon: emoji });
  }

  getSelectedTypeLabel(): string {
    const type = this.form.get('type')?.value;
    return this.serviceTypes.find(t => t.value === type)?.label || type;
  }

  getSelectedDurationLabel(): string {
    const duration = this.form.get('duration')?.value;
    return this.durations.find(d => d.value === duration)?.label || `${duration} min`;
  }

  getTimeRangeLabel(): string {
    const start = this.form.get('defaultStartTime')?.value;
    const end = this.form.get('defaultEndTime')?.value;
    if (!start && !end) {
      return '';
    }
    if (start && end) {
      return `${start} - ${end}`;
    }
    return start || end;
  }

  save(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const template: Partial<Template> = {
        ...this.data.template,
        name: formValue.name,
        icon: formValue.icon,
        type: formValue.type as TemplateType,
        duration: formValue.duration,
        includeTravel: formValue.includeTravel,
        travelBuffer: formValue.includeTravel ? formValue.travelBuffer : 0,
        defaultNotes: formValue.defaultNotes,
        defaultStartTime: formValue.defaultStartTime || undefined,
        defaultEndTime: formValue.defaultEndTime || undefined,
        updatedAt: new Date(),
      };

      if (this.data.mode === 'create') {
        template.id = `template-${Date.now()}`;
        template.userId = 'local';
        template.createdAt = new Date();
        template.isDefault = false;
      }

      this.dialogRef.close(template);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
