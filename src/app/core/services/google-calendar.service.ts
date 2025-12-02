import { Injectable, signal, computed, NgZone, inject } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import {
  CalendarEvent,
  GoogleCalendar,
  RawGoogleCalendarEvent,
  DateRange,
} from '../../models';
import { StorageService } from './storage.service';
import { EventProcessorService } from './event-processor.service';

// Google API types - declared as potentially undefined for SSR compatibility
declare const gapi: any | undefined;
declare const google: any | undefined;

export interface GoogleAuthState {
  isInitialized: boolean;
  isSignedIn: boolean;
  accessToken: string | null;
  tokenExpiry: Date | null;
  userEmail: string | null;
}

/**
 * GoogleCalendarService
 * Handles Google OAuth 2.0 and Calendar API integration
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  private readonly TOKEN_KEY = 'google_access_token';
  private readonly TOKEN_EXPIRY_KEY = 'google_token_expiry';

  private ngZone = inject(NgZone);
  private storage = inject(StorageService);
  private eventProcessor = inject(EventProcessorService);

  // Auth state signals
  private readonly authStateSignal = signal<GoogleAuthState>({
    isInitialized: false,
    isSignedIn: false,
    accessToken: null,
    tokenExpiry: null,
    userEmail: null,
  });

  private tokenClient: any = null;
  private gapiInitialized = false;
  private gisInitialized = false;
  private signInResolver: ((value: void) => void) | null = null;
  private signInRejecter: ((reason: Error) => void) | null = null;

  // Public readonly accessors
  readonly authState = this.authStateSignal.asReadonly();
  readonly isInitialized = computed(() => this.authStateSignal().isInitialized);
  readonly isSignedIn = computed(() => this.authStateSignal().isSignedIn);
  readonly userEmail = computed(() => this.authStateSignal().userEmail);

  constructor() {
    this.loadStoredToken();
  }

  /**
   * Get gapi reference from window
   */
  private getGapi(): any {
    return (window as any).gapi;
  }

  /**
   * Get google reference from window
   */
  private getGoogle(): any {
    return (window as any).google;
  }

  /**
   * Load stored token from localStorage
   */
  private loadStoredToken(): void {
    const token = this.storage.get<string>(this.TOKEN_KEY);
    const expiryStr = this.storage.get<string>(this.TOKEN_EXPIRY_KEY);

    if (token && expiryStr) {
      const expiry = new Date(expiryStr);
      if (expiry > new Date()) {
        this.authStateSignal.update((state) => ({
          ...state,
          accessToken: token,
          tokenExpiry: expiry,
          isSignedIn: true,
        }));
      } else {
        // Token expired, clear it
        this.clearStoredToken();
      }
    }
  }

  /**
   * Store token in localStorage
   */
  private storeToken(token: string, expiresIn: number): void {
    const expiry = new Date(Date.now() + expiresIn * 1000);
    this.storage.set(this.TOKEN_KEY, token);
    this.storage.set(this.TOKEN_EXPIRY_KEY, expiry.toISOString());
  }

  /**
   * Clear stored token
   */
  private clearStoredToken(): void {
    this.storage.remove(this.TOKEN_KEY);
    this.storage.remove(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Initialize Google API client
   */
  async initialize(clientId: string): Promise<void> {
    if (!clientId) {
      throw new Error('Google Client ID is required');
    }

    try {
      // Load GAPI
      await this.loadGapiClient();

      // Load GIS (Google Identity Services)
      await this.loadGisClient(clientId);

      // If we have a stored token, set it on the client
      const storedToken = this.authStateSignal().accessToken;
      if (storedToken && this.getGapi()?.client) {
        this.getGapi().client.setToken({ access_token: storedToken });
      }

      this.authStateSignal.update((state) => ({
        ...state,
        isInitialized: true,
      }));
    } catch (error) {
      console.error('Failed to initialize Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Load GAPI client library
   */
  private async loadGapiClient(): Promise<void> {
    if (this.gapiInitialized) return;

    return new Promise((resolve, reject) => {
      // Check if gapi is loaded
      if (typeof gapi === 'undefined') {
        // Load the script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          const gapiRef = (window as any).gapi;
          gapiRef.load('client', async () => {
            try {
              await gapiRef.client.init({
                discoveryDocs: [this.DISCOVERY_DOC],
              });
              this.gapiInitialized = true;
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        };
        script.onerror = reject;
        document.body.appendChild(script);
      } else {
        const gapiRef = gapi;
        gapiRef.load('client', async () => {
          try {
            await gapiRef.client.init({
              discoveryDocs: [this.DISCOVERY_DOC],
            });
            this.gapiInitialized = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      }
    });
  }

  /**
   * Load Google Identity Services
   */
  private async loadGisClient(clientId: string): Promise<void> {
    if (this.gisInitialized) return;

    return new Promise((resolve, reject) => {
      // Check if google is loaded
      if (typeof google === 'undefined' || !google?.accounts) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          this.initializeTokenClient(clientId);
          this.gisInitialized = true;
          resolve();
        };
        script.onerror = reject;
        document.body.appendChild(script);
      } else {
        this.initializeTokenClient(clientId);
        this.gisInitialized = true;
        resolve();
      }
    });
  }

  /**
   * Initialize OAuth token client
   */
  private initializeTokenClient(clientId: string): void {
    const googleRef = (window as any).google;
    this.tokenClient = googleRef.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: this.SCOPES,
      callback: (response: any) => {
        this.ngZone.run(() => {
          if (response.error) {
            console.error('OAuth error:', response.error, response.error_description);
            if (this.signInRejecter) {
              this.signInRejecter(new Error(response.error_description || response.error));
              this.signInRejecter = null;
              this.signInResolver = null;
            }
            return;
          }

          const token = response.access_token;
          const expiresIn = response.expires_in || 3600;

          this.storeToken(token, expiresIn);
          this.getGapi().client.setToken({ access_token: token });

          this.authStateSignal.update((state) => ({
            ...state,
            accessToken: token,
            tokenExpiry: new Date(Date.now() + expiresIn * 1000),
            isSignedIn: true,
          }));

          // Get user email
          this.fetchUserEmail();

          // Resolve the signIn promise
          if (this.signInResolver) {
            this.signInResolver();
            this.signInResolver = null;
            this.signInRejecter = null;
          }
        });
      },
      error_callback: (error: any) => {
        this.ngZone.run(() => {
          console.error('OAuth error callback:', error);
          if (this.signInRejecter) {
            this.signInRejecter(new Error(error.message || 'OAuth error'));
            this.signInRejecter = null;
            this.signInResolver = null;
          }
        });
      },
    });
  }

  /**
   * Fetch user email from Google
   */
  private async fetchUserEmail(): Promise<void> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${this.authStateSignal().accessToken}`,
          },
        }
      );
      const data = await response.json();
      this.authStateSignal.update((state) => ({
        ...state,
        userEmail: data.email,
      }));
    } catch (error) {
      console.error('Failed to fetch user email:', error);
    }
  }

  /**
   * Trigger OAuth sign-in
   * Returns a Promise that resolves when sign-in completes or rejects on error
   */
  async signIn(): Promise<void> {
    if (!this.tokenClient) {
      throw new Error('Google Calendar not initialized. Call initialize() first.');
    }

    // Check if we have a stored valid token
    const state = this.authStateSignal();
    if (state.accessToken && state.tokenExpiry && state.tokenExpiry > new Date()) {
      this.getGapi().client.setToken({ access_token: state.accessToken });
      return;
    }

    // Return a promise that resolves when the OAuth callback fires
    return new Promise<void>((resolve, reject) => {
      this.signInResolver = resolve;
      this.signInRejecter = reject;

      // Request new token - use empty prompt to allow silent sign-in if possible
      // 'consent' forces the consent screen every time
      // 'select_account' allows user to choose account
      // '' (empty) allows silent auth if user previously consented
      try {
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (error) {
        this.signInResolver = null;
        this.signInRejecter = null;
        reject(error);
      }
    });
  }

  /**
   * Sign out and revoke token
   */
  signOut(): void {
    const token = this.authStateSignal().accessToken;
    if (token) {
      this.getGoogle().accounts.oauth2.revoke(token);
    }

    this.getGapi().client.setToken(null);
    this.clearStoredToken();

    this.authStateSignal.update((state) => ({
      ...state,
      accessToken: null,
      tokenExpiry: null,
      isSignedIn: false,
      userEmail: null,
    }));
  }

  /**
   * List available calendars
   */
  listCalendars(): Observable<GoogleCalendar[]> {
    if (!this.isSignedIn()) {
      return throwError(() => new Error('Not signed in'));
    }

    if (!this.gapiInitialized || !this.getGapi()?.client?.calendar) {
      return throwError(() => new Error('Google API not initialized'));
    }

    return from(this.getGapi().client.calendar.calendarList.list()).pipe(
      map((response: any) => {
        const items = response.result.items || [];
        return items.map((item: any) => ({
          id: item.id,
          summary: item.summary,
          description: item.description,
          primary: item.primary || false,
          backgroundColor: item.backgroundColor,
          foregroundColor: item.foregroundColor,
          accessRole: item.accessRole,
          selected: item.primary || false, // Select primary by default
        }));
      }),
      catchError((error) => {
        console.error('Failed to list calendars:', error);
        // If 401, token is invalid - clear it
        if (error.status === 401 || error.result?.error?.code === 401) {
          this.clearStoredToken();
          this.authStateSignal.update((state) => ({
            ...state,
            accessToken: null,
            tokenExpiry: null,
            isSignedIn: false,
          }));
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch events from a single calendar
   */
  fetchCalendarEvents(
    calendarId: string,
    dateRange: DateRange
  ): Observable<CalendarEvent[]> {
    if (!this.isSignedIn()) {
      return throwError(() => new Error('Not signed in'));
    }

    if (!this.gapiInitialized || !this.getGapi()?.client?.calendar) {
      return throwError(() => new Error('Google API not initialized'));
    }

    return from(
      this.getGapi().client.calendar.events.list({
        calendarId: calendarId,
        timeMin: dateRange.start.toISOString(),
        timeMax: dateRange.end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
      })
    ).pipe(
      map((response: any) => {
        const items: RawGoogleCalendarEvent[] = response.result.items || [];
        return items.map((item) => this.parseGoogleEvent(item, calendarId));
      }),
      map((events) => this.eventProcessor.processEvents(events)),
      catchError((error) => {
        console.error(`Failed to fetch events from ${calendarId}:`, error);
        // If 401, token is invalid - clear it
        if (error.status === 401 || error.result?.error?.code === 401) {
          this.clearStoredToken();
          this.authStateSignal.update((state) => ({
            ...state,
            accessToken: null,
            tokenExpiry: null,
            isSignedIn: false,
          }));
        }
        return of([]);
      })
    );
  }

  /**
   * Fetch events from multiple calendars
   */
  fetchEventsFromCalendars(
    calendarIds: string[],
    dateRange: DateRange
  ): Observable<CalendarEvent[]> {
    if (calendarIds.length === 0) {
      return of([]);
    }

    // Fetch from all calendars in parallel, then merge
    const requests = calendarIds.map((id) =>
      this.fetchCalendarEvents(id, dateRange)
    );

    return from(Promise.all(requests.map((obs) => obs.toPromise()))).pipe(
      map((results) => {
        const allEvents = results.flat().filter((e): e is CalendarEvent => e !== undefined);
        // Sort by start time
        return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
      })
    );
  }

  /**
   * Parse raw Google Calendar event to our model
   */
  private parseGoogleEvent(
    raw: RawGoogleCalendarEvent,
    calendarId: string
  ): CalendarEvent {
    const isAllDay = !raw.start.dateTime;
    const start = isAllDay
      ? new Date(raw.start.date + 'T00:00:00')
      : new Date(raw.start.dateTime!);
    const end = isAllDay
      ? new Date(raw.end.date + 'T23:59:59')
      : new Date(raw.end.dateTime!);

    return {
      id: raw.id,
      calendarId,
      title: raw.summary || '(No title)',
      description: raw.description,
      location: raw.location,
      start,
      end,
      allDay: isAllDay,
      recurringEventId: raw.recurringEventId,
      status: (raw.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
    };
  }

  /**
   * Get default date range (current month with padding)
   */
  getDefaultDateRange(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return { start, end };
  }

  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): boolean {
    const state = this.authStateSignal();
    if (!state.tokenExpiry) return true;

    // Refresh if expiring in less than 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return state.tokenExpiry < fiveMinutesFromNow;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<void> {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: '' });
    }
  }
}
