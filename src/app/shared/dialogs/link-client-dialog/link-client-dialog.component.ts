import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { Client, CreateClientDto } from '../../../models/client.model';

export interface LinkClientDialogData {
  clients: Client[];
  candidateName?: string;
  currentClientId?: string;
}

export interface LinkClientDialogResult {
  action: 'select' | 'create' | 'cancel';
  clientId?: string;
  newClient?: CreateClientDto;
}

@Component({
  selector: 'app-link-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatDividerModule,
    MatExpansionModule,
  ],
  templateUrl: './link-client-dialog.component.html',
  styleUrl: './link-client-dialog.component.scss',
})
export class LinkClientDialogComponent {
  private dialogRef = inject(MatDialogRef<LinkClientDialogComponent>);
  public data = inject<LinkClientDialogData>(MAT_DIALOG_DATA);

  searchQuery = signal('');
  showCreateForm = signal(false);
  selectedClientId = signal<string | null>(null);

  // New client form
  newClientName = signal('');
  newClientAddress = signal('');
  newClientPhone = signal('');
  newClientEmail = signal('');

  filteredClients = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.data.clients;

    return this.data.clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.address?.toLowerCase().includes(query)
    );
  });

  constructor() {
    // Pre-populate search if candidate name provided
    if (this.data.candidateName) {
      this.searchQuery.set(this.data.candidateName);
    }
    
    // Pre-select current client if editing
    if (this.data.currentClientId) {
      this.selectedClientId.set(this.data.currentClientId);
    }
  }

  selectClient(clientId: string) {
    this.selectedClientId.set(clientId);
  }

  confirmSelection() {
    const clientId = this.selectedClientId();
    if (!clientId) return;

    const result: LinkClientDialogResult = {
      action: 'select',
      clientId,
    };
    this.dialogRef.close(result);
  }

  toggleCreateForm() {
    this.showCreateForm.set(!this.showCreateForm());
    if (this.showCreateForm()) {
      // Pre-populate name from search query or candidate
      const name = this.searchQuery() || this.data.candidateName || '';
      this.newClientName.set(name);
    }
  }

  createAndLink() {
    const name = this.newClientName().trim();
    if (!name) return;

    const newClient: CreateClientDto = {
      name,
      address: this.newClientAddress().trim(),
      phone: this.newClientPhone().trim(),
      email: this.newClientEmail().trim(),
    };

    const result: LinkClientDialogResult = {
      action: 'create',
      newClient,
    };
    this.dialogRef.close(result);
  }

  cancel() {
    const result: LinkClientDialogResult = {
      action: 'cancel',
    };
    this.dialogRef.close(result);
  }
}
