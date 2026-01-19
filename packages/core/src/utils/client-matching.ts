/**
 * Client Matching Utilities
 * Handles automatic and assisted client association for visit records
 */

import { Client } from '../models/client.model';
import { CalendarEvent } from '../models/event.model';

/**
 * Normalize a name for case-insensitive comparison
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Find all clients that match a candidate name
 * Returns exact matches (case-insensitive)
 */
export function findClientMatches(clients: Client[], candidate: string): Client[] {
  if (!candidate) return [];
  
  const normalizedCandidate = normalizeName(candidate);
  
  return clients.filter(client => 
    normalizeName(client.name) === normalizedCandidate
  );
}

/**
 * Extract a client name candidate from a calendar event
 * Priority:
 * 1. event.clientName (if set by event processor)
 * 2. Parse from event.title (format: "ClientName - ServiceType" or just "ClientName")
 */
export function getClientCandidateFromEvent(event: CalendarEvent): string | null {
  // Prefer explicit clientName field
  if (event.clientName) {
    return event.clientName.trim();
  }
  
  // Fallback: parse from title
  if (event.title) {
    // Handle "Client Name - Service Type" format
    const parts = event.title.split(' - ');
    const candidate = parts[0].trim();
    
    // Basic validation: reject if too short or looks like a service type
    if (candidate.length < 2) return null;
    
    // Reject common service type words that might appear alone
    const serviceKeywords = ['visit', 'walk', 'drop-in', 'overnight', 'housesit', 'meet', 'greet'];
    if (serviceKeywords.includes(candidate.toLowerCase())) return null;
    
    return candidate;
  }
  
  return null;
}

/**
 * Determine if we have exactly one confident match
 * Returns the client ID if confident, null otherwise
 */
export function getConfidentClientMatch(clients: Client[], event: CalendarEvent): string | null {
  const candidate = getClientCandidateFromEvent(event);
  if (!candidate) return null;
  
  const matches = findClientMatches(clients, candidate);
  
  // Only auto-link if exactly one match
  if (matches.length === 1) {
    return matches[0].id;
  }
  
  return null;
}

/**
 * Find clients whose names partially match a search term
 */
export function searchClients(clients: Client[], searchTerm: string): Client[] {
  if (!searchTerm) return clients;
  
  const normalizedTerm = normalizeName(searchTerm);
  
  return clients.filter(client =>
    normalizeName(client.name).includes(normalizedTerm) ||
    (client.email && normalizeName(client.email).includes(normalizedTerm)) ||
    (client.address && normalizeName(client.address).includes(normalizedTerm))
  );
}
