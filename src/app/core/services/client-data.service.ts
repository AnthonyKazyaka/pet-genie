import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { Client, CreateClientDto, UpdateClientDto } from '../../models/client.model';

/**
 * ClientDataService
 * Manages CRUD operations for Client entities
 * Currently uses localStorage via StorageService
 * Interface designed to swap to Amplify/backend later
 */
@Injectable({
  providedIn: 'root',
})
export class ClientDataService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'clients';
  
  // Observable stream of all clients for reactive UI
  private clientsSubject = new BehaviorSubject<Client[]>([]);
  public clients$ = this.clientsSubject.asObservable();

  constructor() {
    this.loadClients();
  }

  /**
   * Get all clients
   */
  getAll(): Observable<Client[]> {
    return of(this.clientsSubject.value);
  }

  /**
   * Get client by ID
   */
  getById(id: string): Observable<Client | null> {
    const client = this.clientsSubject.value.find((c) => c.id === id);
    return of(client || null);
  }

  /**
   * Create new client
   */
  create(dto: CreateClientDto): Observable<Client> {
    const now = new Date();
    const client: Client = {
      id: this.generateId(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    const clients = [...this.clientsSubject.value, client];
    this.saveClients(clients);
    return of(client);
  }

  /**
   * Update existing client
   */
  update(dto: UpdateClientDto): Observable<Client | null> {
    const clients = this.clientsSubject.value;
    const index = clients.findIndex((c) => c.id === dto.id);
    
    if (index === -1) {
      return of(null);
    }

    const updated: Client = {
      ...clients[index],
      ...dto,
      updatedAt: new Date(),
    };

    const newClients = [...clients];
    newClients[index] = updated;
    this.saveClients(newClients);
    return of(updated);
  }

  /**
   * Delete client
   */
  delete(id: string): Observable<boolean> {
    const clients = this.clientsSubject.value.filter((c) => c.id !== id);
    this.saveClients(clients);
    return of(true);
  }

  /**
   * Search clients by name
   */
  searchByName(query: string): Observable<Client[]> {
    const lowerQuery = query.toLowerCase();
    const results = this.clientsSubject.value.filter((c) =>
      c.name.toLowerCase().includes(lowerQuery)
    );
    return of(results);
  }

  /**
   * Load clients from storage
   */
  private loadClients(): void {
    const clients = this.storage.get<Client[]>(this.STORAGE_KEY) || [];
    // Convert date strings back to Date objects
    const parsedClients = clients.map(c => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
    this.clientsSubject.next(parsedClients);
  }

  /**
   * Save clients to storage
   */
  private saveClients(clients: Client[]): void {
    this.storage.set(this.STORAGE_KEY, clients);
    this.clientsSubject.next(clients);
  }

  /**
   * Generate unique ID (simple timestamp-based for MVP)
   * TODO: Replace with UUID or backend-generated ID
   */
  private generateId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
