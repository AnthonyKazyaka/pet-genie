# Pet Genie Mobile Feature Roadmap

## Overview
This document tracks the feature parity implementation between the web app (Angular/Material) and mobile app (React Native/Expo). The mobile version is now at approximately 95% feature parity.

**Last Updated:** January 22, 2026

---

## Feature Gap Summary

| Priority | Feature | Status | Notes |
|----------|---------|--------|-------|
| HIGH | Dashboard Screen | ✅ Completed | Quick stats, burnout warnings, setup progress |
| HIGH | Calendar Day View | ✅ Completed | Month/Week/Day toggle |
| MEDIUM | Multi-Event Scheduling | ✅ Completed | Bulk event creation |
| MEDIUM | Client Auto-Matching | ✅ Completed | Auto-link events to clients |
| LOW | Polish & UX | ✅ Completed | Skeletons, toasts, settings |
| LOW | Onboarding Flow | ✅ Completed | First-time setup wizard |

---

## Detailed Implementation Plan

### 1. Dashboard Screen ✅ COMPLETED
**Files:**
- [x] `mobile/app/(tabs)/dashboard.tsx` - Main dashboard component
- [x] `mobile/components/DashboardCard.tsx` - Reusable stat card
- [x] `mobile/components/SetupProgress.tsx` - Setup wizard progress
- [x] `mobile/components/BurnoutWarning.tsx` - Burnout alert banner
- [x] `mobile/components/UpcomingEvents.tsx` - Grouped upcoming events

**Features:**
- [x] Quick statistics (today's visits, hours, weekly summary)
- [x] Setup progress tracking (calendar, templates, thresholds)
- [x] Burnout warnings with violation details
- [x] Upcoming events grouped by day
- [x] Pull-to-refresh

---

### 2. Calendar Day View ✅ COMPLETED
**Files:**
- [x] `mobile/components/DayView.tsx` - Day view component
- [x] `mobile/app/(tabs)/calendar.tsx` - Updated with Day toggle

**Features:**
- [x] Month/Week/Day toggle
- [x] Hourly time slots (6am-10pm)
- [x] Event blocks with positioning
- [x] Navigate to visit detail on tap
- [x] Current time indicator

---

### 3. Multi-Event Scheduling ✅ COMPLETED
**Files:**
- [x] `mobile/components/MultiEventModal.tsx` - Bulk creation modal
- [x] `mobile/services/multi-event.service.ts` - Event generation logic

**Features:**
- [x] Daily visits or overnight stays
- [x] Weekend vs weekday slots
- [x] Conflict detection with existing events
- [x] Preview before creation
- [x] Duration and time configuration

---

### 4. Client Auto-Matching ✅ COMPLETED
**Files:**
- [x] `mobile/services/event-client-mapping.service.ts` - Added auto-match logic
- [x] `mobile/components/AutoMatchSuggestion.tsx` - UI for suggestions

**Features:**
- [x] Parse event titles for client/pet names
- [x] Suggest matches with confidence score (High/Medium/Low)
- [x] Accept/reject interface (compact and full modes)
- [x] Levenshtein distance for fuzzy matching
- [x] Combines existing mappings with auto-suggestions

---

### 5. Polish & UX Improvements ✅ COMPLETED
**Files:**
- [x] `mobile/components/Toast.tsx` - Toast notification system with provider
- [x] `mobile/components/Skeleton.tsx` - Added SkeletonDashboard preset
- [x] `mobile/models/settings.model.ts` - Added new settings

**Features:**
- [x] Skeleton loaders (Dashboard, Calendar, Cards, Stats, Charts)
- [x] Toast notifications (success, error, warning, info)
- [x] `showWeekNumbers` setting
- [x] `use24HourTime` setting
- [x] Toast provider integrated in root layout

---

### 6. Onboarding Flow ✅ COMPLETED
**Files:**
- [x] `mobile/components/OnboardingFlow.tsx` - Complete onboarding flow
- [x] `mobile/app/_layout.tsx` - Integrated onboarding check

**Features:**
- [x] Welcome screen with app introduction
- [x] Connect Google Calendar step
- [x] Add first client step (optional)
- [x] Create template step (optional)
- [x] Completion celebration
- [x] Skip functionality for optional steps
- [x] Persists completion state

---

## Progress Log

### January 22, 2026 - Session Complete
- ✅ Created roadmap document
- ✅ Dashboard implementation complete
- ✅ Calendar Day View complete
- ✅ Multi-Event Scheduling complete
- ✅ Client Auto-Matching complete
- ✅ Polish & UX (Toast, Skeleton, Settings) complete
- ✅ Onboarding Flow complete

---

## New Files Created

```
mobile/
├── app/
│   └── (tabs)/
│       ├── dashboard.tsx (NEW)
│       ├── _layout.tsx (MODIFIED - added Dashboard tab)
│       └── calendar.tsx (MODIFIED - Day view toggle)
├── components/
│   ├── DashboardCard.tsx (NEW)
│   ├── SetupProgress.tsx (NEW)
│   ├── BurnoutWarning.tsx (NEW)
│   ├── UpcomingEvents.tsx (NEW)
│   ├── DayView.tsx (NEW)
│   ├── MultiEventModal.tsx (NEW)
│   ├── AutoMatchSuggestion.tsx (NEW)
│   ├── Toast.tsx (NEW)
│   ├── OnboardingFlow.tsx (NEW)
│   └── Skeleton.tsx (MODIFIED - added SkeletonDashboard)
├── services/
│   ├── multi-event.service.ts (NEW)
│   └── event-client-mapping.service.ts (MODIFIED - auto-match)
└── models/
    ├── settings.model.ts (MODIFIED - new display settings)
    └── workload.model.ts (MODIFIED - filterWorkEvents)
```

---

## Technical Notes

### Tab Navigation Changes
- Dashboard is now the home tab (index 0)
- "Today" renamed to "Visits"

### Toast System
- Use `useToast()` hook for notifications
- Methods: `success()`, `error()`, `warning()`, `info()`
- Supports action buttons and auto-dismiss

### Auto-Matching Algorithm
- Uses Levenshtein distance for fuzzy string matching
- Checks client names, pet names, and "Client - Service" patterns
- Returns confidence scores (0-1) with categorization (High/Medium/Low)

### Onboarding
- Checks `onboarding_complete` key in AsyncStorage
- Required steps: Welcome, Calendar connection
- Optional steps: Add client, Create template
- Can be reset with `resetOnboarding()` for testing
- Current "Today" view renamed to "Visits"
- Tab order: Dashboard → Visits → Calendar → Clients → Analytics → Settings

### Dependencies
- No new npm packages required
- Reusing existing hooks and services

### Testing Checklist
- [ ] Dashboard loads without errors
- [ ] Day view displays events correctly
- [ ] Multi-event creation works
- [ ] Auto-matching suggestions appear
- [ ] All new settings persist
- [ ] Onboarding completes successfully
