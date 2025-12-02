import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { DataService, GoogleCalendarService } from '../../core/services';
import { DEFAULT_THRESHOLDS, GoogleCalendar } from '../../models';

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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatListModule,
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
            <span>{{ isConnected() ? 'Connected to Google Calendar' : 'Not connected' }}</span>
          </div>

          @if (!isConnected()) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Google Client ID</mat-label>
              <input
                matInput
                [(ngModel)]="googleClientId"
                placeholder="Enter your Google OAuth Client ID"
              />
              <mat-hint>
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank">
                  Get a Client ID from Google Cloud Console
                </a>
              </mat-hint>
            </mat-form-field>
          }

          @if (isConnected() && calendars().length > 0) {
            <div class="calendar-selection">
              <h3>Select calendars to sync</h3>
              <mat-selection-list [(ngModel)]="selectedCalendars">
                @for (calendar of calendars(); track calendar.id) {
                  <mat-list-option [value]="calendar.id">
                    <span matListItemTitle>{{ calendar.summary }}</span>
                    @if (calendar.description) {
                      <span matListItemLine>{{ calendar.description }}</span>
                    }
                  </mat-list-option>
                }
              </mat-selection-list>
              <div class="calendar-actions">
                <button mat-stroked-button (click)="selectAllCalendars()">Select All</button>
                <button mat-stroked-button (click)="deselectAllCalendars()">Deselect All</button>
                <button mat-raised-button color="primary" (click)="saveCalendarSelection()">
                  Save Selection
                </button>
              </div>
            </div>
          }

          @if (isLoading()) {
            <div class="loading-indicator">
              <mat-spinner diameter="24"></mat-spinner>
              <span>{{ loadingMessage() }}</span>
            </div>
          }
        </mat-card-content>
        <mat-card-actions>
          @if (isConnected()) {
            <button mat-stroked-button (click)="refreshCalendars()" [disabled]="isLoading()">
              <mat-icon>refresh</mat-icon>
              Refresh Calendars
            </button>
            <button mat-stroked-button color="warn" (click)="disconnect()">
              <mat-icon>link_off</mat-icon>
              Disconnect
            </button>
          } @else {
            <button
              mat-raised-button
              color="primary"
              (click)="connect()"
              [disabled]="!googleClientId || isLoading()"
            >
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

    .calendar-selection {
      margin-top: 16px;
    }

    .calendar-selection h3 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 500;
    }

    .calendar-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: var(--on-surface-variant);
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
export class SettingsComponent implements OnInit {
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private snackBar = inject(MatSnackBar);

  // Google Calendar state
  isConnected = signal(false);
  isLoading = signal(false);
  loadingMessage = signal('');
  calendars = signal<GoogleCalendar[]>([]);
  selectedCalendars: string[] = [];
  googleClientId = '';

  // Settings state
  thresholds = { ...DEFAULT_THRESHOLDS };
  includeTravelTime = true;
  use24HourTime = false;
  showWeekNumbers = false;

  async ngOnInit(): Promise<void> {
    // Load current settings
    const settings = this.dataService.settings();
    this.googleClientId = settings.googleClientId;
    this.thresholds = { ...settings.thresholds };
    this.includeTravelTime = settings.includeTravelTime;
    this.use24HourTime = settings.timeFormat === '24h';
    this.showWeekNumbers = settings.showWeekNumbers;
    this.selectedCalendars = [...settings.selectedCalendars];

    // Check if already signed in and initialize
    if (this.googleClientId) {
      await this.initializeGoogleApi();
    }
  }

  private async initializeGoogleApi(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.loadingMessage.set('Initializing Google API...');

      await this.googleCalendarService.initialize(this.googleClientId);

      // Check if already signed in
      if (this.googleCalendarService.isSignedIn()) {
        this.isConnected.set(true);
        await this.loadCalendars();
      }
    } catch (error) {
      console.error('Failed to initialize Google API:', error);
    } finally {
      this.isLoading.set(false);
      this.loadingMessage.set('');
    }
  }

  async connect(): Promise<void> {
    if (!this.googleClientId) {
      this.showMessage('Please enter a Google Client ID');
      return;
    }

    try {
      this.isLoading.set(true);
      this.loadingMessage.set('Connecting to Google...');

      // Save client ID
      this.dataService.updateSettings({ googleClientId: this.googleClientId });

      // Initialize and sign in
      await this.googleCalendarService.initialize(this.googleClientId);
      await this.googleCalendarService.signIn();

      this.isConnected.set(true);
      await this.loadCalendars();

      this.showMessage('Successfully connected to Google Calendar!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to connect';
      this.showMessage(message);
      console.error('Connection error:', error);
    } finally {
      this.isLoading.set(false);
      this.loadingMessage.set('');
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.googleCalendarService.signOut();
      this.isConnected.set(false);
      this.calendars.set([]);
      this.selectedCalendars = [];
      this.dataService.updateSettings({ selectedCalendars: [] });
      this.dataService.clearEventsCache();
      this.showMessage('Disconnected from Google Calendar');
    } catch (error) {
      console.error('Disconnect error:', error);
      this.showMessage('Failed to disconnect');
    }
  }

  async loadCalendars(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.loadingMessage.set('Loading calendars...');

      const calendarList = await firstValueFrom(this.googleCalendarService.listCalendars());
      this.calendars.set(calendarList);

      // If no calendars selected yet, select primary by default
      if (this.selectedCalendars.length === 0) {
        const primary = calendarList.find(c => c.primary);
        if (primary) {
          this.selectedCalendars = [primary.id];
        }
      }
    } catch (error) {
      console.error('Failed to load calendars:', error);
      this.showMessage('Failed to load calendars');
    } finally {
      this.isLoading.set(false);
      this.loadingMessage.set('');
    }
  }

  async refreshCalendars(): Promise<void> {
    await this.loadCalendars();
    this.showMessage('Calendars refreshed');
  }

  selectAllCalendars(): void {
    this.selectedCalendars = this.calendars().map(c => c.id);
  }

  deselectAllCalendars(): void {
    this.selectedCalendars = [];
  }

  saveCalendarSelection(): void {
    this.dataService.updateSettings({ selectedCalendars: this.selectedCalendars });
    this.dataService.clearEventsCache(); // Clear cache when calendar selection changes
    this.showMessage('Calendar selection saved');
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
