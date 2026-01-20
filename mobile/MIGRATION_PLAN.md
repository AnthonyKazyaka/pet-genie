# Pet Genie Mobile App - Migration Plan

## Overview

This document tracks the implementation of the Pet Genie mobile app using React Native (Expo).
The mobile app mirrors the functionality from the Angular web app's backlog, focusing on the
MVP features for daily pet sitting workflow management.

**Created**: January 20, 2026
**Status**: Core Features Complete

---

## Architecture

### Tech Stack

- **Framework**: React Native with Expo (SDK 54)
- **Router**: Expo Router (file-based routing)
- **State Management**: React Hooks with local state
- **Persistence**: AsyncStorage (localStorage equivalent)
- **Icons**: @expo/vector-icons (FontAwesome)

### Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   │   ├── _layout.tsx    # Tab bar configuration
│   │   ├── index.tsx      # Today screen
│   │   └── two.tsx        # Clients screen
│   ├── visit/
│   │   └── [id].tsx       # Visit detail screen
│   ├── client/
│   │   ├── [id].tsx       # Client detail/edit screen
│   │   └── new.tsx        # New client screen
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
│   ├── Button.tsx
│   ├── EmptyState.tsx
│   ├── StatusBadge.tsx
│   ├── Themed.tsx
│   └── VisitCard.tsx
├── hooks/                 # Data management hooks
│   ├── useClients.ts
│   ├── usePets.ts
│   └── useVisitRecords.ts
├── models/                # TypeScript interfaces
│   ├── client.model.ts
│   ├── pet.model.ts
│   ├── visit-record.model.ts
│   └── event.model.ts
└── services/              # Business logic
    └── storage.service.ts
```

---

## Implemented Features

### Phase 1: Foundation ✅

- [x] Create project structure
- [x] Set up Expo Router navigation
- [x] Configure tab bar with icons

### Phase 2: Core Features ✅

- [x] Port domain models (Client, Pet, VisitRecord, CalendarEvent)
- [x] Create StorageService for AsyncStorage
- [x] Build data hooks (useClients, usePets, useVisitRecords)

### Phase 3: Today View ✅

- [x] Today screen with visit cards (PG-3.1, PG-3.2)
- [x] Stats summary (upcoming, in-progress, completed)
- [x] Pull-to-refresh functionality
- [x] Navigation to visit details

### Phase 4: Visit Lifecycle ✅

- [x] Visit detail screen (PG-4.3)
- [x] Check-in/check-out functionality (PG-4.1)
- [x] Visit notes editing (PG-4.2)
- [x] Visit summary generation (PG-6.1, PG-6.2, PG-6.3)
- [x] Copy to clipboard

### Phase 5: Client Management ✅

- [x] Client list with search (PG-5.1)
- [x] Client CRUD operations
- [x] Pet management per client (PG-5.2)
- [x] Emergency contact support

---

## Backlog Mapping

| Backlog Item | Status | Mobile Implementation |
| ------------ | ------ | --------------------- |
| PG-3.1 Today feature module | ✅ | `app/(tabs)/index.tsx` |
| PG-3.2 Today list view | ✅ | `components/VisitCard.tsx` |
| PG-3.3 Link events to VisitRecords | ✅ | `hooks/useVisitRecords.ts` |
| PG-4.1 Check-in/Check-out | ✅ | `app/visit/[id].tsx` |
| PG-4.2 Visit notes | ✅ | `app/visit/[id].tsx` |
| PG-4.3 Visit Detail screen | ✅ | `app/visit/[id].tsx` |
| PG-5.1 Client list & edit UI | ✅ | `app/(tabs)/two.tsx`, `app/client/[id].tsx` |
| PG-5.2 Pet management per client | ✅ | `app/client/[id].tsx` |
| PG-5.3 Event ↔ Client association | 🔄 | Partial (mock data) |
| PG-6.1 VisitSummaryService | ✅ | Inline in visit detail |
| PG-6.2 Template-based summary | ✅ | Visit detail screen |
| PG-6.3 "Generate Summary" action | ✅ | Visit detail screen |

---

## Remaining Work

### High Priority

1. **Google Calendar Integration** - Replace mock data with actual calendar sync
2. **Client-Event Association** (PG-5.3) - Link calendar events to stored clients

### Medium Priority

3. **Analytics Dashboard** - Port analytics from web app
4. **Settings Screen** - App preferences and configuration

### Future

5. **Push Notifications** - Visit reminders
6. **Offline Support** - Queue operations when offline
7. **Backend Sync** - AWS Amplify integration

---

## Running the App

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (Mac only)
npx expo run:ios
```

---

## Notes

- Currently using mock visit data for demonstration
- All data persisted locally via AsyncStorage
- Ready for Google Calendar API integration
- Compatible with both iOS and Android

