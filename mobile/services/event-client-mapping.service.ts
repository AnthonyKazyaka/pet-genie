import { StorageService } from './storage.service';

const STORAGE_KEY = 'event_client_mappings';

/**
 * Mapping from event client name (from calendar) to actual Client ID
 */
export interface EventClientMapping {
  eventClientName: string;
  clientId: string;
  createdAt: string;
}

/**
 * Service for managing Event ↔ Client associations
 * Persists mapping for reuse so events can be automatically linked to clients
 */
export class EventClientMappingService {
  private static mappings: EventClientMapping[] = [];
  private static loaded = false;

  /**
   * Load mappings from storage
   */
  static async load(): Promise<EventClientMapping[]> {
    try {
      const stored = await StorageService.get<EventClientMapping[]>(STORAGE_KEY);
      this.mappings = stored || [];
      this.loaded = true;
      return this.mappings;
    } catch (error) {
      console.error('Error loading event-client mappings:', error);
      return [];
    }
  }

  /**
   * Get all mappings
   */
  static async getAll(): Promise<EventClientMapping[]> {
    if (!this.loaded) {
      await this.load();
    }
    return this.mappings;
  }

  /**
   * Get client ID for a given event client name
   */
  static async getClientId(eventClientName: string): Promise<string | null> {
    if (!this.loaded) {
      await this.load();
    }
    const normalized = eventClientName.toLowerCase().trim();
    const mapping = this.mappings.find(
      m => m.eventClientName.toLowerCase().trim() === normalized
    );
    return mapping?.clientId ?? null;
  }

  /**
   * Set mapping between event client name and actual client ID
   */
  static async setMapping(eventClientName: string, clientId: string): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }

    const normalized = eventClientName.toLowerCase().trim();
    const existingIndex = this.mappings.findIndex(
      m => m.eventClientName.toLowerCase().trim() === normalized
    );

    const mapping: EventClientMapping = {
      eventClientName,
      clientId,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.mappings[existingIndex] = mapping;
    } else {
      this.mappings.push(mapping);
    }

    await StorageService.set(STORAGE_KEY, this.mappings);
  }

  /**
   * Remove mapping by event client name
   */
  static async removeMapping(eventClientName: string): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }

    const normalized = eventClientName.toLowerCase().trim();
    this.mappings = this.mappings.filter(
      m => m.eventClientName.toLowerCase().trim() !== normalized
    );

    await StorageService.set(STORAGE_KEY, this.mappings);
  }

  /**
   * Remove all mappings for a specific client (useful when deleting a client)
   */
  static async removeMappingsForClient(clientId: string): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }

    this.mappings = this.mappings.filter(m => m.clientId !== clientId);
    await StorageService.set(STORAGE_KEY, this.mappings);
  }

  /**
   * Clear all mappings
   */
  static async clearAll(): Promise<void> {
    this.mappings = [];
    await StorageService.set(STORAGE_KEY, this.mappings);
  }
}
