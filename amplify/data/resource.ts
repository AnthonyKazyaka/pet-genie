import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Pet Genie Data Schema
 * Stores user settings and templates with owner-based authorization
 * Calendar events are fetched from Google Calendar (not stored in Amplify)
 */
const schema = a.schema({
  /**
   * User Settings - per-user preferences and configuration
   */
  UserSettings: a
    .model({
      // Workload thresholds as JSON
      thresholds: a.json(),
      // Display preferences
      includeTravelTime: a.boolean().default(true),
      defaultTravelBuffer: a.integer().default(15),
      defaultCalendarView: a.string().default('month'),
      weekStartsOn: a.integer().default(0),
      timeFormat: a.string().default('12h'),
      showWeekNumbers: a.boolean().default(false),
      // Google Calendar config
      googleClientId: a.string(),
      selectedCalendars: a.string().array(),
      // Business info
      businessName: a.string(),
      homeAddress: a.string(),
      // Cache settings
      cacheExpiryMinutes: a.integer().default(15),
      autoRefreshMinutes: a.integer().default(15),
      // Feature flags
      enableAnalytics: a.boolean().default(true),
      enableNotifications: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner()]),

  /**
   * Templates - appointment templates for quick scheduling
   */
  Template: a
    .model({
      name: a.string().required(),
      icon: a.string().default('🐾'),
      type: a.enum(['overnight', 'housesit', 'drop_in', 'walk', 'meet_greet', 'nail_trim', 'other']),
      duration: a.integer().required(), // in minutes
      includeTravel: a.boolean().default(true),
      travelBuffer: a.integer().default(15),
      defaultNotes: a.string(),
      color: a.string(),
      isDefault: a.boolean().default(false),
      sortOrder: a.integer().default(0),
    })
    .authorization((allow) => [allow.owner()]),

  /**
   * IgnoredEvents - events to exclude from workload calculations
   */
  IgnoredEvent: a
    .model({
      eventId: a.string().required(),
      calendarId: a.string().required(),
      reason: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // Use Cognito user pools for owner-based authorization
    defaultAuthorizationMode: 'userPool',
    // Keep API key for unauthenticated access if needed
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
