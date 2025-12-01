import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DEFAULT_TEMPLATES, Template } from '../../models';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="templates-container">
      <header class="page-header">
        <div class="header-content">
          <h1>Templates</h1>
          <p class="subtitle">Create appointment templates for quick scheduling</p>
        </div>
        <button mat-raised-button color="primary" (click)="createTemplate()">
          <mat-icon>add</mat-icon>
          New Template
        </button>
      </header>

      <div class="templates-grid">
        @for (template of templates(); track template.name) {
          <mat-card class="template-card">
            <mat-card-header>
              <span class="template-icon">{{ template.icon }}</span>
              <mat-card-title>{{ template.name }}</mat-card-title>
              <mat-card-subtitle>{{ formatDuration(template.duration) }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="template-details">
                <div class="detail">
                  <mat-icon>category</mat-icon>
                  <span>{{ formatType(template.type) }}</span>
                </div>
                <div class="detail" *ngIf="template.includeTravel">
                  <mat-icon>directions_car</mat-icon>
                  <span>{{ template.travelBuffer }} min travel buffer</span>
                </div>
              </div>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-icon-button matTooltip="Edit" (click)="editTemplate(template)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Duplicate" (click)="duplicateTemplate(template)">
                <mat-icon>content_copy</mat-icon>
              </button>
              <button
                mat-icon-button
                matTooltip="Delete"
                (click)="deleteTemplate(template)"
                [disabled]="template.isDefault"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .templates-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-content h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--on-surface-variant);
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .template-card {
      display: flex;
      flex-direction: column;
    }

    .template-card mat-card-header {
      padding: 16px 16px 0;
    }

    .template-icon {
      font-size: 32px;
      margin-right: 12px;
    }

    .template-card mat-card-content {
      flex: 1;
      padding: 16px;
    }

    .template-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--on-surface-variant);
      font-size: 14px;
    }

    .detail mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    mat-card-actions {
      border-top: 1px solid var(--outline-variant);
    }
  `],
})
export class TemplatesComponent {
  private dialog = inject(MatDialog);

  // Use default templates for now
  templates = signal(
    DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `default-${i}`,
      userId: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  formatDuration(minutes: number): string {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} min`;
  }

  formatType(type: string): string {
    const types: Record<string, string> = {
      'drop-in': 'Drop-In Visit',
      walk: 'Walk',
      overnight: 'Overnight',
      housesit: 'Housesit',
      'meet-greet': 'Meet & Greet',
      'nail-trim': 'Nail Trim',
      other: 'Other',
    };
    return types[type] || type;
  }

  createTemplate(): void {
    // TODO: Open template dialog
    console.log('Create template');
  }

  editTemplate(template: Template): void {
    // TODO: Open template dialog for editing
    console.log('Edit template', template);
  }

  duplicateTemplate(template: Template): void {
    const newTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.update((t) => [...t, newTemplate]);
  }

  deleteTemplate(template: Template): void {
    if (template.isDefault) return;
    this.templates.update((t) => t.filter((item) => item.id !== template.id));
  }
}
