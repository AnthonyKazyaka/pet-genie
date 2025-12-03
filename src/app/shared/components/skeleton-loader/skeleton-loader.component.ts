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
  styleUrl: './skeleton-loader.component.scss'
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
