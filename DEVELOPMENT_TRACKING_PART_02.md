
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

---

#### 2025-12-15: Fix Hub Dashboard Calendar Bottom Clipping (Month View)

**Core Components**
- Hub dashboard calendar view (`src/pages/hub-dashboard.tsx`)
- Shared calendar component (`src/components/calendar/professional-calendar.tsx`)

**Key Features**
- **No more clipped bottom row**: Removed an `overflow-hidden` container and increased the calendar’s month/week/day height so the month grid cannot be cut off.
- **Safe scrolling behavior**: Calendar area now scrolls when content exceeds the available space instead of hiding overflow.
- **Text hygiene**: Replaced corrupted/irregular whitespace characters in the calendar event “Open” label to avoid lint failures.

**Integration Points**
- Hub view route param: `/hub-dashboard?view=calendar` (uses `ProfessionalCalendar`)
- Build: `npm run build` (verified)
- API tests: `cd api && npm test` (verified)

**File Paths**
- `src/components/calendar/professional-calendar.tsx`

**Next Priority Task**
- Refactor `ProfessionalCalendar` to remove fixed inline sizing and reduce ESLint/TS noise (unused imports, inline styles) while preserving current scheduling behavior.

**Code Organization & Quality**
- Kept the fix localized to calendar layout sizing/overflow, avoiding new UI patterns or cross-cutting refactors.

---

#### 2025-12-15: Fix Business Calendar Slot Time Drift (Date-Only → 10:00am Bug)

**Core Components**
- Shared calendar component (`src/components/calendar/professional-calendar.tsx`)

**Key Features**
- **Consistent slot times**: Fixed a timezone parsing bug where `job.date` (e.g. `YYYY-MM-DD`) was parsed as UTC and rendered as `10:00am` local in AU timezones.
- **Robust start/end parsing**: Calendar now prefers ISO `startTime/endTime` and can combine `date + HH:mm` into a local `Date`, preventing “random” time drift and inconsistent slot labels across the month.

**Integration Points**
- Hub view route param: `/hub-dashboard?view=calendar` (business mode uses `ProfessionalCalendar`)
- Build: `npm run build` (verified)

**File Paths**
- `src/components/calendar/professional-calendar.tsx`

**Next Priority Task**
- Reduce month-view clutter by tuning business-mode event rendering (ensure 3 daily slots remain visible without `+more` when possible).

**Code Organization & Quality**
- Kept the change isolated to date/time parsing in the calendar event mapping logic.

