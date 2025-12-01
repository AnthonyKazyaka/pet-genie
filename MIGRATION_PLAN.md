# GPS Admin to Angular 17 Migration Plan

## Executive Summary

This plan outlines the migration of gps-admin (9,300 lines of vanilla JavaScript) to an Angular 17 application with Angular Material UI, AWS Amplify Gen 2 backend, and Google Calendar API integration.

**Key Decisions:**
- **Backend:** Google Calendar API for event data (client-side), AWS Amplify for templates/settings storage
- **UI Framework:** Angular Material (latest)
- **Deployment:** AWS Amplify Hosting
- **Scope:** Full feature parity with gps-admin
- **Travel Time:** NOT migrating Google Maps initially (use 15-min estimates)

---

## 1. Architecture Overview

### Application Structure

```
pet-genie/
├── src/app/
│   ├── core/                    # Singleton services, guards, interceptors
│   ├── shared/                  # Shared components, directives, pipes
│   ├── features/                # Feature modules (lazy-loaded)
│   │   ├── dashboard/
│   │   ├── calendar/
│   │   ├── templates/
│   │   ├── analytics/
│   │   └── settings/
│   ├── models/                  # TypeScript interfaces/types
│   └── layout/                  # Shell/layout components
```

### State Management Strategy

- **Angular Signals** for reactive state (primary approach)
- **RxJS** for async operations and side effects
- **Service-based** state management (no NgRx - keep it simple)
- **LocalStorage** for caching with 15-minute expiry

### Service Architecture (Vanilla JS → Angular)

| Vanilla JS Class | Angular Service | Purpose |
|-----------------|-----------------|---------|
| DataManager | DataService | State management, caching |
| EventProcessor | EventProcessorService | Event classification, work detection |
| WorkloadCalculator | WorkloadService | Workload calculations |
| WorkloadAnalyzer | AnalyticsService | Burnout analysis, insights |
| RenderEngine | Component logic + RenderHelperService | UI rendering |
| CalendarAPI | GoogleCalendarService | Google Calendar OAuth & API |
| TemplatesManager | TemplatesService | Template CRUD operations |
| EventListExporter | ExportService | Event export to CSV/text |
| Utils | Shared utilities | Helper functions |

### Data Flow

```
Components (UI with Signals)
    ↓
Feature Services (business logic)
    ↓
Core Services (data access)
    ↓
[Google Calendar API] ← Events
[AWS Amplify] ← Templates/Settings
[LocalStorage] ← Cache
```

---

## 2. Technology Stack

### Dependencies to Install

```bash
# Angular Material + CDK
npm install @angular/material @angular/cdk @angular/animations

# Date handling
npm install date-fns

# Google API integration
npm install @types/gapi @types/gapi.auth2 @types/gapi.client.calendar

# Charts for Analytics
npm install ngx-echarts echarts
# OR keep custom CSS charts (lighter bundle)

# Utilities
npm install lodash-es @types/lodash-es
```

### Angular Material Components

| Feature | Material Components |
|---------|-------------------|
| Navigation | MatSidenav, MatToolbar, MatButton, MatIcon |
| Dashboard | MatCard, MatRipple |
| Calendar | Custom grid + MatDatepicker (navigation) |
| Forms | MatFormField, MatInput, MatSelect, MatCheckbox, MatDatepicker |
| Dialogs | MatDialog, MatDialogActions |
| Lists | MatList, MatListItem |
| Notifications | MatSnackBar |
| Progress | MatProgressSpinner, MatProgressBar |
| Tabs | MatTabGroup |
| Expansion | MatExpansionPanel |

---

## 3. Detailed Directory Structure

```
/home/anthony/code/pet-genie/src/app/
├── core/
│   ├── services/
│   │   ├── data.service.ts                    # State + caching
│   │   ├── event-processor.service.ts         # Event classification
│   │   ├── google-calendar.service.ts         # Google Calendar API
│   │   ├── storage.service.ts                 # LocalStorage wrapper
│   │   └── amplify-data.service.ts            # AWS Amplify operations
│   ├── guards/
│   │   └── auth.guard.ts
│   └── interceptors/
│       └── error.interceptor.ts
│
├── shared/
│   ├── components/
│   │   ├── workload-indicator/
│   │   ├── event-card/
│   │   ├── loading-spinner/
│   │   └── confirmation-dialog/
│   ├── pipes/
│   │   ├── duration-format.pipe.ts
│   │   ├── workload-level.pipe.ts
│   │   └── date-range.pipe.ts
│   └── directives/
│       └── workload-color.directive.ts
│
├── models/
│   ├── event.model.ts
│   ├── template.model.ts
│   ├── settings.model.ts
│   ├── workload.model.ts
│   ├── calendar.model.ts
│   └── index.ts
│
├── features/
│   ├── dashboard/
│   │   ├── dashboard.component.ts
│   │   ├── components/
│   │   │   ├── quick-stats/
│   │   │   ├── upcoming-appointments/
│   │   │   ├── week-overview/
│   │   │   ├── weekly-insights/
│   │   │   └── recommendations/
│   │   └── services/
│   │       └── dashboard.service.ts
│   │
│   ├── calendar/
│   │   ├── calendar.component.ts
│   │   ├── components/
│   │   │   ├── calendar-header/
│   │   │   ├── calendar-grid/
│   │   │   ├── calendar-list/
│   │   │   ├── day-details-dialog/
│   │   │   ├── appointment-dialog/
│   │   │   └── event-export-dialog/
│   │   └── services/
│   │       ├── calendar-view.service.ts
│   │       └── calendar-render.service.ts
│   │
│   ├── templates/
│   │   ├── templates.component.ts
│   │   ├── components/
│   │   │   ├── template-card/
│   │   │   └── template-dialog/
│   │   └── services/
│   │       └── templates.service.ts
│   │
│   ├── analytics/
│   │   ├── analytics.component.ts
│   │   ├── components/
│   │   │   ├── analytics-overview/
│   │   │   ├── workload-trend-chart/
│   │   │   ├── client-distribution-chart/
│   │   │   ├── service-types-chart/
│   │   │   ├── busiest-days-chart/
│   │   │   ├── busiest-times-chart/
│   │   │   ├── duration-distribution-chart/
│   │   │   └── insights-panel/
│   │   └── services/
│   │       ├── analytics.service.ts
│   │       └── workload.service.ts
│   │
│   └── settings/
│       ├── settings.component.ts
│       ├── components/
│       │   ├── api-config-section/
│       │   ├── workload-thresholds-section/
│       │   ├── calendar-selection-section/
│       │   └── account-management-section/
│       └── services/
│           └── settings.service.ts
│
├── layout/
│   ├── app-shell/
│   ├── header/
│   └── sidebar/
│
├── app.component.ts
├── app.config.ts
└── app.routes.ts
```

---

## 4. Core Services Implementation

### 4.1 DataService (from DataManager)

**File:** `src/app/core/services/data.service.ts`

**Responsibilities:**
- Centralized state management with Signals
- LocalStorage persistence
- Cache management with 15-minute expiry
- Default data initialization

**Key Methods:**
```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly STORAGE_KEY = 'gpsAdminData';
  private readonly CACHE_EXPIRY_MS = 15 * 60 * 1000;

  // Signals for reactive state
  events = signal<CalendarEvent[]>([]);
  settings = signal<AppSettings>(defaultSettings);
  selectedCalendars = signal<string[]>([]);
  ignoredEventIds = signal<Set<string>>(new Set());

  loadEventsCache(): CalendarEvent[] | null
  saveEventsCache(events: CalendarEvent[]): void
  isCacheValid(): boolean
  clearEventsCache(): void
}
```

**Migration Notes:**
- Keep ALL default values from DataManager
- Preserve cache expiry logic exactly
- Use Signals instead of plain state object

### 4.2 EventProcessorService (from EventProcessor)

**File:** `src/app/core/services/event-processor.service.ts`

**Responsibilities:**
- Classify events as work vs personal
- Detect overnight/housesit events
- Extract client names and service info
- Calculate event duration per day (multi-day handling)

**Critical:** Preserve ALL regex patterns exactly:
```typescript
private workEventPatterns = {
  meetAndGreet: /\b(MG|M&G|Meet\s*&\s*Greet)\b/i,
  minutesSuffix: /\b(15|20|30|45|60)\b/i,
  housesitSuffix: /\b(HS|Housesit)\b/i,
  nailTrim: /\b(nail\s*trim)\b/i
};

private personalEventPatterns = {
  offDay: /^\s*✨\s*off\s*✨/i,
  // ... all other patterns from original
};
```

**Key Methods:**
```typescript
isWorkEvent(event: CalendarEvent | string): boolean
isOvernightEvent(event: CalendarEvent): boolean
isDefinitelyPersonal(title: string): boolean
calculateEventDurationForDay(event: CalendarEvent, date: Date): number
extractClientName(title: string): string
extractServiceInfo(title: string): ServiceInfo
```

### 4.3 WorkloadService (from WorkloadCalculator)

**File:** `src/app/features/analytics/services/workload.service.ts`

**Responsibilities:**
- Calculate workload metrics (work time, travel time, total)
- Determine workload level (comfortable/busy/high/burnout)
- Handle multi-day events
- Apply configurable thresholds

**Key Methods:**
```typescript
@Injectable({ providedIn: 'root' })
export class WorkloadService {
  constructor(
    private eventProcessor: EventProcessorService,
    private dataService: DataService
  ) {}

  calculateWorkloadMetrics(
    events: CalendarEvent[],
    targetDate: Date
  ): WorkloadMetrics

  calculateEstimatedTravelTime(workEvents: CalendarEvent[]): number

  getWorkloadLevel(
    hours: number,
    period: 'daily' | 'weekly' | 'monthly'
  ): WorkloadLevel
}
```

**Migration Notes:**
- Keep ALL calculation logic identical
- Preserve overnight event special handling (12hr cap per day)
- Use settings from DataService for thresholds

### 4.4 GoogleCalendarService (from CalendarAPI)

**File:** `src/app/core/services/google-calendar.service.ts`

**Responsibilities:**
- Google OAuth 2.0 authentication
- Token management (localStorage)
- Fetch events from multiple calendars
- List available calendars

**Key Methods:**
```typescript
@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private gapiInited = signal(false);
  private gisInited = signal(false);
  private accessToken = signal<string | null>(null);

  async init(clientId: string): Promise<void>
  async authenticate(): Promise<void>
  async listCalendars(): Promise<GoogleCalendar[]>
  async loadEventsFromCalendars(calendarIds: string[]): Observable<CalendarEvent[]>
  signOut(): void
}
```

**Migration Notes:**
- Keep OAuth flow identical
- Preserve token expiry checking
- Return Observables instead of Promises for better Angular integration

### 4.5 TemplatesService (from TemplatesManager)

**File:** `src/app/features/templates/services/templates.service.ts`

**Responsibilities:**
- Template CRUD operations
- AWS Amplify sync
- Default templates initialization
- LocalStorage backup

**Key Methods:**
```typescript
@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private templates = signal<Template[]>([]);

  constructor(
    private storageService: StorageService,
    private amplifyDataService: AmplifyDataService
  ) {
    this.loadTemplates();
  }

  getAllTemplates(): Template[]
  getTemplateById(id: string): Template | undefined
  createTemplate(data: CreateTemplateDto): Template
  updateTemplate(id: string, updates: Partial<Template>): void
  deleteTemplate(id: string): void
  duplicateTemplate(id: string): Template

  async syncToCloud(): Promise<void>
  async syncFromCloud(): Promise<void>
}
```

**Migration Notes:**
- Keep ALL default templates identical
- Add AWS Amplify cloud sync
- LocalStorage as primary, Amplify as backup

### 4.6 AnalyticsService (from WorkloadAnalyzer)

**File:** `src/app/features/analytics/services/analytics.service.ts`

**Responsibilities:**
- Workload trend analysis
- Burnout risk detection
- Client/service distribution
- Time-based analytics
- Smart recommendations

**Key Methods:**
```typescript
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(
    private workloadService: WorkloadService,
    private eventProcessor: EventProcessorService
  ) {}

  analyzeWorkloadTrend(events: CalendarEvent[], range: DateRange): TrendData
  getClientDistribution(events: CalendarEvent[]): ClientStats[]
  getServiceTypeBreakdown(events: CalendarEvent[]): ServiceStats[]
  getBusiestDaysOfWeek(events: CalendarEvent[]): DayStats[]
  getBusiestTimesOfDay(events: CalendarEvent[]): TimeStats[]
  getDurationDistribution(events: CalendarEvent[]): DurationStats[]
  generateInsights(events: CalendarEvent[], range: DateRange): Insight[]
}
```

---

## 5. AWS Amplify Data Schema

**File:** `/home/anthony/code/pet-genie/amplify/data/resource.ts`

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // User settings (per-user, private)
  UserSettings: a
    .model({
      userId: a.string().required(),
      thresholds: a.json(), // { daily, weekly, monthly }
      homeAddress: a.string(),
      includeTravelTime: a.boolean().default(true),
      selectedCalendars: a.string().array(),
      googleClientId: a.string(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  // Templates (per-user, private)
  Template: a
    .model({
      userId: a.string().required(),
      name: a.string().required(),
      icon: a.string(),
      type: a.string().required(), // 'overnight' | 'dropin' | 'walk' | 'meet-greet'
      duration: a.integer().required(),
      includeTravel: a.boolean().default(true),
      travelBuffer: a.integer().default(15),
      defaultNotes: a.string(),
      color: a.string(),
      isDefault: a.boolean().default(false),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

**Usage Pattern:**
- Templates and settings sync to AWS for multi-device access
- Events stay client-side (Google Calendar is source of truth)
- LocalStorage as fallback if Amplify unavailable

---

## 6. Material Design Theme

**File:** `src/theme.scss`

```scss
@use '@angular/material' as mat;

// Custom palette matching gps-admin colors
$pet-genie-primary: mat.define-palette((
  50: #EEF2FF,
  100: #E0E7FF,
  200: #C7D2FE,
  300: #A5B4FC,
  400: #818CF8,
  500: #6366F1,
  600: #4F46E5, // Primary color
  700: #4338CA,
  800: #3730A3,
  900: #312E81,
));

$pet-genie-accent: mat.define-palette(mat.$cyan-palette, 500);
$pet-genie-warn: mat.define-palette(mat.$red-palette, 500);

$pet-genie-theme: mat.define-light-theme((
  color: (
    primary: $pet-genie-primary,
    accent: $pet-genie-accent,
    warn: $pet-genie-warn,
  ),
  typography: mat.define-typography-config(),
  density: 0,
));

@include mat.all-component-themes($pet-genie-theme);

// Custom workload colors (matching gps-admin)
:root {
  --workload-comfortable: #10B981;
  --workload-busy: #F59E0B;
  --workload-high: #F97316;
  --workload-burnout: #EF4444;
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Set up infrastructure and core services

**Tasks:**
1. Install dependencies (Material, date-fns, Google types)
2. Configure Angular Material theme
3. Create TypeScript models (event, template, settings, workload)
4. Build core services:
   - StorageService
   - DataService
   - EventProcessorService
   - WorkloadService
5. Create app shell (layout, header, sidebar)
6. Set up routing

**Deliverable:** App shell with navigation

### Phase 2: Settings & Google Calendar (Week 2)

**Goal:** Google Calendar integration working

**Tasks:**
1. Implement GoogleCalendarService
2. Build Settings feature:
   - API configuration section
   - Workload thresholds section (with live preview)
   - Account management
3. Update AWS Amplify schema for UserSettings
4. Test OAuth flow
5. Calendar selection UI

**Deliverable:** Can connect to Google Calendar and load events

### Phase 3: Templates (Week 3)

**Goal:** Template management complete

**Tasks:**
1. Implement TemplatesService with Amplify sync
2. Build Templates UI:
   - Template grid with Material cards
   - Create/edit dialog
   - Delete confirmation
3. Update Amplify schema for Template model
4. Default templates initialization

**Deliverable:** Full template CRUD with cloud sync

### Phase 4: Calendar Views (Week 4-5)

**Goal:** All calendar views working

**Tasks:**
1. CalendarViewService (state management)
2. CalendarRenderService (helper functions)
3. Calendar header (navigation, view toggle)
4. Custom calendar grid components:
   - Month view
   - Week view
   - Day view
   - List view
5. Day details dialog
6. Appointment create/edit dialog
7. Event rendering with workload colors
8. Multi-day event spanning

**Deliverable:** Full calendar functionality

### Phase 5: Dashboard (Week 6)

**Goal:** Dashboard showing real-time data

**Tasks:**
1. Quick stats cards (computed signals)
2. Upcoming appointments list
3. Week overview component
4. Weekly insights
5. Smart recommendations

**Deliverable:** Complete dashboard

### Phase 6: Analytics (Week 7)

**Goal:** Analytics with charts

**Tasks:**
1. Implement AnalyticsService
2. Analytics overview cards
3. Time range selector
4. Charts (choose: ngx-echarts or custom CSS):
   - Workload trend
   - Client distribution
   - Service types
   - Busiest days
   - Busiest times
   - Duration distribution
5. Insights panel

**Deliverable:** Complete analytics dashboard

### Phase 7: Export & Polish (Week 8)

**Goal:** Production-ready

**Tasks:**
1. Event export dialog (CSV/text)
2. Export preview and download
3. Responsive design (mobile, tablet)
4. Error handling
5. Loading states
6. Unit tests for services
7. Component tests
8. E2E tests (critical flows)
9. Performance optimization
10. Documentation

**Deliverable:** Production-ready application

---

## 8. Key Technical Decisions

### 8.1 Calendar Rendering

**Decision:** Custom CSS Grid calendar (NOT Material Datepicker)

**Rationale:**
- Material Datepicker is for date selection, not event display
- Need full control over event rendering, workload colors, multi-day spanning
- Keep consistent with gps-admin design

**Implementation:**
```typescript
// Generate calendar grid similar to RenderEngine
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  workloadLevel: WorkloadLevel;
}
```

### 8.2 State Management

**Decision:** Signals + Service-based (NO NgRx)

**Rationale:**
- Angular 17 Signals are built-in, reactive, performant
- Simpler than Redux pattern
- Less boilerplate
- Easier maintenance

**Pattern:**
```typescript
// Service with signals
export class DataService {
  private eventsSignal = signal<CalendarEvent[]>([]);
  readonly events = this.eventsSignal.asReadonly();
}

// Component with computed
export class DashboardComponent {
  dataService = inject(DataService);

  todayEvents = computed(() =>
    this.dataService.events().filter(e => isToday(e.start))
  );
}
```

### 8.3 Forms

**Decision:** Reactive Forms

**Rationale:**
- Better for complex forms (appointments, settings)
- Type safety
- Easier testing
- Better validation

### 8.4 Authentication

**Decision:** Dual auth (Cognito + Google OAuth)

**Flow:**
1. AWS Cognito for app login (required for Amplify)
2. Google OAuth for calendar access (separate)
3. Google token in localStorage only
4. Templates/settings sync via Cognito-authenticated Amplify

### 8.5 Travel Time

**Decision:** Estimated 15 min per leg (no Maps API initially)

**Rationale:**
- Keep migration scope manageable
- Can add Maps API later
- Interface-based design for easy swap

```typescript
interface TravelService {
  calculateTravelTime(from: string, to: string): Promise<number>;
}

// Current implementation
class EstimatedTravelService implements TravelService {
  async calculateTravelTime(): Promise<number> {
    return 15; // Fixed estimate
  }
}

// Future: GoogleMapsTravelService
```

---

## 9. Migration Challenges & Solutions

### Challenge 1: Regex Pattern Preservation

**Solution:**
- Copy ALL patterns exactly from EventProcessor
- Comprehensive unit tests with real event titles
- Test against current event data export

### Challenge 2: Multi-day Events

**Solution:**
- Keep `calculateEventDurationForDay()` logic identical
- Overnight events: 12hr cap per day
- Calendar grid: CSS grid-column spanning

### Challenge 3: Workload Calculations

**Solution:**
- Keep ALL calculation logic from WorkloadCalculator
- Use computed() for derived metrics
- Memoize expensive calculations

### Challenge 4: Real-time Updates

**Solution:**
- Polling every 15 min (RxJS interval)
- Manual refresh button
- Cache with expiry
- Show "last updated" timestamp

```typescript
startAutoRefresh(): Observable<CalendarEvent[]> {
  return interval(15 * 60 * 1000).pipe(
    switchMap(() => this.loadEventsFromCalendars()),
    shareReplay(1)
  );
}
```

### Challenge 5: Export Functionality

**Solution:**
- Keep EventListExporter logic
- Blob API for file download
- Clipboard API for copy
- Material dialog for options

---

## 10. Testing Strategy

### Unit Tests

**Services:**
- EventProcessorService (pattern matching)
- WorkloadService (calculation accuracy)
- DataService (storage operations)
- TemplatesService (CRUD)

**Example:**
```typescript
describe('EventProcessorService', () => {
  it('should identify 30-minute work event', () => {
    expect(service.isWorkEvent('Fluffy - 30')).toBe(true);
  });

  it('should exclude personal events', () => {
    expect(service.isWorkEvent('Doctor appointment')).toBe(false);
  });
});
```

### Component Tests

**Focus:**
- Input/Output behavior
- Template rendering
- User interactions

### E2E Tests

**Critical Flows:**
1. Connect Google Calendar
2. Create template
3. Create appointment from template
4. View day details
5. Export event list
6. Change workload thresholds

---

## 11. Performance Optimizations

### Rendering
1. OnPush change detection on all components
2. Virtual scrolling for long lists (CDK)
3. Lazy loading for feature modules
4. Memoization with computed()

### Bundle Size
1. Tree shaking (import only needed Material modules)
2. Date-fns with specific imports
3. Lazy images
4. Chart library code splitting

### Data Loading
1. 15-minute cache for events
2. LocalStorage for instant load
3. Debounced search/filter
4. Pagination for analytics if needed

---

## 12. Deployment Configuration

### AWS Amplify Hosting

**File:** `amplify.yml`

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist/pet-genie
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Environment Variables

```bash
# .env
VITE_GOOGLE_CALENDAR_CLIENT_ID=<oauth-client-id>
VITE_AMPLIFY_REGION=us-east-1
```

---

## 13. Critical Files for Implementation

Based on this plan, these are the 5 most critical files:

1. **src/app/core/services/event-processor.service.ts**
   - Core business logic for work event detection
   - Must preserve ALL regex patterns exactly
   - Foundation for entire app

2. **src/app/core/services/google-calendar.service.ts**
   - Google Calendar OAuth and event fetching
   - Critical for data source
   - Token management

3. **src/app/features/analytics/services/workload.service.ts**
   - Workload calculations and level determination
   - Used throughout app for color coding
   - Burnout analysis

4. **src/app/features/calendar/components/calendar-grid/calendar-grid.component.ts**
   - Most complex UI component
   - Multi-day events, workload coloring
   - Custom calendar rendering

5. **amplify/data/resource.ts**
   - AWS Amplify data schema
   - Templates and settings storage
   - Multi-device sync

---

## 14. Success Criteria

### Functional
- [ ] All gps-admin features working identically
- [ ] Google Calendar integration functional
- [ ] Templates sync to AWS Amplify
- [ ] Workload calculations match original exactly
- [ ] All calendar views render correctly
- [ ] Export functionality works

### Technical
- [ ] TypeScript strict mode with no errors
- [ ] All unit tests passing
- [ ] E2E tests for critical flows passing
- [ ] Performance: < 3s initial load
- [ ] Bundle size: < 1MB initial
- [ ] Accessibility: WCAG 2.1 AA compliant

### User Experience
- [ ] Responsive on mobile/tablet/desktop
- [ ] Material Design consistently applied
- [ ] Loading states for all async operations
- [ ] Error messages user-friendly
- [ ] Offline support via PWA

---

## 15. Risk Mitigation

### Data Migration
- Export current gps-admin data before migration
- Import script for existing users
- Keep gps-admin running in parallel initially

### Pattern Matching Regression
- Comprehensive unit tests with real titles
- Test against exported event data
- Validate against current app

### Google API Changes
- Pin Google API script versions
- Abstract behind service interface
- Monitor changelog

### AWS Amplify Sync Issues
- LocalStorage as source of truth
- Amplify is backup/sync only
- Graceful degradation
- Manual sync button

---

## Timeline

**Total:** 8 weeks (1-2 developers)

- Week 1: Foundation
- Week 2: Settings & Google Calendar
- Week 3: Templates
- Week 4-5: Calendar Views
- Week 6: Dashboard
- Week 7: Analytics
- Week 8: Export & Polish

---

## Future Enhancements (Post-MVP)

1. Google Maps integration (real travel time)
2. Recurring events
3. Multi-user/team calendars
4. Mobile app (Ionic/Capacitor)
5. AI scheduling suggestions
6. Burnout prediction ML model
7. Client management integration
8. Invoicing integration
