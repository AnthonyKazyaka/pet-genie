# PG-5.3 — Event ↔ Client Association Smoke Test Plan

## ✅ Implementation Complete

### What Was Built

1. **Client Matching Utility** (`src/app/core/utils/client-matching.ts`)
   - `normalizeName()` - Case-insensitive name normalization
   - `findClientMatches()` - Exact name matching
   - `getClientCandidateFromEvent()` - Extracts name from event.clientName or event.title
   - `getConfidentClientMatch()` - Returns clientId only if exactly one match (zen: "ask once, remember forever")

2. **Service Methods** (`src/app/core/services/visit-record-data.service.ts`)
   - `linkClient(eventId, calendarId, clientId)` - Idempotent link creation
   - `unlinkClient(eventId, calendarId)` - Removes clientId association

3. **LinkClientDialogComponent** (`src/app/shared/dialogs/link-client-dialog/`)
   - Search/select from existing clients
   - Create new client inline
   - Returns: 'select' | 'create' | 'cancel' with appropriate data

4. **TodayComponent Integration**
   - Auto-linking on "Create Visit" when exactly one client matches event name
   - Falls back to dialog for ambiguous matches (0 or 2+ matches)
   - "Link Client" button for visits without clientId
   - Visual indicator (link icon) when client is linked
   - Displays linked client name instead of parsed event title

5. **VisitDetailComponent Integration**
   - "Link Client" button when no client linked
   - "Change Client" button when client already linked
   - Empty state message when no client
   - Handles deleted client scenario (relink prompt)

---

## 🧪 Manual Smoke Test Procedure

### Prerequisites
- Google Calendar connected
- At least one calendar event for today
- Running dev server: `npm start`

### Test Case 1: Auto-Linking (Exact Match)

**Setup**
1. Navigate to Clients page
2. Create client: "Jamie Smith"
   - Address: "123 Main St"
   - Phone: "555-1234"
   - Email: "jamie@example.com"
3. Create calendar event for today: "Jamie Smith - Dog Walk"

**Test Steps**
1. Navigate to Today page
2. Find "Jamie Smith - Dog Walk" event
3. Click "Create Visit"

**Expected Results**
- ✅ Visit created automatically
- ✅ No dialog shown (confident match)
- ✅ Link icon appears next to "Jamie Smith"
- ✅ Snackbar: "Visit created and linked to Jamie Smith"
- ✅ "Check In" button now visible

### Test Case 2: Assisted Linking (Ambiguous Match)

**Setup**
1. Create second client: "Jamie Smithson"
2. Create calendar event for today: "Jamie - Pet Sitting"

**Test Steps**
1. Navigate to Today page
2. Find "Jamie - Pet Sitting" event
3. Click "Create Visit"

**Expected Results**
- ✅ Dialog opens with search results showing both "Jamie Smith" and "Jamie Smithson"
- ✅ Can filter results by typing in search box
- ✅ Selecting a client and clicking "Link Client" creates visit
- ✅ Snackbar: "Visit created and linked to [client name]"

### Test Case 3: Create New Client from Dialog

**Setup**
1. Create calendar event for today: "Alex Johnson - Cat Care"
2. No existing client named "Alex Johnson"

**Test Steps**
1. Navigate to Today page
2. Find "Alex Johnson - Cat Care" event
3. Click "Create Visit"
4. In dialog, click "Create New Client"
5. Fill form: Name "Alex Johnson", Address "456 Oak St"
6. Click "Create & Link"

**Expected Results**
- ✅ New client created
- ✅ Visit linked to new client
- ✅ Snackbar: "Created and linked client: Alex Johnson"
- ✅ Client appears in Clients list

### Test Case 4: Manual Linking (Existing Visit)

**Setup**
1. Have an existing visit without clientId (created before PG-5.3)

**Test Steps**
1. Navigate to Today page
2. Find visit without link icon
3. Click "Link Client" button
4. Search for and select a client
5. Click "Link Client"

**Expected Results**
- ✅ Dialog opens with all clients
- ✅ Search filters results
- ✅ After linking, link icon appears
- ✅ Client name updates to linked client's name

### Test Case 5: Change Client from Detail View

**Setup**
1. Have a visit linked to "Jamie Smith"

**Test Steps**
1. Click "View Details" on the visit
2. In Client Information section, click "Change Client"
3. Select different client "Alex Johnson"
4. Click "Link Client"

**Expected Results**
- ✅ Client changes from Jamie Smith to Alex Johnson
- ✅ Snackbar: "Client linked successfully"
- ✅ Client Information card updates immediately
- ✅ Back on Today page, client name reflects change

### Test Case 6: Empty State in Detail View

**Setup**
1. Have a visit with no client linked

**Test Steps**
1. Click "View Details" on visit
2. Observe Client Information card

**Expected Results**
- ✅ Card shows "No client linked yet. Link a client to see their information."
- ✅ "Link Client" button visible in header
- ✅ Empty pets section (if applicable)
- ✅ "Generate Summary" button disabled or hidden

### Test Case 7: Persistence & Display

**Test Steps**
1. Link several visits to different clients
2. Refresh page (F5)
3. Navigate away and back to Today page

**Expected Results**
- ✅ All client links persist after refresh
- ✅ Link icons still visible
- ✅ Correct client names displayed
- ✅ No duplicate visit records created

### Test Case 8: No Regressions

**Test Steps**
1. Navigate to Calendar page → verify events load
2. Navigate to Analytics page → verify charts render
3. Navigate to Export page → verify export works
4. Create visit without linking client → verify check-in/check-out still works

**Expected Results**
- ✅ Calendar integration unaffected
- ✅ Analytics calculations unaffected
- ✅ Exports include correct event data
- ✅ Visit lifecycle works with or without client

---

## 🐛 Known Limitations (By Design)

1. **Auto-linking requires exact name match** - Intentional to avoid false positives
2. **No fuzzy matching** - Keeps logic simple and predictable
3. **clientName not written to calendar** - Per acceptance criteria: "Does not modify calendar events"
4. **No bulk re-linking** - Manual one-at-a-time for safety
5. **Deleted client shows as null** - User must manually relink (prevents silent data loss)

---

## 📊 Acceptance Criteria Verification

| Criteria | Status | Evidence |
|----------|--------|----------|
| Allow mapping event.clientName → Client | ✅ | LinkClientDialogComponent, getClientCandidateFromEvent() |
| Persist mapping for reuse | ✅ | VisitRecordDataService.linkClient(), stored in localStorage |
| Does not modify calendar events | ✅ | No GoogleCalendarService.update() calls, read-only event usage |

---

## 🚀 Next Steps After Smoke Test

1. If tests pass → Mark PG-5.3 complete
2. Update BACKLOG.md to reflect completion
3. Consider EPIC 7 (Analytics) or EPIC 8 (Burnout Protection) next
4. Document any edge cases discovered during testing
5. Consider adding unit tests for client-matching.ts

---

## 📝 Notes

- Implementation follows "zen principle" - auto-link when confident, ask user when ambiguous
- Dialog allows both selecting existing clients and creating new ones inline
- Visual feedback (link icon, client name) makes linked state obvious
- All operations are idempotent - safe to call multiple times
- No breaking changes to existing event processing, analytics, or exports
