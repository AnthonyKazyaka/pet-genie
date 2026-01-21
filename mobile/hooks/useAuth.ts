/**
 * Authentication Context and Hook
 * 
 * Provides app-wide authentication state for Google Calendar integration
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  GoogleCalendarService,
  GoogleAuthState,
  GoogleCalendar,
} from '@/services/google-calendar.service';
import { CalendarEvent, DateRange } from '@/models';

interface AuthContextValue extends GoogleAuthState {
  isLoading: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  listCalendars: () => Promise<GoogleCalendar[]>;
  fetchEvents: (calendarIds: string[], dateRange: DateRange) => Promise<CalendarEvent[]>;
  selectedCalendars: string[];
  setSelectedCalendars: (ids: string[]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isSignedIn: false,
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    userEmail: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = GoogleCalendarService.subscribe((state) => {
      setAuthState(state);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load stored tokens on mount
  useEffect(() => {
    GoogleCalendarService.loadStoredTokens();
  }, []);

  const signIn = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await GoogleCalendarService.signIn();
      if (result) {
        // Auto-select primary calendar after sign in
        const calendars = await GoogleCalendarService.listCalendars();
        const primary = calendars.find((c) => c.primary);
        if (primary) {
          setSelectedCalendars([primary.id]);
        }
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await GoogleCalendarService.signOut();
      setSelectedCalendars([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listCalendars = useCallback(async (): Promise<GoogleCalendar[]> => {
    return GoogleCalendarService.listCalendars();
  }, []);

  const fetchEvents = useCallback(
    async (calendarIds: string[], dateRange: DateRange): Promise<CalendarEvent[]> => {
      return GoogleCalendarService.fetchEventsFromCalendars(calendarIds, dateRange);
    },
    []
  );

  const value: AuthContextValue = {
    ...authState,
    isLoading,
    signIn,
    signOut,
    listCalendars,
    fetchEvents,
    selectedCalendars,
    setSelectedCalendars,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to fetch calendar events with date range
 */
export function useCalendarEvents(dateRange: DateRange | null) {
  const { isSignedIn, fetchEvents, selectedCalendars } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!isSignedIn || !dateRange || selectedCalendars.length === 0) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchEvents(selectedCalendars, dateRange);
      setEvents(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch events'));
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, dateRange, selectedCalendars, fetchEvents]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, error, refresh };
}
