import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoogleCalendarService, EventProcessorService, VisitRecordDataService, DataService, ClientDataService, PetDataService } from '../../core/services';
import { CalendarEvent, VisitRecord, VisitStatus, Client } from '../../models';
import { SkeletonLoaderComponent, EmptyStateComponent } from '../../shared';
import { LinkClientDialogComponent, LinkClientDialogResult } from '../../shared/dialogs/link-client-dialog/link-client-dialog.component';
import { getConfidentClientMatch, getClientCandidateFromEvent } from '../../core/utils/client-matching';
import { format, startOfDay, endOfDay } from 'date-fns';
import { firstValueFrom } from 'rxjs';

interface TodayVisit {
  event: CalendarEvent;
  visitRecord: VisitRecord | null;
  displayStatus: VisitStatus;
  clientName: string;
  serviceType: string;
  linkedClient?: Client | null; // Actual client object if linked
  petNames: string[]; // Names of assigned pets
}

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSnackBarModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  styleUrl: './today.component.scss',
  templateUrl: './today.component.html',
})
export class TodayComponent implements OnInit, OnDestroy {
  private googleCalendarService = inject(GoogleCalendarService);
  private eventProcessor = inject(EventProcessorService);
  private visitRecordService = inject(VisitRecordDataService);
  private dataService = inject(DataService);
  private clientService = inject(ClientDataService);
  private petService = inject(PetDataService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  visits = signal<TodayVisit[]>([]);
  isConnected = signal(false);
  
  private refreshListener: (() => void) | null = null;

  async ngOnInit() {
    this.isConnected.set(this.googleCalendarService.isSignedIn());
    
    if (this.isConnected()) {
      await this.loadTodayVisits();
    }

    // Listen for calendar refresh events
    this.refreshListener = () => this.loadTodayVisits();
    window.addEventListener('calendar-refresh', this.refreshListener);
  }

  ngOnDestroy() {
    if (this.refreshListener) {
      window.removeEventListener('calendar-refresh', this.refreshListener);
    }
  }

  /**
   * Load today's events and map to visits
   */
  async loadTodayVisits() {
    this.isLoading.set(true);
    
    try {
      const today = new Date();
      const dateRange = {
        start: startOfDay(today),
        end: endOfDay(today),
      };

      const settings = this.dataService.settings();
      
      // Fetch events from calendar
      const events = await firstValueFrom(
        this.googleCalendarService.fetchEventsFromCalendars(settings.selectedCalendars, dateRange)
      );

      // Process events
      const processedEvents = this.eventProcessor.processEvents(events ?? []);

      // Sort by start time
      processedEvents.sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      // Map to TodayVisit with visit records
      const visits = await Promise.all(
        processedEvents.map(async (event) => {
          const visitRecord = await firstValueFrom(
            this.visitRecordService.getByEventId(event.id, event.calendarId)
          );

          // Load linked client if available
          let linkedClient: Client | null = null;
          if (visitRecord?.clientId) {
            linkedClient = await firstValueFrom(
              this.clientService.getById(visitRecord.clientId)
            );
          }

          // Load pet names for assigned pets
          let petNames: string[] = [];
          if (visitRecord?.petIds && visitRecord.petIds.length > 0) {
            const allPets = await firstValueFrom(this.petService.getAll());
            petNames = visitRecord.petIds
              .map(id => allPets.find(p => p.id === id)?.name)
              .filter((name): name is string => !!name);
          }

          return {
            event,
            visitRecord,
            displayStatus: visitRecord?.status || 'scheduled',
            clientName: linkedClient?.name || this.extractClientName(event.title || 'Unknown Client'),
            serviceType: this.extractServiceType(event.title || ''),
            linkedClient,
            petNames,
          };
        })
      );

      this.visits.set(visits);
    } catch (error) {
      console.error('Error loading today\'s visits:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Extract client name from event summary
   * Format expected: "Client Name - Service Type" or just "Client Name"
   */
  private extractClientName(summary: string): string {
    const parts = summary.split(' - ');
    return parts[0].trim();
  }

  /**
   * Extract service type from event summary
   */
  private extractServiceType(summary: string): string {
    const parts = summary.split(' - ');
    return parts.length > 1 ? parts[1].trim() : 'Visit';
  }

  /**
   * Create a visit record for an event with auto-linking
   */
  async createVisit(visit: TodayVisit) {
    try {
      // Get all clients for matching
      const clients = await firstValueFrom(this.clientService.getAll());
      
      // Try to find a confident match
      const confidentClientId = getConfidentClientMatch(clients, visit.event);
      
      if (confidentClientId) {
        // Auto-link: exactly one match found
        await firstValueFrom(
          this.visitRecordService.linkClient(
            visit.event.id,
            visit.event.calendarId,
            confidentClientId
          )
        );
        this.snackBar.open('Visit created and client linked', 'Close', { duration: 2000 });
      } else {
        // Ambiguous or no match: show dialog
        const candidate = getClientCandidateFromEvent(visit.event);
        await this.showLinkClientDialog(visit.event, clients, candidate || undefined);
      }

      // Reload visits to reflect changes
      await this.loadTodayVisits();
    } catch (error) {
      console.error('Error creating visit:', error);
      this.snackBar.open('Error creating visit', 'Close', { duration: 3000 });
    }
  }

  /**
   * Link a client to an existing visit
   */
  async linkClient(visit: TodayVisit) {
    try {
      const clients = await firstValueFrom(this.clientService.getAll());
      const candidate = getClientCandidateFromEvent(visit.event);
      const currentClientId = visit.visitRecord?.clientId;
      
      await this.showLinkClientDialog(visit.event, clients, candidate || undefined, currentClientId);
      await this.loadTodayVisits();
    } catch (error) {
      console.error('Error linking client:', error);
      this.snackBar.open('Error linking client', 'Close', { duration: 3000 });
    }
  }

  /**
   * Show dialog to link client (select existing or create new)
   */
  private async showLinkClientDialog(
    event: CalendarEvent,
    clients: Client[],
    candidateName?: string,
    currentClientId?: string
  ): Promise<void> {
    const dialogRef = this.dialog.open(LinkClientDialogComponent, {
      width: '600px',
      data: { clients, candidateName, currentClientId },
    });

    const result: LinkClientDialogResult | undefined = await firstValueFrom(dialogRef.afterClosed());
    
    if (!result || result.action === 'cancel') {
      return;
    }

    if (result.action === 'select' && result.clientId) {
      // Link existing client
      await firstValueFrom(
        this.visitRecordService.linkClient(event.id, event.calendarId, result.clientId)
      );
      this.snackBar.open('Client linked', 'Close', { duration: 2000 });
    } else if (result.action === 'create' && result.newClient) {
      // Create new client and link
      const newClient = await firstValueFrom(
        this.clientService.create(result.newClient)
      );
      await firstValueFrom(
        this.visitRecordService.linkClient(event.id, event.calendarId, newClient.id)
      );
      this.snackBar.open('Client created and linked', 'Close', { duration: 2000 });
    }
  }

  /**
   * Check in to a visit
   */
  async checkIn(visit: TodayVisit) {
    if (!visit.visitRecord) return;

    try {
      await firstValueFrom(
        this.visitRecordService.checkIn({
          id: visit.visitRecord.id,
          checkInAt: new Date(),
        })
      );

      await this.loadTodayVisits();
    } catch (error) {
      console.error('Error checking in:', error);
    }
  }

  /**
   * Check out from a visit
   */
  async checkOut(visit: TodayVisit) {
    if (!visit.visitRecord) return;

    try {
      await firstValueFrom(
        this.visitRecordService.checkOut({
          id: visit.visitRecord.id,
          checkOutAt: new Date(),
        })
      );

      await this.loadTodayVisits();
    } catch (error) {
      console.error('Error checking out:', error);
    }
  }

  /**
   * Get status color for badges
   */
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

  /**
   * Format time for display
   */
  formatTime(date: string | Date): string {
    return format(new Date(date), 'h:mm a');
  }

  /**
   * Connect to Google Calendar
   */
  async connectCalendar() {
    try {
      await this.googleCalendarService.signIn();
      this.isConnected.set(true);
      await this.loadTodayVisits();
    } catch (error) {
      console.error('Error connecting to calendar:', error);
    }
  }
}
