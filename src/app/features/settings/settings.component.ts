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
  styleUrl: './settings.component.scss',
  templateUrl: './settings.component.html',
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
