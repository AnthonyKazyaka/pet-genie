import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import {
  VisitRecord,
  CreateVisitRecordDto,
  UpdateVisitRecordDto,
  VisitCheckInDto,
  VisitCheckOutDto,
  VisitStatus,
} from '../../models/visit-record.model';

/**
 * VisitRecordDataService
 * Manages CRUD operations for VisitRecord entities
 * Links calendar events to actual visit tracking
 * Currently uses localStorage via StorageService
 * Interface designed to swap to Amplify/backend later
 */
@Injectable({
  providedIn: 'root',
})
export class VisitRecordDataService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'visit_records';
  
  // Observable stream of all visit records for reactive UI
  private visitRecordsSubject = new BehaviorSubject<VisitRecord[]>([]);
  public visitRecords$ = this.visitRecordsSubject.asObservable();

  constructor() {
    this.loadVisitRecords();
  }

  /**
   * Get all visit records
   */
  getAll(): Observable<VisitRecord[]> {
    return of(this.visitRecordsSubject.value);
  }

  /**
   * Get visit record by ID
   */
  getById(id: string): Observable<VisitRecord | null> {
    const record = this.visitRecordsSubject.value.find((r) => r.id === id);
    return of(record || null);
  }

  /**
   * Get visit record by event ID and calendar ID (idempotent lookup)
   */
  getByEventId(eventId: string, calendarId: string): Observable<VisitRecord | null> {
    const record = this.visitRecordsSubject.value.find(
      (r) => r.eventId === eventId && r.calendarId === calendarId
    );
    return of(record || null);
  }

  /**
   * Get all visit records for a specific client
   */
  getByClientId(clientId: string): Observable<VisitRecord[]> {
    const records = this.visitRecordsSubject.value.filter((r) => r.clientId === clientId);
    return of(records);
  }

  /**
   * Get visit records by status
   */
  getByStatus(status: VisitStatus): Observable<VisitRecord[]> {
    const records = this.visitRecordsSubject.value.filter((r) => r.status === status);
    return of(records);
  }

  /**
   * Get visit records within a date range
   */
  getByDateRange(startDate: Date, endDate: Date): Observable<VisitRecord[]> {
    const records = this.visitRecordsSubject.value.filter((r) => {
      const createdAt = new Date(r.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });
    return of(records);
  }

  /**
   * Create new visit record
   */
  create(dto: CreateVisitRecordDto): Observable<VisitRecord> {
    const now = new Date();
    const record: VisitRecord = {
      id: this.generateId(),
      status: dto.status || 'scheduled',
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    const records = [...this.visitRecordsSubject.value, record];
    this.saveVisitRecords(records);
    return of(record);
  }

  /**
   * Update existing visit record
   */
  update(dto: UpdateVisitRecordDto): Observable<VisitRecord | null> {
    const records = this.visitRecordsSubject.value;
    const index = records.findIndex((r) => r.id === dto.id);
    
    if (index === -1) {
      return of(null);
    }

    const updated: VisitRecord = {
      ...records[index],
      ...dto,
      updatedAt: new Date(),
    };

    const newRecords = [...records];
    newRecords[index] = updated;
    this.saveVisitRecords(newRecords);
    return of(updated);
  }

  /**
   * Check in to a visit
   */
  checkIn(dto: VisitCheckInDto): Observable<VisitRecord | null> {
    return this.update({
      id: dto.id,
      status: 'in-progress',
      checkInAt: dto.checkInAt,
    });
  }

  /**
   * Check out from a visit
   */
  checkOut(dto: VisitCheckOutDto): Observable<VisitRecord | null> {
    return this.update({
      id: dto.id,
      status: 'completed',
      checkOutAt: dto.checkOutAt,
      notes: dto.notes,
    });
  }

  /**
   * Delete visit record
   */
  delete(id: string): Observable<boolean> {
    const records = this.visitRecordsSubject.value.filter((r) => r.id !== id);
    this.saveVisitRecords(records);
    return of(true);
  }

  /**
   * Link a client to a visit record by event ID
   * Idempotent: creates visit record if it doesn't exist
   */
  linkClient(eventId: string, calendarId: string, clientId: string): Observable<VisitRecord> {
    const existing = this.visitRecordsSubject.value.find(
      (r) => r.eventId === eventId && r.calendarId === calendarId
    );

    if (existing) {
      // Update existing record
      return this.update({
        id: existing.id,
        clientId,
      }) as Observable<VisitRecord>;
    } else {
      // Create new record with client linked
      return this.create({
        eventId,
        calendarId,
        clientId,
        status: 'scheduled',
      });
    }
  }

  /**
   * Unlink a client from a visit record
   */
  unlinkClient(eventId: string, calendarId: string): Observable<VisitRecord | null> {
    const existing = this.visitRecordsSubject.value.find(
      (r) => r.eventId === eventId && r.calendarId === calendarId
    );

    if (!existing) {
      return of(null);
    }

    return this.update({
      id: existing.id,
      clientId: undefined,
    });
  }

  /**
   * Load visit records from storage
   */
  private loadVisitRecords(): void {
    const records = this.storage.get<VisitRecord[]>(this.STORAGE_KEY) || [];
    // Convert date strings back to Date objects
    const parsedRecords = records.map(r => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      checkInAt: r.checkInAt ? new Date(r.checkInAt) : undefined,
      checkOutAt: r.checkOutAt ? new Date(r.checkOutAt) : undefined,
      lastSummarySentAt: r.lastSummarySentAt ? new Date(r.lastSummarySentAt) : undefined,
    }));
    this.visitRecordsSubject.next(parsedRecords);
  }

  /**
   * Save visit records to storage
   */
  private saveVisitRecords(records: VisitRecord[]): void {
    this.storage.set(this.STORAGE_KEY, records);
    this.visitRecordsSubject.next(records);
  }

  /**
   * Generate unique ID (simple timestamp-based for MVP)
   * TODO: Replace with UUID or backend-generated ID
   */
  private generateId(): string {
    return `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
