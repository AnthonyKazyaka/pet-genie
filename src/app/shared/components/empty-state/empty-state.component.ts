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
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-state.compact {
      padding: 24px 16px;
    }

    .empty-illustration {
      margin-bottom: 24px;
    }

    .illustration-image {
      max-width: 200px;
      max-height: 160px;
      opacity: 0.8;
    }

    .compact .illustration-image {
      max-width: 120px;
      max-height: 100px;
    }

    .icon-container {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--surface-container);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .compact .icon-container {
      width: 56px;
      height: 56px;
    }

    .icon-container mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--outline);
    }

    .compact .icon-container mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .empty-content h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 500;
      color: var(--on-surface);
    }

    .compact .empty-content h3 {
      font-size: 16px;
    }

    .empty-content p {
      margin: 0 0 20px;
      font-size: 14px;
      color: var(--on-surface-variant);
      max-width: 400px;
    }

    .compact .empty-content p {
      margin-bottom: 16px;
    }

    button mat-icon,
    a mat-icon {
      margin-right: 8px;
    }
  `]
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
