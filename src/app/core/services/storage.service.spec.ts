import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  const PREFIX = 'petgenie_';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('get/set', () => {
    it('should store and retrieve a string', () => {
      service.set('test', 'hello');
      expect(service.get<string>('test')).toBe('hello');
    });

    it('should store and retrieve an object', () => {
      const obj = { name: 'Test', value: 123 };
      service.set('testObj', obj);
      expect(service.get<typeof obj>('testObj')).toEqual(obj);
    });

    it('should store and retrieve an array', () => {
      const arr = [1, 2, 3, 'four'];
      service.set('testArr', arr);
      expect(service.get<typeof arr>('testArr')).toEqual(arr);
    });

    it('should return null for non-existent key', () => {
      expect(service.get('nonexistent')).toBeNull();
    });

    it('should use prefix for keys', () => {
      service.set('prefixTest', 'value');
      expect(localStorage.getItem(PREFIX + 'prefixTest')).toBe('"value"');
    });
  });

  describe('remove', () => {
    it('should remove a stored item', () => {
      service.set('toRemove', 'value');
      service.remove('toRemove');
      expect(service.get('toRemove')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all prefixed items', () => {
      service.set('item1', 'value1');
      service.set('item2', 'value2');
      localStorage.setItem('other_item', 'should remain');

      service.clear();

      expect(service.get('item1')).toBeNull();
      expect(service.get('item2')).toBeNull();
      expect(localStorage.getItem('other_item')).toBe('should remain');
    });
  });

  describe('cached operations', () => {
    it('should store and retrieve cached data', () => {
      const data = { name: 'cached' };
      service.setCached('cachedItem', data, 15);

      expect(service.getCached<typeof data>('cachedItem')).toEqual(data);
    });

    it('should return null for expired cache', (done) => {
      const data = { name: 'expiring' };
      // Set cache with very short expiry (0.001 minutes = 60ms)
      service.setCached('expiringItem', data, 0.001);

      // Wait for expiry
      setTimeout(() => {
        expect(service.getCached('expiringItem')).toBeNull();
        done();
      }, 100);
    });

    it('should check cache validity', () => {
      service.setCached('validCache', { data: true }, 15);
      expect(service.isCacheValid('validCache')).toBe(true);
      expect(service.isCacheValid('nonexistent')).toBe(false);
    });

    it('should get cache timestamp', () => {
      const before = Date.now();
      service.setCached('timestampTest', {}, 15);
      const after = Date.now();

      const timestamp = service.getCacheTimestamp('timestampTest');
      expect(timestamp).not.toBeNull();
      expect(timestamp!.getTime()).toBeGreaterThanOrEqual(before);
      expect(timestamp!.getTime()).toBeLessThanOrEqual(after);
    });

    it('should return null timestamp for non-existent cache', () => {
      expect(service.getCacheTimestamp('nonexistent')).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem(PREFIX + 'invalidJson', 'not valid json{');
      expect(service.get('invalidJson')).toBeNull();
      expect(localStorage.getItem(PREFIX + 'invalidJson')).toBeNull();
    });
  });
});
