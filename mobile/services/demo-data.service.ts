/**
 * Demo Data Service
 * 
 * Provides realistic mock data for demo mode.
 * When demo mode is enabled, the app uses this data instead of real data sources.
 */

import { CalendarEvent } from '@/models/event.model';
import { Client } from '@/models/client.model';
import { Pet, Medication, VetInfo } from '@/models/pet.model';
import { VisitRecord, VisitStatus } from '@/models/visit-record.model';

// Demo clients with realistic data
const DEMO_CLIENTS: Client[] = [
  {
    id: 'demo_client_1',
    name: 'Johnson Family',
    email: 'johnson@example.com',
    phone: '(555) 123-4567',
    address: '123 Oak Street, Springfield',
    notes: 'Gate code: 1234. Prefers morning visits.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'demo_client_2',
    name: 'Smith Residence',
    email: 'smith.pets@example.com',
    phone: '(555) 234-5678',
    address: '456 Maple Avenue, Springfield',
    notes: 'Key under the mat. Dog is shy at first.',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'demo_client_3',
    name: 'Garcia Home',
    email: 'garcia.family@example.com',
    phone: '(555) 345-6789',
    address: '789 Pine Road, Springfield',
    notes: 'Multiple pets. Extra treats in pantry.',
    createdAt: '2025-01-08T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'demo_client_4',
    name: 'Williams Family',
    email: 'williams@example.com',
    phone: '(555) 456-7890',
    address: '321 Elm Court, Springfield',
    notes: 'Cat has special diet. Medication in fridge.',
    createdAt: '2025-01-12T00:00:00Z',
    updatedAt: '2025-01-18T00:00:00Z',
  },
  {
    id: 'demo_client_5',
    name: 'Brown Household',
    email: 'brown.house@example.com',
    phone: '(555) 567-8901',
    address: '654 Birch Lane, Springfield',
    notes: 'Alarm code: 5678. Dog loves belly rubs.',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-22T00:00:00Z',
  },
];

// Demo pets
const DEMO_PETS: Pet[] = [
  {
    id: 'demo_pet_1',
    clientId: 'demo_client_1',
    name: 'Buddy',
    species: 'dog',
    breed: 'Golden Retriever',
    age: 4,
    careNotes: 'Loves fetch! Very friendly.',
    feedingInstructions: '2 cups morning, 2 cups evening',
    medications: [],
    vetInfo: {
      clinicName: 'Springfield Vet',
      phone: '(555) 111-2222',
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'demo_pet_2',
    clientId: 'demo_client_2',
    name: 'Luna',
    species: 'cat',
    breed: 'Siamese',
    age: 3,
    careNotes: 'Indoor only. Shy but warms up quickly.',
    feedingInstructions: '1/4 cup twice daily',
    medications: [],
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'demo_pet_3',
    clientId: 'demo_client_2',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    age: 6,
    careNotes: 'Needs leash walks. Very energetic.',
    feedingInstructions: '2.5 cups twice daily',
    medications: [
      {
        name: 'Joint supplement',
        dosage: '1 tablet',
        frequency: 'Daily with breakfast',
      },
    ],
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'demo_pet_4',
    clientId: 'demo_client_3',
    name: 'Whiskers',
    species: 'cat',
    breed: 'Maine Coon',
    age: 5,
    careNotes: 'Loves to be brushed. Very vocal.',
    feedingInstructions: '1/3 cup morning and evening',
    medications: [],
    createdAt: '2025-01-08T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'demo_pet_5',
    clientId: 'demo_client_3',
    name: 'Coco',
    species: 'dog',
    breed: 'French Bulldog',
    age: 2,
    careNotes: 'Can overheat easily. Short walks only.',
    feedingInstructions: '1 cup twice daily',
    medications: [],
    createdAt: '2025-01-08T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'demo_pet_6',
    clientId: 'demo_client_4',
    name: 'Mittens',
    species: 'cat',
    breed: 'Tabby',
    age: 8,
    careNotes: 'Senior cat. Has special kidney diet.',
    feedingInstructions: 'Prescription food only - 1/4 cup x2',
    medications: [
      {
        name: 'Kidney medication',
        dosage: '1 tablet',
        frequency: 'Twice daily',
      },
    ],
    vetInfo: {
      clinicName: 'Paws Clinic',
      phone: '(555) 333-4444',
    },
    createdAt: '2025-01-12T00:00:00Z',
    updatedAt: '2025-01-18T00:00:00Z',
  },
  {
    id: 'demo_pet_7',
    clientId: 'demo_client_5',
    name: 'Rocky',
    species: 'dog',
    breed: 'German Shepherd',
    age: 3,
    careNotes: 'Well-trained. Knows basic commands.',
    feedingInstructions: '3 cups morning, 3 cups evening',
    medications: [],
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-22T00:00:00Z',
  },
];

/**
 * Generate demo calendar events for a date range
 */
function generateDemoEvents(startDate: Date, endDate: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const serviceTypes = ['drop-in', 'walk', 'overnight'] as const;
  const times = [
    { hour: 8, minute: 0 },
    { hour: 10, minute: 30 },
    { hour: 14, minute: 0 },
    { hour: 16, minute: 30 },
    { hour: 18, minute: 0 },
  ];

  const clientPetMap: Record<string, Pet[]> = {};
  DEMO_PETS.forEach(pet => {
    if (!clientPetMap[pet.clientId]) {
      clientPetMap[pet.clientId] = [];
    }
    clientPetMap[pet.clientId].push(pet);
  });

  // Iterate through each day
  const currentDate = new Date(startDate);
  let eventId = 1;

  while (currentDate <= endDate) {
    // Skip some days randomly (weekends less likely to have full schedule)
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const skipChance = isWeekend ? 0.5 : 0.2;

    if (Math.random() > skipChance) {
      // Generate 2-5 events per day
      const eventCount = Math.floor(Math.random() * 4) + 2;
      const usedTimes = new Set<number>();
      const usedClients = new Set<string>();

      for (let i = 0; i < eventCount && usedTimes.size < times.length; i++) {
        // Pick a random time slot
        let timeIndex: number;
        do {
          timeIndex = Math.floor(Math.random() * times.length);
        } while (usedTimes.has(timeIndex));
        usedTimes.add(timeIndex);

        // Pick a client (try not to repeat)
        let client: Client;
        const availableClients = DEMO_CLIENTS.filter(c => !usedClients.has(c.id));
        if (availableClients.length > 0) {
          client = availableClients[Math.floor(Math.random() * availableClients.length)];
        } else {
          client = DEMO_CLIENTS[Math.floor(Math.random() * DEMO_CLIENTS.length)];
        }
        usedClients.add(client.id);

        const pets = clientPetMap[client.id] || [];
        const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
        const time = times[timeIndex];
        
        // Duration based on service type
        const duration = serviceType === 'walk' ? 45 : serviceType === 'overnight' ? 720 : 30;

        const eventStart = new Date(currentDate);
        eventStart.setHours(time.hour, time.minute, 0, 0);

        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventEnd.getMinutes() + duration);

        const petNames = pets.map(p => p.name).join(', ');
        const title = serviceType === 'walk' 
          ? `Walk - ${client.name}${petNames ? ` (${petNames})` : ''}`
          : serviceType === 'overnight'
          ? `Overnight - ${client.name}`
          : `Drop-in - ${client.name}`;

        events.push({
          id: `demo_event_${eventId++}`,
          calendarId: 'demo',
          title,
          clientName: client.name,
          location: client.address,
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
          allDay: false,
          status: 'confirmed',
          isWorkEvent: true,
          serviceInfo: {
            type: serviceType,
            duration,
            notes: `Pets: ${petNames || 'None specified'}`,
          },
        });
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return events;
}

/**
 * Generate demo visit records for past events
 */
function generateDemoVisitRecords(events: CalendarEvent[]): VisitRecord[] {
  const now = new Date();
  
  return events
    .filter(event => new Date(event.end) < now)
    .map(event => {
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);
      
      // Randomize actual check-in/out times slightly
      const checkInOffset = Math.floor(Math.random() * 10) - 5; // -5 to +5 minutes
      const checkOutOffset = Math.floor(Math.random() * 15) - 5; // -5 to +10 minutes
      
      const actualCheckIn = new Date(startTime);
      actualCheckIn.setMinutes(actualCheckIn.getMinutes() + checkInOffset);
      
      const actualCheckOut = new Date(endTime);
      actualCheckOut.setMinutes(actualCheckOut.getMinutes() + checkOutOffset);

      const activities = [
        'Fed all pets',
        'Refreshed water bowls',
        'Played fetch in backyard',
        'Gave treats',
        'Cleaned litter box',
        'Administered medication',
        'Went for a walk around the block',
        'Brushed coat',
        'Checked food and water levels',
      ];

      // Pick 2-4 random activities
      const shuffled = [...activities].sort(() => Math.random() - 0.5);
      const selectedActivities = shuffled.slice(0, Math.floor(Math.random() * 3) + 2);

      return {
        id: `demo_record_${event.id}`,
        eventId: event.id,
        calendarId: event.calendarId,
        status: 'completed' as VisitStatus,
        checkInAt: actualCheckIn.toISOString(),
        checkOutAt: actualCheckOut.toISOString(),
        notes: selectedActivities.join('. ') + '.',
        createdAt: actualCheckIn.toISOString(),
        updatedAt: actualCheckOut.toISOString(),
      };
    });
}

/**
 * Demo Data Service
 */
export const DemoDataService = {
  /**
   * Get all demo clients
   */
  getClients(): Client[] {
    return DEMO_CLIENTS;
  },

  /**
   * Get all demo pets
   */
  getPets(): Pet[] {
    return DEMO_PETS;
  },

  /**
   * Get pets for a specific client
   */
  getPetsForClient(clientId: string): Pet[] {
    return DEMO_PETS.filter(pet => pet.clientId === clientId);
  },

  /**
   * Get demo events for a date range
   * Generates consistent events based on the date range
   */
  getEvents(startDate: Date, endDate: Date): CalendarEvent[] {
    return generateDemoEvents(startDate, endDate);
  },

  /**
   * Get demo events for today and the next week
   */
  getUpcomingEvents(): CalendarEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return this.getEvents(today, nextWeek);
  },

  /**
   * Get demo events for the past month (for analytics/export)
   */
  getPastEvents(): CalendarEvent[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    lastMonth.setHours(0, 0, 0, 0);
    
    return this.getEvents(lastMonth, today);
  },

  /**
   * Get demo visit records
   */
  getVisitRecords(): VisitRecord[] {
    const pastEvents = this.getPastEvents();
    return generateDemoVisitRecords(pastEvents);
  },

  /**
   * Get a specific client by ID
   */
  getClientById(id: string): Client | undefined {
    return DEMO_CLIENTS.find(c => c.id === id);
  },

  /**
   * Get a specific pet by ID
   */
  getPetById(id: string): Pet | undefined {
    return DEMO_PETS.find(p => p.id === id);
  },

  /**
   * Check if an ID is a demo ID
   */
  isDemoId(id: string): boolean {
    return id.startsWith('demo_');
  },
};

export default DemoDataService;
