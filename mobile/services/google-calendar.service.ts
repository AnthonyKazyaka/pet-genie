/**
 * Google Calendar Service for Mobile
 * 
 * Handles OAuth 2.0 authentication and Calendar API integration
 * using expo-auth-session for the auth flow and expo-secure-store
 * for token storage.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { CalendarEvent, DateRange } from '@/models';

// Ensure browser redirect is handled
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Configuration
const GOOGLE_CLIENT_ID_WEB = Constants.expoConfig?.extra?.googleClientIds?.web ?? '';
const GOOGLE_CLIENT_ID_IOS = Constants.expoConfig?.extra?.googleClientIds?.ios ?? '';
const GOOGLE_CLIENT_ID_ANDROID = Constants.expoConfig?.extra?.googleClientIds?.android ?? '';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Secure storage keys
const TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';
const USER_EMAIL_KEY = 'google_user_email';

export interface GoogleAuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
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
 * Get the appropriate client ID based on platform
 */
function getClientId(): string {
  switch (Platform.OS) {
    case 'ios':
      return GOOGLE_CLIENT_ID_IOS;
    case 'android':
      return GOOGLE_CLIENT_ID_ANDROID;
    default:
      return GOOGLE_CLIENT_ID_WEB;
  }
}

/**
 * Get the redirect URI for the current platform
 */
function getRedirectUri(): string {
  if (Platform.OS === 'android') {
    if (!GOOGLE_CLIENT_ID_ANDROID) {
      throw new Error('Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID');
    }
    const clientIdBase = GOOGLE_CLIENT_ID_ANDROID.replace('.apps.googleusercontent.com', '');
    return `com.googleusercontent.apps.${clientIdBase}:/oauth2redirect`;
  }

  if (Platform.OS === 'ios') {
    if (!GOOGLE_CLIENT_ID_IOS) {
      throw new Error('Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS');
    }
    const clientIdBase = GOOGLE_CLIENT_ID_IOS.replace('.apps.googleusercontent.com', '');
    return `com.googleusercontent.apps.${clientIdBase}:/oauth2redirect`;
  }

  return AuthSession.makeRedirectUri({
    scheme: 'petgenie',
    path: 'oauth/callback',
  });
}

/**
 * Google Calendar Service Class
 */
class GoogleCalendarServiceClass {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private userEmail: string | null = null;
  private listeners: Set<(state: GoogleAuthState) => void> = new Set();

  constructor() {
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
      refreshToken: this.refreshToken,
      tokenExpiry: this.tokenExpiry,
      userEmail: this.userEmail,
    };
  }

  /**
   * Check if user is signed in with valid token
   */
  isSignedIn(): boolean {
    if (!this.accessToken) return false;
    if (this.tokenExpiry && this.tokenExpiry <= new Date()) {
      // Token expired - try to refresh
      return false;
    }
    return true;
  }

  /**
   * Load stored tokens from secure storage
   */
  async loadStoredTokens(): Promise<void> {
    try {
      const [token, refreshToken, expiryStr, email] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.getItemAsync(TOKEN_EXPIRY_KEY),
        SecureStore.getItemAsync(USER_EMAIL_KEY),
      ]);

      this.accessToken = token;
      this.refreshToken = refreshToken;
      this.userEmail = email;

      if (expiryStr) {
        this.tokenExpiry = new Date(expiryStr);
        
        // If token is expired but we have refresh token, try to refresh
        if (this.tokenExpiry <= new Date() && this.refreshToken) {
          await this.refreshAccessToken();
        }
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
  }

  /**
   * Store tokens in secure storage
   */
  private async storeTokens(
    accessToken: string,
    refreshToken: string | null,
    expiresIn: number
  ): Promise<void> {
    const expiry = new Date(Date.now() + expiresIn * 1000);

    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, accessToken),
      refreshToken
        ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
        : Promise.resolve(),
      SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toISOString()),
    ]);

    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    this.tokenExpiry = expiry;
    this.notifyListeners();
  }

  /**
   * Clear all stored tokens
   */
  private async clearStoredTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
      SecureStore.deleteItemAsync(USER_EMAIL_KEY),
    ]);

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userEmail = null;
    this.notifyListeners();
  }

  /**
   * Initiate OAuth sign-in flow
   */
  async signIn(): Promise<boolean> {
    try {
      const clientId = getClientId();
      const redirectUri = getRedirectUri();

      console.log('[GoogleAuth] Platform:', Platform.OS);
      console.log('[GoogleAuth] clientId:', clientId);
      console.log('[GoogleAuth] redirectUri:', redirectUri);

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: SCOPES,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const result = await request.promptAsync(DISCOVERY, { useProxy: false });

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier!,
            },
          },
          DISCOVERY
        );

        await this.storeTokens(
          tokenResult.accessToken,
          tokenResult.refreshToken ?? null,
          tokenResult.expiresIn ?? 3600
        );

        // Fetch user email
        await this.fetchUserEmail();

        return true;
      }

      return false;
    } catch (error) {
      console.error('Sign in failed:', error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const clientId = getClientId();

      const tokenResult = await AuthSession.refreshAsync(
        {
          clientId,
          refreshToken: this.refreshToken,
        },
        DISCOVERY
      );

      await this.storeTokens(
        tokenResult.accessToken,
        tokenResult.refreshToken ?? this.refreshToken,
        tokenResult.expiresIn ?? 3600
      );

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      await this.clearStoredTokens();
      return false;
    }
  }

  /**
   * Sign out and revoke tokens
   */
  async signOut(): Promise<void> {
    if (this.accessToken) {
      try {
        await AuthSession.revokeAsync(
          { token: this.accessToken },
          DISCOVERY
        );
      } catch (error) {
        console.error('Token revocation failed:', error);
      }
    }

    await this.clearStoredTokens();
  }

  /**
   * Fetch user email from Google
   */
  private async fetchUserEmail(): Promise<void> {
    if (!this.accessToken) return;

    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.userEmail = data.email;
        await SecureStore.setItemAsync(USER_EMAIL_KEY, data.email);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to fetch user email:', error);
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<string | null> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    if (this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.accessToken;
      }
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

    // Try to extract client name from title or attendees
    let clientName: string | undefined;
    if (raw.attendees && raw.attendees.length > 0) {
      const client = raw.attendees.find((a) => a.responseStatus !== 'declined');
      clientName = client?.displayName || client?.email;
    }

    // Try to detect service type from title
    const title = raw.summary || '(No title)';
    const titleLower = title.toLowerCase();
    let serviceType: 'drop-in' | 'walk' | 'overnight' | undefined;
    if (titleLower.includes('walk')) {
      serviceType = 'walk';
    } else if (titleLower.includes('overnight') || titleLower.includes('boarding')) {
      serviceType = 'overnight';
    } else if (titleLower.includes('drop-in') || titleLower.includes('visit')) {
      serviceType = 'drop-in';
    }

    return {
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
      isWorkEvent: true,
      clientName,
      serviceInfo: serviceType ? { type: serviceType, duration: 30 } : undefined,
    };
  }
}

// Export singleton instance
export const GoogleCalendarService = new GoogleCalendarServiceClass();
