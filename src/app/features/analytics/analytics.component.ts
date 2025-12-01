import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="analytics-container">
      <header class="page-header">
        <h1>Analytics</h1>
        <p class="subtitle">Insights into your pet sitting business</p>
      </header>

      <mat-card class="placeholder-card">
        <mat-card-content>
          <div class="placeholder">
            <mat-icon>analytics</mat-icon>
            <h2>Analytics Coming Soon</h2>
            <p>
              Track your workload trends, client distribution, busiest times,
              and get smart recommendations to optimize your business.
            </p>
            <div class="features">
              <div class="feature">
                <mat-icon>show_chart</mat-icon>
                <span>Workload trends over time</span>
              </div>
              <div class="feature">
                <mat-icon>pie_chart</mat-icon>
                <span>Client distribution</span>
              </div>
              <div class="feature">
                <mat-icon>schedule</mat-icon>
                <span>Peak hours analysis</span>
              </div>
              <div class="feature">
                <mat-icon>lightbulb</mat-icon>
                <span>Smart insights</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .analytics-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--on-surface-variant);
    }

    .placeholder-card {
      min-height: 400px;
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .placeholder > mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--primary);
      margin-bottom: 16px;
    }

    .placeholder h2 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
    }

    .placeholder > p {
      margin: 0 0 32px;
      max-width: 500px;
      color: var(--on-surface-variant);
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 600px;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--surface-container-low);
      border-radius: 8px;
    }

    .feature mat-icon {
      color: var(--primary);
    }

    .feature span {
      font-size: 14px;
    }
  `],
})
export class AnalyticsComponent {}
