import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage.service';
import { DemoDataService } from '../services/demo-data.service';
import { Client, CreateClientDto, UpdateClientDto } from '../models/client.model';
import { useSettings } from './useSettings';

const STORAGE_KEY = 'clients';

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hook for managing Client data
 * Provides CRUD operations with AsyncStorage persistence
 * Supports demo mode with mock data
 */
export function useClients() {
  const { settings } = useSettings();
  const isDemoMode = settings.demoMode;
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load clients from storage or demo data
   */
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isDemoMode) {
        // Use demo data
        setClients(DemoDataService.getClients());
      } else {
        // Use real storage
        const stored = await StorageService.get<Client[]>(STORAGE_KEY);
        setClients(stored || []);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load clients');
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  /**
   * Save clients to storage (disabled in demo mode)
   */
  const saveClients = useCallback(async (data: Client[]) => {
    if (isDemoMode) {
      // In demo mode, just update local state without persisting
      setClients(data);
      return;
    }
    await StorageService.set(STORAGE_KEY, data);
    setClients(data);
  }, [isDemoMode]);

  /**
   * Get client by ID
   */
  const getById = useCallback((id: string): Client | undefined => {
    return clients.find(c => c.id === id);
  }, [clients]);

  /**
   * Create new client
   */
  const create = useCallback(async (dto: CreateClientDto): Promise<Client> => {
    const now = new Date().toISOString();
    const client: Client = {
      id: generateId(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [...clients, client];
    await saveClients(updated);
    return client;
  }, [clients, saveClients]);

  /**
   * Update existing client
   */
  const update = useCallback(async (dto: UpdateClientDto): Promise<Client | null> => {
    const index = clients.findIndex(c => c.id === dto.id);
    if (index === -1) return null;

    const updatedClient: Client = {
      ...clients[index],
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    const updated = [...clients];
    updated[index] = updatedClient;
    await saveClients(updated);
    return updatedClient;
  }, [clients, saveClients]);

  /**
   * Delete client
   */
  const remove = useCallback(async (id: string): Promise<boolean> => {
    const updated = clients.filter(c => c.id !== id);
    await saveClients(updated);
    return true;
  }, [clients, saveClients]);

  /**
   * Search clients by name
   */
  const searchByName = useCallback((query: string): Client[] => {
    const lowerQuery = query.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(lowerQuery));
  }, [clients]);

  // Load clients on mount and when demo mode changes
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return {
    clients,
    loading,
    error,
    getById,
    create,
    update,
    remove,
    searchByName,
    refresh: loadClients,
  };
}

export default useClients;
