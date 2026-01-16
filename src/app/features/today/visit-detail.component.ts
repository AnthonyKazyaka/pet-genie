import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  VisitRecordDataService,
  ClientDataService,
  PetDataService,
  GoogleCalendarService,
  VisitSummaryService,
} from '../../core/services';
import { VisitRecord, Client, Pet, CalendarEvent, VisitStatus } from '../../models';
import { format, formatDistance } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { LinkClientDialogComponent } from '../../shared/dialogs/link-client-dialog/link-client-dialog.component';
import { getClientCandidateFromEvent } from '../../core/utils/client-matching';

@Component({
  selector: 'app-visit-detail',
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
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  styleUrl: './visit-detail.component.scss',
  templateUrl: './visit-detail.component.html',
})
export class VisitDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private visitRecordService = inject(VisitRecordDataService);
  private clientService = inject(ClientDataService);
  private petService = inject(PetDataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private visitSummaryService = inject(VisitSummaryService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  visitRecord = signal<VisitRecord | null>(null);
  client = signal<Client | null>(null);
  pets = signal<Pet[]>([]);  // Currently assigned pets
  availablePets = signal<Pet[]>([]);  // All pets for linked client
  selectedPetIds = signal<Set<string>>(new Set());  // Checked pet IDs
  event = signal<CalendarEvent | null>(null);
  isLoading = signal(true);
  isEditingNotes = signal(false);
  isEditingPets = signal(false);
  notesText = signal('');

  async ngOnInit() {
    const visitId = this.route.snapshot.paramMap.get('id');
    if (!visitId) {
      this.router.navigate(['/today']);
      return;
    }

    await this.loadVisitDetails(visitId);
  }

  async loadVisitDetails(visitId: string) {
    this.isLoading.set(true);
    
    try {
      // Load visit record
      const visit = await firstValueFrom(this.visitRecordService.getById(visitId));
      
      if (!visit) {
        this.snackBar.open('Visit not found', 'Close', { duration: 3000 });
        this.router.navigate(['/today']);
        return;
      }

      this.visitRecord.set(visit);
      this.notesText.set(visit.notes || '');
      
      // Initialize selected pet IDs from visit record
      this.selectedPetIds.set(new Set(visit.petIds || []));

      // Load client if associated
      if (visit.clientId) {
        const client = await firstValueFrom(this.clientService.getById(visit.clientId));
        this.client.set(client);
        
        // Load all pets for this client (for selection)
        if (client) {
          const clientPets = await firstValueFrom(this.petService.getByClientId(client.id));
          this.availablePets.set(clientPets);
        }
      }

      // Load assigned pets
      if (visit.petIds && visit.petIds.length > 0) {
        const petsPromises = visit.petIds.map(petId =>
          firstValueFrom(this.petService.getById(petId))
        );
        const loadedPets = await Promise.all(petsPromises);
        this.pets.set(loadedPets.filter(p => p !== null) as Pet[]);
      }

      // Load calendar event details if available
      if (visit.eventId && visit.calendarId) {
        try {
          const calendarEvent = await firstValueFrom(
            this.googleCalendarService.getEventById(visit.calendarId, visit.eventId)
          );
          if (calendarEvent) {
            this.event.set(calendarEvent);
          }
        } catch (error) {
          console.warn('Could not load calendar event:', error);
        }
      }
    } catch (error) {
      console.error('Error loading visit details:', error);
      this.snackBar.open('Error loading visit details', 'Close', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async checkIn() {
    const visit = this.visitRecord();
    if (!visit) return;

    try {
      await firstValueFrom(
        this.visitRecordService.checkIn({
          id: visit.id,
          checkInAt: new Date(),
        })
      );

      await this.loadVisitDetails(visit.id);
      this.snackBar.open('Checked in successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error checking in:', error);
      this.snackBar.open('Error checking in', 'Close', { duration: 3000 });
    }
  }

  async checkOut() {
    const visit = this.visitRecord();
    if (!visit) return;

    try {
      await firstValueFrom(
        this.visitRecordService.checkOut({
          id: visit.id,
          checkOutAt: new Date(),
          notes: this.notesText(),
        })
      );

      await this.loadVisitDetails(visit.id);
      this.snackBar.open('Visit completed successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error checking out:', error);
      this.snackBar.open('Error completing visit', 'Close', { duration: 3000 });
    }
  }

  async saveNotes() {
    const visit = this.visitRecord();
    if (!visit) return;

    try {
      await firstValueFrom(
        this.visitRecordService.update({
          id: visit.id,
          notes: this.notesText(),
        })
      );

      await this.loadVisitDetails(visit.id);
      this.isEditingNotes.set(false);
      this.snackBar.open('Notes saved', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error saving notes:', error);
      this.snackBar.open('Error saving notes', 'Close', { duration: 3000 });
    }
  }

  cancelEditNotes() {
    const visit = this.visitRecord();
    this.notesText.set(visit?.notes || '');
    this.isEditingNotes.set(false);
  }

  getStatusColor(status: VisitStatus): string {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'in-progress':
        return 'accent';
      case 'completed':
        return 'warn';
      default:
        return '';
    }
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  }

  formatTime(date: Date | undefined): string {
    if (!date) return 'N/A';
    return format(new Date(date), 'h:mm a');
  }

  formatDuration(start: Date | undefined, end: Date | undefined): string {
    if (!start || !end) return 'N/A';
    return formatDistance(new Date(start), new Date(end));
  }

  async generateAndCopySummary() {
    const visit = this.visitRecord();
    const clientData = this.client();
    const petsData = this.pets();

    if (!visit || !clientData) {
      this.snackBar.open('Missing required data for summary', 'Close', { duration: 3000 });
      return;
    }

    try {
      // Use actual event if loaded, otherwise create a fallback
      let eventData = this.event();
      if (!eventData) {
        // Fallback mock event if actual event couldn't be loaded
        eventData = {
          id: visit.eventId,
          calendarId: visit.calendarId,
          title: clientData.name,
          start: visit.createdAt,
          end: visit.checkOutAt || visit.createdAt,
          location: clientData.address,
          allDay: false,
          status: 'confirmed',
        };
      }

      const summary = this.visitSummaryService.generateSummary(
        eventData,
        visit,
        clientData,
        petsData
      );

      // Copy to clipboard
      await navigator.clipboard.writeText(summary);

      // Update lastSummarySentAt
      await firstValueFrom(
        this.visitRecordService.update({
          id: visit.id,
          lastSummarySentAt: new Date(),
        })
      );

      await this.loadVisitDetails(visit.id);
      this.snackBar.open('Summary copied to clipboard!', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating summary:', error);
      this.snackBar.open('Error generating summary', 'Close', { duration: 3000 });
    }
  }

  async linkClient() {
    const visit = this.visitRecord();
    const event = this.event();
    
    if (!visit) return;

    // Get candidate name from event or use empty string
    const candidateName = event ? getClientCandidateFromEvent(event) || '' : '';

    try {
      const allClients = await firstValueFrom(this.clientService.getAll());
      const result = await this.showLinkClientDialog(
        allClients,
        candidateName,
        visit.clientId
      );

      if (result.action === 'select' && result.clientId) {
        // Link to existing client
        await firstValueFrom(
          this.visitRecordService.linkClient(visit.eventId, visit.calendarId, result.clientId)
        );
        this.snackBar.open('Client linked successfully', 'Close', { duration: 2000 });
        await this.loadVisitDetails(visit.id);
      } else if (result.action === 'create' && result.newClient) {
        // Create new client and link
        const newClient = await firstValueFrom(
          this.clientService.create(result.newClient)
        );
        await firstValueFrom(
          this.visitRecordService.linkClient(visit.eventId, visit.calendarId, newClient.id)
        );
        this.snackBar.open(`Created and linked client: ${newClient.name}`, 'Close', { duration: 2000 });
        await this.loadVisitDetails(visit.id);
      }
    } catch (error) {
      console.error('Error linking client:', error);
      this.snackBar.open('Error linking client', 'Close', { duration: 3000 });
    }
  }

  private async showLinkClientDialog(
    clients: Client[],
    candidateName: string,
    currentClientId?: string
  ) {
    const dialogRef = this.dialog.open(LinkClientDialogComponent, {
      width: '500px',
      data: {
        clients,
        candidateName,
        currentClientId,
      },
    });

    return firstValueFrom(dialogRef.afterClosed());
  }

  /**
   * Toggle a pet's selection for this visit
   */
  togglePetSelection(petId: string) {
    const current = new Set(this.selectedPetIds());
    if (current.has(petId)) {
      current.delete(petId);
    } else {
      current.add(petId);
    }
    this.selectedPetIds.set(current);
  }

  /**
   * Check if a pet is currently selected
   */
  isPetSelected(petId: string): boolean {
    return this.selectedPetIds().has(petId);
  }

  /**
   * Save the pet selection to the visit record
   */
  async savePetSelection() {
    const visit = this.visitRecord();
    if (!visit) return;

    try {
      const petIds = Array.from(this.selectedPetIds());
      
      await firstValueFrom(
        this.visitRecordService.update({
          id: visit.id,
          petIds,
        })
      );

      await this.loadVisitDetails(visit.id);
      this.isEditingPets.set(false);
      this.snackBar.open('Pets updated', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error saving pet selection:', error);
      this.snackBar.open('Error saving pets', 'Close', { duration: 3000 });
    }
  }

  /**
   * Cancel pet editing and revert selection
   */
  cancelPetEditing() {
    const visit = this.visitRecord();
    this.selectedPetIds.set(new Set(visit?.petIds || []));
    this.isEditingPets.set(false);
  }
}
