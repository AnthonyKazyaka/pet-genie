import { Injectable } from '@angular/core';
import { CalendarEvent } from '../../models/event.model';
import { VisitRecord } from '../../models/visit-record.model';
import { Client } from '../../models/client.model';
import { Pet } from '../../models/pet.model';

/**
 * Visit Summary Service
 * Generates plain-text visit summaries using a template-based approach
 * Similar to ExportTemplate patterns but focused on individual visit summaries
 */
@Injectable({
  providedIn: 'root'
})
export class VisitSummaryService {

  /**
   * Generate a plain-text visit summary
   * @param event - The calendar event associated with the visit
   * @param visitRecord - The visit record containing check-in/out and notes
   * @param client - The client being visited
   * @param pets - Array of pets involved in the visit
   * @returns Plain-text formatted summary
   */
  generateSummary(
    event: CalendarEvent,
    visitRecord: VisitRecord,
    client: Client,
    pets: Pet[]
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(event, client));
    sections.push('');

    // Visit Details
    sections.push(this.generateVisitDetails(event, visitRecord));
    sections.push('');

    // Pets
    if (pets.length > 0) {
      sections.push(this.generatePetsSection(pets));
      sections.push('');
    }

    // Visit Notes
    if (visitRecord.notes) {
      sections.push(this.generateNotesSection(visitRecord.notes));
      sections.push('');
    }

    // Footer
    sections.push(this.generateFooter(visitRecord));

    return sections.join('\n');
  }

  /**
   * Generate a concise one-line summary
   * @param event - The calendar event
   * @param client - The client
   * @param pets - Array of pets
   * @returns Short summary string
   */
  generateShortSummary(
    event: CalendarEvent,
    client: Client,
    pets: Pet[]
  ): string {
    const serviceType = event.serviceInfo?.type || 'visit';
    const petNames = pets.map(p => p.name).join(', ');
    const duration = this.calculateDuration(event.start, event.end);
    
    return `${serviceType} for ${client.name}${petNames ? ` (${petNames})` : ''} - ${duration}`;
  }

  /**
   * Generate summary template for email or messaging
   * @param event - The calendar event
   * @param visitRecord - The visit record
   * @param client - The client
   * @param pets - Array of pets
   * @returns HTML-formatted summary suitable for email
   */
  generateEmailSummary(
    event: CalendarEvent,
    visitRecord: VisitRecord,
    client: Client,
    pets: Pet[]
  ): string {
    const plainText = this.generateSummary(event, visitRecord, client, pets);
    // Convert plain text to basic HTML formatting
    return plainText
      .split('\n')
      .map(line => {
        if (line.startsWith('===')) {
          return '<hr>';
        } else if (line.startsWith('VISIT SUMMARY') || line.startsWith('PETS:') || line.startsWith('VISIT NOTES:')) {
          return `<h3>${line}</h3>`;
        } else if (line.trim() === '') {
          return '<br>';
        } else {
          return `<p>${line}</p>`;
        }
      })
      .join('\n');
  }

  private generateHeader(event: CalendarEvent, client: Client): string {
    const lines: string[] = [];
    lines.push('===================================');
    lines.push('VISIT SUMMARY');
    lines.push('===================================');
    lines.push(`Client: ${client.name}`);
    lines.push(`Service: ${this.formatServiceType(event.serviceInfo?.type || 'other')}`);
    return lines.join('\n');
  }

  private generateVisitDetails(event: CalendarEvent, visitRecord: VisitRecord): string {
    const lines: string[] = [];
    
    // Date and time
    lines.push(`Date: ${this.formatDate(event.start)}`);
    lines.push(`Scheduled: ${this.formatTime(event.start)} - ${this.formatTime(event.end)}`);
    
    // Actual check-in/out times if available
    if (visitRecord.checkInAt) {
      lines.push(`Check-in: ${this.formatTime(visitRecord.checkInAt)}`);
    }
    if (visitRecord.checkOutAt) {
      lines.push(`Check-out: ${this.formatTime(visitRecord.checkOutAt)}`);
    }
    
    // Duration
    const duration = this.calculateDuration(event.start, event.end);
    lines.push(`Duration: ${duration}`);
    
    // Location
    if (event.location) {
      lines.push(`Location: ${event.location}`);
    }
    
    // Status
    lines.push(`Status: ${this.formatStatus(visitRecord.status)}`);
    
    return lines.join('\n');
  }

  private generatePetsSection(pets: Pet[]): string {
    const lines: string[] = [];
    lines.push('PETS:');
    
    pets.forEach(pet => {
      const petInfo: string[] = [`  • ${pet.name}`];
      
      if (pet.species || pet.breed) {
        const details: string[] = [];
        if (pet.species) details.push(pet.species);
        if (pet.breed) details.push(pet.breed);
        petInfo.push(` (${details.join(', ')})`);
      }
      
      lines.push(petInfo.join(''));
      
      // Add special care notes if present
      if (pet.specialNeeds) {
        lines.push(`    Special needs: ${pet.specialNeeds}`);
      }
      if (pet.medications && pet.medications.length > 0) {
        lines.push(`    Medications: ${pet.medications.map(m => m.name).join(', ')}`);
      }
    });
    
    return lines.join('\n');
  }

  private generateNotesSection(notes: string): string {
    const lines: string[] = [];
    lines.push('VISIT NOTES:');
    
    // Split notes into lines and indent
    const noteLines = notes.split('\n');
    noteLines.forEach(line => {
      lines.push(`  ${line}`);
    });
    
    return lines.join('\n');
  }

  private generateFooter(visitRecord: VisitRecord): string {
    const lines: string[] = [];
    lines.push('===================================');
    lines.push(`Generated: ${this.formatDateTime(new Date())}`);
    
    if (visitRecord.lastSummarySentAt) {
      lines.push(`Last sent: ${this.formatDateTime(visitRecord.lastSummarySentAt)}`);
    }
    
    return lines.join('\n');
  }

  private formatServiceType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'drop-in': 'Drop-in Visit',
      'walk': 'Dog Walk',
      'overnight': 'Overnight Care',
      'housesit': 'House Sitting',
      'meet-greet': 'Meet & Greet',
      'nail-trim': 'Nail Trim',
      'other': 'Pet Care'
    };
    return typeMap[type] || type;
  }

  private formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'Scheduled',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private calculateDuration(start: Date, end: Date): string {
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return remainingMinutes > 0 
        ? `${hours}h ${remainingMinutes}m` 
        : `${hours}h`;
    }
    return `${minutes}m`;
  }
}
