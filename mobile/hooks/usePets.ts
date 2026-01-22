import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage.service';
import { DemoDataService } from '../services/demo-data.service';
import { Pet, CreatePetDto, UpdatePetDto } from '../models/pet.model';
import { useSettings } from './useSettings';

const STORAGE_KEY = 'pets';

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hook for managing Pet data
 * Provides CRUD operations with AsyncStorage persistence
 * Supports demo mode with mock data
 */
export function usePets() {
  const { settings } = useSettings();
  const isDemoMode = settings.demoMode;
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load pets from storage or demo data
   */
  const loadPets = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isDemoMode) {
        // Use demo data
        setPets(DemoDataService.getPets());
      } else {
        // Use real storage
        const stored = await StorageService.get<Pet[]>(STORAGE_KEY);
        setPets(stored || []);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load pets');
      console.error('Error loading pets:', err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  /**
   * Save pets to storage (disabled in demo mode)
   */
  const savePets = useCallback(async (data: Pet[]) => {
    if (isDemoMode) {
      // In demo mode, just update local state without persisting
      setPets(data);
      return;
    }
    await StorageService.set(STORAGE_KEY, data);
    setPets(data);
  }, [isDemoMode]);

  /**
   * Get pet by ID
   */
  const getById = useCallback((id: string): Pet | undefined => {
    return pets.find(p => p.id === id);
  }, [pets]);

  /**
   * Get pets by client ID
   */
  const getByClientId = useCallback((clientId: string): Pet[] => {
    return pets.filter(p => p.clientId === clientId);
  }, [pets]);

  /**
   * Create new pet
   */
  const create = useCallback(async (dto: CreatePetDto): Promise<Pet> => {
    const now = new Date().toISOString();
    const pet: Pet = {
      id: generateId(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [...pets, pet];
    await savePets(updated);
    return pet;
  }, [pets, savePets]);

  /**
   * Update existing pet
   */
  const update = useCallback(async (dto: UpdatePetDto): Promise<Pet | null> => {
    const index = pets.findIndex(p => p.id === dto.id);
    if (index === -1) return null;

    const updatedPet: Pet = {
      ...pets[index],
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    const updated = [...pets];
    updated[index] = updatedPet;
    await savePets(updated);
    return updatedPet;
  }, [pets, savePets]);

  /**
   * Delete pet
   */
  const remove = useCallback(async (id: string): Promise<boolean> => {
    const updated = pets.filter(p => p.id !== id);
    await savePets(updated);
    return true;
  }, [pets, savePets]);

  /**
   * Delete all pets for a client
   */
  const removeByClientId = useCallback(async (clientId: string): Promise<boolean> => {
    const updated = pets.filter(p => p.clientId !== clientId);
    await savePets(updated);
    return true;
  }, [pets, savePets]);

  // Load pets on mount and when demo mode changes
  useEffect(() => {
    loadPets();
  }, [loadPets]);

  return {
    pets,
    loading,
    error,
    getById,
    getByClientId,
    create,
    update,
    remove,
    removeByClientId,
    refresh: loadPets,
  };
}

export default usePets;
