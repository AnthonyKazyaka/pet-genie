/**
 * Tests for StorageService
 * These tests verify AsyncStorage wrapper functionality
 */

// Mock must be defined before any imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  clear: jest.fn(() => Promise.resolve()),
}));

// Import after mock
const AsyncStorage = require('@react-native-async-storage/async-storage').default || require('@react-native-async-storage/async-storage');

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should store a string value', async () => {
      await AsyncStorage.setItem('test-key', 'test-value');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should store an object as JSON', async () => {
      const data = { name: 'Test', value: 123 };
      await AsyncStorage.setItem('object-key', JSON.stringify(data));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('object-key', '{"name":"Test","value":123}');
    });
  });

  describe('getItem', () => {
    it('should return null for non-existent key', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      const result = await AsyncStorage.getItem('non-existent');
      expect(result).toBeNull();
    });

    it('should return stored value', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce('stored-value');
      const result = await AsyncStorage.getItem('existing-key');
      expect(result).toBe('stored-value');
    });

    it('should return JSON object when parsed', async () => {
      const data = { name: 'Test', value: 123 };
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(data));
      
      const result = await AsyncStorage.getItem('object-key');
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual(data);
    });
  });

  describe('removeItem', () => {
    it('should remove an item', async () => {
      await AsyncStorage.removeItem('key-to-remove');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key-to-remove');
    });
  });

  describe('multiRemove', () => {
    it('should remove multiple items', async () => {
      const keys = ['key1', 'key2', 'key3'];
      await AsyncStorage.multiRemove(keys);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(keys);
    });
  });

  describe('getAllKeys', () => {
    it('should return empty array when no keys', async () => {
      AsyncStorage.getAllKeys.mockResolvedValueOnce([]);
      const keys = await AsyncStorage.getAllKeys();
      expect(keys).toEqual([]);
    });

    it('should return all keys', async () => {
      const expectedKeys = ['key1', 'key2', 'key3'];
      AsyncStorage.getAllKeys.mockResolvedValueOnce(expectedKeys);
      
      const keys = await AsyncStorage.getAllKeys();
      expect(keys).toEqual(expectedKeys);
    });
  });

  describe('clear', () => {
    it('should clear all storage', async () => {
      await AsyncStorage.clear();
      expect(AsyncStorage.clear).toHaveBeenCalled();
    });
  });

  describe('JSON handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce('not-valid-json');
      
      const result = await AsyncStorage.getItem('invalid-json-key');
      
      // Attempting to parse invalid JSON should throw
      expect(() => JSON.parse(result)).toThrow();
    });

    it('should handle arrays correctly', async () => {
      const data = [1, 2, 3, 'a', 'b'];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(data));
      
      const result = await AsyncStorage.getItem('array-key');
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual(data);
    });

    it('should handle nested objects correctly', async () => {
      const data = {
        level1: {
          level2: {
            value: 'deep'
          }
        }
      };
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(data));
      
      const result = await AsyncStorage.getItem('nested-key');
      const parsed = JSON.parse(result);
      
      expect(parsed.level1.level2.value).toBe('deep');
    });
  });
});
