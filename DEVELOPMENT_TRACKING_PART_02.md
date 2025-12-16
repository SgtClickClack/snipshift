
#### 2025-12-16: Add Forgot Password Flow (Firebase Password Reset Email)

**Core Components**
- Password reset UI page (`src/pages/forgot-password.tsx`)
- Login screen navigation (`src/pages/login.tsx`)
- Firebase auth helper (`src/lib/firebase.ts`)
- Route registration (`src/App.tsx`)
- Auth public-route allowlist (`src/components/auth/auth-guard.tsx`)
- E2E coverage (`tests/e2e/forgot-password.spec.ts`)

**Key Features**
- **Forgot Password route + page**: Added `/forgot-password` with a simple email form and clear success/error states.
- **Neutral success messaging**: Success UI is intentionally neutral (“If an account exists…”) to reduce account enumeration risk.
- **Firebase integration**: Wired the form to Firebase Auth `sendPasswordResetEmail`, with an app redirect URL back to `/login`.
- **E2E-safe behavior**: In `VITE_E2E=1`, the reset action resolves without calling external Firebase, keeping tests deterministic.
- **Login entry point**: Added a “Forgot password?” link from the login screen.

**Integration Points**
- UI route: `GET /forgot-password`
- Firebase Auth: `sendPasswordResetEmail(...)`
- Playwright: `npx playwright test --grep "Forgot Password"`

**File Paths**
- `src/pages/forgot-password.tsx`
- `src/pages/login.tsx`
- `src/lib/firebase.ts`
- `src/App.tsx`
- `src/components/auth/auth-guard.tsx`
- `tests/e2e/forgot-password.spec.ts`

**Next Priority Task**
- Verify the reset email link behavior end-to-end in production (Firebase console Action URL settings + redirect back to `/login`).

**Code Organization & Quality**
- Kept all logic localized to auth utilities and auth-related pages/routes; avoided introducing new patterns beyond existing Firebase + E2E gating.

---

#### 2025-12-16: Fix Password Reset Email Delivery (Remove Continue URL + Google Account Hint)

**Core Components**
- Firebase auth helper (`src/lib/firebase.ts`)
- Forgot password UI (`src/pages/forgot-password.tsx`)

**Key Features**
- **Improved deliverability**: Removed the custom password-reset continue URL argument so Firebase uses its default reset handler (avoids `auth/unauthorized-continue-uri` misconfig blocking email sends).
- **User guidance**: Added a short note clarifying that password reset emails apply to **email/password** accounts (Google-only signups won’t receive reset emails).

**Integration Points**
- Firebase Auth: `sendPasswordResetEmail(auth, email)` (no custom ActionCodeSettings)

**File Paths**
- `src/lib/firebase.ts`
- `src/pages/forgot-password.tsx`

**Next Priority Task**
- Verify password reset email delivery in production (and check spam/promotions folders) for a known email/password account.

**Code Organization & Quality**
- Kept changes tightly scoped to auth helper + auth page; no backend changes required.

---

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

---

#### 2025-12-15: Fix “Clear All Shifts” 404 (Route Order: /clear-all vs /:id)

**Core Components**
- Shifts API routes (`api/_src/routes/shifts.ts`)
- Calendar settings danger zone (`src/components/calendar/calendar-settings-modal.tsx`)

**Key Features**
- **Clear All Shifts works again**: Fixed Express route ordering so `DELETE /api/shifts/clear-all` no longer gets swallowed by `DELETE /api/shifts/:id` (where `id="clear-all"` caused a 404).
- **Supports legacy cleanup**: Enables wiping old timezone-shifted/generated roster shifts so the calendar can return to consistent slot times.

**Integration Points**
- API endpoint: `DELETE /api/shifts/clear-all`
- UI: Calendar Settings → Danger Zone → “Clear All Shifts”
- Tests: `cd api && npm test` (verified)

**File Paths**
- `api/_src/routes/shifts.ts`

**Next Priority Task**
- Add a safer “Clear generated roster shifts for selected month” action (date-range scoped) to avoid accidental deletion of historical shifts/jobs.

**Code Organization & Quality**
- Minimal change (route declaration order), no behavior changes to shift deletion logic.

---

#### 2025-12-15: Optimize Shop Schedule Calendar Performance (Windowed Fetching + Fewer Re-Renders)

**Core Components**
- Shifts API (employer windowing) (`api/_src/routes/shifts.ts`, `api/_src/routes/shifts.js`)
- Shifts repository range query (`api/_src/repositories/shifts.repository.ts`, `api/_src/repositories/shifts.repository.js`)
- Shop schedule calendar page (`src/pages/shop/schedule.tsx`)
- API route tests (`api/_src/tests/routes/shifts.schedule-tools.test.ts`)

**Key Features**
- **Windowed Fetching enforced (employer view)**: `GET /api/shifts?employer_id=me` now requires `start` and `end` query params to prevent accidental “fetch all shifts”.
- **Server-side filtering tightened**: Employer range query now filters shifts within the window using `start_time >= start` and `end_time <= end`.
- **Calendar range-driven queries**: Shop Schedule now tracks a `currentRange` (from `onRangeChange`) and uses it in the React Query key + fetch params.
- **Reduced re-renders**: Memoized calendar handlers (`useCallback`) and event style/tooltip getters to avoid recreating functions on every render.

**Integration Points**
- API endpoint: `GET /api/shifts?employer_id=me&start=<iso>&end=<iso>`
- Frontend data: `fetchEmployerShifts({ start, end })` (Shop Schedule)
- Tests: `cd api && npm test`

**File Paths**
- `api/_src/routes/shifts.ts`
- `api/_src/routes/shifts.js`
- `api/_src/repositories/shifts.repository.ts`
- `api/_src/repositories/shifts.repository.js`
- `api/_src/tests/routes/shifts.schedule-tools.test.ts`
- `src/pages/shop/schedule.tsx`

**Next Priority Task**
- Add a shop-side “Load previous/next range” UX for history (e.g. month/week jump) if needed, without reintroducing unbounded shift fetches.

**Code Organization & Quality**
- Kept changes localized to the schedule page and the employer shifts endpoint; no new patterns introduced.

---

#### 2025-12-15: Security Hygiene (Secret Scanning Remediation + Audit Fixes + CI Stabilization)

**Core Components**
- GitHub security automation (Secret Scanning, Dependabot Security Updates)
- Code scanning (CodeQL workflow)
- Playwright CI workflow (`.github/workflows/playwright.yml`)
- Frontend dependency security overrides (`package.json`, `package-lock.json`)
- API dependency security overrides (`api/package.json`, `api/package-lock.json`)
- Firebase configuration loader (`src/lib/firebase.ts`)
- Security documentation & env templates (`docs/STRIPE_WEBHOOKS_SETUP.md`, `docs/env.vercel.example`)

**Key Features**
- **Secret scanning remediation**: Removed committed secret-bearing files and stripped secret-like patterns from docs/tests to prevent future leaks.
- **Dependabot security updates enabled**: Turned on repo-level Dependabot Security Updates to keep vulnerable dependencies patched via PRs.
- **CI reliability fixed (Playwright)**: Updated the Playwright workflow to use Node 22 (matches `engines`) and install API dependencies before running E2E tests.
- **Code scanning enabled (CodeQL)**: Added a standard CodeQL workflow for JavaScript/TypeScript security scanning on PRs, pushes, and a weekly schedule.
- **Audit vulnerabilities resolved**: Added targeted `npm` overrides to remediate the `esbuild` advisory without forcing a major toolchain upgrade; verified `npm audit` is clean for both root and API.
- **Env hygiene**: Hardened `.gitignore` to ignore `.env.*` (including `.env.vercel`) and added a safe example template under `docs/`.

**Integration Points**
- GitHub API (via `gh api`):
  - `PATCH /repos/:owner/:repo` (security_and_analysis settings)
  - `PATCH /repos/:owner/:repo/secret-scanning/alerts/:number` (resolve false-positive doc alert)
- CI: `.github/workflows/playwright.yml` (installs root + `api/` dependencies)
- Validation:
  - Root: `npm ci`, `npm run lint`, `npm run build`, `npm audit`
  - API: `cd api && npm ci`, `npm test`, `npm run build`, `npm audit`

**File Paths**
- `.github/workflows/codeql.yml`
- `.github/workflows/playwright.yml`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `api/package.json`
- `api/package-lock.json`
- `src/lib/firebase.ts`
- `src/lib/firebase-fallback.ts` (removed)
- `.env.vercel` (removed)
- `api/_src/tests/webhooks.test.ts`
- `docs/STRIPE_WEBHOOKS_SETUP.md`
- `PRODUCTION_DEPLOYMENT.md`
- `docs/env.vercel.example` (added)

**Next Priority Task**
- Rotate/revoke the leaked Google API keys and then resolve the remaining open GitHub Secret Scanning alerts as **revoked/rotated**.

**Code Organization & Quality**
- Kept security fixes minimal and localized (overrides + CI step fix), avoiding breaking toolchain upgrades.
- Removed committed env files and documented safe patterns to prevent reintroducing secrets.

---

#### 2025-12-16: Fix Business Calendar Mobile Horizontal Overflow (“Blow Out”)

**Core Components**
- Shared calendar toolbar (`src/components/calendar/CalendarToolbar.tsx`)
- Shared calendar container (`src/components/calendar/professional-calendar.tsx`)
- Shop schedule E2E coverage (`tests/e2e/shop-schedule.spec.ts`)

**Key Features**
- **Mobile-safe toolbar wrapping**: Allowed the business calendar header controls (settings + view switcher + nav) to wrap onto multiple lines on small screens instead of forcing a single-row layout that can overflow the viewport.
- **Contained calendar overflow**: Hardened the calendar container to prevent horizontal overflow from “blowing out” the page width on mobile, while preserving desktop behavior.
- **Regression protection**: Added an E2E assertion on mobile viewport to ensure the schedule page does not introduce horizontal page overflow.

**Integration Points**
- Shop schedule route: `/shop/schedule` (business calendar surface)
- Playwright: `npm run test:e2e` (covers mobile overflow check)

**File Paths**
- `src/components/calendar/CalendarToolbar.tsx`
- `src/components/calendar/professional-calendar.tsx`
- `tests/e2e/shop-schedule.spec.ts`

**Next Priority Task**
- Reduce `ProfessionalCalendar` size and remove remaining layout inline styles by extracting focused subcomponents (keep behavior unchanged).

**Code Organization & Quality**
- Kept the fix localized to layout/overflow behavior without introducing new patterns or touching business logic.