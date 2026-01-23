/**
 * Service Type Constants
 * Service type definitions and related constants
 * 
 * Shared between web and mobile applications
 */

import type { ServiceType } from '../models/event.model';

/**
 * Service type labels for display
 */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  'drop-in': 'Drop-In',
  'walk': 'Walk',
  'overnight': 'Overnight',
  'housesit': 'Housesit',
  'meet-greet': 'Meet & Greet',
  'nail-trim': 'Nail Trim',
  'other': 'Other',
};

/**
 * Service type icons (emoji)
 */
export const SERVICE_TYPE_ICONS: Record<ServiceType, string> = {
  'drop-in': '🏠',
  'walk': '🚶',
  'overnight': '🌙',
  'housesit': '🏡',
  'meet-greet': '👋',
  'nail-trim': '✂️',
  'other': '📋',
};

/**
 * Service type colors for UI accent
 */
export const SERVICE_TYPE_COLORS: Record<ServiceType, string> = {
  'drop-in': '#3B82F6', // Blue
  'walk': '#10B981',    // Green
  'overnight': '#8B5CF6', // Purple
  'housesit': '#EC4899',  // Pink
  'meet-greet': '#F59E0B', // Amber
  'nail-trim': '#14B8A6', // Teal
  'other': '#6B7280',    // Gray
};

/**
 * Default durations for service types (in minutes)
 */
export const SERVICE_TYPE_DURATIONS: Record<ServiceType, number> = {
  'drop-in': 30,
  'walk': 60,
  'overnight': 720, // 12 hours
  'housesit': 1440, // 24 hours
  'meet-greet': 30,
  'nail-trim': 15,
  'other': 30,
};

/**
 * All service types in display order
 */
export const ALL_SERVICE_TYPES: ServiceType[] = [
  'drop-in',
  'walk',
  'overnight',
  'housesit',
  'meet-greet',
  'nail-trim',
  'other',
];

/**
 * Get display label for a service type
 * @param type - Service type key
 * @returns Human-readable label
 */
export function getServiceTypeLabel(type: ServiceType | string | undefined): string {
  if (!type) return SERVICE_TYPE_LABELS['other'];
  return SERVICE_TYPE_LABELS[type as ServiceType] ?? type;
}

/**
 * Get icon for a service type
 * @param type - Service type key
 * @returns Emoji icon
 */
export function getServiceTypeIcon(type: ServiceType | string | undefined): string {
  if (!type) return SERVICE_TYPE_ICONS['other'];
  return SERVICE_TYPE_ICONS[type as ServiceType] ?? '📋';
}

/**
 * Get color for a service type
 * @param type - Service type key
 * @returns Hex color code
 */
export function getServiceTypeColor(type: ServiceType | string | undefined): string {
  if (!type) return SERVICE_TYPE_COLORS['other'];
  return SERVICE_TYPE_COLORS[type as ServiceType] ?? SERVICE_TYPE_COLORS['other'];
}
