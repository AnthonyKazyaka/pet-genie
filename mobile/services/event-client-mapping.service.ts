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

  /**
   * Auto-match an event title against a list of clients
   * Returns matches with confidence scores
   */
  static autoMatch(
    eventTitle: string,
    clients: Array<{ id: string; name: string; pets?: Array<{ name: string }> }>,
    threshold: number = 0.5
  ): AutoMatchResult[] {
    if (!eventTitle || !clients.length) return [];

    const normalizedTitle = eventTitle.toLowerCase().trim();
    const results: AutoMatchResult[] = [];

    for (const client of clients) {
      let score = 0;
      const reasons: string[] = [];

      // Check client name match
      const clientNameLower = client.name.toLowerCase();
      const clientNameScore = this.calculateSimilarity(normalizedTitle, clientNameLower);
      
      // Direct name match (highest confidence)
      if (normalizedTitle.includes(clientNameLower)) {
        score += 0.8;
        reasons.push('Client name found in title');
      } else if (clientNameLower.includes(normalizedTitle.split(' ')[0])) {
        score += 0.4;
        reasons.push('Partial client name match');
      } else if (clientNameScore > 0.6) {
        score += clientNameScore * 0.5;
        reasons.push('Similar to client name');
      }

      // Check pet names
      if (client.pets?.length) {
        for (const pet of client.pets) {
          const petNameLower = pet.name.toLowerCase();
          if (normalizedTitle.includes(petNameLower)) {
            score += 0.6;
            reasons.push(`Pet name "${pet.name}" found`);
            break; // Only count one pet match
          }
        }
      }

      // Check for common patterns like "ClientName - ServiceType"
      const dashPattern = normalizedTitle.split(' - ');
      if (dashPattern.length > 1) {
        const possibleClientName = dashPattern[0].trim();
        if (this.calculateSimilarity(possibleClientName, clientNameLower) > 0.8) {
          score += 0.3;
          reasons.push('Matches "Client - Service" pattern');
        }
      }

      // Normalize score to 0-1
      score = Math.min(score, 1);

      if (score >= threshold) {
        results.push({
          clientId: client.id,
          clientName: client.name,
          confidence: score,
          reasons,
        });
      }
    }

    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create matrix
    const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    
    // Initialize first column and row
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    
    // Fill matrix
    for (let j = 1; j <= n; j++) {
      for (let i = 1; i <= m; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // deletion
          d[i][j - 1] + 1,      // insertion
          d[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return d[m][n];
  }

  /**
   * Get suggestions for an event (combines existing mapping + auto-match)
   */
  static async getSuggestions(
    eventTitle: string,
    eventClientName: string | undefined,
    clients: Array<{ id: string; name: string; pets?: Array<{ name: string }> }>
  ): Promise<ClientSuggestion[]> {
    const suggestions: ClientSuggestion[] = [];

    // First, check if there's an existing mapping
    if (eventClientName) {
      const existingClientId = await this.getClientId(eventClientName);
      if (existingClientId) {
        const client = clients.find(c => c.id === existingClientId);
        if (client) {
          suggestions.push({
            clientId: client.id,
            clientName: client.name,
            confidence: 1.0,
            source: 'existing-mapping',
            reasons: ['Previously linked to this client'],
          });
        }
      }
    }

    // Then, run auto-matching
    const autoMatches = this.autoMatch(eventTitle, clients, 0.3);
    for (const match of autoMatches) {
      // Don't duplicate existing mapping
      if (!suggestions.find(s => s.clientId === match.clientId)) {
        suggestions.push({
          ...match,
          source: 'auto-match',
        });
      }
    }

    return suggestions;
  }
}

/**
 * Result from auto-matching
 */
export interface AutoMatchResult {
  clientId: string;
  clientName: string;
  confidence: number;
  reasons: string[];
}

/**
 * Client suggestion with source
 */
export interface ClientSuggestion extends AutoMatchResult {
  source: 'existing-mapping' | 'auto-match';
}
