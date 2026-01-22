/**
 * Google Calendar Service for Mobile
 * 
 * Handles authentication via @react-native-google-signin/google-signin
 * and Calendar API integration. Uses secure storage only for caching
 * metadata; Google Sign-In manages the actual tokens and session.
 */

import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CalendarEvent, DateRange } from '@/models';
import { EventProcessorService } from './event-processor.service';

// Google OAuth Configuration from app.config.ts
const GOOGLE_CLIENT_ID_WEB = Constants.expoConfig?.extra?.googleClientIds?.web ?? '';
const GOOGLE_CLIENT_ID_IOS = Constants.expoConfig?.extra?.googleClientIds?.ios ?? '';
const GOOGLE_CLIENT_ID_ANDROID = Constants.expoConfig?.extra?.googleClientIds?.android ?? '';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// Secure storage keys (for caching user metadata only)
const USER_EMAIL_KEY = 'google_user_email';

// Track if GoogleSignin has been configured
let isConfigured = false;

export interface GoogleAuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  userEmail: string | null;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: string;
  selected: boolean;
}

export interface RawGoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  status?: string;
  recurringEventId?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

/**
 * Configure Google Sign-In with the appropriate client IDs and scopes
 */
function configureGoogleSignIn(): void {
  if (isConfigured) return;

  // Determine platform-specific configuration
  const iosClientId = GOOGLE_CLIENT_ID_IOS || undefined;
  const webClientId = GOOGLE_CLIENT_ID_WEB || undefined;

  GoogleSignin.configure({
    scopes: SCOPES,
    webClientId, // Required for Android
    iosClientId, // Required for iOS
    offlineAccess: true, // Request refresh token
  });

  isConfigured = true;
  console.log('[GoogleAuth] Configured for platform:', Platform.OS);
}

/**
 * Google Calendar Service Class
 */
class GoogleCalendarServiceClass {
  private accessToken: string | null = null;
  private userEmail: string | null = null;
  private listeners: Set<(state: GoogleAuthState) => void> = new Set();

  constructor() {
    // Configure Google Sign-In on instantiation
    configureGoogleSignIn();
    this.loadStoredTokens();
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: GoogleAuthState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.getAuthState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getAuthState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Get current auth state
   */
  getAuthState(): GoogleAuthState {
    return {
      isSignedIn: this.isSignedIn(),
      accessToken: this.accessToken,
      userEmail: this.userEmail,
    };
  }

  /**
   * Check if user is signed in with valid token
   */
  isSignedIn(): boolean {
    return !!this.accessToken;
  }

  /**
   * Load stored metadata and check current sign-in state
   * Google Sign-In manages the actual tokens; we just cache user metadata
   */
  async loadStoredTokens(): Promise<void> {
    try {
      // Load cached user email
      const email = await SecureStore.getItemAsync(USER_EMAIL_KEY);
      this.userEmail = email;

      // Check if user is currently signed in via Google Sign-In
      const isSignedIn = await GoogleSignin.hasPreviousSignIn();
      
      if (isSignedIn) {
        try {
          // Try to get current user silently (refreshes tokens if needed)
          const response = await GoogleSignin.signInSilently();
          
          if (response.type === 'success') {
            // Get fresh access token
            const tokens = await GoogleSignin.getTokens();
            this.accessToken = tokens.accessToken;
            this.userEmail = response.data.user.email;
            await SecureStore.setItemAsync(USER_EMAIL_KEY, response.data.user.email);
          } else if (response.type === 'noSavedCredentialFound') {
            // No credentials found, user needs to sign in
            console.log('[GoogleAuth] No saved credentials found');
            this.accessToken = null;
          }
        } catch (error) {
          if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_REQUIRED) {
            // User was signed in but session expired, need to sign in again
            console.log('[GoogleAuth] Session expired, sign in required');
            this.accessToken = null;
          } else {
            console.error('[GoogleAuth] Silent sign-in failed:', error);
          }
        }
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
  }

  /**
   * Clear stored metadata
   */
  private async clearStoredMetadata(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
    this.accessToken = null;
    this.userEmail = null;
    this.notifyListeners();
  }

  /**
   * Initiate Google Sign-In flow
   */
  async signIn(): Promise<boolean> {
    try {
      console.log('[GoogleAuth] Starting sign-in flow for platform:', Platform.OS);

      // Check for Google Play Services on Android
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        // Get access token for API calls
        const tokens = await GoogleSignin.getTokens();
        this.accessToken = tokens.accessToken;
        this.userEmail = response.data.user.email;

        // Cache user email
        await SecureStore.setItemAsync(USER_EMAIL_KEY, response.data.user.email);

        this.notifyListeners();
        console.log('[GoogleAuth] Sign-in successful for:', this.userEmail);
        return true;
      }

      return false;
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('[GoogleAuth] User cancelled sign-in');
            break;
          case statusCodes.IN_PROGRESS:
            console.log('[GoogleAuth] Sign-in already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.error('[GoogleAuth] Google Play Services not available');
            break;
          default:
            console.error('[GoogleAuth] Sign-in failed with code:', error.code, error.message);
        }
      } else {
        console.error('[GoogleAuth] Sign-in failed:', error);
      }
      return false;
    }
  }

  /**
   * Refresh access token using Google Sign-In's built-in refresh
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      // Google Sign-In handles token refresh automatically
      // We just need to get fresh tokens
      const tokens = await GoogleSignin.getTokens();
      this.accessToken = tokens.accessToken;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('[GoogleAuth] Token refresh failed:', error);
      // Token refresh failed, clear state and require new sign-in
      await this.clearStoredMetadata();
      return false;
    }
  }

  /**
   * Sign out and revoke access
   */
  async signOut(): Promise<void> {
    try {
      // Revoke access to remove all granted permissions
      await GoogleSignin.revokeAccess();
    } catch (error) {
      console.error('[GoogleAuth] Revoke access failed:', error);
    }

    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('[GoogleAuth] Sign out failed:', error);
    }

    await this.clearStoredMetadata();
  }

  /**
   * Ensure we have a valid access token, refreshing if necessary
   */
  private async ensureValidToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }

    // Try to refresh the token
    const refreshed = await this.refreshAccessToken();
    if (refreshed) {
      return this.accessToken;
    }

    return null;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(url: string): Promise<T | null> {
    const token = await this.ensureValidToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token invalid, try refresh
      const refreshed = await this.refreshAccessToken();
      if (refreshed && this.accessToken) {
        const retryResponse = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
        if (retryResponse.ok) {
          return retryResponse.json();
        }
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List available calendars
   */
  async listCalendars(): Promise<GoogleCalendar[]> {
    try {
      const data = await this.apiRequest<any>(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList'
      );

      if (!data?.items) {
        return [];
      }

      return data.items.map((item: any) => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        primary: item.primary || false,
        backgroundColor: item.backgroundColor,
        foregroundColor: item.foregroundColor,
        accessRole: item.accessRole,
        selected: item.primary || false,
      }));
    } catch (error) {
      console.error('Failed to list calendars:', error);
      return [];
    }
  }

  /**
   * Fetch events from a calendar
   */
  async fetchCalendarEvents(
    calendarId: string,
    dateRange: DateRange
  ): Promise<CalendarEvent[]> {
    try {
      const timeMin = dateRange.start.toISOString();
      const timeMax = dateRange.end.toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500`;

      const data = await this.apiRequest<any>(url);

      if (!data?.items) {
        return [];
      }

      return data.items.map((item: RawGoogleCalendarEvent) =>
        this.parseGoogleEvent(item, calendarId)
      );
    } catch (error) {
      console.error(`Failed to fetch events from ${calendarId}:`, error);
      return [];
    }
  }

  /**
   * Fetch events from multiple calendars
   */
  async fetchEventsFromCalendars(
    calendarIds: string[],
    dateRange: DateRange
  ): Promise<CalendarEvent[]> {
    if (calendarIds.length === 0) {
      return [];
    }

    const results = await Promise.all(
      calendarIds.map((id) => this.fetchCalendarEvents(id, dateRange))
    );

    const allEvents = results.flat();
    // Sort by start time
    return allEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }

  /**
   * Parse Google Calendar event to our model
   * Uses EventProcessorService to properly classify work vs personal events
   */
  private parseGoogleEvent(
    raw: RawGoogleCalendarEvent,
    calendarId: string
  ): CalendarEvent {
    const isAllDay = !raw.start.dateTime;
    const startStr = isAllDay
      ? `${raw.start.date}T00:00:00`
      : raw.start.dateTime!;
    const endStr = isAllDay
      ? `${raw.end.date}T23:59:59`
      : raw.end.dateTime!;

    const title = raw.summary || '(No title)';
    
    // Build the base event
    const baseEvent: CalendarEvent = {
      id: raw.id,
      calendarId,
      title,
      description: raw.description,
      location: raw.location,
      start: startStr,
      end: endStr,
      allDay: isAllDay,
      recurringEventId: raw.recurringEventId,
      status: (raw.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
    };

    // Use EventProcessorService to classify and enrich the event
    // This ensures consistent work event detection with the website
    return EventProcessorService.processEvent(baseEvent);
  }
}

// Export singleton instance
export const GoogleCalendarService = new GoogleCalendarServiceClass();
