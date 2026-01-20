/**
 * Pet Model
 * Represents a pet belonging to a client with care instructions
 */
export interface Pet {
  id: string;
  clientId: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  careNotes?: string;
  medications?: Medication[];
  vetInfo?: VetInfo;
  feedingInstructions?: string;
  specialNeeds?: string;
  createdAt: string; // ISO date string for JSON storage
  updatedAt: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

export interface VetInfo {
  clinicName: string;
  phone: string;
  address?: string;
  emergencyPhone?: string;
}

export interface CreatePetDto {
  clientId: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  careNotes?: string;
  medications?: Medication[];
  vetInfo?: VetInfo;
  feedingInstructions?: string;
  specialNeeds?: string;
}

export interface UpdatePetDto extends Partial<Omit<CreatePetDto, 'clientId'>> {
  id: string;
}
