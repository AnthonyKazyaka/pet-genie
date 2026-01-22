import { useState, useCallback } from 'react';
import {
  EventClientMappingService,
  EventClientMapping,
} from '../services/event-client-mapping.service';
import { DemoDataService } from '../services/demo-data.service';
import { useSettings } from './useSettings';

/**
 * Hook for managing event-to-client mappings
 * Allows linking calendar event client names to actual Client records
 * Supports demo mode with pre-configured mappings
 */
export function useEventClientMapping() {
  const { settings } = useSettings();
  const isDemoMode = settings.demoMode;
  
  const [mappings, setMappings] = useState<EventClientMapping[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Load all mappings (from demo data or storage)
   */
  const loadMappings = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        // Use demo mappings
        setMappings(DemoDataService.getEventClientMappings());
      } else {
        const data = await EventClientMappingService.getAll();
        setMappings(data);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  /**
   * Get client ID for a given event client name
   */
  const getClientId = useCallback(async (eventClientName: string): Promise<string | null> => {
    if (isDemoMode) {
      // Search demo mappings
      const demoMappings = DemoDataService.getEventClientMappings();
      const normalized = eventClientName.toLowerCase().trim();
      const mapping = demoMappings.find(
        m => m.eventClientName.toLowerCase().trim() === normalized
      );
      return mapping?.clientId ?? null;
    }
    return EventClientMappingService.getClientId(eventClientName);
  }, [isDemoMode]);

  /**
   * Create or update mapping between event client name and client ID
   * (in demo mode, just update local state without persisting)
   */
  const setMapping = useCallback(async (eventClientName: string, clientId: string) => {
    if (isDemoMode) {
      // In demo mode, just update local state
      const newMapping: EventClientMapping = {
        eventClientName,
        clientId,
        createdAt: new Date().toISOString(),
      };
      setMappings(prev => {
        const existing = prev.findIndex(
          m => m.eventClientName.toLowerCase().trim() === eventClientName.toLowerCase().trim()
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newMapping;
          return updated;
        }
        return [...prev, newMapping];
      });
      return;
    }
    await EventClientMappingService.setMapping(eventClientName, clientId);
    await loadMappings();
  }, [isDemoMode, loadMappings]);

  /**
   * Remove mapping by event client name
   */
  const removeMapping = useCallback(async (eventClientName: string) => {
    if (isDemoMode) {
      // In demo mode, just update local state
      setMappings(prev => prev.filter(
        m => m.eventClientName.toLowerCase().trim() !== eventClientName.toLowerCase().trim()
      ));
      return;
    }
    await EventClientMappingService.removeMapping(eventClientName);
    await loadMappings();
  }, [isDemoMode, loadMappings]);

  /**
   * Remove all mappings for a specific client
   */
  const removeMappingsForClient = useCallback(async (clientId: string) => {
    if (isDemoMode) {
      // In demo mode, just update local state
      setMappings(prev => prev.filter(m => m.clientId !== clientId));
      return;
    }
    await EventClientMappingService.removeMappingsForClient(clientId);
    await loadMappings();
  }, [isDemoMode, loadMappings]);

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
