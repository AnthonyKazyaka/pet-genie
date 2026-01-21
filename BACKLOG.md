# 🐾 Pet Genie — MVP Backlog (Zen-First Implementation)

> Goal: Deliver a **daily-usable, low-stress pet sitting system** that layers on top of the existing event-centric architecture without breaking analytics, exports, or scheduling.

This backlog is ordered to **maximize real-world usefulness early** and **minimize refactors**.

---

## 🧭 EPIC 0 — Foundations & Guardrails

### PG-0.1 Define MVP scope + constraints
**Description**
- Explicitly lock MVP scope to avoid feature creep.

**Acceptance Criteria**
- MVP excludes: payments, SMS, public booking portal, contractors
- Google Calendar remains scheduling source-of-truth
- New features must not break:
  - analytics
  - exports
  - workload calculations

---

## 🧩 EPIC 1 — Core Domain Models (Non-Breaking)

### PG-1.1 Add Client model
**Files**
- `src/app/models/client.model.ts`

**Acceptance Criteria**
- Client has id, name, address, notes, emergency contact
- No dependency on events yet
- Stored via new data service (localStorage-backed)

---

### PG-1.2 Add Pet model
**Files**
- `src/app/models/pet.model.ts`

**Acceptance Criteria**
- Pet references clientId
- Supports care notes, meds, vet info
- No UI yet (data-only)

---

### PG-1.3 Add VisitRecord model
**Files**
- `src/app/models/visit-record.model.ts`

**Acceptance Criteria**
- VisitRecord references:
  - eventId
  - calendarId
- Supports lifecycle states:
  - scheduled
  - in-progress
  - completed
- Supports notes + timestamps

---

## 🧠 EPIC 2 — Persistence Layer

### PG-2.1 ClientDataService
**Files**
- `src/app/core/services/client-data.service.ts`

**Acceptance Criteria**
- CRUD operations for Client
- Backed by StorageService (localStorage)
- Interface designed to later swap to Amplify

---

### PG-2.2 PetDataService
**Files**
- `src/app/core/services/pet-data.service.ts`

**Acceptance Criteria**
- CRUD operations for Pet
- Lookup pets by clientId

---

### PG-2.3 VisitRecordDataService
**Files**
- `src/app/core/services/visit-record-data.service.ts`

**Acceptance Criteria**
- Create/read/update VisitRecord by eventId + calendarId
- Idempotent lookup (safe to call multiple times)

---

## 📅 EPIC 3 — Daily Workflow (“Today” View)

### PG-3.1 Create Today feature module
**Files**
- `src/app/features/today/`

**Acceptance Criteria**
- Route exists (e.g. `/today`)
- Module lazy-loaded
- Uses existing calendar fetch + event processing

---

### PG-3.2 Today list view
**Description**
- Shows today’s events as actionable visits

**Acceptance Criteria**
- Events grouped chronologically
- Each row shows:
  - time
  - client name
  - service type
  - visit status
- Status derived from VisitRecord (or defaults to scheduled)

---

### PG-3.3 Link events to VisitRecords
**Acceptance Criteria**
- For each event:
  - attempt lookup by `{eventId, calendarId}`
  - if missing, allow “Create Visit” action
- No Google Calendar writes required

---

## 🟢 EPIC 4 — Visit Lifecycle (Zen Closure)

### PG-4.1 Check-in / Check-out
**Acceptance Criteria**
- “Start Visit” sets:
  - status = in-progress
  - checkInAt timestamp
- “Complete Visit” sets:
  - status = completed
  - checkOutAt timestamp

---

### PG-4.2 Visit notes
**Acceptance Criteria**
- Notes field editable during or after visit
- Auto-saved to VisitRecord
- Visible in Visit Detail view

---

### PG-4.3 Visit Detail screen
**Acceptance Criteria**
- Accessible from Today list
- Shows:
  - event info
  - linked client/pets
  - lifecycle state
  - notes
- No photos required in MVP

---

## 🧑‍🤝‍🧑 EPIC 5 — Client & Pet Management (Lightweight)

### PG-5.1 Client list & edit UI
**Acceptance Criteria**
- Simple CRUD UI
- No validation beyond required name
- Editable notes + emergency contact

---

### PG-5.2 Pet management per client
**Acceptance Criteria**
- Add/edit pets under a client
- Assign pets to VisitRecord manually (checkbox list)

---

### PG-5.3 Event ↔ Client association helper
**Acceptance Criteria**
- Allow mapping:
  - event.clientName → Client
- Persist mapping for reuse
- Does not modify calendar events

---

## 🧾 EPIC 6 — Visit Summaries & Communication Prep

### PG-6.1 VisitSummaryService
**Files**
- `src/app/core/services/visit-summary.service.ts`

**Acceptance Criteria**
- Input:
  - CalendarEvent
  - VisitRecord
  - Client
  - Pets
- Output:
  - Plain-text visit summary

---

### PG-6.2 Template-based summary generation
**Acceptance Criteria**
- Reuse EventExporterService or ExportTemplate concepts
- Summary includes:
  - client name
  - service type
  - visit duration
  - notes

---

### PG-6.3 “Generate Summary” action
**Acceptance Criteria**
- Button on Visit Detail
- Outputs summary to:
  - modal
  - copy-to-clipboard
- Track `lastSummarySentAt`

---

## 📊 EPIC 7 — Analytics Refactor (Prep for Growth)

### PG-7.1 Extract AnalyticsService ✅ Completed
**Files**
- `src/app/core/services/analytics.service.ts`

**Acceptance Criteria**
- ✅ Move aggregation logic out of AnalyticsComponent
- ✅ Service exposes:
  - hours/day
  - hours/week
  - breakdown by service
  - breakdown by client

---

### PG-7.2 Analytics uses VisitRecords when present ✅ Completed
**Acceptance Criteria**
- ✅ If VisitRecord exists:
  - prefer actual duration (checkIn/out)
- ✅ Fallback to scheduled duration otherwise
- ✅ No regression in existing charts

---

## 🧘 EPIC 8 — Boundaries & Burnout Protection (Phase 2+)

### PG-8.1 RulesEngineService ✅ Completed
**Files**
- `src/app/core/services/rules-engine.service.ts`

**Acceptance Criteria**
- ✅ Central enforcement for:
  - max visits/day
  - max hours/week
  - threshold warnings
- ✅ Consumes AppSettings + WorkloadService

---

### PG-8.2 Burnout indicators ✅ Completed
**Acceptance Criteria**
- ✅ Dashboard warning if thresholds exceeded
- ✅ "High load week" indicator

---

### PG-8.3 Legacy heuristic port (optional)
**Acceptance Criteria**
- Port 1–2 simple rules from:
  - `legacy/gps-admin/js/workload-analyzer.js`
- Clearly documented as advisory (not blocking)

---

## 🚀 Deferred / Explicitly Out of Scope (MVP)

- Payments / Stripe
- SMS notifications
- Public booking portal
- Contractor management
- Photo uploads
- Multi-user roles

---

## ✅ Definition of MVP Success

- Your wife can:
  - Open the app
  - See today’s visits
  - Check in/out
  - Write notes
  - Generate a visit summary
- No anxiety about:
  - forgetting details
  - overworking unknowingly
  - client follow-ups

---

> “If it reduces decisions, it belongs.  
> If it creates decisions, it waits.”
