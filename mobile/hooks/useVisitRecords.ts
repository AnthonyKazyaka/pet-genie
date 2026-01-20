import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storage.service';
import {
  VisitRecord,
  VisitStatus,
  CreateVisitRecordDto,
  UpdateVisitRecordDto,
} from '../models/visit-record.model';

const STORAGE_KEY = 'visit_records';

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hook for managing Visit Record data
 * Provides CRUD operations with AsyncStorage persistence
 */
export function useVisitRecords() {
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load visit records from storage
   */
  const loadVisitRecords = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await StorageService.get<VisitRecord[]>(STORAGE_KEY);
      setVisitRecords(stored || []);
      setError(null);
    } catch (err) {
      setError('Failed to load visit records');
      console.error('Error loading visit records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save visit records to storage
   */
  const saveVisitRecords = useCallback(async (data: VisitRecord[]) => {
    await StorageService.set(STORAGE_KEY, data);
    setVisitRecords(data);
  }, []);

  /**
   * Get visit record by ID
   */
  const getById = useCallback((id: string): VisitRecord | undefined => {
    return visitRecords.find(v => v.id === id);
  }, [visitRecords]);

  /**
   * Get visit record by event ID and calendar ID (unique key)
   */
  const getByEventKey = useCallback(
    (eventId: string, calendarId: string): VisitRecord | undefined => {
      return visitRecords.find(
        v => v.eventId === eventId && v.calendarId === calendarId
      );
    },
    [visitRecords]
  );

  /**
   * Create new visit record
   */
  const create = useCallback(
    async (dto: CreateVisitRecordDto): Promise<VisitRecord> => {
      const now = new Date().toISOString();
      const visitRecord: VisitRecord = {
        id: generateId(),
        status: dto.status || 'scheduled',
        ...dto,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [...visitRecords, visitRecord];
      await saveVisitRecords(updated);
      return visitRecord;
    },
    [visitRecords, saveVisitRecords]
  );

  /**
   * Update existing visit record
   */
  const update = useCallback(
    async (dto: UpdateVisitRecordDto): Promise<VisitRecord | null> => {
      const index = visitRecords.findIndex(v => v.id === dto.id);
      if (index === -1) return null;

      const updatedRecord: VisitRecord = {
        ...visitRecords[index],
        ...dto,
        updatedAt: new Date().toISOString(),
      };

      const updated = [...visitRecords];
      updated[index] = updatedRecord;
      await saveVisitRecords(updated);
      return updatedRecord;
    },
    [visitRecords, saveVisitRecords]
  );

  /**
   * Check in to a visit
   */
  const checkIn = useCallback(
    async (id: string): Promise<VisitRecord | null> => {
      return update({
        id,
        status: 'in-progress',
        checkInAt: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Check out from a visit
   */
  const checkOut = useCallback(
    async (id: string, notes?: string): Promise<VisitRecord | null> => {
      const current = visitRecords.find(v => v.id === id);
      return update({
        id,
        status: 'completed',
        checkOutAt: new Date().toISOString(),
        notes: notes || current?.notes,
      });
    },
    [update, visitRecords]
  );

  /**
   * Update notes for a visit
   */
  const updateNotes = useCallback(
    async (id: string, notes: string): Promise<VisitRecord | null> => {
      return update({ id, notes });
    },
    [update]
  );

  /**
   * Mark summary as sent
   */
  const markSummarySent = useCallback(
    async (id: string): Promise<VisitRecord | null> => {
      return update({
        id,
        lastSummarySentAt: new Date().toISOString(),
      });
    },
    [update]
  );

  /**
   * Delete visit record
   */
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const updated = visitRecords.filter(v => v.id !== id);
      await saveVisitRecords(updated);
      return true;
    },
    [visitRecords, saveVisitRecords]
  );

  /**
   * Get or create visit record for an event
   * This is idempotent - safe to call multiple times
   */
  const getOrCreate = useCallback(
    async (dto: CreateVisitRecordDto): Promise<VisitRecord> => {
      const existing = getByEventKey(dto.eventId, dto.calendarId);
      if (existing) return existing;
      return create(dto);
    },
    [getByEventKey, create]
  );

  // Load visit records on mount
  useEffect(() => {
    loadVisitRecords();
  }, [loadVisitRecords]);

  return {
    visitRecords,
    loading,
    error,
    getById,
    getByEventKey,
    create,
    update,
    checkIn,
    checkOut,
    updateNotes,
    markSummarySent,
    remove,
    getOrCreate,
    refresh: loadVisitRecords,
  };
}

export default useVisitRecords;
