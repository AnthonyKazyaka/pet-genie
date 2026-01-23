/**
 * Template Models
 * For appointment templates used to quickly create calendar events
 * 
 * Shared between web and mobile applications
 */

export interface Template {
  id: string;
  userId: string;
  name: string;
  icon: string;
  type: TemplateType;
  duration: number; // in minutes
  includeTravel: boolean;
  travelBuffer: number; // in minutes
  defaultNotes?: string;
  color?: string;
  defaultStartTime?: string; // HH:mm
  defaultEndTime?: string;   // HH:mm
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateType =
  | 'overnight'
  | 'housesit'
  | 'drop-in'
  | 'walk'
  | 'meet-greet'
  | 'nail-trim'
  | 'other';

export interface CreateTemplateDto {
  name: string;
  icon?: string;
  type: TemplateType;
  duration: number;
  includeTravel?: boolean;
  travelBuffer?: number;
  defaultNotes?: string;
  color?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export interface UpdateTemplateDto {
  name?: string;
  icon?: string;
  type?: TemplateType;
  duration?: number;
  includeTravel?: boolean;
  travelBuffer?: number;
  defaultNotes?: string;
  color?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

/**
 * Default templates for new users
 */
export const DEFAULT_TEMPLATES: Omit<Template, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '15-Minute Drop-In',
    icon: '🏠',
    type: 'drop-in',
    duration: 15,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true,
  },
  {
    name: '30-Minute Visit',
    icon: '🐕',
    type: 'drop-in',
    duration: 30,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true,
  },
  {
    name: '60-Minute Walk',
    icon: '🚶',
    type: 'walk',
    duration: 60,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true,
  },
  {
    name: 'Overnight Stay',
    icon: '🌙',
    type: 'overnight',
    duration: 720, // 12 hours
    includeTravel: false,
    travelBuffer: 0,
    isDefault: true,
  },
  {
    name: 'House Sitting (Full Day)',
    icon: '🏡',
    type: 'housesit',
    duration: 1440, // 24 hours
    includeTravel: false,
    travelBuffer: 0,
    isDefault: true,
  },
  {
    name: 'Meet & Greet',
    icon: '👋',
    type: 'meet-greet',
    duration: 30,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true,
  },
  {
    name: 'Nail Trim',
    icon: '✂️',
    type: 'nail-trim',
    duration: 15,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true,
  },
];
