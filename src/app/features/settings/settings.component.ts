import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataService, GoogleCalendarService, ThemeService } from '../../core/services';
import { DEFAULT_THRESHOLDS, GoogleCalendar, getWorkloadLevel } from '../../models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared';

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
    MatTabsModule,
    MatExpansionModule,
    MatDialogModule,
    MatTooltipModule,
    ConfirmDialogComponent,
  ],
  template: `
    <div class="settings-container">
      <header class="page-header">
        <div class="header-content">
          <h1>Settings</h1>
          <p class="subtitle">Configure your Pet Genie preferences</p>
        </div>
        @if (hasUnsavedChanges()) {
          <div class="unsaved-indicator">
            <mat-icon>warning</mat-icon>
            <span>Unsaved changes</span>
          </div>
        }
      </header>

      <mat-tab-group animationDuration="200ms" class="settings-tabs">
        <!-- Calendar Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>event</mat-icon>
            <span>Calendar</span>
          </ng-template>

          <div class="tab-content">
            <!-- Google Calendar Connection -->
            <mat-card class="settings-card">
              <mat-card-header>
                <div class="card-header-content">
                  <div class="card-title-row">
                    <mat-icon class="section-icon">cloud</mat-icon>
                    <div>
                      <mat-card-title>Google Calendar Connection</mat-card-title>
                      <mat-card-subtitle>Connect to import your appointments</mat-card-subtitle>
                    </div>
                  </div>
                  <div class="connection-badge" [class.connected]="isConnected()">
                    <mat-icon>{{ isConnected() ? 'check_circle' : 'cloud_off' }}</mat-icon>
                    <span>{{ isConnected() ? 'Connected' : 'Not Connected' }}</span>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                @if (!isConnected()) {
                  <div class="connect-section">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Google Client ID</mat-label>
                      <input
                        matInput
                        [(ngModel)]="googleClientId"
                        placeholder="Enter your Google OAuth Client ID"
                      />
                      <mat-icon matSuffix matTooltip="Your OAuth 2.0 Client ID from Google Cloud Console">help_outline</mat-icon>
                      <mat-hint>
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">
                          Get a Client ID from Google Cloud Console
                          <mat-icon class="external-link">open_in_new</mat-icon>
                        </a>
                      </mat-hint>
                    </mat-form-field>

                    <button
                      mat-raised-button
                      color="primary"
                      class="connect-button"
                      (click)="connect()"
                      [disabled]="!googleClientId || isLoading()"
                    >
                      <mat-icon>link</mat-icon>
                      Connect Google Calendar
                    </button>
                  </div>
                }

                @if (isConnected() && calendars().length > 0) {
                  <div class="calendar-selection">
                    <h3>
                      <mat-icon>calendar_today</mat-icon>
                      Select calendars to sync
                    </h3>
                    <p class="selection-hint">Choose which calendars to include in your workload calculations</p>

                    <div class="calendar-list">
                      @for (calendar of calendars(); track calendar.id) {
                        <label class="calendar-item" [class.selected]="isCalendarSelected(calendar.id)">
                          <mat-checkbox
                            [checked]="isCalendarSelected(calendar.id)"
                            (change)="toggleCalendar(calendar.id)"
                            color="primary"
                          ></mat-checkbox>
                          <div class="calendar-info">
                            <span class="calendar-name">
                              {{ calendar.summary }}
                              @if (calendar.primary) {
                                <span class="primary-badge">Primary</span>
                              }
                            </span>
                            @if (calendar.description) {
                              <span class="calendar-description">{{ calendar.description }}</span>
                            }
                          </div>
                          <div
                            class="calendar-color"
                            [style.background]="calendar.backgroundColor || '#4285f4'"
                          ></div>
                        </label>
                      }
                    </div>

                    <div class="calendar-actions">
                      <button mat-button (click)="selectAllCalendars()">
                        <mat-icon>select_all</mat-icon>
                        Select All
                      </button>
                      <button mat-button (click)="deselectAllCalendars()">
                        <mat-icon>deselect</mat-icon>
                        Deselect All
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

              @if (isConnected()) {
                <mat-card-actions align="end">
                  <button mat-stroked-button (click)="refreshCalendars()" [disabled]="isLoading()">
                    <mat-icon>refresh</mat-icon>
                    Refresh
                  </button>
                  <button mat-stroked-button color="warn" (click)="confirmDisconnect()">
                    <mat-icon>link_off</mat-icon>
                    Disconnect
                  </button>
                </mat-card-actions>
              }
            </mat-card>
          </div>
        </mat-tab>

        <!-- Workload Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>tune</mat-icon>
            <span>Workload</span>
          </ng-template>

          <div class="tab-content">
            <mat-card class="settings-card">
              <mat-card-header>
                <div class="card-title-row">
                  <mat-icon class="section-icon">speed</mat-icon>
                  <div>
                    <mat-card-title>Workload Thresholds</mat-card-title>
                    <mat-card-subtitle>Customize your comfort levels for daily and weekly workload</mat-card-subtitle>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <!-- Threshold Preview -->
                <div class="threshold-preview">
                  <h4>Preview</h4>
                  <div class="preview-bars">
                    <div class="preview-bar">
                      <span class="preview-label">Daily</span>
                      <div class="bar-container">
                        <div
                          class="bar-segment comfortable"
                          [style.width.%]="(thresholds.daily.comfortable / 16) * 100"
                          matTooltip="Comfortable: up to {{ thresholds.daily.comfortable }}h"
                        ></div>
                        <div
                          class="bar-segment busy"
                          [style.width.%]="((thresholds.daily.busy - thresholds.daily.comfortable) / 16) * 100"
                          matTooltip="Busy: {{ thresholds.daily.comfortable }}h - {{ thresholds.daily.busy }}h"
                        ></div>
                        <div
                          class="bar-segment high"
                          [style.width.%]="((thresholds.daily.high - thresholds.daily.busy) / 16) * 100"
                          matTooltip="High: {{ thresholds.daily.busy }}h - {{ thresholds.daily.high }}h"
                        ></div>
                        <div
                          class="bar-segment burnout"
                          [style.width.%]="((16 - thresholds.daily.high) / 16) * 100"
                          matTooltip="Burnout: above {{ thresholds.daily.high }}h"
                        ></div>
                      </div>
                      <span class="preview-max">16h</span>
                    </div>
                    <div class="preview-bar">
                      <span class="preview-label">Weekly</span>
                      <div class="bar-container">
                        <div
                          class="bar-segment comfortable"
                          [style.width.%]="(thresholds.weekly.comfortable / 80) * 100"
                          matTooltip="Comfortable: up to {{ thresholds.weekly.comfortable }}h"
                        ></div>
                        <div
                          class="bar-segment busy"
                          [style.width.%]="((thresholds.weekly.busy - thresholds.weekly.comfortable) / 80) * 100"
                          matTooltip="Busy: {{ thresholds.weekly.comfortable }}h - {{ thresholds.weekly.busy }}h"
                        ></div>
                        <div
                          class="bar-segment high"
                          [style.width.%]="((thresholds.weekly.high - thresholds.weekly.busy) / 80) * 100"
                          matTooltip="High: {{ thresholds.weekly.busy }}h - {{ thresholds.weekly.high }}h"
                        ></div>
                        <div
                          class="bar-segment burnout"
                          [style.width.%]="((80 - thresholds.weekly.high) / 80) * 100"
                          matTooltip="Burnout: above {{ thresholds.weekly.high }}h"
                        ></div>
                      </div>
                      <span class="preview-max">80h</span>
                    </div>
                  </div>
                  <div class="preview-legend">
                    <span class="legend-item"><span class="dot comfortable"></span> Comfortable</span>
                    <span class="legend-item"><span class="dot busy"></span> Busy</span>
                    <span class="legend-item"><span class="dot high"></span> High</span>
                    <span class="legend-item"><span class="dot burnout"></span> Burnout</span>
                  </div>
                </div>

                <mat-expansion-panel class="threshold-panel" expanded>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>today</mat-icon>
                      Daily Thresholds
                    </mat-panel-title>
                    <mat-panel-description>Hours per day</mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="threshold-sliders">
                    <div class="threshold-item">
                      <div class="threshold-label">
                        <span class="level-indicator comfortable"></span>
                        <label>Comfortable</label>
                      </div>
                      <mat-slider min="1" max="12" step="0.5" discrete class="comfortable-slider">
                        <input matSliderThumb [(ngModel)]="thresholds.daily.comfortable" (ngModelChange)="markDirty()" />
                      </mat-slider>
                      <span class="threshold-value">{{ thresholds.daily.comfortable }}h</span>
                    </div>
                    <div class="threshold-item">
                      <div class="threshold-label">
                        <span class="level-indicator busy"></span>
                        <label>Busy</label>
                      </div>
                      <mat-slider [min]="thresholds.daily.comfortable" max="14" step="0.5" discrete class="busy-slider">
                        <input matSliderThumb [(ngModel)]="thresholds.daily.busy" (ngModelChange)="markDirty()" />
                      </mat-slider>
                      <span class="threshold-value">{{ thresholds.daily.busy }}h</span>
                    </div>
                    <div class="threshold-item">
                      <div class="threshold-label">
                        <span class="level-indicator high"></span>
                        <label>High</label>
                      </div>
                      <mat-slider [min]="thresholds.daily.busy" max="16" step="0.5" discrete class="high-slider">
                        <input matSliderThumb [(ngModel)]="thresholds.daily.high" (ngModelChange)="markDirty()" />
                      </mat-slider>
                      <span class="threshold-value">{{ thresholds.daily.high }}h</span>
                    </div>
                  </div>
                </mat-expansion-panel>

                <mat-expansion-panel class="threshold-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>date_range</mat-icon>
                      Weekly Thresholds
                    </mat-panel-title>
                    <mat-panel-description>Hours per week</mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="threshold-sliders">
                    <div class="threshold-item">
                      <div class="threshold-label">
                        <span class="level-indicator comfortable"></span>
                        <label>Comfortable</label>
                      </div>
                      <mat-slider min="10" max="40" step="1" discrete class="comfortable-slider">
                        <input matSliderThumb [(ngModel)]="thresholds.weekly.comfortable" (ngModelChange)="markDirty()" />
                      </mat-slider>
                      <span class="threshold-value">{{ thresholds.weekly.comfortable }}h</span>
                    </div>
                    <div class="threshold-item">
                      <div class="threshold-label">
                        <span class="level-indicator busy"></span>
                        <label>Busy</label>
                      </div>
                      <mat-slider [min]="thresholds.weekly.comfortable" max="50" step="1" discrete class="busy-slider">
                        <input matSliderThumb [(ngModel)]="thresholds.weekly.busy" (ngModelChange)="markDirty()" />
                      </mat-slider>
                      <span class="threshold-value">{{ thresholds.weekly.busy }}h</span>
                    </div>
                    <div class="threshold-item">
                      <div class="threshold-label">
                        <span class="level-indicator high"></span>
                        <label>High</label>
                      </div>
                      <mat-slider [min]="thresholds.weekly.busy" max="60" step="1" discrete class="high-slider">
                        <input matSliderThumb [(ngModel)]="thresholds.weekly.high" (ngModelChange)="markDirty()" />
                      </mat-slider>
                      <span class="threshold-value">{{ thresholds.weekly.high }}h</span>
                    </div>
                  </div>
                </mat-expansion-panel>
              </mat-card-content>

              <mat-card-actions align="end">
                <button mat-stroked-button (click)="confirmResetThresholds()">
                  <mat-icon>restart_alt</mat-icon>
                  Reset to Defaults
                </button>
                <button
                  mat-raised-button
                  color="primary"
                  (click)="saveThresholds()"
                  [disabled]="!hasUnsavedChanges()"
                >
                  <mat-icon>save</mat-icon>
                  Save Changes
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Appearance Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>palette</mat-icon>
            <span>Appearance</span>
          </ng-template>

          <div class="tab-content">
            <mat-card class="settings-card">
              <mat-card-header>
                <div class="card-title-row">
                  <mat-icon class="section-icon">dark_mode</mat-icon>
                  <div>
                    <mat-card-title>Theme</mat-card-title>
                    <mat-card-subtitle>Choose your preferred color scheme</mat-card-subtitle>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="theme-options">
                  <button
                    class="theme-option"
                    [class.selected]="currentTheme() === 'light'"
                    (click)="setTheme('light')"
                  >
                    <mat-icon>light_mode</mat-icon>
                    <span>Light</span>
                  </button>
                  <button
                    class="theme-option"
                    [class.selected]="currentTheme() === 'dark'"
                    (click)="setTheme('dark')"
                  >
                    <mat-icon>dark_mode</mat-icon>
                    <span>Dark</span>
                  </button>
                  <button
                    class="theme-option"
                    [class.selected]="currentTheme() === 'system'"
                    (click)="setTheme('system')"
                  >
                    <mat-icon>settings_suggest</mat-icon>
                    <span>System</span>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="settings-card">
              <mat-card-header>
                <div class="card-title-row">
                  <mat-icon class="section-icon">display_settings</mat-icon>
                  <div>
                    <mat-card-title>Display Preferences</mat-card-title>
                    <mat-card-subtitle>Customize how information is displayed</mat-card-subtitle>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="preference-list">
                  <div class="preference-item">
                    <div class="preference-info">
                      <mat-icon>schedule</mat-icon>
                      <div>
                        <span class="preference-label">24-hour time format</span>
                        <span class="preference-description">Display times as 14:00 instead of 2:00 PM</span>
                      </div>
                    </div>
                    <mat-slide-toggle [(ngModel)]="use24HourTime" (change)="savePreferences()"></mat-slide-toggle>
                  </div>

                  <div class="preference-item">
                    <div class="preference-info">
                      <mat-icon>calendar_view_week</mat-icon>
                      <div>
                        <span class="preference-label">Show week numbers</span>
                        <span class="preference-description">Display week numbers in calendar views</span>
                      </div>
                    </div>
                    <mat-slide-toggle [(ngModel)]="showWeekNumbers" (change)="savePreferences()"></mat-slide-toggle>
                  </div>

                  <div class="preference-item">
                    <div class="preference-info">
                      <mat-icon>directions_car</mat-icon>
                      <div>
                        <span class="preference-label">Include travel time</span>
                        <span class="preference-description">Add estimated travel time to workload calculations</span>
                      </div>
                    </div>
                    <mat-slide-toggle [(ngModel)]="includeTravelTime" (change)="savePreferences()"></mat-slide-toggle>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Data Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>storage</mat-icon>
            <span>Data</span>
          </ng-template>

          <div class="tab-content">
            <mat-card class="settings-card">
              <mat-card-header>
                <div class="card-title-row">
                  <mat-icon class="section-icon">info</mat-icon>
                  <div>
                    <mat-card-title>About Your Data</mat-card-title>
                    <mat-card-subtitle>How Pet Genie handles your information</mat-card-subtitle>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="data-info-cards">
                  <div class="info-card">
                    <mat-icon>computer</mat-icon>
                    <h4>Local Storage</h4>
                    <p>Your settings and preferences are stored locally in your browser.</p>
                  </div>
                  <div class="info-card">
                    <mat-icon>sync</mat-icon>
                    <h4>Calendar Sync</h4>
                    <p>Calendar data is fetched directly from Google and cached for 15 minutes.</p>
                  </div>
                  <div class="info-card">
                    <mat-icon>security</mat-icon>
                    <h4>Privacy</h4>
                    <p>Your data never leaves your device. We don't have servers storing your information.</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="settings-card danger-zone">
              <mat-card-header>
                <div class="card-title-row">
                  <mat-icon class="section-icon danger">warning</mat-icon>
                  <div>
                    <mat-card-title>Danger Zone</mat-card-title>
                    <mat-card-subtitle>Irreversible actions</mat-card-subtitle>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="danger-actions">
                  <div class="danger-action">
                    <div class="action-info">
                      <h4>Clear Cache</h4>
                      <p>Remove cached calendar data. Fresh data will be fetched on next load.</p>
                    </div>
                    <button mat-stroked-button (click)="clearCache()">
                      <mat-icon>cached</mat-icon>
                      Clear Cache
                    </button>
                  </div>

                  <div class="danger-action">
                    <div class="action-info">
                      <h4>Reset All Data</h4>
                      <p>Delete all settings, preferences, and cached data. This cannot be undone.</p>
                    </div>
                    <button mat-stroked-button color="warn" (click)="confirmResetAllData()">
                      <mat-icon>delete_forever</mat-icon>
                      Reset Everything
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 900px;
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

    .unsaved-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--tertiary-container);
      color: var(--on-tertiary-container);
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }

    .unsaved-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Tabs */
    .settings-tabs {
      background: transparent;
    }

    .settings-tabs ::ng-deep .mat-mdc-tab-labels {
      background: var(--surface-container);
      border-radius: 12px;
      padding: 4px;
      margin-bottom: 24px;
    }

    .settings-tabs ::ng-deep .mat-mdc-tab {
      border-radius: 8px;
    }

    .settings-tabs ::ng-deep .mat-mdc-tab .mdc-tab__content {
      gap: 8px;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Cards */
    .settings-card {
      border-radius: 16px;
      border: 1px solid var(--outline-variant);
    }

    .settings-card mat-card-header {
      padding: 20px 20px 0;
    }

    .settings-card mat-card-content {
      padding: 20px;
    }

    .settings-card mat-card-actions {
      padding: 16px 20px 20px;
      margin: 0;
      gap: 12px;
    }

    .card-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      flex-wrap: wrap;
      gap: 16px;
    }

    .card-title-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .section-icon {
      background: var(--primary-container);
      color: var(--on-primary-container);
      padding: 12px;
      border-radius: 12px;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .section-icon.danger {
      background: var(--error-container);
      color: var(--on-error-container);
    }

    /* Connection Badge */
    .connection-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      background: var(--error-container);
      color: var(--on-error-container);
      font-size: 14px;
      font-weight: 500;
    }

    .connection-badge.connected {
      background: var(--tertiary-container);
      color: var(--on-tertiary-container);
    }

    .connection-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Connect Section */
    .connect-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .connect-button {
      align-self: flex-start;
    }

    mat-hint a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--primary);
      text-decoration: underline;
      font-weight: 500;
      transition: color var(--transition-fast) ease;
    }

    mat-hint a:hover {
      color: var(--primary-container);
    }

    [data-theme="dark"] mat-hint a {
      color: #A5B4FC;
    }

    [data-theme="dark"] mat-hint a:hover {
      color: #C7D2FE;
    }

    .external-link {
      font-size: 14px;
      width: 14px;
      height: 14px;
      vertical-align: middle;
    }

    /* Calendar Selection */
    .calendar-selection h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 500;
    }

    .selection-hint {
      margin: 0 0 16px;
      font-size: 14px;
      color: var(--on-surface-variant);
    }

    .calendar-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      padding: 4px;
    }

    .calendar-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--surface-container-low);
      border-radius: 12px;
      cursor: pointer;
      transition: all var(--transition-fast) ease;
      border: 2px solid transparent;
    }

    .calendar-item:hover {
      background: var(--surface-container);
    }

    .calendar-item.selected {
      border-color: var(--primary);
      background: var(--primary-container);
    }

    .calendar-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .calendar-name {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .primary-badge {
      font-size: 10px;
      padding: 2px 8px;
      background: var(--primary);
      color: var(--on-primary);
      border-radius: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .calendar-description {
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .calendar-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .calendar-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: var(--on-surface-variant);
    }

    /* Threshold Preview */
    .threshold-preview {
      background: var(--surface-container-low);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .threshold-preview h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--on-surface-variant);
    }

    .preview-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .preview-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .preview-label {
      width: 60px;
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .bar-container {
      flex: 1;
      height: 24px;
      display: flex;
      border-radius: 12px;
      overflow: hidden;
    }

    .bar-segment {
      height: 100%;
      transition: width var(--transition-normal) ease;
    }

    .bar-segment.comfortable { background: var(--workload-comfortable); }
    .bar-segment.busy { background: var(--workload-busy); }
    .bar-segment.high { background: var(--workload-high); }
    .bar-segment.burnout { background: var(--workload-burnout); }

    .preview-max {
      width: 40px;
      font-size: 12px;
      color: var(--on-surface-variant);
      text-align: right;
    }

    .preview-legend {
      display: flex;
      gap: 16px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    .legend-item .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot.comfortable { background: var(--workload-comfortable); }
    .dot.busy { background: var(--workload-busy); }
    .dot.high { background: var(--workload-high); }
    .dot.burnout { background: var(--workload-burnout); }

    /* Threshold Panels */
    .threshold-panel {
      margin-bottom: 8px;
      border-radius: 12px !important;
      box-shadow: none !important;
      border: 1px solid var(--outline-variant);
    }

    .threshold-panel mat-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .threshold-sliders {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 8px 0;
    }

    .threshold-item {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .threshold-label {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 120px;
    }

    .level-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .level-indicator.comfortable { background: var(--workload-comfortable); }
    .level-indicator.busy { background: var(--workload-busy); }
    .level-indicator.high { background: var(--workload-high); }

    .threshold-item mat-slider {
      flex: 1;
    }

    .threshold-value {
      width: 50px;
      font-weight: 600;
      font-size: 16px;
      text-align: right;
    }

    /* Theme Options */
    .theme-options {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .theme-option {
      flex: 1;
      min-width: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px 16px;
      background: var(--surface-container-low);
      border: 2px solid transparent;
      border-radius: 16px;
      cursor: pointer;
      transition: all var(--transition-fast) ease;
    }

    .theme-option:hover {
      background: var(--surface-container);
    }

    .theme-option.selected {
      border-color: var(--primary);
      background: var(--primary-container);
    }

    .theme-option mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--primary);
    }

    .theme-option span {
      font-weight: 500;
    }

    /* Preference List */
    .preference-list {
      display: flex;
      flex-direction: column;
    }

    .preference-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid var(--outline-variant);
      gap: 16px;
    }

    .preference-item:last-child {
      border-bottom: none;
    }

    .preference-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
    }

    .preference-info mat-icon {
      color: var(--on-surface-variant);
      margin-top: 2px;
    }

    .preference-info > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .preference-label {
      font-size: 14px;
      font-weight: 500;
    }

    .preference-description {
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    /* Data Info Cards */
    .data-info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-card {
      background: var(--surface-container-low);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }

    .info-card mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--primary);
      margin-bottom: 12px;
    }

    .info-card h4 {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
    }

    .info-card p {
      margin: 0;
      font-size: 12px;
      color: var(--on-surface-variant);
      line-height: 1.5;
    }

    /* Danger Zone */
    .danger-zone {
      border-color: var(--error);
    }

    .danger-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .danger-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--surface-container-low);
      border-radius: 12px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .action-info h4 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 500;
    }

    .action-info p {
      margin: 0;
      font-size: 12px;
      color: var(--on-surface-variant);
    }

    @media (max-width: 768px) {
      .settings-tabs ::ng-deep .mat-mdc-tab-labels {
        overflow-x: auto;
        flex-wrap: nowrap;
      }

      .theme-options {
        flex-direction: column;
      }

      .theme-option {
        flex-direction: row;
        padding: 16px;
      }

      .danger-action {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class SettingsComponent implements OnInit {
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private themeService = inject(ThemeService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

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

  // Track unsaved changes
  private originalThresholds = { ...DEFAULT_THRESHOLDS };
  hasUnsavedChanges = signal(false);

  // Theme
  currentTheme = computed(() => this.themeService.currentTheme());

  async ngOnInit(): Promise<void> {
    // Load current settings
    const settings = this.dataService.settings();
    this.googleClientId = settings.googleClientId;
    this.thresholds = { ...settings.thresholds };
    this.originalThresholds = { ...settings.thresholds };
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

      // Verify sign-in was successful
      if (!this.googleCalendarService.isSignedIn()) {
        throw new Error('Sign-in was cancelled or failed');
      }

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

  confirmDisconnect(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Disconnect Google Calendar',
        message: 'Are you sure you want to disconnect from Google Calendar? Your cached events will be cleared.',
        confirmText: 'Disconnect',
        cancelText: 'Cancel',
        type: 'warning',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.disconnect();
      }
    });
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

  isCalendarSelected(calendarId: string): boolean {
    return this.selectedCalendars.includes(calendarId);
  }

  toggleCalendar(calendarId: string): void {
    if (this.isCalendarSelected(calendarId)) {
      this.selectedCalendars = this.selectedCalendars.filter(id => id !== calendarId);
    } else {
      this.selectedCalendars = [...this.selectedCalendars, calendarId];
    }
    this.saveCalendarSelection();
  }

  selectAllCalendars(): void {
    this.selectedCalendars = this.calendars().map(c => c.id);
    this.saveCalendarSelection();
  }

  deselectAllCalendars(): void {
    this.selectedCalendars = [];
    this.saveCalendarSelection();
  }

  saveCalendarSelection(): void {
    this.dataService.updateSettings({ selectedCalendars: this.selectedCalendars });
    this.dataService.clearEventsCache(); // Clear cache when calendar selection changes
    this.showMessage('Calendar selection saved');
  }

  markDirty(): void {
    const thresholdsChanged =
      JSON.stringify(this.thresholds) !== JSON.stringify(this.originalThresholds);
    this.hasUnsavedChanges.set(thresholdsChanged);
  }

  saveThresholds(): void {
    this.dataService.updateSettings({ thresholds: this.thresholds });
    this.originalThresholds = { ...this.thresholds };
    this.hasUnsavedChanges.set(false);
    this.showMessage('Thresholds saved');
  }

  confirmResetThresholds(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Reset Thresholds',
        message: 'Reset all thresholds to their default values?',
        confirmText: 'Reset',
        cancelText: 'Cancel',
        type: 'warning',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.resetThresholds();
      }
    });
  }

  resetThresholds(): void {
    this.thresholds = { ...DEFAULT_THRESHOLDS };
    this.markDirty();
    this.showMessage('Thresholds reset to defaults');
  }

  setTheme(mode: 'light' | 'dark' | 'system'): void {
    this.themeService.setTheme(mode);
    this.showMessage(`Theme changed to ${mode}`);
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

  confirmResetAllData(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Reset All Data',
        message: 'This will delete all your settings, preferences, and cached data. This action cannot be undone.',
        confirmText: 'Reset Everything',
        cancelText: 'Cancel',
        type: 'danger',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.resetAllData();
      }
    });
  }

  resetAllData(): void {
    this.dataService.resetSettings();
    this.dataService.clearEventsCache();
    this.thresholds = { ...DEFAULT_THRESHOLDS };
    this.originalThresholds = { ...DEFAULT_THRESHOLDS };
    this.hasUnsavedChanges.set(false);
    this.showMessage('All data has been reset');
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3000 });
  }
}
