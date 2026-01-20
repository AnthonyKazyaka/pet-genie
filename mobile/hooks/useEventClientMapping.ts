import { useState, useCallback } from 'react';
import {
  EventClientMappingService,
  EventClientMapping,
} from '../services/event-client-mapping.service';

/**
 * Hook for managing event-to-client mappings
 * Allows linking calendar event client names to actual Client records
 */
export function useEventClientMapping() {
  const [mappings, setMappings] = useState<EventClientMapping[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Load all mappings
   */
  const loadMappings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await EventClientMappingService.getAll();
      setMappings(data);
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get client ID for a given event client name
   */
  const getClientId = useCallback(async (eventClientName: string): Promise<string | null> => {
    return EventClientMappingService.getClientId(eventClientName);
  }, []);

  /**
   * Create or update mapping between event client name and client ID
   */
  const setMapping = useCallback(async (eventClientName: string, clientId: string) => {
    await EventClientMappingService.setMapping(eventClientName, clientId);
    await loadMappings();
  }, [loadMappings]);

  /**
   * Remove mapping by event client name
   */
  const removeMapping = useCallback(async (eventClientName: string) => {
    await EventClientMappingService.removeMapping(eventClientName);
    await loadMappings();
  }, [loadMappings]);

  /**
   * Remove all mappings for a specific client
   */
  const removeMappingsForClient = useCallback(async (clientId: string) => {
    await EventClientMappingService.removeMappingsForClient(clientId);
    await loadMappings();
  }, [loadMappings]);

  return {
    mappings,
    loading,
    loadMappings,
    getClientId,
    setMapping,
    removeMapping,
    removeMappingsForClient,
  };
}
