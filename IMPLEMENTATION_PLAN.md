# Pet Genie Implementation Plan

## Overview
This document tracks the implementation of features from the gps-admin repository into the Angular-based pet-genie application. The goal is to maintain best practices by modularizing code into separate `.ts`, `.css`, and `.html` files while extracting shared logic into services and models.

**Created**: December 2, 2025  
**Last Updated**: December 2, 2025  
**Status**: Implementation Completed (all planned tasks delivered)

---

## Features to Implement (from gps-admin commits)

### High Priority Features

#### 1. Multi-Event Scheduling ✅ Completed
**Source**: Commit `d9bbbe5c852c4f2e8a03e7b8040f9528849c628a`
**Description**: Allow users to create multiple events at once (e.g., daily visits over a date range, overnight stays with drop-in visits).

**Components to Create/Modify**:
- [x] `src/app/features/scheduling/multi-event-dialog/multi-event-dialog.component.ts`
- [x] `src/app/features/scheduling/multi-event-dialog/multi-event-dialog.component.html`
- [x] `src/app/features/scheduling/multi-event-dialog/multi-event-dialog.component.scss`
- [x] `src/app/models/multi-event.model.ts` - Define multi-event configuration interfaces
- [x] `src/app/core/services/multi-event.service.ts` - Business logic for generating multiple events

**Key Interfaces**:
```typescript
interface MultiEventConfig {
  clientName: string;
  location: string;
  startDate: Date;
  endDate: Date;
  bookingType: 'daily-visits' | 'overnight-stay';
  visits: VisitSlot[];
  weekendVisits?: VisitSlot[];
  overnightConfig?: OvernightConfig;
  dropinConfig?: DropinConfig;
}

interface VisitSlot {
  templateId: string;
  time: string; // HH:mm format
  duration: number; // minutes
}

interface OvernightConfig {
  templateId: string;
  arrivalTime: string;
  departureTime: string;
}
```

---

#### 2. Event Export with Grouping & Sorting ✅ Completed
**Source**: Commits `9110749`, `574e4bd`, `99880414`, `4c357679`, `774b4f7e`, `133e6af1`
**Description**: Export events to text/file with multi-level grouping and sorting options.

**Components to Create**:
- [x] `src/app/features/export/export-dialog/export-dialog.component.ts`
- [x] `src/app/features/export/export-dialog/export-dialog.component.html`
- [x] `src/app/features/export/export-dialog/export-dialog.component.scss`
- [x] `src/app/core/services/event-exporter.service.ts` - Export logic
- [x] `src/app/models/export.model.ts` - Export configuration interfaces

**Key Features**:
- Multi-level grouping (up to 4 levels): date, client, service, week, month
- Reorderable grouping levels with move up/down buttons
- Multi-level sorting with add/remove functionality
- Live preview of export output
- Copy to clipboard and download as file
- Filter by work events only

**Key Interfaces**:
```typescript
interface ExportOptions {
  startDate: Date;
  endDate: Date;
  includeTime: boolean;
  includeLocation: boolean;
  groupLevels: GroupLevel[];
  sortLevels: SortLevel[];
  workEventsOnly: boolean;
}

interface GroupLevel {
  field: 'date' | 'client' | 'service' | 'week' | 'month';
  order: number;
}

interface SortLevel {
  field: 'date' | 'client' | 'service' | 'time';
  direction: 'asc' | 'desc';
}
```

---

#### 3. Template Enhancements ✅ Completed
**Source**: Commits `2152e629`, `bc612f3b`
**Description**: Add default start/end times and custom duration controls to templates.

**Files to Modify**:
- [x] `src/app/models/template.model.ts` - Add `defaultStartTime` and `defaultEndTime` fields
- [x] `src/app/features/templates/template-dialog.component.ts` - Add time picker controls
- [x] `src/app/features/templates/template-dialog.component.html` - Update form layout
- [x] `src/app/features/templates/template-dialog.component.scss` - Duration controls styling

**Changes to Template Interface**:
```typescript
interface Template {
  // Existing fields...
  defaultStartTime?: string; // HH:mm format
  defaultEndTime?: string;   // HH:mm format
  // Duration adjustment controls in UI
}
```

---

### Medium Priority Features

#### 4. Overnight Event Handling ✅ Completed
**Source**: Commit `b39e420a`
**Description**: Enhanced handling and display of overnight events.

**Files to Create/Modify**:
- [x] `src/app/core/services/event-processor.service.ts` - Add overnight detection
- [x] `src/app/features/calendar/calendar.component.scss` - Overnight event styles
- [x] Add `isOvernightEvent()` helper method
- [x] Add `calculateOvernightNights()` helper method

---

#### 5. Calendar Navigation Enhancement ✅ Completed
**Source**: Commit `08f01f90`
**Description**: Support varying navigation periods (day/week/month).

**Files to Modify**:
- [x] `src/app/features/calendar/calendar.component.ts` - Enhanced navigation methods
- [x] Add `navigateByPeriod(period: 'day' | 'week' | 'month', direction: number)` method

---

#### 6. Mobile Sidebar Improvements ✅ Completed
**Source**: Commit `7db4ba82`
**Description**: Close sidebar when clicking outside on mobile.

**Files to Modify**:
- [x] `src/app/layout/app-shell/app-shell.component.ts` - Add click-outside handler
- [x] Ensure proper touch target sizes (already addressed in previous work)

---

### Lower Priority Features

#### 7. Download Events as JSON ✅ Completed
**Source**: Commit `ec0ce51d`
**Description**: Allow users to download all events as a JSON file.

**Files to Modify**:
- [x] `src/app/core/services/data.service.ts` - Add `downloadEventsAsJSON()` method

---

#### 8. Work Events Filtering ✅ Completed
**Source**: Commits `bf4dbfd9`, `210f354b`
**Description**: Filter to show only work events (pet sitting appointments) vs all calendar events.

**Files to Create/Modify**:
- [x] `src/app/core/services/event-processor.service.ts` - Add work event detection
- [x] `src/app/models/event.model.ts` - Add `isWorkEvent` property

---

## File Modularization Tasks

### Phase 1: Break Apart Existing Component Files ✅ Completed

#### Templates Component
- [x] Extract `templates.component.ts` template to `templates.component.html`
- [x] Extract styles to `templates.component.scss` (if inline)
- [x] Extract `template-dialog.component.ts` template to `template-dialog.component.html`

#### Calendar Component  
- [x] Already has separate `.css` file ✅
- [x] Extract template to `calendar.component.html`

#### Dashboard Component
- [x] Extract template to `dashboard.component.html`
- [x] Create `dashboard.component.scss`

#### Analytics Component
- [x] Already has separate `.css` file ✅
- [x] Extract template to `analytics.component.html`

#### Settings Component
- [x] Extract template to `settings.component.html`
- [x] Create `settings.component.scss`

### SCSS Refactor (CSS → SCSS)
- [x] SkeletonLoaderComponent styles moved to `skeleton-loader.component.scss` using shared variables/mixins
- [x] AppShell styles moved to `app-shell.component.scss`
- [x] ConfirmDialog styles moved to `confirm-dialog.component.scss`
- [x] EmptyState styles moved to `empty-state.component.scss`
- [x] SettingsComponent styles moved to SCSS
- [x] CalendarComponent styles moved to SCSS
- [x] DashboardComponent styles moved to SCSS
- [x] AnalyticsComponent styles moved to SCSS
- [x] TemplateDialogComponent styles moved to SCSS
- [x] TemplatesComponent styles moved to SCSS
- [x] AppComponent styles moved to SCSS

### Phase 2: Create Shared Services ✅ Completed

#### Event Processor Service Enhancements
- [x] Add work event pattern detection
- [x] Add overnight event handling
- [x] Add event duration calculations
- [x] Add client name extraction from titles

#### Export Service (New)
- [x] Multi-level grouping logic
- [x] Multi-level sorting logic
- [x] Text formatting for exports
- [x] File download utilities

#### Multi-Event Service (New)
- [x] Event generation from config
- [x] Conflict detection
- [x] Validation logic

---

## Implementation Order

### Sprint 1: Foundation & Modularization
1. ✅ Break apart component files (Phase 1)
2. ✅ Update Template model with new fields
3. ✅ Enhance event-processor.service.ts with work event detection

### Sprint 2: Export Feature
4. ✅ Create export models and interfaces
5. ✅ Implement EventExporterService
6. ✅ Create ExportDialogComponent with full UI

### Sprint 3: Multi-Event Scheduling
7. ✅ Create multi-event models
8. ✅ Implement MultiEventService
9. ✅ Create MultiEventDialogComponent

### Sprint 4: Polish & Enhancements
10. ✅ Overnight event handling (helpers added, styles completed)
11. ✅ Calendar navigation improvements
12. ✅ Mobile improvements
13. ✅ JSON export functionality

---

## Progress Tracking

| Feature | Status | Started | Completed | Notes |
|---------|--------|---------|-----------|-------|
| Component Modularization | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | SCSS refactor done; settings, calendar, dashboard, analytics, templates moved to external HTML/SCSS |
| Template Enhancements | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | Added default start/end time fields and time pickers; styled time controls |
| Event Export | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | Models/service/dialog plus calendar export button with default range |
| Multi-Event Scheduling | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | Multi-event models/service/dialog with validation & conflicts |
| Overnight Handling | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | isOvernightEvent + calculateOvernightNights and SCSS styles |
| Calendar Navigation | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | navigateByPeriod added for day/week/month |
| Mobile Improvements | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | Click-outside handler added to close sidenav on mobile |
| JSON Export | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | downloadEventsAsJSON added to DataService |
| Work Events Filter | ✅ Completed | Dec 2, 2025 | Dec 2, 2025 | isWorkEvent flag and detection implemented |

---

## Technical Notes

### Angular Best Practices
- Use standalone components with explicit imports
- Prefer signals over BehaviorSubject for reactive state
- Use OnPush change detection where possible
- Lazy load feature modules where appropriate

### Material Design Integration
- Use Angular Material components consistently
- Follow Material Design 3 theming patterns
- Leverage mat-dialog for modal dialogs
- Use mat-snack-bar for notifications

### File Naming Conventions
- Components: `feature-name.component.ts/html/css`
- Services: `service-name.service.ts`
- Models: `model-name.model.ts`
- Guards: `guard-name.guard.ts`

### Testing Strategy
- Unit tests for services with business logic
- Component tests for UI interactions
- E2E tests for critical user flows

---

## References

- [Angular Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)
- [Material Design 3](https://m3.material.io/)
- [gps-admin Repository](https://github.com/AnthonyKazyaka/gps-admin)
