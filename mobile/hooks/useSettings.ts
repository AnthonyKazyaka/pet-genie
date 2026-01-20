import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage.service';
import { AppSettings, DEFAULT_SETTINGS, SettingsUpdateDto } from '../models/settings.model';

const STORAGE_KEY = 'app_settings';

/**
 * Hook for managing app settings
 * Provides read/write access to user preferences with persistence
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  /**
   * Load settings from storage
   */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await StorageService.get<Partial<AppSettings>>(STORAGE_KEY);
      // Merge with defaults to ensure all fields exist
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save settings to storage
   */
  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      await StorageService.set(STORAGE_KEY, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }, []);

  /**
   * Update specific settings fields
   */
  const updateSettings = useCallback(async (updates: SettingsUpdateDto) => {
    const newSettings = { ...settings, ...updates };
    await saveSettings(newSettings);
    return newSettings;
  }, [settings, saveSettings]);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(async () => {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }, [saveSettings]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    loadSettings,
    updateSettings,
    resetSettings,
  };
}
