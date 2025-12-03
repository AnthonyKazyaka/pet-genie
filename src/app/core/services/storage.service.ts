import { Injectable } from '@angular/core';
import { CacheEntry, isCacheValid } from '../../models';

/**
 * StorageService
 * Wrapper for localStorage with typed access and cache management
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly PREFIX = 'petgenie_';

  /**
   * Get item from localStorage with optional type
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      // Invalid JSON or access issue: remove corrupted entry to avoid repeated errors
      this.remove(key);
      return null;
    }
  }

  /**
   * Set item in localStorage
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage: ${key}`, error);
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  /**
   * Clear all pet-genie items from localStorage
   */
  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Get cached item with expiry check
   */
  getCached<T>(key: string): T | null {
    const entry = this.get<CacheEntry<T>>(key);
    if (isCacheValid(entry)) {
      return entry!.data;
    }
    // Remove expired cache
    if (entry) {
      this.remove(key);
    }
    return null;
  }

  /**
   * Set cached item with expiry
   */
  setCached<T>(key: string, data: T, expiryMinutes: number = 15): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiryMs: expiryMinutes * 60 * 1000,
    };
    this.set(key, entry);
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(key: string): boolean {
    const entry = this.get<CacheEntry<unknown>>(key);
    return isCacheValid(entry);
  }

  /**
   * Get cache timestamp
   */
  getCacheTimestamp(key: string): Date | null {
    const entry = this.get<CacheEntry<unknown>>(key);
    if (entry) {
      return new Date(entry.timestamp);
    }
    return null;
  }
}
