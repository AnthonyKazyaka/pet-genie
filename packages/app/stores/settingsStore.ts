import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  GoogleCalendar,
} from '@pet-genie/core';

interface SettingsState {
  settings: AppSettings;
  calendars: GoogleCalendar[];
  isInitialized: boolean;
  
  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  setCalendars: (calendars: GoogleCalendar[]) => void;
  toggleCalendarSelection: (calendarId: string) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      calendars: [],
      isInitialized: false,
      
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
        
      setCalendars: (calendars) =>
        set({ calendars }),
        
      toggleCalendarSelection: (calendarId) =>
        set((state) => {
          const { selectedCalendars } = state.settings;
          const isSelected = selectedCalendars.includes(calendarId);
          
          return {
            settings: {
              ...state.settings,
              selectedCalendars: isSelected
                ? selectedCalendars.filter((id) => id !== calendarId)
                : [...selectedCalendars, calendarId],
            },
          };
        }),
        
      resetSettings: () =>
        set({
          settings: DEFAULT_SETTINGS,
          calendars: [],
        }),
    }),
    {
      name: 'pet-genie-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
        }
      },
    }
  )
);
