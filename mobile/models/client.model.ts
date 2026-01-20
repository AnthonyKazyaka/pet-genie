/**
 * Client Model
 * Represents a pet sitting client with contact and location information
 */
export interface Client {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  emergencyContact?: EmergencyContact;
  notes?: string;
  createdAt: string; // ISO date string for JSON storage
  updatedAt: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface CreateClientDto {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  emergencyContact?: EmergencyContact;
  notes?: string;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {
  id: string;
}
