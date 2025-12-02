import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (type) {
      @case ('card') {
        <div class="skeleton-wrapper">
          @for (i of countArray; track i) {
            <div class="skeleton skeleton-card" [style.height.px]="height"></div>
          }
        </div>
      }
      @case ('list') {
        <div class="skeleton-list">
          @for (i of countArray; track i) {
            <div class="skeleton-list-item">
              <div class="skeleton skeleton-circle" [style.width.px]="40" [style.height.px]="40"></div>
              <div class="skeleton-list-content">
                <div class="skeleton skeleton-text" style="width: 60%"></div>
                <div class="skeleton skeleton-text" style="width: 40%"></div>
              </div>
            </div>
          }
        </div>
      }
      @case ('text') {
        <div class="skeleton-text-block">
          @for (i of countArray; track i) {
            <div class="skeleton skeleton-text" [style.width]="getRandomWidth()"></div>
          }
        </div>
      }
      @case ('stat') {
        <div class="skeleton-stats">
          @for (i of countArray; track i) {
            <div class="skeleton-stat">
              <div class="skeleton skeleton-circle" [style.width.px]="48" [style.height.px]="48"></div>
              <div class="skeleton-stat-content">
                <div class="skeleton skeleton-text" style="width: 50px; height: 24px"></div>
                <div class="skeleton skeleton-text" style="width: 80px"></div>
              </div>
            </div>
          }
        </div>
      }
      @case ('calendar') {
        <div class="skeleton-calendar">
          <div class="skeleton-calendar-header">
            @for (i of [1,2,3,4,5,6,7]; track i) {
              <div class="skeleton skeleton-text" style="width: 30px"></div>
            }
          </div>
          <div class="skeleton-calendar-grid">
            @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14]; track i) {
              <div class="skeleton skeleton-card" style="height: 60px"></div>
            }
          </div>
        </div>
      }
      @default {
        <div class="skeleton" [style.width]="width" [style.height.px]="height"></div>
      }
    }
  `,
  styles: [`
    .skeleton-wrapper {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skeleton-list-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      background: var(--surface-container-low);
      border-radius: 8px;
    }

    .skeleton-list-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-text-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .skeleton-stat {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--surface-container-low);
      border-radius: 12px;
    }

    .skeleton-stat-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-calendar {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skeleton-calendar-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      justify-items: center;
    }

    .skeleton-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .skeleton {
      background: linear-gradient(
        90deg,
        var(--surface-container) 0px,
        var(--surface-container-high) 40px,
        var(--surface-container) 80px
      );
      background-size: 200px 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }

    .skeleton-circle {
      border-radius: 50%;
    }

    .skeleton-card {
      border-radius: 12px;
    }

    .skeleton-text {
      height: 14px;
    }

    @keyframes skeleton-loading {
      0% {
        background-position: -200px 0;
      }
      100% {
        background-position: calc(200px + 100%) 0;
      }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() type: 'card' | 'list' | 'text' | 'stat' | 'calendar' | 'custom' = 'custom';
  @Input() count = 1;
  @Input() width = '100%';
  @Input() height = 100;

  get countArray(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }

  getRandomWidth(): string {
    const widths = ['100%', '90%', '80%', '70%', '95%'];
    return widths[Math.floor(Math.random() * widths.length)];
  }
}
