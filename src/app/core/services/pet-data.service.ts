import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { Pet, CreatePetDto, UpdatePetDto } from '../../models/pet.model';

/**
 * PetDataService
 * Manages CRUD operations for Pet entities
 * Currently uses localStorage via StorageService
 * Interface designed to swap to Amplify/backend later
 */
@Injectable({
  providedIn: 'root',
})
export class PetDataService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'pets';
  
  // Observable stream of all pets for reactive UI
  private petsSubject = new BehaviorSubject<Pet[]>([]);
  public pets$ = this.petsSubject.asObservable();

  constructor() {
    this.loadPets();
  }

  /**
   * Get all pets
   */
  getAll(): Observable<Pet[]> {
    return of(this.petsSubject.value);
  }

  /**
   * Get pet by ID
   */
  getById(id: string): Observable<Pet | null> {
    const pet = this.petsSubject.value.find((p) => p.id === id);
    return of(pet || null);
  }

  /**
   * Get all pets for a specific client
   */
  getByClientId(clientId: string): Observable<Pet[]> {
    const pets = this.petsSubject.value.filter((p) => p.clientId === clientId);
    return of(pets);
  }

  /**
   * Create new pet
   */
  create(dto: CreatePetDto): Observable<Pet> {
    const now = new Date();
    const pet: Pet = {
      id: this.generateId(),
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    const pets = [...this.petsSubject.value, pet];
    this.savePets(pets);
    return of(pet);
  }

  /**
   * Update existing pet
   */
  update(dto: UpdatePetDto): Observable<Pet | null> {
    const pets = this.petsSubject.value;
    const index = pets.findIndex((p) => p.id === dto.id);
    
    if (index === -1) {
      return of(null);
    }

    const updated: Pet = {
      ...pets[index],
      ...dto,
      updatedAt: new Date(),
    };

    const newPets = [...pets];
    newPets[index] = updated;
    this.savePets(newPets);
    return of(updated);
  }

  /**
   * Delete pet
   */
  delete(id: string): Observable<boolean> {
    const pets = this.petsSubject.value.filter((p) => p.id !== id);
    this.savePets(pets);
    return of(true);
  }

  /**
   * Search pets by name
   */
  searchByName(query: string): Observable<Pet[]> {
    const lowerQuery = query.toLowerCase();
    const results = this.petsSubject.value.filter((p) =>
      p.name.toLowerCase().includes(lowerQuery)
    );
    return of(results);
  }

  /**
   * Load pets from storage
   */
  private loadPets(): void {
    const pets = this.storage.get<Pet[]>(this.STORAGE_KEY) || [];
    // Convert date strings back to Date objects
    const parsedPets = pets.map(p => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
    this.petsSubject.next(parsedPets);
  }

  /**
   * Save pets to storage
   */
  private savePets(pets: Pet[]): void {
    this.storage.set(this.STORAGE_KEY, pets);
    this.petsSubject.next(pets);
  }

  /**
   * Generate unique ID (simple timestamp-based for MVP)
   * TODO: Replace with UUID or backend-generated ID
   */
  private generateId(): string {
    return `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
