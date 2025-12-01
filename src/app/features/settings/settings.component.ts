import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DataService } from '../../core/services';
import { DEFAULT_THRESHOLDS } from '../../models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="settings-container">
      <header class="page-header">
        <h1>Settings</h1>
        <p class="subtitle">Configure your Pet Genie preferences</p>
      </header>

      <!-- Google Calendar Connection -->
      <mat-card class="settings-section">
        <mat-card-header>
          <mat-icon mat-card-avatar>event</mat-icon>
          <mat-card-title>Google Calendar</mat-card-title>
          <mat-card-subtitle>Connect to import your appointments</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="connection-status" [class.connected]="isConnected()">
            <mat-icon>{{ isConnected() ? 'check_circle' : 'error_outline' }}</mat-icon>
            <span>{{ isConnected() ? 'Connected' : 'Not connected' }}</span>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Google Client ID</mat-label>
            <input
              matInput
              [(ngModel)]="googleClientId"
              placeholder="Enter your Google OAuth Client ID"
            />
            <mat-hint>Required for Google Calendar integration</mat-hint>
          </mat-form-field>
        </mat-card-content>
        <mat-card-actions>
          @if (isConnected()) {
            <button mat-stroked-button color="warn" (click)="disconnect()">
              <mat-icon>link_off</mat-icon>
              Disconnect
            </button>
          } @else {
            <button mat-raised-button color="primary" (click)="connect()" [disabled]="!googleClientId">
              <mat-icon>link</mat-icon>
              Connect Google Calendar
            </button>
          }
        </mat-card-actions>
      </mat-card>

      <!-- Workload Thresholds -->
      <mat-card class="settings-section">
        <mat-card-header>
          <mat-icon mat-card-avatar>tune</mat-icon>
          <mat-card-title>Workload Thresholds</mat-card-title>
          <mat-card-subtitle>Customize your comfort levels</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="threshold-group">
            <h3>Daily Thresholds (hours)</h3>
            <div class="threshold-sliders">
              <div class="threshold-item">
                <label>Comfortable</label>
                <mat-slider min="1" max="12" step="0.5" discrete>
                  <input matSliderThumb [(ngModel)]="thresholds.daily.comfortable" />
                </mat-slider>
                <span class="threshold-value comfortable">{{ thresholds.daily.comfortable }}h</span>
              </div>
              <div class="threshold-item">
                <label>Busy</label>
                <mat-slider min="2" max="14" step="0.5" discrete>
                  <input matSliderThumb [(ngModel)]="thresholds.daily.busy" />
                </mat-slider>
                <span class="threshold-value busy">{{ thresholds.daily.busy }}h</span>
              </div>
              <div class="threshold-item">
                <label>High</label>
                <mat-slider min="4" max="16" step="0.5" discrete>
                  <input matSliderThumb [(ngModel)]="thresholds.daily.high" />
                </mat-slider>
                <span class="threshold-value high">{{ thresholds.daily.high }}h</span>
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="threshold-group">
            <h3>Weekly Thresholds (hours)</h3>
            <div class="threshold-sliders">
              <div class="threshold-item">
                <label>Comfortable</label>
                <mat-slider min="10" max="40" step="1" discrete>
                  <input matSliderThumb [(ngModel)]="thresholds.weekly.comfortable" />
                </mat-slider>
                <span class="threshold-value comfortable">{{ thresholds.weekly.comfortable }}h</span>
              </div>
              <div class="threshold-item">
                <label>Busy</label>
                <mat-slider min="20" max="50" step="1" discrete>
                  <input matSliderThumb [(ngModel)]="thresholds.weekly.busy" />
                </mat-slider>
                <span class="threshold-value busy">{{ thresholds.weekly.busy }}h</span>
              </div>
              <div class="threshold-item">
                <label>High</label>
                <mat-slider min="30" max="60" step="1" discrete>
                  <input matSliderThumb [(ngModel)]="thresholds.weekly.high" />
                </mat-slider>
                <span class="threshold-value high">{{ thresholds.weekly.high }}h</span>
              </div>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-stroked-button (click)="resetThresholds()">
            Reset to Defaults
          </button>
          <button mat-raised-button color="primary" (click)="saveThresholds()">
            Save Thresholds
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Display Preferences -->
      <mat-card class="settings-section">
        <mat-card-header>
          <mat-icon mat-card-avatar>display_settings</mat-icon>
          <mat-card-title>Display Preferences</mat-card-title>
          <mat-card-subtitle>Customize how information is displayed</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="preference-item">
            <div class="preference-info">
              <span class="preference-label">Include travel time in calculations</span>
              <span class="preference-description">Add estimated travel time to workload metrics</span>
            </div>
            <mat-slide-toggle [(ngModel)]="includeTravelTime"></mat-slide-toggle>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <span class="preference-label">24-hour time format</span>
              <span class="preference-description">Display times in 24-hour format instead of AM/PM</span>
            </div>
            <mat-slide-toggle [(ngModel)]="use24HourTime"></mat-slide-toggle>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <span class="preference-label">Show week numbers</span>
              <span class="preference-description">Display week numbers in calendar views</span>
            </div>
            <mat-slide-toggle [(ngModel)]="showWeekNumbers"></mat-slide-toggle>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="savePreferences()">
            Save Preferences
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- Data Management -->
      <mat-card class="settings-section">
        <mat-card-header>
          <mat-icon mat-card-avatar>storage</mat-icon>
          <mat-card-title>Data Management</mat-card-title>
          <mat-card-subtitle>Manage your local data</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="data-info">
            Pet Genie stores your settings locally in your browser. Your calendar data
            is fetched directly from Google Calendar and cached for 15 minutes.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-stroked-button (click)="clearCache()">
            <mat-icon>cached</mat-icon>
            Clear Cache
          </button>
          <button mat-stroked-button color="warn" (click)="resetAllData()">
            <mat-icon>restart_alt</mat-icon>
            Reset All Data
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
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

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section mat-card-header {
      margin-bottom: 16px;
    }

    .settings-section mat-icon[mat-card-avatar] {
      background: var(--primary-container);
      color: var(--on-primary-container);
      padding: 8px;
      border-radius: 50%;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: var(--error-container);
      color: var(--on-error-container);
    }

    .connection-status.connected {
      background: var(--tertiary-container);
      color: var(--on-tertiary-container);
    }

    .full-width {
      width: 100%;
    }

    .threshold-group {
      padding: 16px 0;
    }

    .threshold-group h3 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 500;
    }

    .threshold-sliders {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .threshold-item {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .threshold-item label {
      width: 100px;
      font-size: 14px;
    }

    .threshold-item mat-slider {
      flex: 1;
    }

    .threshold-value {
      width: 50px;
      font-weight: 500;
      text-align: right;
    }

    .threshold-value.comfortable {
      color: #10B981;
    }

    .threshold-value.busy {
      color: #F59E0B;
    }

    .threshold-value.high {
      color: #F97316;
    }

    .preference-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--outline-variant);
    }

    .preference-item:last-child {
      border-bottom: none;
    }

    .preference-info {
      display: flex;
      flex-direction: column;
    }

    .preference-label {
      font-size: 14px;
      font-weight: 500;
    }

    .preference-description {
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .data-info {
      color: var(--on-surface-variant);
      font-size: 14px;
      line-height: 1.5;
    }

    mat-card-actions {
      padding: 16px;
      gap: 8px;
    }
  `],
})
export class SettingsComponent {
  private dataService = inject(DataService);
  private snackBar = inject(MatSnackBar);

  isConnected = signal(false);
  googleClientId = '';

  thresholds = { ...DEFAULT_THRESHOLDS };
  includeTravelTime = true;
  use24HourTime = false;
  showWeekNumbers = false;

  constructor() {
    // Load current settings
    const settings = this.dataService.settings();
    this.googleClientId = settings.googleClientId;
    this.thresholds = { ...settings.thresholds };
    this.includeTravelTime = settings.includeTravelTime;
    this.use24HourTime = settings.timeFormat === '24h';
    this.showWeekNumbers = settings.showWeekNumbers;
  }

  connect(): void {
    // TODO: Implement Google OAuth flow
    this.showMessage('Google Calendar connection coming soon!');
  }

  disconnect(): void {
    this.isConnected.set(false);
    this.showMessage('Disconnected from Google Calendar');
  }

  saveThresholds(): void {
    this.dataService.updateSettings({ thresholds: this.thresholds });
    this.showMessage('Thresholds saved');
  }

  resetThresholds(): void {
    this.thresholds = { ...DEFAULT_THRESHOLDS };
    this.showMessage('Thresholds reset to defaults');
  }

  savePreferences(): void {
    this.dataService.updateSettings({
      includeTravelTime: this.includeTravelTime,
      timeFormat: this.use24HourTime ? '24h' : '12h',
      showWeekNumbers: this.showWeekNumbers,
    });
    this.showMessage('Preferences saved');
  }

  clearCache(): void {
    this.dataService.clearEventsCache();
    this.showMessage('Cache cleared');
  }

  resetAllData(): void {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      this.dataService.resetSettings();
      this.dataService.clearEventsCache();
      this.thresholds = { ...DEFAULT_THRESHOLDS };
      this.showMessage('All data has been reset');
    }
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000 });
  }
}
