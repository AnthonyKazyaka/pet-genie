import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { ClientDataService, PetDataService } from '../../core/services';
import { Client, Pet, CreateClientDto, UpdateClientDto, CreatePetDto } from '../../models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatListModule,
  ],
  styleUrl: './client-detail.component.scss',
  templateUrl: './client-detail.component.html',
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientDataService);
  private petService = inject(PetDataService);
  private snackBar = inject(MatSnackBar);

  client = signal<Client | null>(null);
  pets = signal<Pet[]>([]);
  isLoading = signal(true);
  isEditing = signal(false);
  isNew = signal(false);

  // Form data
  formData = signal<CreateClientDto>({
    name: '',
    address: '',
    phone: '',
    email: '',
    notes: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
  });

  async ngOnInit() {
    const clientId = this.route.snapshot.paramMap.get('id');
    
    if (clientId === 'new') {
      this.isNew.set(true);
      this.isEditing.set(true);
      this.isLoading.set(false);
    } else if (clientId) {
      await this.loadClient(clientId);
    } else {
      this.router.navigate(['/clients']);
    }
  }

  async loadClient(clientId: string) {
    this.isLoading.set(true);
    
    try {
      const client = await firstValueFrom(this.clientService.getById(clientId));
      
      if (!client) {
        this.snackBar.open('Client not found', 'Close', { duration: 3000 });
        this.router.navigate(['/clients']);
        return;
      }

      this.client.set(client);
      this.formData.set({
        name: client.name,
        address: client.address,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
        emergencyContact: client.emergencyContact || {
          name: '',
          phone: '',
          relationship: '',
        },
      });

      // Load pets
      const pets = await firstValueFrom(this.petService.getByClientId(clientId));
      this.pets.set(pets);
    } catch (error) {
      console.error('Error loading client:', error);
      this.snackBar.open('Error loading client', 'Close', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveClient() {
    const data = this.formData();
    
    if (!data.name.trim()) {
      this.snackBar.open('Client name is required', 'Close', { duration: 3000 });
      return;
    }

    try {
      if (this.isNew()) {
        const newClient = await firstValueFrom(this.clientService.create(data));
        this.snackBar.open('Client created successfully', 'Close', { duration: 2000 });
        this.router.navigate(['/clients', newClient.id]);
      } else if (this.client()) {
        const updateDto: UpdateClientDto = {
          id: this.client()!.id,
          ...data,
        };
        await firstValueFrom(this.clientService.update(updateDto));
        await this.loadClient(this.client()!.id);
        this.isEditing.set(false);
        this.snackBar.open('Client updated successfully', 'Close', { duration: 2000 });
      }
    } catch (error) {
      console.error('Error saving client:', error);
      this.snackBar.open('Error saving client', 'Close', { duration: 3000 });
    }
  }

  cancelEdit() {
    if (this.isNew()) {
      this.router.navigate(['/clients']);
    } else {
      this.isEditing.set(false);
      const client = this.client();
      if (client) {
        this.formData.set({
          name: client.name,
          address: client.address,
          phone: client.phone,
          email: client.email,
          notes: client.notes,
          emergencyContact: client.emergencyContact || {
            name: '',
            phone: '',
            relationship: '',
          },
        });
      }
    }
  }

  async deletePet(pet: Pet) {
    if (!confirm(`Are you sure you want to delete ${pet.name}?`)) {
      return;
    }

    try {
      await firstValueFrom(this.petService.delete(pet.id));
      await this.loadClient(this.client()!.id);
      this.snackBar.open('Pet deleted', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error deleting pet:', error);
      this.snackBar.open('Error deleting pet', 'Close', { duration: 3000 });
    }
  }

  updateEmergencyContact(field: string, value: string) {
    const contact = this.formData().emergencyContact || { name: '', phone: '', relationship: '' };
    this.formData.set({
      ...this.formData(),
      emergencyContact: {
        ...contact,
        [field]: value,
      },
    });
  }
}
