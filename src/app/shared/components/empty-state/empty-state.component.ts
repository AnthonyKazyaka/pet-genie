import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="empty-state" [class.compact]="compact">
      <div class="empty-illustration">
        @if (illustration) {
          <img [src]="illustration" [alt]="title" class="illustration-image" />
        } @else {
          <div class="icon-container">
            <mat-icon>{{ icon }}</mat-icon>
          </div>
        }
      </div>
      
      <div class="empty-content">
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
        
        @if (actionLabel && actionLink) {
          <a mat-raised-button color="primary" [routerLink]="actionLink">
            @if (actionIcon) {
              <mat-icon>{{ actionIcon }}</mat-icon>
            }
            {{ actionLabel }}
          </a>
        }
        
        @if (actionLabel && !actionLink) {
          <button mat-raised-button color="primary" (click)="onAction()">
            @if (actionIcon) {
              <mat-icon>{{ actionIcon }}</mat-icon>
            }
            {{ actionLabel }}
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() illustration?: string;
  @Input() title = 'No data found';
  @Input() description = 'There is no data to display at this time.';
  @Input() actionLabel?: string;
  @Input() actionLink?: string;
  @Input() actionIcon?: string;
  @Input() compact = false;

  onAction(): void {
    // Override with (click) handler on parent
  }
}
