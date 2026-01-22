
#### 2026-01-22: Unlock Onboarding Role Cards for Firebase Auth

**Core Components**
- Onboarding role selection (`src/pages/onboarding.tsx`)

**Key Features**
- Removed disabled/pointer lock styling so role cards stay clickable once Firebase auth is confirmed.
- Kept role selection gated to Firebase session checks without requiring a DB profile.

**Integration Points**
- Routing: `/onboarding`
- Auth: Firebase `auth.currentUser` / `useAuth` token state

**File Paths**
- `src/pages/onboarding.tsx`

**Next Priority Task**
- Verify Venue/Staff role cards are clickable for new Google users during onboarding in production.

**Code Organization & Quality**
- Preserved the single source of truth for role selection gating via `hasFirebaseSession`.

---

#### 2026-01-11: Fix Landing Page Mobile Horizontal Overflow (Blowout)

**Core Components**
- Landing page (`src/pages/LandingPage.tsx`)
- Landing layout regression tests (`tests/e2e/landing-layout.spec.ts`)

**Key Features**
- Prevented mobile horizontal overflow caused by transform scaling:
  - Disabled hero image scale on small screens (kept on `md+` only)
  - Disabled card hover scale on mobile (kept on `md+` only) to avoid “sticky hover” widening on touch devices
- Strengthened the landing mobile overflow Playwright checks by simulating mobile taps before asserting no horizontal scroll.

**Integration Points**
- E2E: `npm run test:e2e` (Playwright) → `tests/e2e/landing-layout.spec.ts`

**File Paths**
- `src/pages/LandingPage.tsx`
- `tests/e2e/landing-layout.spec.ts`

**Next Priority Task**
- Verify the landing page on a real iOS Safari device to confirm horizontal scrolling is gone.

**Code Organization & Quality**
- Kept changes localized to landing UI behaviors (no global overflow hacks) and added interaction-aware regression coverage.

---

#### 2026-01-11: Implement Role-Based Redirects (Venue/Worker Clean-Break)

**Core Components**
- Auth context provider (`src/contexts/AuthContext.tsx`)
- Google auth entrypoint (`src/components/auth/google-auth-button.tsx`)
- Clean-break route protectors (`src/components/auth/venue-route.tsx`, `src/components/auth/worker-route.tsx`)
- App route tree (`src/App.tsx`)

**Key Features**
- Normalized backend role values (including `venue`/`worker`) into the app’s canonical role model to prevent redirect/guard mismatches.
- Centralized post-auth redirect resolution to the clean-break homes:
  - Venue-side → `/venue/dashboard`
  - Worker-side → `/worker/dashboard`
  - Not onboarded / missing app user → `/onboarding`
- Ensured Google sign-in reliably kicks off the centralized redirect logic and displays a neon-green spinner while redirect resolution is in progress.
- Verified `/venue/*` and `/worker/*` route trees remain strictly protected by `VenueRoute` / `WorkerRoute`.

**Integration Points**
- Firebase auth listener: `onAuthStateChange`
- API: `GET /api/me`
- Routing: `useNavigate` / `Navigate` (React Router)

**File Paths**
- `src/contexts/AuthContext.tsx`

**Next Priority Task**
- Add a small unit test suite around role normalization + redirect target selection to prevent regressions across role label changes.

**Code Organization & Quality**
- Kept role normalization and redirect selection local to AuthContext (no new global patterns) and avoided coupling onboarding gates to compliance profile presence.

---

#### 2026-01-11: Branded Worker Dashboard & Compliance Hub

**Core Components**
- Worker Dashboard page (`src/pages/worker/Dashboard.tsx`)
- ShiftFeed component (`src/components/worker/ShiftFeed.tsx`)
- RSAManager component (`src/components/worker/RSAManager.tsx`)
- Updated Footer with support contact info
- Language polish across codebase

**Key Features**
- **Mobile-First Worker Dashboard**: Deep Obsidian (#0B0E11) background with animated 'Steady Hum' HospoGo logo using neon-flicker animation and drop shadow effects.
- **Earnings Section**: Simple cards showing Total Paid and Pending Payouts using existing payment balance API.
- **Compliance Section**: Neon Green badge if RSA verified, Electric Purple alert if RSA is missing or expired. Direct navigation to RSA manager.
- **ShiftFeed Component**: Fetches and displays shifts where status === 'OPEN'. Shows 'Verified Only' badge on premium shifts. Direct navigation to shift details to apply.
- **RSAManager Component**: Drag-and-drop upload zone for QLD RSA PDF/Image. POST to `/api/me` with `rsaCertificate`. Shows 'Under Review' status immediately after upload.
- **Clean Break Language Polish**: Replaced all user-facing references to 'Barber', 'Shop', 'Chair' with 'Pro', 'Venue', 'Shift' across landing pages, onboarding, and profile components.
- **Support Footer**: Updated to info@hospogo.com and +61 478 430 822.

**Integration Points**
- API endpoint: `GET /api/payments/balance/:userId` (earnings data)
- API endpoint: `PUT /api/me` (RSA certificate upload via FormData)
- API endpoint: `GET /api/shifts?status=open` (open shifts feed)
- Route: `/worker` (protected, requires professional role)
- Auth context: Uses `user.rsaCertificateUrl`, `user.rsaVerified`, `user.rsaExpiry` for compliance status

**File Paths**
- `src/pages/worker/Dashboard.tsx` - Main worker dashboard page
- `src/components/worker/ShiftFeed.tsx` - Open shifts feed component
- `src/components/worker/RSAManager.tsx` - RSA upload and management component
- `src/components/layout/Footer.tsx` - Added support contact section
- `src/App.tsx` - Added /worker route
- `src/pages/role-selection.tsx` - "Venue Manager" terminology
- `src/pages/LandingPage.tsx` - Hospitality language polish
- `src/pages/company/about.tsx` - Updated hospitality context
- `src/components/onboarding/RoleSelection.tsx` - "Venue" terminology
- `src/components/profile/public-profile.tsx` - "Hospitality Venue" label

**Next Priority Task**
- Test the Worker Dashboard on mobile devices and verify RSA upload workflow.

---

#### 2025-12-14: Fix 500 Error on Calendar Load (Missing Status Enums)

**Core Components**
- Zod validation schemas (`api/_src/validation/schemas.ts`)
- PostgreSQL enum migration (`api/drizzle/0014_fix_shift_status_enum.sql`)
- Frontend event styling (`src/pages/shop/schedule.tsx`)

**Key Features**
- **Zod Schema Update**: Added missing `pending_completion` status to the `ShiftSchema` z.enum definition to prevent Zod validation from throwing errors when DB returns shifts with this status.
- **PostgreSQL Migration**: Created comprehensive migration `0014_fix_shift_status_enum.sql` that adds all required status values (`draft`, `pending`, `invited`, `open`, `filled`, `completed`, `confirmed`, `cancelled`, `pending_completion`) using `ADD VALUE IF NOT EXISTS` to ensure idempotent execution.
- **Frontend Event Styling**: Added `pending_completion` case to both `statusLabel()` and `eventStyleForStatus()` functions in the Shop Schedule calendar. Renders with purple styling to indicate shifts awaiting review/confirmation.

**Integration Points**
- API endpoint: `GET /api/shifts` (now returns shifts with all status values without Zod validation errors)
- Database migration: Run via `drizzle-kit push` or manual SQL execution
- Calendar UI: `eventPropGetter` now handles all shift statuses

**File Paths**
- `api/_src/validation/schemas.ts` - Added `pending_completion` to ShiftSchema status enum
- `api/drizzle/0014_fix_shift_status_enum.sql` - New migration for enum completeness
- `src/pages/shop/schedule.tsx` - Added styling for `pending_completion` status

**Next Priority Task**
- Run the migration on production database and verify the calendar loads without 500 errors.

**Code Organization & Quality**
- Migration is idempotent (safe to run multiple times)
- Kept Drizzle schema, Zod schema, and frontend visuals in sync
- Used established color patterns for new status (purple for pending states)

---

#### 2025-12-14: First-to-Accept Invites and Bulk Accept Roster

**Core Components**
- Shift Invitations table (`shift_invitations`)
- Multi-invite API (`POST /api/shifts/:id/invite`)
- Bulk accept API (`POST /api/shifts/bulk-accept`)
- Pending invitations API (`GET /api/shifts/invitations/pending`)
- AssignStaffModal component (multi-select mode)
- BulkInvitationReview component

**Key Features**
- **Phase 1: Database Upgrade** - Added `shift_invitations` table to track invitations sent to professionals for the "First-to-Accept" pattern. Multiple professionals can be invited to the same shift.
- **Phase 2: Multi-Invite Backend** - Updated `POST /api/shifts/:id/invite` to accept `professionalIds` array. Creates invitations for all professionals without setting `assigneeId` until acceptance.
- **Phase 2: Race-Safe Accept** - Updated `POST /api/shifts/:id/accept` with atomic database update (WHERE assignee_id IS NULL) to prevent race conditions. First professional to accept wins; others get "Already Taken" error.
- **Phase 2: Bulk Accept** - Created `POST /api/shifts/bulk-accept` endpoint for professionals to accept multiple invitations at once. Returns detailed success/failure counts.
- **Phase 3: Shop UI Multi-Select** - Updated `AssignStaffModal` to use checkboxes for multi-select. Button dynamically shows "Invite X Barbers".
- **Phase 4: Roster Review UI** - Created `BulkInvitationReview` component with grouped views (by Shop, by Week), select-all functionality, and bulk accept button.

**Integration Points**
- API endpoint: `POST /api/shifts/:id/invite` (supports `professionalId` or `professionalIds[]`)
- API endpoint: `POST /api/shifts/:id/accept` (race-condition safe)
- API endpoint: `POST /api/shifts/bulk-accept` (accepts `shiftIds[]`)
- API endpoint: `GET /api/shifts/invitations/pending` (grouped by shop/week)
- Database migration: `0013_add_shift_invitations.sql`

**File Paths**
- `api/drizzle/0013_add_shift_invitations.sql` - Migration for shift_invitations table
- `api/_src/db/schema/shifts.ts` - Added shiftInvitations table definition
- `api/_src/db/schema.ts` - Export shiftInvitations
- `api/_src/repositories/shift-invitations.repository.ts` - New repository
- `api/_src/routes/shifts.ts` - Updated invite/accept, added bulk-accept and pending invitations endpoints
- `api/_src/validation/schemas.ts` - Added BulkAcceptSchema, updated ShiftInviteSchema
- `src/components/calendar/assign-staff-modal.tsx` - Multi-select with checkboxes
- `src/components/calendar/professional-calendar.tsx` - Multi-assign handler
- `src/pages/shop/schedule.tsx` - Multi-assign handler
- `src/components/dashboard/BulkInvitationReview.tsx` - New roster review component
- `src/pages/professional-dashboard.tsx` - Added Invitations tab with count badge

**Next Priority Task**
- Test the full workflow: Shop invites multiple barbers → Barbers see invitations in dashboard → First barber accepts → Other barbers see "Already Taken".

**Code Organization & Quality**
- Used atomic database update pattern for race-condition prevention
- Maintained backwards compatibility with legacy single-invite flow
- Reused existing notification and shift offer systems alongside new invitations

---

#### 2025-12-14: Audit and Fix Auth Race Conditions

**Core Components**
- AuthContext provider (`src/contexts/AuthContext.tsx`)
- GoogleAuthButton component (`src/components/auth/google-auth-button.tsx`)
- Landing page (`src/pages/landing.tsx`)
- Auth guard system (`src/components/auth/auth-guard.tsx`)

**Key Features**
- **Phase 1: Auth Gatekeeper** - Fixed `AuthContext` to prevent double-firing in React Strict Mode by:
  - Removing `location.search` dependency that caused auth listener to re-subscribe on URL changes
  - Adding `isProcessingAuth` ref to prevent concurrent profile fetches for the same user
  - Adding `currentAuthUid` ref to skip redundant fetches when user hasn't changed
  - Adding `hasInitialized` ref to prevent double initialization in Strict Mode
- **Phase 2: Router Verification** - Verified App.tsx already correctly shows `LoadingScreen` while `isLoading` is true, preventing flash of wrong content
- **Phase 3: Landing Page Cleanup** - Added localStorage/sessionStorage cleanup on landing page load to clear stale `onboarding_step`, `redirect_url`, and `signupRolePreference` that could cause race conditions
- **Phase 4: GoogleAuthButton Protection** - Added `isAuthInProgress` ref to prevent double-click/double-fire issues and clear stale localStorage before starting new auth

**Integration Points**
- Firebase `onAuthStateChange` listener - now properly debounced
- Profile fetch from `/api/me` - protected against duplicate calls
- Google popup auth flow - protected against rapid clicks
- Logout flow - now clears stale redirect/onboarding data

**File Paths**
- `src/contexts/AuthContext.tsx` - Core auth race condition fixes
- `src/components/auth/google-auth-button.tsx` - Double-click protection
- `src/pages/landing.tsx` - Stale data cleanup on page load

**Next Priority Task**
- Test the full Google OAuth flow: Landing → Signup → Google Popup → Profile Fetch → Redirect to appropriate dashboard without flashes or double redirects

**Code Organization & Quality**
- Used `useRef` for mutable tracking state (avoids re-renders)
- Maintained backward compatibility with existing auth flow
- Added debug logging via existing `logger` utility for troubleshooting

---

#### 2025-12-14: Interactive Roster Builder - Auto-Generate Slots from Opening Hours

**Core Components**
- Shop Schedule page (`src/pages/shop/schedule.tsx`)
- Business Settings component (`src/components/settings/business-settings.tsx`)
- Shifts API routes (`api/_src/routes/shifts.ts`)
- Shifts repository (`api/_src/repositories/shifts.repository.ts`)

**Key Features**
- **Phase 1: Auto-Generate Slots** - Added `POST /api/shifts/generate-roster` endpoint that creates DRAFT shift slots based on opening hours and shift pattern configuration. When Business Settings are saved, the system automatically generates draft slots for the next month.
- **Phase 2: Interactive Calendar** - Updated Shop Calendar to render DRAFT slots as "Ghost" blocks (gray, dashed border, subtle opacity) that indicate empty slots ready for assignment. Clicking a ghost slot opens the AssignStaffModal.
- **Phase 3: Quick Fill Modal** - Wired `AssignStaffModal` to list available professionals. Selecting a professional invites them to the shift (updates status to `invited` and sends notification).
- **Phase 4: Visual Status Distinction** - Updated shift color coding: DRAFT=gray dashed (ghost), OPEN=blue, PENDING=amber, CONFIRMED=green, COMPLETED=slate, CANCELLED=rose.

**Integration Points**
- API endpoint: `POST /api/shifts/generate-roster`
- API endpoint: `POST /api/shifts/:id/invite`
- Business Settings save → triggers roster generation
- Calendar click → opens AssignStaffModal for draft slots
- Validation schema: `GenerateRosterSchema`

**File Paths**
- `api/_src/routes/shifts.ts` - Added generate-roster endpoint
- `api/_src/validation/schemas.ts` - Added GenerateRosterSchema
- `api/_src/repositories/shifts.repository.ts` - Added deleteDraftShiftsInRange
- `src/lib/api.ts` - Added generateRoster function
- `src/components/settings/business-settings.tsx` - Wired roster generation on save
- `src/pages/shop/schedule.tsx` - Added ghost styling, click-to-assign, AssignStaffModal

**Next Priority Task**
- Test the full workflow: Define Hours → View Slots → Invite Barber → Accept/Decline

**Code Organization & Quality**
- Leveraged existing `shift-slot-generator.ts` utility for slot calculation
- Reused existing `AssignStaffModal` component
- Followed established API patterns and repository structure

---

#### 2025-12-14: Fix Shop Shifts API 500 Error (Missing shift_id Column Fallback)

**Core Components**
- Applications repository (`getApplications` function)
- Shop shifts route (`GET /api/shifts/shop/:userId`)

**Key Features**
- Fixed `GET /api/shifts/shop/:userId` returning **500** when the production database is missing the `shift_id` column in the `applications` table by adding a fallback query in `getApplications()`.
- Added `excludeExpired: false` to the jobs query in the shop shifts route to ensure past jobs are included for calendar/history display.
- Applied the same fix to both `.ts` and `.js` versions of the affected files.

**Integration Points**
- API endpoint: `GET /api/shifts/shop/:userId`
- Applications repository: `getApplications()`
- Calendar component: `ProfessionalCalendar`

**File Paths**
- `api/_src/repositories/applications.repository.ts`
- `api/_src/repositories/applications.repository.js`
- `api/_src/routes/shifts.ts`
- `api/_src/routes/shifts.js`

**Next Priority Task**
- Deploy the fix to production and verify the calendar loads shifts correctly.

**Code Organization & Quality**
- Kept DB compatibility logic in the repository layer, matching the fallback patterns already in place for other functions.
- Used the existing `shouldFallbackToJobsOnly` helper for consistency.

---

#### 2025-12-14: Fix Professional Calendar Production Crash (Missing React Query Import)

**Core Components**
- Professional calendar UI (`ProfessionalCalendar`)
- React Query hook usage in calendar data fetch (professionals list)

**Key Features**
- Fixed a production runtime crash (`ReferenceError: useQuery is not defined`) by importing `useQuery` from TanStack React Query where it is used.
- Removed duplicate import declarations in the same module to ensure the calendar bundle parses cleanly and remains tree-shake safe.

**Integration Points**
- TanStack React Query (`useQuery`)
- Calendar bundle chunk (`professional-calendar.*.js`)

**File Paths**
- `src/components/calendar/professional-calendar.tsx`

**Next Priority Task**
- Verify `npm run build` and a production deployment load the Professional Calendar without runtime errors (no `useQuery` crash).

**Code Organization & Quality**
- Kept the fix localized to the calendar module imports; avoided introducing new patterns or dependencies.

#### 2025-12-14: Fix Smart Fill Roster 500 + Real Professional Picker (No Mock Data)

**Core Components**
- Smart Fill batch shift creation (`POST /api/shifts/smart-fill`)
- Shift creation with direct invite (`POST /api/shifts` + `assignedStaffId`)
- Professional discovery endpoint for scheduling (`GET /api/professionals`)
- Calendar slot assignment UI (unassigned slots → favourites/search → invite/post)
- Legacy DB schema compatibility for shifts inserts (missing `lat`/`lng`)

**Key Features**
- Fixed **Smart Fill Roster** failing with a 500 by adding repository fallbacks when the `shifts` table is missing newer columns (observed: missing `lat`/`lng`).
- Added a forward migration to bring older DBs up to parity (`lat`/`lng` + index) without breaking existing installs.
- Replaced calendar **mock professionals** with real data:
  - Added `GET /api/professionals` and a frontend `fetchProfessionals()` helper.
  - Updated calendar assignment modals to use the real list for **favorites** + **manual search**.
- Fixed slot assignment invite wiring so selecting a professional creates an **invited** shift and triggers the invite notification flow (offer creation + notify).

**Integration Points**
- API endpoint: `POST /api/shifts/smart-fill`
- API endpoint: `GET /api/professionals`
- API endpoint: `POST /api/shifts` (supports `assignedStaffId` for invite-style creation)
- Frontend: `ProfessionalCalendar` unassigned-slot click → `ShiftAssignmentModal`

**File Paths**
- `api/_src/repositories/shifts.repository.ts`
- `api/_src/repositories/shifts.repository.js`
- `api/_src/routes/shifts.ts`
- `api/_src/routes/shifts.js`
- `api/_src/repositories/users.repository.ts`
- `api/_src/repositories/users.repository.js`
- `api/_src/routes/users.ts`
- `api/_src/routes/users.js`
- `api/drizzle/0012_add_shift_lat_lng.sql`
- `src/components/calendar/professional-calendar.tsx`
- `src/components/calendar/assign-staff-modal.tsx`
- `src/lib/api.ts`

**Next Priority Task**
- Replace remaining non-test mock “professional” data patterns (if any) and ensure calendar assignment uses real availability + acceptance sync end-to-end (invite → accept → both calendars reflect confirmed).

**Code Organization & Quality**
- Kept DB compatibility logic in the repository layer (routes/UI stay focused on behavior).
- Avoided introducing new UI patterns; reused existing modals and React Query patterns.

---

#### 2025-12-14: Fix Shop Shifts 500 + Prevent Calendar Settings Render Loop

**Core Components**
- Shop shifts aggregation route (`/api/shifts/shop/:userId`)
- Shifts repository employer query fallback (legacy schema compatibility)
- Professional calendar settings sync (re-render loop prevention)

**Key Features**
- Fixed `GET /api/shifts/shop/:userId` returning **500** by:
  - Normalizing legacy `jobs.createdAt` values that may arrive as strings.
  - Adding a **safe fallback query** in `getShiftsByEmployer` when the underlying DB schema is older than the current Drizzle model (avoids crashes from missing columns).
- Prevented the Professional calendar from entering a settings-driven render loop by only updating `calendarSettings` when the values actually change (stable normalization + equality guard).
- Adjusted the calendar’s “excessive re-render” detector to only warn on **high render rate** (within 1s), avoiding false positives from expected timer-driven updates.

**Integration Points**
- API endpoint: `GET /api/shifts/shop/:userId`
- Frontend component: `ProfessionalCalendar` (settings storage + sync)
- Tests: `vitest` route coverage for shop shifts normalization behavior

**File Paths**
- `api/_src/routes/shifts.ts`
- `api/_src/routes/shifts.js`
- `api/_src/repositories/shifts.repository.ts`
- `api/_src/repositories/shifts.repository.js`
- `api/_src/tests/routes/shifts.schedule-tools.test.ts`
- `src/components/calendar/professional-calendar.tsx`

**Next Priority Task**
- Fix the failing API integration test in `api/_src/tests/repositories/jobs.repository.test.ts` (filters returning empty set unexpectedly).

**Code Organization & Quality**
- Kept compatibility logic isolated to the repository layer (route stays focused on response shaping).
- Added a targeted regression test and avoided introducing new patterns or dependencies.

---

#### 2025-12-14: Deployment Preflight Script (Env + Production Hygiene Checks)

**Core Components**
- Deployment readiness automation (`preflight` CLI)
- Production environment verification (frontend + API env keys)

**Key Features**
- Added a `preflight` script that checks for commonly missed production settings:
  - Missing required environment variables (Vite Firebase/Stripe/Maps + API DB/Stripe/Firebase Admin)
  - Suspicious production settings (e.g. Stripe test keys in prod mode, `VITE_E2E` enabled)
  - Debug hygiene (`debugger` statements) and frontend `console.log` leftovers
  - Accessibility hygiene: warns if any `<img>` tags are missing `alt`
- Supports `--local` mode to report issues without failing when running on a dev machine.

**Integration Points**
- npm scripts: `npm run preflight`, `npm run preflight:local`

**File Paths**
- `scripts/preflight.cjs`
- `package.json`

**Next Priority Task**
- Run `npm run preflight` in a production-like environment (CI/Vercel) with production env vars set to validate “live” readiness.

**Code Organization & Quality**
- Kept the script dependency-free (Node + existing `dotenv`), scoped scans to `src/` and `api/_src`, and avoided reading/printing secret values.

---

#### 2025-12-14: Invalidate “My Listings” Queries After Salon Post Job (Immediate Dashboard Sync)

**Core Components**
- Salon create job submit flow (`SalonCreateJobPage`)
- React Query cache invalidation for shop listings and feeds

**Key Features**
- After a successful `createShift`, invalidates employer listing queries so the shop dashboard “My Listings” updates instantly without a hard refresh.
- Also invalidates shift/job feed queries to keep marketplace views in sync.

**Integration Points**
- UI route: `/salon/create-job` → `/dashboard`
- API endpoint: `POST /api/shifts`
- React Query keys: `['shop-shifts', userId]`, `['shop-shifts']`, `['shop-schedule-shifts']`, `['/api/shifts']`, `['/api/jobs']`

**File Paths**
- `src/pages/salon-create-job.tsx`

**Next Priority Task**
- Fix the current repo `npm run lint` errors (it currently fails due to pre-existing API lint issues like `prefer-const` in `api/_src/index.ts`).

**Code Organization & Quality**
- Kept changes scoped to the post-submit success path; reused existing query key patterns already used in dashboards/calendars.

---

#### 2025-12-14: Playwright Coverage for Shop Schedule + E2E Auth Reliability (SessionStorage + Mock Token)

**Core Components**
- Playwright global auth setup (`tests/auth.setup.ts`)
- E2E session hydration (AuthContext)
- E2E API auth token support (React Query `apiRequest` / `getQueryFn`)
- Shop schedule E2E coverage (`/shop/schedule`)

**Key Features**
- Stabilized E2E auth by hydrating the user from `sessionStorage['hospogo_test_user']` when `VITE_E2E=1` (no brittle Firebase UI login in automation).
- Added E2E API auth fallback token (`Bearer mock-test-token`) so API routes work in Playwright runs.
- Added a Playwright spec that covers `/shop/schedule` core workflows: **Copy Previous Week**, **Publish All**, and **Quick Create (Draft)**.

**Integration Points**
- Playwright: `npm run test:e2e`
- E2E env: `VITE_E2E=1` (webServer config)
- API auth bypass: `Bearer mock-test-token`

**File Paths**
- `tests/auth.setup.ts`
- `tests/e2e/shop-schedule.spec.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/queryClient.ts`

**Next Priority Task**
- Invalidate employer listing queries after successful salon job post so “My Listings” reflects the new post instantly.

**Code Organization & Quality**
- Kept the E2E bypass strictly behind `VITE_E2E` so dev/prod auth behavior remains Firebase-driven.

---

#### 2025-12-14: Fix Map Interaction Wiring on Details Pages (Static Marker Mode)

**Core Components**
- Details pages map usage (`ShiftDetailsPage`, `JobDetailsPage`)
- Shared map component interaction affordance (`GoogleMapView`)

**Key Features**
- Removed misleading no-op marker handler on Details pages by setting `interactive={false}` for the single-pin map.
- Added explicit static/non-interactive support to `GoogleMapView` (optional `onJobSelect`, guarded selection UI, non-pointer cursor when disabled).

**Integration Points**
- UI routes: `/shifts/:id`, `/jobs/:id` (Details pages)

**File Paths**
- `src/components/job-feed/google-map-view.tsx`
- `src/pages/shift-details.tsx`
- `src/pages/job-details.tsx`

**Next Priority Task**
- Invalidate employer listing queries after successful salon job post so “My Listings” reflects the new post instantly.

**Code Organization & Quality**
- Kept the change localized to the map component contract + Details page usage; preserved existing interactive behavior for feed/map browsing.

---

#### 2025-12-14: Shop Scheduling Command Center (Weekly Calendar + Bulk Actions + Confirmed Shift Safety)

**Core Components**
- Shop schedule page (`ShopSchedulePage`)
- Shift API extensions (employer-scoped fetch + bulk actions)
- Confirmed shift safety + professional notifications
- Professional dashboard calendar commitments/opportunities separation

**Key Features**
- Added `/shop/schedule` weekly calendar with **click-to-create DRAFT shifts** and **drag-and-drop rescheduling**.
- Added status-aware styling (pastel event colors) for `DRAFT`, `OPEN`, `PENDING`, `CONFIRMED`, etc.
- Implemented **Copy Previous Week** (duplicates last week’s shifts into the current week as `draft`).
- Implemented **Publish All** (bulk changes current week’s `draft` shifts to `open`).
- Safety guard: modifying a `confirmed` shift now requires a **change reason** and triggers a **notification to the assigned Professional**.
- Professional dashboard calendar now strictly filters **ACCEPTED/accepted** applications for “My Commitments” and shows `open` shifts separately as “Opportunities”.

**Integration Points**
- Frontend route: `GET /shop/schedule`
- API endpoint: `GET /api/shifts?employer_id=me&start=<iso>&end=<iso>`
- API endpoint: `POST /api/shifts/copy-previous-week`
- API endpoint: `POST /api/shifts/publish-all`
- API endpoint: `PUT /api/shifts/:id` (supports `changeReason` guard for confirmed reschedules)
- Notification: `notifyProfessionalOfShiftChange` (in-app + email mock)

**File Paths**
- `src/pages/shop/schedule.tsx`
- `src/App.tsx`
- `src/lib/api.ts`
- `src/pages/professional-dashboard.tsx`
- `api/_src/routes/shifts.js`
- `api/_src/routes/shifts.ts`
- `api/_src/lib/notifications-service.js`
- `api/_src/lib/notifications-service.ts`
- `api/_src/tests/routes/shifts.schedule-tools.test.ts`

**Next Priority Task**
- Invalidate employer listing queries after successful salon job post so “My Listings” reflects the new post instantly.

**Code Organization & Quality**
- Kept changes localized to scheduling surfaces + shift routes; reused existing React Query patterns for instant UI sync.
- Added server-side validation for confirmed shift changes and targeted API route tests for schedule actions.

---

#### 2025-12-14: Wire Up Salon “Post Job” Submission (createShift + toasts + redirect)

**Core Components**
- Salon job post page submit handler (`SalonCreateJobPage`)
- Frontend API integration (`createShift`)
- Toast feedback + navigation redirect (React Router)

**Key Features**
- Wired `salon-create-job` submit handler to call `createShift(payload)` with `try/catch`.
- Added success toast ("Job Posted!") and redirected to the Dashboard (role-based routing via `/dashboard`).
- Added error toast ("Failed to post job") and logged the error for debugging.
- Ensured payload includes required `description` field for the shift create API.

**Integration Points**
- API endpoint: `POST /api/shifts` (via `createShift` in `src/lib/api.ts`)
- UI routes: `/salon/create-job` → `/dashboard`

**File Paths**
- `src/pages/salon-create-job.tsx`

**Next Priority Task**
- Invalidate employer listing queries after successful salon job post so “My Listings” reflects the new post instantly.

**Code Organization & Quality**
- Kept changes scoped to wiring + UX feedback; reused existing API/toast/router patterns without introducing new abstractions.

---

#### 2025-12-14: Comprehensive Functional & Wiring Audit (Auth, API Handshake, Map Lat/Lng)

**Core Components**
- Google OAuth UI wiring (`GoogleAuthButton`)
- Frontend API wrapper compatibility (`src/lib/api.ts`)
- Shifts route completeness (`GET /api/shifts/:id`)
- Shift lat/lng normalization (backend + frontend)

**Key Features**
- Fixed Google Auth redirect fallback so popup-blocked sign-in still completes backend session + DB user creation, and ensured loading state always clears on success/error.
- Fixed frontend → backend application payload mismatch by sending `message` (backend zod schema) instead of `coverLetter`.
- Added missing backend route `GET /api/shifts/:id` required by `fetchShiftDetails`, and normalized lat/lng to numeric values to avoid map type/runtime issues.

**Integration Points**
- API endpoints: `POST /api/register`, `POST /api/login`, `GET /api/me`
- API endpoint: `GET /api/shifts/:id`
- API endpoint: `POST /api/applications` (CreateApplicationSchema expects `message`)

**File Paths**
- `src/components/auth/google-auth-button.tsx`
- `src/lib/api.ts`
- `api/_src/routes/shifts.ts`
- `api/_src/routes/shifts.js`

**Next Priority Task**
- Resolve remaining “Disconnected Wires” from the audit report (replace no-op handlers with intended navigation/actions, or remove the interaction affordance).

**Code Organization & Quality**
- Kept fixes tightly scoped to wiring/contract mismatches; avoided introducing new auth patterns beyond existing Firebase + backend session flow.

---

#### 2025-12-13: Public Asset Cleanup (Remove Unused Legacy Large Images)

**Core Components**
- Public static assets (`public/`)
- PWA Workbox precache ignore list (cleanup)

**Key Features**
- Removed unused legacy multi‑MB images from `public/` after confirming no runtime references outside tracking/config notes.
- Simplified Workbox `globIgnores` to only exclude the single remaining legacy large file (`herobarber (2).png`).

**Integration Points**
- Workbox precache config (`vite-plugin-pwa`)

**File Paths**
- `public/hero-background.png` (deleted)
- `public/herobarber (1).png` (deleted)
- `public/herobarber (3).png` (deleted)
- `public/logoblackback.png` (deleted)
- `public/nobackgroundlogo.png` (deleted)
- `public/og-image.png` (deleted)
- `vite.config.ts`

**Next Priority Task**
- Consider generating a smaller PNG fallback for the hero (or removing the PNG entirely once legacy browsers/support requirements are confirmed).

**Code Organization & Quality**
- Kept deletions tightly scoped to assets verified as unreferenced; avoided refactors outside asset + config hygiene.

---

#### 2025-12-13: Landing Assets Optimization (OG Image + PWA Icons + Hero Fallback)

**Core Components**
- Social/SEO image defaults (`SEO`, `index.html` OG/Twitter tags)
- PWA manifest + icon assets (PWA plugin manifest + `public/manifest.json`)
- Service worker precache filtering for legacy large PNGs
- Landing hero image fallback format

**Key Features**
- **OG/Twitter image optimization**: generated `public/og-image.jpg` and updated tags/default SEO image to use it (much smaller than the previous PNG).
- **PWA icon optimization**: added properly-sized `brand-logo-192.png` and `brand-logo-512.png`, updated both manifests to point at them, and resized `brand-logo.png` to a small favicon-friendly size.
- **Hero fallback optimization**: added `public/herobarber (2).jpg` and switched non-WebP fallback from PNG → JPG to reduce worst-case downloads.
- **Precache safety**: excluded legacy oversized PNGs from Workbox precaching to prevent SW updates from downloading unused multi‑MB assets.

**Integration Points**
- PWA: `vite-plugin-pwa` / Workbox precache configuration
- Document metadata: `index.html` + `src/components/seo/SEO.tsx`

**File Paths**
- `index.html`
- `public/manifest.json`
- `public/brand-logo.png`
- `public/brand-logo-192.png`
- `public/brand-logo-512.png`
- `public/og-image.png`
- `public/og-image.jpg`
- `public/herobarber (2).jpg`
- `vite.config.ts`
- `src/components/seo/SEO.tsx`
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`

**Next Priority Task**
- Remove or archive unused legacy PNGs in `public/` (after confirming they’re not referenced anywhere) to reduce repo/deploy size further.

**Code Organization & Quality**
- Kept changes scoped to static assets + their direct references; avoided new runtime dependencies by using one-off CLI tooling for image conversion.

---

#### 2025-12-13: Landing Page Hero Asset Optimization (WebP + Priority Loading)

**Core Components**
- Landing hero rendering (prioritized LCP image via `<picture>`)
- Public hero asset optimization (`public/herobarber (2).webp`)

**Key Features**
- Replaced the hero CSS background image with a real `<picture>` element using **WebP + PNG fallback** to cut transfer size for the landing hero (6.31MB → 0.19MB).
- Added `loading="eager"` + `fetchPriority="high"` + `decoding="async"` for the hero image to improve LCP.
- Kept the original PNG as a legacy fallback without changing routing or introducing new runtime dependencies.

**Integration Points**
- Static asset served from `public/` at `/herobarber (2).webp`

**File Paths**
- `public/herobarber (2).webp`
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`

**Next Priority Task**
- Convert remaining oversized `public/*.{png,jpg}` (e.g. `og-image.png`, `nobackgroundlogo.png`) to WebP/AVIF and ensure any below-the-fold `<img>` elements use `loading="lazy"`.

**Code Organization & Quality**
- Kept changes localized to the landing hero; preserved the semantic z-index layering system (`z-base`/`z-elevated`) and avoided new patterns beyond standard `<picture>` usage.

---

#### 2025-12-13: Vercel Build Fixes (API TS Lib + Script Type Safety)

**Core Components**
- Vercel local build pipeline (`vercel pull`, `vercel build`)
- API TypeScript configuration (`api/tsconfig.json`)
- API jobs geocoding helper typing
- DB utility scripts typing (migration + seeding)

**Key Features**
- **Vercel build reproducibility**: pulled project settings locally and reproduced the failing step(s) in the same pipeline Vercel uses.
- **API TS compile fix**: moved API TS target/lib to ES2021 to support modern String APIs (e.g. `replaceAll`) under strict typing.
- **Safe geocoding parsing**: added runtime/TS guards around Nominatim JSON response before indexing.
- **Script typing fixes**:
  - Eliminated nullable pool usage warnings in `migrate-production`.
  - Updated `seed-data` to use ISO date strings for Drizzle `date` columns (and date comparisons).

**Integration Points**
- `vercel pull --yes`
- `vercel build`
- `api` `postinstall` (`tsc && node fix-imports.js`)

**File Paths**
- `api/tsconfig.json`
- `api/_src/index.ts`
- `api/scripts/migrate-production.ts`
- `api/scripts/seed-data.ts`

**Next Priority Task**
- Reduce Vite build output chunk size (vendor chunk > 1MB) to improve caching/performance.

**Code Organization & Quality**
- Kept changes scoped to build correctness; avoided new patterns and added runtime guards where external JSON is consumed.

---

#### 2025-12-13: Vite/Rollup Build Warning Fix (preserveModules)

**Core Components**
- Vite build configuration
- Rollup options wiring

**Key Features**
- Removed invalid Rollup input option `preserveModules` from Vite’s `build.rollupOptions` to eliminate the build warning.
- Confirmed warning is gone in both `npm run vercel-build` and full `vercel build`.

**Integration Points**
- `npm run vercel-build`
- `vercel build`

**File Paths**
- `vite.config.ts`

**Next Priority Task**
- Reduce Vite build output chunk size (vendor chunk > 1MB) to improve caching/performance.

**Code Organization & Quality**
- Kept config change minimal (no behavior change intended since `preserveModules` was `false` / default).

---

#### 2025-12-13: Vite Chunk Splitting (Reduce Vendor Chunk Size)

**Core Components**
- Vite build chunking (`manualChunks`)
- Vendor bundle organization for caching/performance

**Key Features**
- Split the previous single large `vendor` bundle into stable domain chunks:
  - `vendor-react` (React + router + TanStack Query)
  - `vendor-react` also includes React-dependent UI libs (Radix UI + lucide icons) to avoid runtime ordering issues
  - `vendor-firebase` (Firebase SDK)
  - `vendor-maps` (Google Maps loader + maps helpers)
  - `vendor-react` also includes calendar/charts libs (recharts + d3*, react-big-calendar/date-fns/moment) to avoid runtime ordering issues
  - `vendor-realtime` (socket.io-client)
- Reduced the remaining generic `vendor` chunk to well below the 1MB warning threshold.

**Integration Points**
- `npm run vercel-build` (verified chunk sizes; no >1MB warning)

**File Paths**
- `vite.config.ts`

**Next Priority Task**
- Investigate the remaining local build warnings (`EBADENGINE` + npm `--unsafe-perm`) to keep logs clean and future-proof.

**Code Organization & Quality**
- Used deterministic package-based chunk naming to improve long-term caching and avoid fragile path-based heuristics.

---

#### 2025-12-13: PWA Cache Recovery (Production Black Screen Mitigation)

**Core Components**
- App shell (`index.html`)
- Service worker runtime behavior (client-side recovery)

**Key Features**
- Added a **one-time** service-worker + cache cleanup script that runs **before** loading the app bundle.
- Mitigates situations where an older Workbox precache continues serving broken/stale chunks (symptom: black screen + `forwardRef` undefined in vendor chunk).

**Integration Points**
- Runs automatically in the browser (no server changes).

**File Paths**
- `index.html`

**Next Priority Task**
- Confirm Vercel deployment no longer serves stale chunks after this recovery and monitor for repeat occurrences.

**Code Organization & Quality**
- Guarded to run only once per browser profile (localStorage key) and only when SW/caches actually exist.

---

#### 2025-12-13: Vite Chunking Rollback (Fix React Undefined Runtime Crash)

**Core Components**
- Vite Rollup chunk strategy (`vite.config.ts`)
- PWA recovery trigger versioning (`index.html`)

**Key Features**
- Switched from aggressive package-based vendor chunking to a **conservative** strategy:
  - Only isolates known-heavy libs (`firebase`, maps, Stripe)
  - Leaves all other chunking decisions to Vite/Rollup to preserve correct dependency ordering
- Bumped the SW recovery key to re-run cleanup for clients still pinned to stale/broken chunks.

**Integration Points**
- `npm run vercel-build`
- `vercel build`

**File Paths**
- `vite.config.ts`
- `index.html`

**Next Priority Task**
- Validate production no longer hits `useLayoutEffect`/`forwardRef` undefined crashes and remove recovery script once the user base is fully off stale caches.

**Code Organization & Quality**
- Prioritized runtime correctness over micro-optimizing vendor chunk sizes.

---

#### 2025-12-13: Phase 4 Final Polish (Structure, Naming, Import Hygiene, README)

**Core Components Implemented:**
- Component folder organization (`src/components/*`)
- Hook naming conventions (`src/hooks/*`)
- Import path hygiene (`@/*` aliases)
- Root documentation (`README.md`)

**Key Features**
- **Component Organization:**
  - Moved previously “loose” root components into clear domain folders (e.g. `layout/`, `landing/`, `theme/`, `error/`, `shifts/`).
- **Naming Conventions:**
  - Standardized moved component filenames to **PascalCase**.
  - Renamed hook files to **camelCase** (`useToast`, `useNotifications`, etc.) and updated all imports.
- **Import Hygiene:**
  - Removed remaining deep/relative component imports in key entrypoints, favoring `@/…` aliases.
  - Cleaned up a duplicate import in `Navbar` while updating paths.
- **Documentation:**
  - Updated `README.md` with a concise **Project Structure** overview and clarified **Getting Started** commands.

**Integration Points**
- `npm run build` (verified after moves/renames)

**File Paths**
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/landing/Pricing.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/theme/ThemeProvider.tsx`
- `src/components/theme/ModeToggle.tsx`
- `src/components/error/StartupErrorBoundary.tsx`
- `src/components/shifts/ShiftCard.tsx`
- `src/hooks/useToast.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useImageUpload.ts`
- `src/hooks/useInstallPrompt.ts`
- `src/hooks/useMobile.tsx`
- `src/App.tsx`
- `src/pages/landing.tsx`
- `src/main.tsx`
- `README.md`

**Next Priority Task**
- Fix the remaining lint **errors** so `npm run lint` is green again (then address warnings in smaller follow-up passes).

**Code Organization & Quality**
- Focused on high-signal structural polish without expanding scope to full repo-wide renames.

---

#### 2025-12-13: Fix Professional Dashboard 500 (Applications Query Fallback + Test DB Schema Sync)

**Core Components**
- `/api/professional/applications` query hardening in `applicationsRepo.getApplicationsForUser`
- Test DB schema sync via ordered SQL migrations (instead of `drizzle-kit push`)
- Regression tests for jobs-only fallback behavior when shift support is missing

**Key Features**
- **Resilient applications fetch**: if the database is missing shift-related columns/tables (common in partially-migrated prod DBs), the API now retries with a jobs-only query and returns `shift: null` instead of 500.
- **Deterministic test DB setup**: Vitest global setup now resets the test schema and applies `api/drizzle/*.sql` in order (skipping Supabase-only RLS/policy statements), making integration tests reliable.

**Integration Points**
- API endpoint: `GET /api/professional/applications`
- Tests: `api npm run test`

**File Paths**
- `api/_src/repositories/applications.repository.ts`
- `api/_src/tests/repositories/applications.repository.fallback.test.ts`
- `api/_src/tests/globalSetup.ts`

**Next Priority Task**
- Resolve Vercel config validation error (“should NOT have additional property `rootDirectory`”) by removing that setting from the Vercel Project configuration / ensuring the deployment is building the latest `main`.

**Code Organization & Quality**
- Kept behavior change localized to repository functions; added fallback-specific tests and improved test infra without introducing new runtime dependencies.

---

#### 2025-12-13: Fix Professional Dashboard 500 (Pending Review Query Scope)

**Core Components**
- `/api/shifts/pending-review` role-aware query scoping
- Route regression tests for pending-review behavior

**Key Features**
- **Role-aware pending review fetch**: `/api/shifts/pending-review` now queries only the relevant shift set:
  - Professionals: `assigneeId = currentUser`
  - Businesses: `employerId = currentUser`
  - Admin: both
- **Reduced error surface**: avoids unnecessary employer-side queries for professionals (matches the production 500 signature shown in the dashboard error toast).

**Integration Points**
- API endpoint: `GET /api/shifts/pending-review`
- Tests: `api/_src/tests/routes/shifts.pending-review.test.ts`

**File Paths**
- `api/_src/routes/shifts.ts`
- `api/_src/routes/shifts.js`
- `api/_src/tests/routes/shifts.pending-review.test.ts`

**Next Priority Task**
- Fix the remaining lint **errors** so `npm run lint` is green again (then address warnings in smaller follow-up passes).

**Code Organization & Quality**
- Kept changes localized to the route; added targeted tests without introducing new patterns.

---

#### 2025-12-13: Bulletproof Protocol (API Safety, Empty States, Image Resilience)

**Core Components Implemented:**
- Frontend API wrapper (`src/lib/api.ts`)
- Image resilience via shared UI components (`AvatarImage`, `OptimizedImage` consumers)
- Form and action validation in key flows (Post Job, Shift/Job apply)

**Key Features**
- **API Safety & Catch Blocks:**
  - Introduced a standardized `ApiError` and centralized safe JSON parsing in `src/lib/api.ts`.
  - Wrapped exported API calls in `try/catch` to either **throw a standardized error** (detail/actions) or **return safe fallbacks** (lists/counts) to avoid blank screens.
  - Replaced previously-stubbed endpoints that were actively used in UI (`fetchJobDetails`, `applyToJob`, `fetchJobApplications`, `cancelSubscription`) with real API calls and safe failure behavior.
- **Empty State Handling:**
  - Verified key list views already render explicit empty states (Messages, Notifications, Dashboards, Job/Shift feeds) to prevent “blank whitespace” UX.
- **Image Resilience:**
  - Hardened `AvatarImage` to reliably fall back when an image URL 404s/errors.
  - Replaced remaining dynamic `<img>` usages with `OptimizedImage` in high-traffic surfaces (feeds, dashboards, portfolios, moderation, uploads) to ensure consistent fallbacks.
- **Input Validation:**
  - Added HTML `required` attributes to critical Post Job fields and retained runtime validation.
  - Added pre-submit guards for applying to jobs/shifts when critical listing fields are missing (rate/date/location).

**Integration Points**
- `npm run build` (verified production build succeeds after changes)
- API endpoints: `/api/applications`, `/api/jobs/:id`, `/api/jobs/:id/applications`, `/api/subscriptions/checkout`, `/api/subscriptions/cancel`

**File Paths**
- `src/lib/api.ts`
- `src/lib/queryClient.ts`
- `src/pages/post-job.tsx`
- `src/pages/shift-details.tsx`
- `src/pages/job-details.tsx`
- `src/pages/wallet.tsx`
- `src/pages/manage-jobs.tsx`
- `src/pages/hub-dashboard.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/image-upload.tsx`
- `src/components/ui/location-input.tsx`
- `src/components/social/post-card.tsx`
- `src/components/social/post-creation-form.tsx`
- `src/components/social/social-feed.tsx`
- `src/components/shifts/shift-offer-card.tsx`
- `src/components/profile/profile-edit-form.tsx`
- `src/components/profile/professional-digital-resume.tsx`
- `src/components/profile/portfolio-lightbox.tsx`
- `src/components/training/training-hub.tsx`
- `src/components/admin/content-moderation.tsx`
- `src/components/auth/google-signup-modal.tsx`
- `src/pages/my-applications.tsx`

**Next Priority Task**
- Phase 4: Final Polish (directory organization + config hygiene).

**Code Organization & Quality**
- Centralized resilience behavior in shared utilities/components to avoid repetitive one-off fallbacks.

---

#### 2025-12-13: Visual Unification Pass (Tailwind Normalization)

**Core Components Implemented:**
- UI Components (shadcn/ui wrappers)
- Dashboard + Job Feed layout polish
- Modal sizing standardization

**Key Features**
- **Spacing Standardization:**
  - Replaced safe Tailwind arbitrary pixel values with nearest standard scale classes (e.g., `sm:w-[180px]` → `sm:w-44`, `w-[240px]` → `w-60`, `min-w-[320px]` → `min-w-80`, `p-[1px]` → `p-px`).
  - Standardized common min-height values used for textareas and empty states (e.g., `min-h-[100px]` → `min-h-24`, `min-h-[200px]` → `min-h-48`).
- **Typography:**
  - Removed remaining hard-coded font-size token in `Calendar` day header (`text-[0.8rem]` → `text-xs`).
- **Mobile Responsiveness:**
  - Removed a few fixed-width control widths in key flows (Find Shifts sort controls) while preserving responsive behavior.
- **Interactive States:**
  - Confirmed global `:active` feedback exists in `src/index.css`; existing hover states are preserved and shared Button styles remain the primary source of interaction styling.
- **Build/Tooling Hygiene:**
  - Scoped `npm run lint` to `src/` + `api/` to avoid unrelated legacy directories breaking lint.

**Integration Points**
- `npm run lint`

**File Paths**
- `package.json`
- `src/pages/job-feed.tsx`
- `src/pages/travel.tsx`
- `src/pages/shop-dashboard.tsx`
- `src/pages/brand-dashboard.tsx`
- `src/pages/trainer-dashboard.tsx`
- `src/pages/edit-profile.tsx`
- `src/components/navbar.tsx`
- `src/components/ui/location-input.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/image-upload.tsx`
- `src/components/loading/loading-spinner.tsx`
- `src/components/ui/error-boundary.tsx`
- `src/components/job-board/JobBoard.tsx`
- `src/components/notifications/notification-bell.tsx`
- `src/components/notifications/notification-toast.tsx`
- `src/components/auth/google-signup-modal.tsx`
- `src/components/report/report-button.tsx`
- `src/components/shifts/offer-inbox.tsx`
- `src/components/demo/design-system-showcase.tsx`

**Next Priority Task**
- Phase 3: Bulletproof Protocol (API safety, empty states, image fallbacks).

**Code Organization & Quality**
- Limited changes to value-safe Tailwind token replacements; avoided large refactors in oversized files.

---

#### 2025-12-04: Vercel Build Warnings Fix

**Core Components Implemented:**
- Build Configuration
- API Configuration

**Key Features**
- **Build Optimization:**
  - Updated `engines` to Node 22.x to match Vercel project settings.
  - Enabled ESM (`type: "module"`) for API package to prevent CommonJS compilation warnings.
  - Implemented intelligent chunk splitting in `vite.config.ts`, reducing main vendor chunk size from ~800kB to ~327kB.
- **Code Quality:**
  - Updated API scripts (`fix-imports.js`) to use ESM syntax.
  - Fixed relative import paths in API tests and schema files to comply with ESM standards (added `.js` extensions).

**Integration Points**
- `package.json` scripts
- Vercel build pipeline

**File Paths**
- `package.json`
- `api/package.json`
- `vite.config.ts`
- `api/fix-imports.js`
- `api/_src/db/schema/notifications.ts`
- `api/_src/tests/applications.test.ts`
- `api/_src/tests/auth-flow.test.ts`
- `api/_src/tests/error-handling.test.ts`
- `api/_src/tests/jobs.test.ts`
- `api/_src/tests/payments.test.ts`

**Next Priority Task**
- Deployment to Vercel.

---

#### 2025-01-XX: Shift Completion and Dual-Sided Rating System

**Core Components Implemented:**
- Database Schema Extensions
- Shift Reviews Repository
- Cron Job Service
- API Endpoints
- Frontend Review Components
- Dashboard Notifications

**Key Features**
- **Database Schema:**
  - Added `attendanceStatus` enum and field to shifts table ('pending', 'completed', 'no_show')
  - Added 'pending_completion' to shift status enum
  - Created `shift_reviews` table with dual-sided review support (SHOP_REVIEWING_BARBER, BARBER_REVIEWING_SHOP)
  - Migration SQL file: `0008_add_shift_reviews_and_attendance.sql`
- **Backend Logic:**
  - Created shift reviews repository with aggregation logic that combines job and shift reviews
  - Implemented cron job service to auto-flag shifts as 'pending_completion' 1 hour after endTime
  - Added `POST /api/shifts/:id/review` endpoint with state transitions:
    - SHOP_REVIEWING_BARBER → Sets attendanceStatus to 'completed' (or 'no_show' if marked)
    - BARBER_REVIEWING_SHOP → Allows barber to rate shop
  - Added `GET /api/shifts/pending-review` endpoint to fetch shifts needing review
  - Updated `updateShift` repository function to support attendanceStatus and pending_completion status
- **Frontend UI:**
  - Created `ShiftReviewModal` component with interactive star rating, comment textarea, and no-show toggle (shop only)
  - Created `PendingReviewNotification` component for dashboard alerts
  - Integrated notifications into shop and professional dashboards
  - Added API functions for submitting reviews and fetching pending reviews
- **Data Integration:**
  - Rating aggregation combines both job reviews and shift reviews
  - Updates user's `averageRating` and `reviewCount` when new shift review is submitted
  - Cached values stored on User table for efficient profile display

**Integration Points**
- API endpoints: `/api/shifts/:id/review`, `/api/shifts/pending-review`
- Cron job runs every 5 minutes (checks shifts every 5 min, flags after 1 hour past endTime)
- Dashboard components: `shop-dashboard.tsx`, `professional-dashboard.tsx`
- Review modal integrated with existing Dialog and StarRating components

**File Paths**
- `api/_src/db/schema/shifts.ts` - Schema updates
- `api/drizzle/0008_add_shift_reviews_and_attendance.sql` - Migration
- `api/_src/repositories/shift-reviews.repository.ts` - New repository
- `api/_src/repositories/shifts.repository.ts` - Updated updateShift function
- `api/_src/services/shift-completion-cron.ts` - Cron service
- `api/_src/routes/shifts.ts` - Review endpoints
- `api/_src/validation/schemas.ts` - ShiftReviewSchema
- `api/_src/server.ts` - Cron initialization
- `src/components/shifts/shift-review-modal.tsx` - Review modal component
- `src/components/shifts/pending-review-notification.tsx` - Notification component
- `src/pages/shop-dashboard.tsx` - Integration
- `src/pages/professional-dashboard.tsx` - Integration
- `src/lib/api.ts` - API functions

**Next Priority Task**
- Test the complete flow: shift completion → cron flagging → notification → review submission → rating aggregation

---

#### 2025-01-XX: Stripe Connect Marketplace Payments Implementation

**Core Components Implemented:**
- Database Schema Extensions
- Stripe Connect Service
- Payment Processing Logic
- Onboarding Flows
- Dashboard UI Components

**Key Features**
- **Database Schema:**
  - Added `stripeAccountId`, `stripeOnboardingComplete`, and `stripeCustomerId` to users table
  - Added `paymentStatus` enum ('UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED') and `paymentIntentId` to shifts table
  - Migration SQL file: `0009_add_stripe_connect_fields.sql`
- **Backend Logic:**
  - Created Stripe Connect service for Express account onboarding and management
  - Implemented PaymentIntent creation with manual capture on shift confirmation
  - Payment capture and transfer to barber on shift completion (with HospoGo commission)
  - Security checks: verify `charges_enabled` before allowing barbers to accept shifts
  - Webhook handlers for Connect account updates and payment events
- **API Endpoints:**
  - `GET /api/stripe-connect/account/status` - Get Connect account status
  - `POST /api/stripe-connect/account/create` - Create Connect account and onboarding link
  - `POST /api/stripe-connect/account/onboarding-link` - Create new onboarding link
  - `GET /api/stripe-connect/account/verify` - Verify if user can accept shifts
  - `POST /api/stripe-connect/customer/create` - Create/get Stripe Customer for shops
- **Frontend UI:**
  - Created `PayoutSettings` component for Professional Dashboard
  - Added "Payouts" tab to Professional Dashboard
  - Created `BillingSettings` component for Shop Dashboard
  - Integrated billing settings into Shop Dashboard
  - Onboarding redirect handling with success/error states
- **Payment Flow:**
  - Escrow model: PaymentIntent created on shift confirmation (manual capture)
  - Funds held until shift completion
  - Automatic capture and transfer on shift completion (barber receives payment minus commission)
  - Commission rate configurable via `HOSPOGO_COMMISSION_RATE` env var (default 10%)

**Integration Points**
- API endpoints: `/api/stripe-connect/*`
- Webhook handlers: `account.updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- Shift acceptance flow: PaymentIntent creation integrated
- Shift completion flow: Payment capture integrated with review submission
- Dashboard components: `professional-dashboard.tsx`, `shop-dashboard.tsx`

**File Paths**
- `api/_src/db/schema/users.ts` - Schema updates
- `api/_src/db/schema/shifts.ts` - Payment fields
- `api/drizzle/0009_add_stripe_connect_fields.sql` - Migration
- `api/_src/services/stripe-connect.service.ts` - Connect service
- `api/_src/routes/stripe-connect.ts` - Connect API routes
- `api/_src/routes/shifts.ts` - Payment logic integration
- `api/_src/routes/webhooks.ts` - Connect webhook handlers
- `api/_src/repositories/shifts.repository.ts` - Payment field support
- `src/components/payments/payout-settings.tsx` - Payout settings UI
- `src/components/payments/billing-settings.tsx` - Billing settings UI
- `src/pages/professional-dashboard.tsx` - Payouts tab integration
- `src/pages/shop-dashboard.tsx` - Billing settings integration

**Next Priority Task**
- Test complete payment flow: Connect onboarding → shift acceptance → payment authorization → shift completion → payment capture and transfer
