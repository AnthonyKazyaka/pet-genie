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
  template: `
    <div class="template-dialog">
      <div class="dialog-header">
        <h2>{{ data.mode === 'create' ? 'Create Template' : 'Edit Template' }}</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-dialog-content>
          <!-- Icon Selection -->
          <div class="icon-section">
            <label>Choose an icon</label>
            <div class="icon-grid">
              @for (emoji of availableIcons; track emoji) {
                <button
                  type="button"
                  class="icon-option"
                  [class.selected]="form.get('icon')?.value === emoji"
                  (click)="selectIcon(emoji)"
                >
                  {{ emoji }}
                </button>
              }
            </div>
          </div>

          <!-- Basic Info -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Template Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g., Morning Dog Walk" />
            <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Service Type</mat-label>
              <mat-select formControlName="type">
                @for (type of serviceTypes; track type.value) {
                  <mat-option [value]="type.value">{{ type.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Duration</mat-label>
              <mat-select formControlName="duration">
                @for (duration of durations; track duration.value) {
                  <mat-option [value]="duration.value">{{ duration.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <mat-divider></mat-divider>

          <!-- Travel Settings -->
          <div class="travel-section">
            <div class="toggle-row">
              <div class="toggle-info">
                <mat-icon>directions_car</mat-icon>
                <div>
                  <span class="toggle-label">Include travel time</span>
                  <span class="toggle-description">Add buffer time for travel to and from appointments</span>
                </div>
              </div>
              <mat-slide-toggle formControlName="includeTravel"></mat-slide-toggle>
            </div>

            @if (form.get('includeTravel')?.value) {
              <mat-form-field appearance="outline" class="travel-buffer-field">
                <mat-label>Travel buffer (minutes)</mat-label>
                <input matInput type="number" formControlName="travelBuffer" min="0" max="120" />
                <mat-hint>Time added before and after each appointment</mat-hint>
              </mat-form-field>
            }
          </div>

          <mat-divider></mat-divider>

          <!-- Notes -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Default Notes (optional)</mat-label>
            <textarea
              matInput
              formControlName="defaultNotes"
              placeholder="Add default notes for this template..."
              rows="2"
            ></textarea>
          </mat-form-field>

          <!-- Preview -->
          <div class="preview-section">
            <h4>Preview</h4>
            <div class="preview-card">
              <span class="preview-icon">{{ form.get('icon')?.value || '📅' }}</span>
              <div class="preview-content">
                <span class="preview-name">{{ form.get('name')?.value || 'Template Name' }}</span>
                <span class="preview-details">
                  {{ getSelectedTypeLabel() }} · {{ getSelectedDurationLabel() }}
                  @if (form.get('includeTravel')?.value) {
                    <span> · +{{ form.get('travelBuffer')?.value }}min travel</span>
                  }
                </span>
              </div>
            </div>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" (click)="close()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="!form.valid">
            {{ data.mode === 'create' ? 'Create Template' : 'Save Changes' }}
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .template-dialog {
      width: 500px;
      max-width: 100%;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid var(--outline-variant);
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: var(--on-surface);
    }

    mat-dialog-content {
      padding: 24px !important;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    mat-dialog-actions {
      padding: 16px 24px !important;
      margin: 0 !important;
    }

    .full-width {
      width: 100%;
    }

    .row {
      display: flex;
      gap: 16px;
    }

    .flex-1 {
      flex: 1;
    }

    /* Icon Selection */
    .icon-section label {
      display: block;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 500;
    }

    .icon-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .icon-option {
      width: 48px;
      height: 48px;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid transparent;
      border-radius: 12px;
      background: var(--surface-container-low);
      cursor: pointer;
      transition: all var(--transition-fast) ease;
    }

    .icon-option:hover {
      background: var(--surface-container-high);
    }

    .icon-option.selected {
      border-color: var(--primary);
      background: var(--primary-container);
    }

    /* Travel Section */
    .travel-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .travel-buffer-field {
      margin-left: 40px;
      width: calc(100% - 40px);
    }

    /* Toggle Row */
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .toggle-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .toggle-info mat-icon {
      color: var(--on-surface-variant);
      margin-top: 2px;
    }

    .toggle-info > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 500;
    }

    .toggle-description {
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    /* Preview */
    .preview-section {
      background: var(--surface-container-low);
      border-radius: 12px;
      padding: 16px;
    }

    .preview-section h4 {
      margin: 0 0 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      color: var(--on-surface-variant);
    }

    .preview-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--surface);
      border-radius: 8px;
      border: 1px solid var(--outline-variant);
    }

    .preview-icon {
      font-size: 32px;
    }

    .preview-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .preview-name {
      font-weight: 500;
    }

    .preview-details {
      font-size: 12px;
      color: var(--on-surface-variant);
    }
  `],
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
