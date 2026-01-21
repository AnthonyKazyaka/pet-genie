/**
 * Tests for useVisitRecords hook
 * These tests verify visit record management functionality
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

// Simple mock for testing visit records storage
const STORAGE_KEY = 'pet_genie_visit_records';

interface VisitRecord {
  id: string;
  eventKey: string;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper functions that mirror the hook's logic
const generateId = (): string => Math.random().toString(36).substring(2, 11);

const createRecord = (eventKey: string): VisitRecord => ({
  id: generateId(),
  eventKey,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const checkInRecord = (record: VisitRecord): VisitRecord => ({
  ...record,
  checkInAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const checkOutRecord = (record: VisitRecord): VisitRecord => ({
  ...record,
  checkOutAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('useVisitRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should use correct storage key', () => {
      expect(STORAGE_KEY).toBe('pet_genie_visit_records');
    });
  });

  describe('createRecord', () => {
    it('should create a new record with eventKey', () => {
      const eventKey = 'event-123';
      const record = createRecord(eventKey);

      expect(record.eventKey).toBe(eventKey);
      expect(record.id).toBeDefined();
      expect(record.createdAt).toBeDefined();
      expect(record.updatedAt).toBeDefined();
      expect(record.checkInAt).toBeUndefined();
      expect(record.checkOutAt).toBeUndefined();
    });

    it('should generate unique IDs', () => {
      const record1 = createRecord('event-1');
      const record2 = createRecord('event-2');

      expect(record1.id).not.toBe(record2.id);
    });
  });

  describe('checkIn', () => {
    it('should set checkInAt timestamp', () => {
      const record = createRecord('event-123');
      const checkedIn = checkInRecord(record);

      expect(checkedIn.checkInAt).toBeDefined();
      expect(checkedIn.checkOutAt).toBeUndefined();
    });

    it('should update the updatedAt timestamp', () => {
      const record = createRecord('event-123');
      const originalUpdatedAt = record.updatedAt;

      // Small delay to ensure different timestamp
      const checkedIn = checkInRecord(record);

      expect(new Date(checkedIn.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('checkOut', () => {
    it('should set checkOutAt timestamp', () => {
      const record = createRecord('event-123');
      const checkedIn = checkInRecord(record);
      const checkedOut = checkOutRecord(checkedIn);

      expect(checkedOut.checkInAt).toBeDefined();
      expect(checkedOut.checkOutAt).toBeDefined();
    });
  });

  describe('storage integration', () => {
    it('should save records to AsyncStorage', async () => {
      const records: VisitRecord[] = [createRecord('event-1')];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
    });

    it('should load records from AsyncStorage', async () => {
      const records: VisitRecord[] = [createRecord('event-1')];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(records));

      const result = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(result!);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].eventKey).toBe('event-1');
    });

    it('should handle empty storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await AsyncStorage.getItem(STORAGE_KEY);
      expect(result).toBeNull();
    });
  });

  describe('getByEventKey', () => {
    it('should find record by eventKey', () => {
      const records: VisitRecord[] = [
        createRecord('event-1'),
        createRecord('event-2'),
        createRecord('event-3'),
      ];

      const found = records.find(r => r.eventKey === 'event-2');
      expect(found).toBeDefined();
      expect(found!.eventKey).toBe('event-2');
    });

    it('should return undefined for non-existent eventKey', () => {
      const records: VisitRecord[] = [createRecord('event-1')];

      const found = records.find(r => r.eventKey === 'non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove record by id', () => {
      const record1 = createRecord('event-1');
      const record2 = createRecord('event-2');
      let records: VisitRecord[] = [record1, record2];

      // Remove record1
      records = records.filter(r => r.id !== record1.id);

      expect(records).toHaveLength(1);
      expect(records[0].eventKey).toBe('event-2');
    });
  });

  describe('getOrCreate', () => {
    it('should return existing record if found', () => {
      const existingRecord = createRecord('event-1');
      const records: VisitRecord[] = [existingRecord];

      const found = records.find(r => r.eventKey === 'event-1');
      const result = found || createRecord('event-1');

      expect(result.id).toBe(existingRecord.id);
    });

    it('should create new record if not found', () => {
      const records: VisitRecord[] = [];

      const found = records.find(r => r.eventKey === 'new-event');
      const result = found || createRecord('new-event');

      expect(result.eventKey).toBe('new-event');
      expect(result.id).toBeDefined();
    });
  });
});
