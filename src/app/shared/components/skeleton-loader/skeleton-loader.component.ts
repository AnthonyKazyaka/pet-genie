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
              <div class="skeleton skeleton-text" style="width: 30px; height: 12px"></div>
            }
          </div>
          <div class="skeleton-calendar-grid">
            @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35]; track i) {
              <div class="skeleton skeleton-calendar-cell"></div>
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
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

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
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      max-height: 100%;
      background: var(--surface);
      border-radius: 12px;
      border: 1px solid var(--outline-variant);
      overflow: hidden;
    }

    .skeleton-calendar-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: var(--surface-container);
      border-bottom: 1px solid var(--outline-variant);
      flex-shrink: 0;
    }

    .skeleton-calendar-header > div {
      padding: 12px;
      text-align: center;
    }

    .skeleton-calendar-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: repeat(5, 1fr);
      gap: 0;
      min-height: 0;
      overflow: hidden;
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

    .skeleton-calendar-cell {
      border-right: 1px solid var(--outline-variant);
      border-bottom: 1px solid var(--outline-variant);
      border-radius: 0;
      min-height: 120px;
    }

    .skeleton-calendar-cell:nth-child(7n) {
      border-right: none;
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
