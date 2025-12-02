import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DEFAULT_TEMPLATES, Template, TemplateType } from '../../models';
import { ConfirmDialogComponent, ConfirmDialogData, EmptyStateComponent } from '../../shared';
import { TemplateDialogComponent, TemplateDialogData } from './template-dialog.component';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatMenuModule,
    MatSnackBarModule,
    ConfirmDialogComponent,
    EmptyStateComponent,
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

      <!-- Search and Filter -->
      <div class="search-filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            placeholder="Search templates..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
          />
          @if (searchQuery) {
            <button mat-icon-button matSuffix (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <div class="filter-chips">
          <mat-chip-listbox [(value)]="selectedType" (change)="onFilterChange()">
            <mat-chip-option value="">All</mat-chip-option>
            @for (type of serviceTypes; track type.value) {
              <mat-chip-option [value]="type.value">{{ type.label }}</mat-chip-option>
            }
          </mat-chip-listbox>
        </div>
      </div>

      @if (filteredTemplates().length === 0) {
        @if (searchQuery || selectedType) {
          <app-empty-state
            icon="search_off"
            title="No templates found"
            description="Try adjusting your search or filter criteria"
            actionLabel="Clear Filters"
            (action)="clearFilters()"
          ></app-empty-state>
        } @else {
          <app-empty-state
            icon="description"
            title="No templates yet"
            description="Create your first template to streamline your scheduling"
            actionLabel="Create Template"
            (action)="createTemplate()"
          ></app-empty-state>
        }
      } @else {
        <div class="templates-grid">
          @for (template of filteredTemplates(); track template.id) {
            <mat-card class="template-card" [class.default]="template.isDefault">
              <div class="card-content" (click)="editTemplate(template)">
                <div class="template-header">
                  <span class="template-icon">{{ template.icon }}</span>
                  <div class="template-info">
                    <h3>{{ template.name }}</h3>
                    <span class="template-duration">{{ formatDuration(template.duration) }}</span>
                  </div>
                  @if (template.isDefault) {
                    <span class="default-badge">Default</span>
                  }
                </div>

                <div class="template-details">
                  <div class="detail-chip">
                    <mat-icon>category</mat-icon>
                    <span>{{ formatType(template.type) }}</span>
                  </div>
                  @if (template.includeTravel) {
                    <div class="detail-chip">
                      <mat-icon>directions_car</mat-icon>
                      <span>+{{ template.travelBuffer }}min</span>
                    </div>
                  }
                </div>
              </div>

              <div class="card-actions">
                <button mat-icon-button matTooltip="Edit" (click)="editTemplate(template); $event.stopPropagation()">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Duplicate" (click)="duplicateTemplate(template); $event.stopPropagation()">
                  <mat-icon>content_copy</mat-icon>
                </button>
                <button
                  mat-icon-button
                  matTooltip="Delete"
                  (click)="confirmDeleteTemplate(template); $event.stopPropagation()"
                  [disabled]="template.isDefault"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </mat-card>
          }

          <!-- Add New Card -->
          <button class="add-template-card" (click)="createTemplate()">
            <mat-icon>add_circle_outline</mat-icon>
            <span>Add Template</span>
          </button>
        </div>
      }
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
      flex-wrap: wrap;
      gap: 16px;
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

    /* Search and Filter */
    .search-filter-bar {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .search-field {
      width: 100%;
      max-width: 400px;
    }

    .search-field mat-icon {
      color: var(--on-surface-variant);
    }

    .filter-chips {
      overflow-x: auto;
      padding: 4px 0;
    }

    .filter-chips mat-chip-listbox {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
    }

    /* Templates Grid */
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    /* Template Card */
    .template-card {
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      border: 1px solid var(--outline-variant);
      overflow: hidden;
      transition: all var(--transition-normal) ease;
      cursor: pointer;
    }

    .template-card:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .template-card.default {
      border-color: var(--tertiary);
    }

    .card-content {
      padding: 20px;
      flex: 1;
    }

    .template-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .template-icon {
      font-size: 40px;
      line-height: 1;
    }

    .template-info {
      flex: 1;
    }

    .template-info h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .template-duration {
      font-size: 14px;
      color: var(--on-surface-variant);
    }

    .default-badge {
      font-size: 10px;
      padding: 4px 10px;
      background: var(--tertiary-container);
      color: var(--on-tertiary-container);
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .template-details {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .detail-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--surface-container-high);
      border-radius: 16px;
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .detail-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .detail-chip.work {
      background: var(--primary-container);
      color: var(--on-primary-container);
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      padding: 8px 12px;
      border-top: 1px solid var(--outline-variant);
      background: var(--surface-container-low);
    }

    /* Add Template Card */
    .add-template-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 180px;
      border: 2px dashed var(--outline-variant);
      border-radius: 16px;
      background: transparent;
      cursor: pointer;
      transition: all var(--transition-normal) ease;
      color: var(--on-surface-variant);
    }

    .add-template-card:hover {
      border-color: var(--primary);
      background: var(--primary-container);
      color: var(--on-primary-container);
    }

    .add-template-card mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .add-template-card span {
      font-size: 14px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .templates-grid {
        grid-template-columns: 1fr;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .page-header button {
        width: 100%;
      }
    }
  `],
})
export class TemplatesComponent {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Search and filter
  searchQuery = '';
  selectedType: TemplateType | '' = '';

  serviceTypes = [
    { value: 'drop-in' as TemplateType, label: 'Drop-In' },
    { value: 'walk' as TemplateType, label: 'Walk' },
    { value: 'overnight' as TemplateType, label: 'Overnight' },
    { value: 'housesit' as TemplateType, label: 'Housesit' },
    { value: 'meet-greet' as TemplateType, label: 'Meet & Greet' },
    { value: 'nail-trim' as TemplateType, label: 'Nail Trim' },
  ];

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

  // Filtered templates
  filteredTemplates = computed(() => {
    let result = this.templates();

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (this.selectedType) {
      result = result.filter(t => t.type === this.selectedType);
    }

    return result;
  });

  onSearchChange(): void {
    // Trigger computed recalculation
    this.templates.update(t => [...t]);
  }

  onFilterChange(): void {
    // Trigger computed recalculation
    this.templates.update(t => [...t]);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchChange();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedType = '';
    this.onSearchChange();
  }

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
    const dialogRef = this.dialog.open(TemplateDialogComponent, {
      data: { mode: 'create' } as TemplateDialogData,
      maxWidth: '100vw',
      panelClass: 'template-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result: Template | undefined) => {
      if (result) {
        this.templates.update(t => [...t, result]);
        this.snackBar.open('Template created', 'OK', { duration: 3000 });
      }
    });
  }

  editTemplate(template: Template): void {
    const dialogRef = this.dialog.open(TemplateDialogComponent, {
      data: { mode: 'edit', template } as TemplateDialogData,
      maxWidth: '100vw',
      panelClass: 'template-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result: Template | undefined) => {
      if (result) {
        this.templates.update(t =>
          t.map(item => (item.id === result.id ? result : item))
        );
        this.snackBar.open('Template updated', 'OK', { duration: 3000 });
      }
    });
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
    this.snackBar.open('Template duplicated', 'OK', { duration: 3000 });
  }

  confirmDeleteTemplate(template: Template): void {
    if (template.isDefault) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Template',
        message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteTemplate(template);
      }
    });
  }

  deleteTemplate(template: Template): void {
    if (template.isDefault) return;
    this.templates.update((t) => t.filter((item) => item.id !== template.id));
    this.snackBar.open('Template deleted', 'OK', { duration: 3000 });
  }
}
