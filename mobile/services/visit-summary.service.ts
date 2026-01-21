import { CalendarEvent } from '../models/event.model';
import { VisitRecord } from '../models/visit-record.model';
import { Client } from '../models/client.model';
import { Pet } from '../models/pet.model';
import { AppSettings, DEFAULT_SETTINGS } from '../models/settings.model';

/**
 * Options for summary generation
 */
export interface SummaryOptions {
  includeTimestamps: boolean;
  includeDuration: boolean;
  includePetDetails: boolean;
  includeLocation: boolean;
  includeNotes: boolean;
}

/**
 * Visit Summary Service
 * Generates plain-text visit summaries using a template-based approach
 */
export class VisitSummaryService {
  /**
   * Get default options from app settings
   */
  static getOptionsFromSettings(settings: AppSettings): SummaryOptions {
    return {
      includeTimestamps: settings.includeTimestampsInSummary,
      includeDuration: settings.includeDurationInSummary,
      includePetDetails: settings.includePetDetailsInSummary,
      includeLocation: true,
      includeNotes: true,
    };
  }

  /**
   * Generate a full plain-text visit summary
   */
  static generateSummary(
    event: CalendarEvent,
    visitRecord: VisitRecord,
    client: Client | null,
    pets: Pet[],
    options: SummaryOptions = {
      includeTimestamps: true,
      includeDuration: true,
      includePetDetails: true,
      includeLocation: true,
      includeNotes: true,
    }
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(event, client));
    sections.push('');

    // Visit Details
    sections.push(this.generateVisitDetails(event, visitRecord, options));
    sections.push('');

    // Pets
    if (options.includePetDetails && (pets.length > 0 || event.serviceInfo?.petName)) {
      sections.push(this.generatePetsSection(pets, event.serviceInfo?.petName));
      sections.push('');
    }

    // Visit Notes
    if (options.includeNotes && visitRecord.notes) {
      sections.push(this.generateNotesSection(visitRecord.notes));
      sections.push('');
    }

    // Footer
    sections.push(this.generateFooter(visitRecord));

    return sections.join('\n');
  }

  /**
   * Generate a concise one-line summary
   */
  static generateShortSummary(
    event: CalendarEvent,
    client: Client | null,
    pets: Pet[]
  ): string {
    const serviceType = this.formatServiceType(event.serviceInfo?.type || 'visit');
    const clientName = client?.name || event.clientName || 'Unknown';
    const petNames = pets.length > 0 
      ? pets.map(p => p.name).join(', ')
      : event.serviceInfo?.petName;
    const duration = this.calculateDuration(event.start, event.end);
    
    return `${serviceType} for ${clientName}${petNames ? ` (${petNames})` : ''} - ${duration}`;
  }

  /**
   * Generate a summary optimized for messaging/texting
   */
  static generateTextSummary(
    event: CalendarEvent,
    visitRecord: VisitRecord,
    client: Client | null,
    pets: Pet[]
  ): string {
    const lines: string[] = [];
    const clientName = client?.name || event.clientName || 'Unknown';
    const serviceType = this.formatServiceType(event.serviceInfo?.type || 'visit');
    
    lines.push(`✅ ${serviceType} Complete`);
    lines.push(`📍 ${clientName}`);
    
    if (visitRecord.checkInAt && visitRecord.checkOutAt) {
      lines.push(`⏱ ${this.formatTime(visitRecord.checkInAt)} - ${this.formatTime(visitRecord.checkOutAt)}`);
    }
    
    const petNames = pets.length > 0 
      ? pets.map(p => p.name).join(', ')
      : event.serviceInfo?.petName;
    if (petNames) {
      lines.push(`🐾 ${petNames}`);
    }
    
    if (visitRecord.notes) {
      // Truncate notes for text message
      const truncatedNotes = visitRecord.notes.length > 100 
        ? visitRecord.notes.substring(0, 100) + '...'
        : visitRecord.notes;
      lines.push(`📝 ${truncatedNotes}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate header section
   */
  private static generateHeader(event: CalendarEvent, client: Client | null): string {
    const lines: string[] = [];
    const clientName = client?.name || event.clientName || 'Unknown';
    
    lines.push('═══════════════════════════════════');
    lines.push('       VISIT SUMMARY');
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push(`Client: ${clientName}`);
    
    if (client?.address || event.location) {
      lines.push(`Location: ${client?.address || event.location}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate visit details section
   */
  private static generateVisitDetails(
    event: CalendarEvent,
    visitRecord: VisitRecord,
    options: SummaryOptions
  ): string {
    const lines: string[] = [];
    
    lines.push('VISIT DETAILS');
    lines.push('-----------------------------------');
    
    // Service type
    lines.push(`Service: ${this.formatServiceType(event.serviceInfo?.type || 'visit')}`);
    
    // Scheduled time
    lines.push(`Scheduled: ${this.formatTime(event.start)} - ${this.formatTime(event.end)}`);
    
    // Actual times
    if (options.includeTimestamps) {
      if (visitRecord.checkInAt) {
        lines.push(`Check-in: ${this.formatDateTime(visitRecord.checkInAt)}`);
      }
      if (visitRecord.checkOutAt) {
        lines.push(`Check-out: ${this.formatDateTime(visitRecord.checkOutAt)}`);
      }
    }
    
    // Duration
    if (options.includeDuration && visitRecord.checkInAt && visitRecord.checkOutAt) {
      lines.push(`Duration: ${this.calculateDuration(visitRecord.checkInAt, visitRecord.checkOutAt)}`);
    }
    
    // Status
    lines.push(`Status: ${this.formatStatus(visitRecord.status)}`);
    
    return lines.join('\n');
  }

  /**
   * Generate pets section
   */
  private static generatePetsSection(pets: Pet[], fallbackPetName?: string): string {
    const lines: string[] = [];
    
    lines.push('PETS');
    lines.push('-----------------------------------');
    
    if (pets.length > 0) {
      pets.forEach(pet => {
        const details: string[] = [];
        if (pet.species) details.push(pet.species);
        if (pet.breed) details.push(pet.breed);
        
        lines.push(`• ${pet.name}${details.length > 0 ? ` (${details.join(' - ')})` : ''}`);
        
        if (pet.careNotes) {
          lines.push(`  Care notes: ${pet.careNotes}`);
        }
        if (pet.specialNeeds) {
          lines.push(`  Special needs: ${pet.specialNeeds}`);
        }
        if (pet.medications && pet.medications.length > 0) {
          lines.push(`  Medications: ${pet.medications.map(m => m.name).join(', ')}`);
        }
      });
    } else if (fallbackPetName) {
      lines.push(`• ${fallbackPetName}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate notes section
   */
  private static generateNotesSection(notes: string): string {
    const lines: string[] = [];
    
    lines.push('NOTES');
    lines.push('-----------------------------------');
    lines.push(notes);
    
    return lines.join('\n');
  }

  /**
   * Generate footer section
   */
  private static generateFooter(visitRecord: VisitRecord): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    
    if (visitRecord.lastSummarySentAt) {
      lines.push(`Previously sent: ${this.formatDateTime(visitRecord.lastSummarySentAt)}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Format service type for display
   */
  private static formatServiceType(type: string): string {
    const typeMap: Record<string, string> = {
      'drop-in': 'Drop-in Visit',
      'walk': 'Dog Walk',
      'overnight': 'Overnight Care',
      'housesit': 'House Sitting',
      'meet-greet': 'Meet & Greet',
      'nail-trim': 'Nail Trim',
      'visit': 'Pet Care Visit',
      'other': 'Pet Care',
    };
    return typeMap[type.toLowerCase()] || type;
  }

  /**
   * Format status for display
   */
  private static formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'scheduled': '📅 Scheduled',
      'in-progress': '🔄 In Progress',
      'completed': '✅ Completed',
      'cancelled': '❌ Cancelled',
    };
    return statusMap[status] || status;
  }

  /**
   * Format time from ISO string
   */
  private static formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format date and time from ISO string
   */
  private static formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Calculate duration between two ISO timestamps
   */
  private static calculateDuration(start: string, end: string): string {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const minutes = Math.round((endTime - startTime) / 60000);
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
}
