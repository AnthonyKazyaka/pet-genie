# @pet-genie/shared

Shared models, utilities, and constants for Pet Genie web and mobile applications.

## Purpose

This package provides a **single source of truth** for code that is shared between:
- **Web Application** (Angular) - `src/`
- **Mobile Application** (React Native/Expo) - `mobile/`

## Contents

### Models (`/models`)
TypeScript interfaces and types for core data structures:
- `AppSettings` - User preferences and configurable thresholds
- `CalendarEvent` - Google Calendar event with pet-genie extensions
- `VisitRecord` - Visit lifecycle tracking
- `Client`, `Pet` - Client and pet information
- `Template` - Appointment templates
- Analytics and workload-related types

### Utilities (`/utils`)
Pure functions for common operations:

#### Date Utilities
- `formatTime()`, `formatDate()` - Consistent date/time formatting
- `formatDateHeader()`, `formatSectionDate()` - Smart headers with "Today", "Tomorrow"
- `getGreeting()` - Time-of-day greetings
- Date range helpers: `getStartOfDay()`, `getStartOfWeek()`, `getStartOfMonth()`, etc.

#### Calculation Utilities
- `calculateMonthlyMetrics()` - Monthly visit/hours statistics
- `calculateDateRangeMetrics()` - Custom range metrics
- `calculateDayWorkHours()` - Daily work hours from events
- `getWorkloadLevel()` - Workload assessment
- `filterWorkEvents()` - Filter to work-related events only

#### Format Utilities
- `getServiceLabel()` - Service type display names
- `formatCurrency()`, `formatNumber()`, `formatPercent()` - Number formatting
- `truncate()`, `capitalize()`, `getInitials()` - String utilities

### Constants (`/constants`)
Shared configuration values:

#### Workload Colors
- `WORKLOAD_COLORS` - Light theme colors by workload level
- `WORKLOAD_COLORS_DARK` - Dark theme colors

#### Service Types
- `SERVICE_TYPE_LABELS` - Display labels
- `SERVICE_TYPE_ICONS` - Emoji icons
- `SERVICE_TYPE_COLORS` - UI accent colors
- `SERVICE_TYPE_DURATIONS` - Default durations

## Usage

### In Mobile App (React Native)

The mobile app re-exports from the shared package through `@/models`:

```typescript
// All models and utilities available through @/models
import { 
  CalendarEvent, 
  AppSettings,
  WORKLOAD_COLORS,
  calculateDayWorkHours,
  getWorkloadLevel 
} from '@/models';
```

Or import directly from the shared package:

```typescript
import { formatTime, getGreeting } from '@pet-genie/shared/utils';
import { CalendarEvent } from '@pet-genie/shared/models';
```

### In Web App (Angular)

```typescript
import { CalendarEvent, AppSettings } from '@pet-genie/shared/models';
import { formatTime, calculateMonthlyMetrics } from '@pet-genie/shared/utils';
import { WORKLOAD_COLORS, getServiceTypeLabel } from '@pet-genie/shared/constants';
```

## Development

### Building

```bash
# From root directory
npm run build:shared

# Or from packages/shared
npm run build
```

### Watching for Changes

```bash
cd packages/shared
npm run dev
```

### Type Checking

```bash
cd packages/shared
npm run typecheck
```

## Package Structure

```
packages/shared/
├── src/
│   ├── index.ts              # Main entry point
│   ├── models/
│   │   ├── index.ts
│   │   ├── settings.model.ts
│   │   ├── event.model.ts
│   │   ├── visit-record.model.ts
│   │   ├── analytics.model.ts
│   │   ├── workload.model.ts
│   │   ├── client.model.ts
│   │   ├── pet.model.ts
│   │   └── template.model.ts
│   ├── utils/
│   │   ├── index.ts
│   │   ├── date-utils.ts
│   │   ├── format-utils.ts
│   │   └── calculation-utils.ts
│   └── constants/
│       ├── index.ts
│       ├── workload-colors.ts
│       └── service-types.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Adding New Shared Code

1. **Identify duplication**: Look for identical or similar code in both mobile and web apps
2. **Extract pure logic**: Only share code that has no framework-specific dependencies
3. **Add to appropriate module**:
   - Types/interfaces → `models/`
   - Pure functions → `utils/`
   - Static values → `constants/`
4. **Export from index**: Add to the relevant `index.ts`
5. **Update consumers**: Modify mobile `@/models` re-exports and web imports

## Principles

1. **No framework dependencies**: This package must work in both Angular and React Native
2. **Pure functions only**: Utilities should have no side effects
3. **TypeScript first**: All code should be strongly typed
4. **Self-documenting**: Use JSDoc comments for public APIs
