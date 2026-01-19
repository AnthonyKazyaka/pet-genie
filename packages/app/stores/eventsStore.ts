import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEvent, processEvents } from '@pet-genie/core';

interface EventsState {
  events: CalendarEvent[];
  ignoredEventIds: Set<string>;
  lastRefresh: Date | null;
  isLoading: boolean;
  
  // Actions
  setEvents: (events: CalendarEvent[]) => void;
  addEvents: (events: CalendarEvent[]) => void;
  clearEvents: () => void;
  ignoreEvent: (eventId: string) => void;
  unignoreEvent: (eventId: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Selectors
  getWorkEvents: () => CalendarEvent[];
  getVisibleEvents: () => CalendarEvent[];
  getEventsForDate: (date: Date) => CalendarEvent[];
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      events: [],
      ignoredEventIds: new Set(),
      lastRefresh: null,
      isLoading: false,
      
      setEvents: (events) => {
        const processed = processEvents(events);
        set({
          events: processed,
          lastRefresh: new Date(),
        });
      },
      
      addEvents: (newEvents) => {
        const { events } = get();
        const processed = processEvents(newEvents);
        const existingIds = new Set(events.map((e) => e.id));
        const unique = processed.filter((e) => !existingIds.has(e.id));
        set({
          events: [...events, ...unique],
          lastRefresh: new Date(),
        });
      },
      
      clearEvents: () =>
        set({
          events: [],
          lastRefresh: null,
        }),
        
      ignoreEvent: (eventId) =>
        set((state) => ({
          ignoredEventIds: new Set([...state.ignoredEventIds, eventId]),
        })),
        
      unignoreEvent: (eventId) =>
        set((state) => {
          const newSet = new Set(state.ignoredEventIds);
          newSet.delete(eventId);
          return { ignoredEventIds: newSet };
        }),
        
      setLoading: (loading) => set({ isLoading: loading }),
      
      getWorkEvents: () => {
        const { events, ignoredEventIds } = get();
        return events.filter(
          (e) => e.isWorkEvent && !ignoredEventIds.has(e.id)
        );
      },
      
      getVisibleEvents: () => {
        const { events, ignoredEventIds } = get();
        return events.filter((e) => !ignoredEventIds.has(e.id));
      },
      
      getEventsForDate: (date: Date) => {
        const { events, ignoredEventIds } = get();
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        
        return events.filter(
          (e) =>
            !ignoredEventIds.has(e.id) &&
            e.start >= start &&
            e.start <= end
        );
      },
    }),
    {
      name: 'pet-genie-events',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        events: state.events.map((e) => ({
          ...e,
          start: e.start.toISOString(),
          end: e.end.toISOString(),
        })),
        ignoredEventIds: Array.from(state.ignoredEventIds),
        lastRefresh: state.lastRefresh?.toISOString() || null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert dates back from strings
          state.events = state.events.map((e: any) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }));
          state.ignoredEventIds = new Set(state.ignoredEventIds as any);
          state.lastRefresh = state.lastRefresh
            ? new Date(state.lastRefresh as any)
            : null;
        }
      },
    }
  )
);
