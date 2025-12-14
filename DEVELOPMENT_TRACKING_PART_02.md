
#### 2025-12-14: Comprehensive Shop Calendar Audit & Fix (Clean UI + Reliable Deletes)

**Core Components**
- Shop schedule calendar page (`src/pages/shop/schedule.tsx`)
- Shift deletion route (transactional cascade) (`api/_src/routes/shifts.ts`)
- Frontend shift typing (`src/lib/api.ts`)
- API route tests (`api/_src/tests/routes/shifts.delete.test.ts`)

**Key Features**
- **Clean Slate UI**: Ensured the Shop Schedule calendar is full-width and moved the status legend into the top header row so it’s always visible while scheduling.
- **Identity Check (Shifts vs Jobs)**: Tightened calendar event mapping so only managed roster **Shifts** render in the calendar (prevents legacy “Jobs”/other statuses from bleeding into this management surface).
- **Date Safety**: Calendar `events` now only include items with valid `start`/`end` Date objects derived from `startTime`/`endTime`.
- **Undeletable Shifts Fix**: Updated `DELETE /api/shifts/:id` to delete dependent rows in a transaction **without** failing on legacy DBs missing tables/columns (prevents FK/missing-column 500s).

**Integration Points**
- API endpoint: `DELETE /api/shifts/:id` (now deletes `shift_invitations`, `shift_offers`, and `applications` rows when present, then deletes the shift)
- Frontend calendar data: `GET /api/shifts?employer_id=me&start=<iso>&end=<iso>` (events filtered to managed shift statuses)
- Tests: `api npm run test` (added coverage for delete cascade behavior)

**File Paths**
- `src/pages/shop/schedule.tsx`
- `src/lib/api.ts`
- `api/_src/routes/shifts.ts`
- `api/_src/tests/routes/shifts.delete.test.ts`

**Next Priority Task**
- Add a **Delete Shift** action to the Shop Schedule event flows (OPEN/CONFIRMED modals) that calls `DELETE /api/shifts/:id` and invalidates the schedule queries.

**Code Organization & Quality**
- Kept the schedule surface focused on roster management by filtering statuses, reducing “mixed model” confusion.
- Implemented deletion as a transaction with schema-existence guards to prevent whack-a-mole failures across partially-migrated environments.

