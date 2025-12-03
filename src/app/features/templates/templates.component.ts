import { Component, inject, signal, computed, WritableSignal } from '@angular/core';
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
  styleUrl: './templates.component.scss',
  templateUrl: './templates.component.html',
})
export class TemplatesComponent {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Search and filter
  searchQuery = '';
  selectedType: WritableSignal<TemplateType | ''> = signal('');

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
    if (this.selectedType()) {
      result = result.filter(t => t.type === this.selectedType());
    }

    return result;
  });

  onSearchChange(): void {
    // Trigger computed recalculation
    this.templates.update(t => [...t]);
  }

  onTypeChange(event: any): void {
    this.selectedType.set(event.value || '');
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
    this.selectedType.set('');
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
