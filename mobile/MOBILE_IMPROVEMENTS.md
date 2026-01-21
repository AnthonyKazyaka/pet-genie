# Pet Genie Mobile App - Improvements & Next Steps

> Last Updated: January 20, 2026

This document tracks improvements, refinements, and features needed for the Pet Genie mobile app to achieve feature parity with the web app and provide a polished mobile experience.

## Quick Summary

| Category | Pending | In Progress | Completed |
|----------|---------|-------------|-----------|
| Critical Infrastructure | 3 | 0 | 0 |
| Feature Parity | 4 | 0 | 6 |
| UI/UX Improvements | 8 | 0 | 0 |
| Code Quality | 5 | 0 | 0 |
| **Total** | **20** | **0** | **6** |

---

## 🔴 Critical Infrastructure (Must Have)

| ID | Task | Description | Status | Priority |
|----|------|-------------|--------|----------|
| CI-1 | Google Calendar Integration | Replace mock data with actual Google Calendar API sync using `expo-auth-session` and Google OAuth | ⬜ Pending | P0 |
| CI-2 | Real-time Calendar Sync | Implement background sync and webhook/polling for calendar updates | ⬜ Pending | P0 |
| CI-3 | Push Notifications | Implement push notifications for visit reminders using `expo-notifications` | ⬜ Pending | P1 |

---

## 🟡 Feature Parity with Web App

| ID | Task | Description | Status | Priority |
|----|------|-------------|--------|----------|
| FP-1 | Calendar View | Month view with day cells, event dots, tap-to-view details | ✅ Completed | P0 |
| FP-2 | Templates Feature | Template CRUD, type filtering, emoji icons, travel buffer | ✅ Completed | P1 |
| FP-3 | Export Feature | Date range selection, summary/detailed/CSV formats, Share API | ✅ Completed | P1 |
| FP-4 | RulesEngine Service | Burnout protection, workload limits, violation detection | ✅ Completed | P1 |
| FP-5 | Analytics Dashboard | Visit stats, service breakdown, workload tracking | ✅ Completed | P1 |
| FP-6 | Visit Records | Check-in/out, notes, summary generation | ✅ Completed | P1 |
| FP-7 | Week View Mode | Calendar week view with time slots (web has day/week/month) | ⬜ Pending | P2 |
| FP-8 | Day View Mode | Calendar day view with hourly time grid | ⬜ Pending | P2 |
| FP-9 | Multi-Event Creation | Create recurring/multiple events from templates | ⬜ Pending | P2 |
| FP-10 | Export Templates | Save and reuse export configurations | ⬜ Pending | P3 |

---

## 🟢 UI/UX Improvements

| ID | Task | Description | Status | Priority |
|----|------|-------------|--------|----------|
| UX-1 | Dark Mode Support | Implement proper dark mode theming throughout app | ⬜ Pending | P1 |
| UX-2 | Skeleton Loading States | Replace basic spinners with skeleton loaders for better perceived performance | ⬜ Pending | P2 |
| UX-3 | Pull-to-Refresh Animations | Add custom refresh animations with branding | ⬜ Pending | P3 |
| UX-4 | Haptic Feedback | Add haptic feedback for check-in/out, saves, deletions | ⬜ Pending | P2 |
| UX-5 | Swipe Actions | Add swipe-to-delete/edit on client cards and visit cards | ⬜ Pending | P2 |
| UX-6 | Bottom Sheet Modals | Replace full-screen modals with bottom sheets for quick actions | ⬜ Pending | P2 |
| UX-7 | Animation Polish | Add enter/exit animations, list item animations | ⬜ Pending | P3 |
| UX-8 | Accessibility Audit | Ensure proper VoiceOver/TalkBack support, contrast ratios | ⬜ Pending | P1 |

---

## 🔵 Code Quality & Technical Debt

| ID | Task | Description | Status | Priority |
|----|------|-------------|--------|----------|
| CQ-1 | Unit Tests | Add comprehensive unit tests for hooks and services | ⬜ Pending | P1 |
| CQ-2 | Remove Mock Data | Replace all `generateMockEvents()` with real data sources | ⬜ Pending | P0 |
| CQ-3 | Error Boundaries | Add React error boundaries with fallback UI | ⬜ Pending | P2 |
| CQ-4 | Form Validation | Add proper form validation with error messages (Zod/Yup) | ⬜ Pending | P2 |
| CQ-5 | Type Safety Audit | Review and strengthen TypeScript types, remove `any` | ⬜ Pending | P2 |

---

## Detailed Analysis

### 1. Current State Assessment

#### ✅ What's Working Well

1. **Core CRUD Operations**: Clients, Pets, Visit Records all have functional hooks with AsyncStorage persistence
2. **Navigation Structure**: Tab-based navigation with proper routing using Expo Router
3. **Component Library**: Reusable components (Button, StatusBadge, VisitCard, EmptyState)
4. **Settings Management**: Full settings screen with work limits, display preferences
5. **Analytics Dashboard**: Stat cards, progress bars, service breakdowns
6. **Templates System**: Full CRUD with emoji picker, type filtering, travel buffer
7. **Export System**: Multiple formats (summary, detailed, CSV) with Share API integration
8. **Rules Engine**: Burnout protection with violation detection and indicators

#### ⚠️ Areas Needing Attention

1. **Mock Data Dependency**: All screens use `generateMockEvents()` instead of real calendar data
2. **No Authentication**: No user authentication or Google OAuth flow
3. **Limited Calendar Views**: Only month view implemented (web has day/week/month)
4. **No Offline Support**: No data caching or offline-first architecture
5. **No Push Notifications**: Reminder settings exist but notifications not implemented
6. **Minimal Testing**: Only one test file exists (`StyledText-test.js`)

### 2. File-by-File Review

#### Screens

| File | Purpose | Issues | Recommendations |
|------|---------|--------|-----------------|
| `(tabs)/index.tsx` | Today's visits | Uses mock data, warning banner could be collapsible | Integrate real calendar API |
| `(tabs)/two.tsx` | Clients list | Working well | Add search debouncing |
| `(tabs)/calendar.tsx` | Calendar view | Uses mock data, only month view | Add week/day views |
| `(tabs)/analytics.tsx` | Analytics dashboard | Uses mock data | Connect to real visit records |
| `(tabs)/settings.tsx` | Settings | Working well | Add theme selection |
| `visit/[id].tsx` | Visit detail | Uses mock events | Needs real event loading |
| `client/[id].tsx` | Client detail | Working well | Add contact actions (call, email) |
| `templates.tsx` | Templates | Working well | Add template usage analytics |
| `export.tsx` | Export | Uses mock data | Connect to real visit records |

#### Hooks

| Hook | Purpose | Issues | Recommendations |
|------|---------|--------|-----------------|
| `useClients` | Client CRUD | Working | Add bulk operations |
| `usePets` | Pet CRUD | Working | Add photo support |
| `useVisitRecords` | Visit tracking | Working | Add sync with calendar |
| `useSettings` | App settings | Working | Add migration for new fields |
| `useAnalytics` | Stats calculation | Working | Memoize expensive calculations |
| `useRulesEngine` | Burnout rules | Working | Add custom rule support |
| `useTemplates` | Template CRUD | Working | Add import/export |
| `useEventClientMapping` | Event-client link | Working | Add fuzzy matching |

#### Services

| Service | Purpose | Issues | Recommendations |
|---------|---------|--------|-----------------|
| `storage.service.ts` | AsyncStorage wrapper | Working | Add encryption option |
| `visit-summary.service.ts` | Summary generation | Working | Add markdown format |
| `rules-engine.service.ts` | Workload rules | Working | Add time-of-day rules |
| `event-client-mapping.service.ts` | Client matching | Basic impl | Add learning/suggestion |

### 3. Missing Components Compared to Web

| Web Component | Mobile Status | Notes |
|---------------|---------------|-------|
| Google OAuth Flow | ❌ Missing | Need expo-auth-session |
| Calendar Day View | ❌ Missing | Hourly time grid |
| Calendar Week View | ❌ Missing | 7-day time grid |
| Multi-Event Dialog | ❌ Missing | Create multiple events |
| Skeleton Loaders | ❌ Missing | Better loading states |
| Theme Service | ❌ Missing | Dark/light mode |
| Event Processor | ⚠️ Partial | Basic in visit summary |
| Workload Service | ⚠️ Partial | Merged into rules engine |

### 4. Recommended Implementation Order

#### Phase 1: Critical Path (Weeks 1-2)
1. **CI-1**: Google Calendar Integration
2. **CQ-2**: Remove all mock data
3. **CI-2**: Calendar sync implementation

#### Phase 2: Polish (Weeks 3-4)
4. **UX-1**: Dark mode support
5. **UX-8**: Accessibility audit
6. **CQ-1**: Unit tests for hooks

#### Phase 3: Enhanced Features (Weeks 5-6)
7. **FP-7**: Week view mode
8. **FP-8**: Day view mode
9. **CI-3**: Push notifications

#### Phase 4: Nice-to-Have (Weeks 7+)
10. **UX-5**: Swipe actions
11. **FP-9**: Multi-event creation
12. **UX-4**: Haptic feedback

---

## Implementation Notes

### Google Calendar Integration (CI-1)

```typescript
// Recommended packages:
// - expo-auth-session (OAuth flow)
// - expo-web-browser (Auth redirect)
// - expo-secure-store (Token storage)

// Key implementation steps:
// 1. Configure Google Cloud project with iOS/Android OAuth clients
// 2. Implement OAuth flow with expo-auth-session
// 3. Store tokens securely with expo-secure-store
// 4. Create GoogleCalendarService similar to web version
// 5. Replace all generateMockEvents() calls with API calls
```

### Dark Mode (UX-1)

```typescript
// Current Colors.ts already has light/dark definitions
// Need to:
// 1. Create ThemeContext provider
// 2. Hook into useColorScheme from react-native
// 3. Add theme toggle in settings
// 4. Audit all hardcoded colors in StyleSheet
```

### Unit Testing (CQ-1)

```typescript
// Recommended setup:
// - Jest (already configured via expo)
// - @testing-library/react-native
// - Mock AsyncStorage

// Priority test files:
// 1. useClients.test.ts
// 2. useVisitRecords.test.ts
// 3. rules-engine.service.test.ts
// 4. visit-summary.service.test.ts
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-20 | Initial analysis document |

---

## Legend

- ⬜ Pending
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked

**Priority Scale:**
- P0: Critical - Must have for MVP
- P1: High - Important for user experience
- P2: Medium - Nice to have
- P3: Low - Future enhancement
