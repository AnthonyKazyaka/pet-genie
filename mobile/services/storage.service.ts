import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'petgenie_';

/**
 * Storage Service
 * Wrapper for AsyncStorage with typed access
 */
export const StorageService = {
  /**
   * Get item from AsyncStorage with optional type
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(PREFIX + key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from AsyncStorage: ${key}`, error);
      return null;
    }
  },

  /**
   * Set item in AsyncStorage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to AsyncStorage: ${key}`, error);
    }
  },

  /**
   * Remove item from AsyncStorage
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch (error) {
      console.error(`Error removing from AsyncStorage: ${key}`, error);
    }
  },

  /**
   * Get all keys with pet-genie prefix
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys
        .filter(key => key.startsWith(PREFIX))
        .map(key => key.slice(PREFIX.length));
    } catch (error) {
      console.error('Error getting all keys from AsyncStorage', error);
      return [];
    }
  },

  /**
   * Clear all pet-genie items from AsyncStorage
   */
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const petGenieKeys = keys.filter(key => key.startsWith(PREFIX));
      await AsyncStorage.multiRemove(petGenieKeys);
    } catch (error) {
      console.error('Error clearing AsyncStorage', error);
    }
  },
};

export default StorageService;
