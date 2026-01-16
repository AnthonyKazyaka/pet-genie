# Pet Genie — Repository Analysis Report

Generated: 2026-01-16

This report contains concrete, verifiable facts extracted from the repository to support implementation planning. No speculation.

---

## 1. Current Domain Model Inventory

- **CalendarEvent (interface)**
  - File: `src/app/models/event.model.ts`
  - Key fields:
    - `id: string`
    - `calendarId: string`
    - `title: string`
    - `description?: string`
    - `location?: string`
    - `start: Date`
    - `end: Date`
    - `allDay: boolean`
    - `recurringEventId?: string`
    - `status: 'confirmed' | 'tentative' | 'cancelled'`
    - Extensions on model:
      - `isWorkEvent?: boolean`
      - `isOvernightEvent?: boolean`
      - `clientName?: string`
      - `serviceInfo?: ServiceInfo`
      - `color?: string`
  - Represents: calendar entry / appointment.

- **ServiceInfo (interface)**
  - File: `src/app/models/event.model.ts`
  - Fields: `type: ServiceType`, `duration: number`, `petName?: string`, `notes?: string`
  - Represents: extracted service metadata for an event.

- **ServiceType (type)**
  - File: `src/app/models/event.model.ts`
  - Values: `'drop-in' | 'walk' | 'overnight' | 'housesit' | 'meet-greet' | 'nail-trim' | 'other'`

- **GoogleCalendar (interface)**
  - File: `src/app/models/event.model.ts`
  - Represents external calendar metadata (id, summary, colors, accessRole, selected flag).

- **Multi-event / Booking models**
  - File: `src/app/models/multi-event.model.ts`
  - Types / Interfaces:
    - `BookingType = 'daily-visits' | 'overnight-stay'`
    - `VisitSlot { templateId, time (HH:mm), duration }`
    - `OvernightConfig { templateId, arrivalTime, departureTime }`
    - `DropinConfig { templateId, time, duration }`
    - `MultiEventConfig { clientName, location, startDate, endDate, bookingType, visits[], weekendVisits?, overnightConfig?, dropinConfig? }`
    - `GeneratedEvent { title, start, end, templateId? }`
  - Represents: multi-day booking configuration and generated events.

- **Template (interface)**
  - File: `src/app/models/template.model.ts`
  - Key fields: `id, userId, name, icon, type (TemplateType), duration, includeTravel, travelBuffer, defaultNotes?, color?, defaultStartTime?, defaultEndTime?, isDefault, createdAt, updatedAt`
  - `TemplateType` values mirror service types.

- **Export models**
  - File: `src/app/models/export.model.ts`
  - Types: `ExportOptions`, `ExportRow`, `ExportResult`, `ExportTemplate`, `GroupLevel`, `SortLevel`.

- **Settings & Workload models**
  - Files: `src/app/models/settings.model.ts`, `src/app/models/workload.model.ts`
  - `AppSettings` contains `thresholds`, `includeTravelTime`, `defaultTravelBuffer`, `googleClientId`, `selectedCalendars`, display prefs, cache settings, feature flags.
  - `WorkloadThresholds` and `DEFAULT_THRESHOLDS` present.
  - `WorkloadMetrics`, `WorkloadSummary`, and `getWorkloadLevel` exist.

- Event-centric models: `CalendarEvent`, `ServiceInfo`, multi-event `GeneratedEvent`, export rows.
- Dedicated `Client` or `Pet` entity: Not found. Client/pet data is embedded in `clientName` and optional `serviceInfo.petName` on events.

---

## 2. Event & Calendar Flow (Critical)

- Fetching & normalization flow (exact files & calls):
  - UI components call `GoogleCalendarService.fetchEventsFromCalendars(...)`.
    - Examples: `src/app/features/calendar/calendar.component.ts`, `src/app/features/analytics/analytics.component.ts`.
  - `GoogleCalendarService.fetchEventsFromCalendars(calendarIds, dateRange)`
    - File: `src/app/core/services/google-calendar.service.ts`
    - Calls `fetchCalendarEvents` per calendar, which lists Google Calendar events and maps raw items via `parseGoogleEvent(...)` to `CalendarEvent` (converts start/end strings to `Date`).
  - After fetching, events are passed to `EventProcessorService.processEvents(...)`.
    - File: `src/app/core/services/event-processor.service.ts`
    - `processEvents` calls `processEvent` which sets `isWorkEvent`, `isOvernightEvent`, `clientName`, `serviceInfo`.

- Where validation/guards occur:
  - Google connectivity checks in components via `googleCalendarService.isInitialized()` and `isSignedIn()` (see `CalendarComponent.loadEvents()` and `SettingsComponent`).
  - `MultiEventService.validateConfig(config)` validates multi-event input and `generateEvents` throws an Error on invalid config.
    - File: `src/app/core/services/multi-event.service.ts`

- How events are created (multi-event generation):
  - `MultiEventService.generateEvents(config, templates)` iterates dates in range and builds `GeneratedEvent[]`.
    - Overnight events created by `buildOvernightEvent` (start on day, end next day).
    - Drop-ins and visit slots built from `VisitSlot` data and templates.
    - Conflict detection via `detectConflicts(existingEvents, generated)` uses `overlaps(...)`.
    - File: `src/app/core/services/multi-event.service.ts`.
  - UI entry: `src/app/features/scheduling/multi-event-dialog/multi-event-dialog.component.ts` provides form fields (e.g., `clientName` in the dialog) and invokes generation.

- Multi-event / batch handling:
  - `GeneratedEvent` objects are produced; service does not directly persist to Google Calendar — UI must perform the actual calendar insert operation.
  - Conflicts are returned as a filtered list; overnight + drop-in combinations supported.

- Workload calculation (exact functions & usage):
  - Per-event per-day duration: `EventProcessorService.calculateEventDurationForDay(event, date)` — caps overnight events to 12 hours/day.
    - File: `src/app/core/services/event-processor.service.ts`.
  - Aggregation & travel time: `WorkloadService.calculateDailyMetrics(date, events?)` sums event durations and calls `calculateEstimatedTravelTime(...)` when `settings.includeTravelTime` is true.
    - Default travel leg: 15 minutes per leg (`WorkloadService.DEFAULT_TRAVEL_TIME`).
    - File: `src/app/core/services/workload.service.ts`.
  - Consumers:
    - `CalendarComponent` uses `eventProcessor.calculateEventDurationForDay` via `calculateWorkMinutes` for cell workload rendering.
      - File: `src/app/features/calendar/calendar.component.ts`.
    - `AnalyticsComponent` uses `eventProcessor.calculateEventDurationForDay` for charts and breakdowns.
      - File: `src/app/features/analytics/analytics.component.ts`.

- Explicit assumptions in code (fact list):
  - Overnight events are capped at 12 hours per day.
  - Work event detection is regex-driven (duration numbers, keywords like 'overnight', 'housesit', 'walk', etc.).
  - Travel time estimated at 15 minutes per leg; consecutive same-location events reduce legs.
  - Templates provide durations used as fallbacks during generation.

---

## 3. Analytics & Dashboard Data Sources

- Primary source: Google Calendar events fetched via `GoogleCalendarService.fetchEventsFromCalendars(...)` and normalized by `EventProcessorService.processEvents(...)`.
  - Files: `src/app/core/services/google-calendar.service.ts`, `src/app/core/services/event-processor.service.ts`.

- Aggregation loci:
  - Component-level aggregation (tight to UI): `AnalyticsComponent` performs many aggregations locally (daily stats, service breakdown, day-of-week stats, top clients).
    - File: `src/app/features/analytics/analytics.component.ts`.
  - Service-level aggregation (reusable): `WorkloadService` exposes `calculateDailyMetrics`, `calculateRangeMetrics`, and `getWorkloadSummary` for summaries and can be reused by UI.
    - File: `src/app/core/services/workload.service.ts`.
  - Export aggregation is encapsulated in `EventExporterService`.
    - File: `src/app/core/services/event-exporter.service.ts`.

- Reusability vs coupling facts:
  - Workload core logic centralized in `WorkloadService` and `EventProcessorService` (reusable).
  - Many analytics calculations live inside `AnalyticsComponent` (tighter coupling to UI and not exposed as a service).

---

## 4. Export & Template System

- Export formats supported (facts):
  - Grouped plain text content produced by `EventExporterService.formatGroups(...)`.
  - CSV string produced by `EventExporterService.formatCsv(...)`.
  - Structured `ExportResult` object with `rows` and `groups`.
  - Files: `src/app/core/services/event-exporter.service.ts`, `src/app/models/export.model.ts`.

- Template definitions & persistence (facts):
  - Angular model `ExportTemplate` exists: `src/app/models/export.model.ts` (has `options: ExportOptions`, `includeDateRange`, timestamps).
  - Legacy localStorage-backed manager exists at `legacy/gps-admin/js/export-templates.js` (saves templates to localStorage).

- How data maps into templates (exact mapping):
  - `EventExporterService.buildRows(events, options)` maps `CalendarEvent` → `ExportRow` where `ExportRow.client` uses `event.clientName || event.title`, `service` uses `event.serviceInfo?.type`, `durationMinutes` uses `serviceInfo.duration` or difference in minutes.
  - Grouping keys produced by `getGroupKey(event, field)` for date/week/month/client/service.

- Visit summary support (fact):
  - `ExportRow` includes `client` and `service` and `durationMinutes`; full event data (location, title, serviceInfo) is available to `EventExporterService`. Basic visit summary exports are already supported by the exporter data structures.

---

## 5. Settings & Rule Enforcement

- Configurable settings (exact keys):
  - File: `src/app/models/settings.model.ts`
  - `AppSettings` includes: `thresholds`, `includeTravelTime`, `defaultTravelBuffer`, `googleClientId`, `selectedCalendars`, `defaultCalendarView`, `weekStartsOn`, `timeFormat`, `showWeekNumbers`, `businessName?`, `homeAddress?`, `cacheExpiryMinutes`, `autoRefreshMinutes`, `enableAnalytics`, `enableNotifications`.

- Where settings are enforced (facts):
  - `includeTravelTime` used in `WorkloadService.calculateDailyMetrics`.
    - File: `src/app/core/services/workload.service.ts`.
  - `thresholds` used by `getWorkloadLevel` and `WorkloadService` for level calculations.
  - `googleClientId` validated by `SettingsComponent` and used to initialize `GoogleCalendarService`.
  - `selectedCalendars` influence which calendars are fetched; `DataService` persists selection and clears cache on change.
  - Display preferences (`timeFormat`, `showWeekNumbers`) used in UI rendering.

- Whether settings influence scheduling/analytics (fact):
  - Yes: `thresholds` and `includeTravelTime` directly influence workload and analytics results.

---

## 6. Auth & Multi-User Assumptions

- Auth used for calendar access:
  - `GoogleCalendarService` implements OAuth token handling and sign-in state.
    - File: `src/app/core/services/google-calendar.service.ts`.
  - `AppComponent` attempts to `Amplify.configure(...)` if `amplify_outputs.json` is present but otherwise the app uses localStorage for persistence.
    - File: `src/app/app.component.ts`.

- Multi-user facts:
  - Amplify backend schema is defined under `amplify/data/resource.ts` (models: `UserSettings`, `Template`, `IgnoredEvent`) with owner-based authorization.
    - File: `amplify/data/resource.ts`.
  - Current Angular code primarily uses localStorage via `StorageService` and `DataService` for persistence — indicates a local single-user runtime by default.
    - File: `src/app/core/services/storage.service.ts`, `src/app/core/services/data.service.ts`.
  - No Angular-side role/permission enforcement code found. (Not found.)

---

## 7. Legacy Code Overlap

- Notable legacy-only features (facts):
  - `WorkloadAnalyzer` in `legacy/gps-admin/js/workload-analyzer.js` contains risk scoring, recommendation generation, consecutive-days analysis, and other heuristics that are more extensive than the Angular `WorkloadService`.
    - File: `legacy/gps-admin/js/workload-analyzer.js`.
  - Legacy `ExportTemplatesManager` persists templates to localStorage with metadata handling that differs from Angular template handling.
    - File: `legacy/gps-admin/js/export-templates.js`.

- Duplicated features (facts):
  - Event classification (regex) exists in both legacy `events.js` and Angular `EventProcessorService`.
    - Files: `legacy/gps-admin/js/events.js`, `src/app/core/services/event-processor.service.ts`.
  - Workload calculations appear in both codebases, with different implementations/heuristics.

- Anything flagged as "do not port":
  - No explicit markers found in repo. (Not found.)

---

## 8. Extension Readiness Assessment (fact answers)

- Can “Visit” be layered on top of existing events?
  - Yes. Facts: `CalendarEvent` already includes `serviceInfo` (`type`, `duration`, optional `petName`) and `clientName`. Existing models can represent visit semantics.

- Can client/pet models be added without breaking analytics?
  - Yes. Facts: analytics code reads `event.clientName` and `event.serviceInfo`. Adding separate `Client`/`Pet` entities and populating those fields preserves current consumers.

- Can workload/burnout rules be enforced centrally?
  - Yes. Facts: `WorkloadService` centralizes workload calculation and `getWorkloadSummary`; `AppSettings.thresholds` live in `DataService` settings. Central enforcement is aligned with existing structure.

---

### Key referenced files (paths)

```
src/app/models/event.model.ts
src/app/models/multi-event.model.ts
src/app/models/template.model.ts
src/app/models/settings.model.ts
src/app/models/workload.model.ts
src/app/models/export.model.ts
src/app/core/services/event-processor.service.ts
src/app/core/services/multi-event.service.ts
src/app/core/services/event-exporter.service.ts
src/app/core/services/workload.service.ts
src/app/core/services/google-calendar.service.ts
src/app/core/services/data.service.ts
src/app/core/services/storage.service.ts
src/app/features/calendar/calendar.component.ts
src/app/features/analytics/analytics.component.ts
src/app/features/scheduling/multi-event-dialog/multi-event-dialog.component.ts
amplify/data/resource.ts
legacy/gps-admin/js/events.js
legacy/gps-admin/js/workload-analyzer.js
legacy/gps-admin/js/export-templates.js
```

---

Report generated from repository source files. No speculative statements included. If you want this saved under a different filename or require line-linked references, tell me the target filename and I will update it.
