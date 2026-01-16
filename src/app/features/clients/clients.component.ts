import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ClientDataService, PetDataService } from '../../core/services';
import { Client, Pet } from '../../models';
import { SkeletonLoaderComponent, EmptyStateComponent } from '../../shared';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-clients',
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
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  styleUrl: './clients.component.scss',
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit {
  private clientService = inject(ClientDataService);
  private petService = inject(PetDataService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  clients = signal<Client[]>([]);
  clientPetMap = signal<Map<string, Pet[]>>(new Map());
  isLoading = signal(true);
  searchQuery = signal('');

  displayedColumns = ['name', 'address', 'phone', 'pets', 'actions'];

  async ngOnInit() {
    await this.loadClients();
  }

  async loadClients() {
    this.isLoading.set(true);
    
    try {
      const clients = await firstValueFrom(this.clientService.getAll());
      this.clients.set(clients);

      // Load pets for each client
      const petMap = new Map<string, Pet[]>();
      for (const client of clients) {
        const pets = await firstValueFrom(this.petService.getByClientId(client.id));
        petMap.set(client.id, pets);
      }
      this.clientPetMap.set(petMap);
    } catch (error) {
      console.error('Error loading clients:', error);
      this.snackBar.open('Error loading clients', 'Close', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  filteredClients() {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.clients();

    return this.clients().filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.address?.toLowerCase().includes(query)
    );
  }

  getPetsForClient(clientId: string): Pet[] {
    return this.clientPetMap().get(clientId) || [];
  }

  async deleteClient(client: Client) {
    if (!confirm(`Are you sure you want to delete ${client.name}?`)) {
      return;
    }

    try {
      await firstValueFrom(this.clientService.delete(client.id));
      await this.loadClients();
      this.snackBar.open('Client deleted', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error deleting client:', error);
      this.snackBar.open('Error deleting client', 'Close', { duration: 3000 });
    }
  }
}
