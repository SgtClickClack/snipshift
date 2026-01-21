#### 2026-01-21: Auth Transition Gate + Pending State Handler

**Core Components**
- Auth context transition gate (`src/contexts/AuthContext.tsx`)
- User sync partial silence break (`src/hooks/useUserSync.ts`)
- Auth guard pending state handler (`src/components/auth/auth-guard.tsx`)

**Key Features**
- **Task 1 - Transition Gate**: Added `useEffect` in AuthContext that monitors `auth.currentUser` and immediately redirects authenticated users from `/login` and `/signup` to `/onboarding` (new users) or their dashboard (existing users). This runs BEFORE `useUserSync` fires, eliminating the stuck navigation issue.
- **Task 2 - Partial Silence Break**: Modified `useUserSync` to allow a ONE-TIME verification sync on public paths when `firebaseUser` is present. This enables proper redirect decisions without constant polling.
- **Task 3 - Pending State Handler**: Updated `AuthGuard` to handle new Google users (Firebase auth exists, no Postgres record). Users in this "pending" state are allowed on all `/onboarding/*` routes and redirected there from other protected routes.

**Integration Points**
- Firebase Auth: `auth.currentUser` monitoring in transition gate
- API: `GET /api/me` verification sync
- Router: `useNavigate` for immediate redirects

**File Paths**
- `src/contexts/AuthContext.tsx` (Transition Gate effect + ref)
- `src/hooks/useUserSync.ts` (verification sync + global flag)
- `src/components/auth/auth-guard.tsx` (pending state logic)

**Next Priority Task**
- Test the complete auth flow with Google Sign-In to verify users are no longer stuck on login/signup pages.

**Code Organization & Quality**
- Used refs to prevent duplicate transitions in React Strict Mode
- Added comprehensive logging for debugging auth flow issues
- Maintained backward compatibility with existing auth logic

---

#### 2026-01-21: Demo Auth Sync Silence Guard

**Core Components**
- User sync hook (`src/hooks/useUserSync.ts`)

**Key Features**
- Added a public-path guard for `/`, `/login`, `/signup`, and `/venue-guide` to keep `/api/me` polling fully silent on demo-facing pages.
- Introduced a global sync lock to prevent concurrent `/api/me` calls across hook instances.
- Returned `null` on 401 responses to stop polling without resetting auth state or triggering redirects.

**Integration Points**
- API: `GET /api/me`
- Auth lifecycle: Firebase `auth.currentUser` + token presence

**File Paths**
- `src/hooks/useUserSync.ts`

**Next Priority Task**
- Re-run the demo auth flow to confirm the 401 loop is gone on public routes.

**Code Organization & Quality**
- Kept logic centralized in the existing sync hook without introducing new patterns.

---

#### 2026-01-21: Auth Circuit Breaker + Sync Throttle

**Core Components**
- Auth context (`src/contexts/AuthContext.tsx`)
- User sync polling (`src/hooks/useUserSync.ts`)
- Stripe client config (`src/lib/stripe.ts`)

**Key Features**
- Added `isInitialLoading` gate so the app and `/api/me` waits for initial Firebase auth resolution.
- Throttled `/api/me` sync calls to at most one every 5 seconds and avoided sign-out redirects on landing/signup flows.
- Confirmed `hospogo.com` uses `VITE_STRIPE_PUBLISHABLE_KEY_LIVE` when available.

**Integration Points**
- Auth listener: `onAuthStateChange`
- API: `GET /api/me`
- Stripe: `VITE_STRIPE_PUBLISHABLE_KEY_LIVE`

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/hooks/useUserSync.ts`
- `src/lib/stripe.ts`

**Next Priority Task**
- Re-run the demo auth flow to confirm no 401 loops.

**Code Organization & Quality**
- Kept auth guards isolated to the auth context and user sync hook.

---

#### 2026-01-21: Register Upsert Repo Export + Schema Sync

**Core Components**
- Users repository (`api/_src/repositories/users.repository.ts`)
- Users schema + migration (`api/_src/db/schema/users.ts`, `api/_src/db/migrations/0034_add_firebase_uid_last_login.sql`)
- Auth middleware role handling (`api/_src/middleware/auth.ts`)

**Key Features**
- Ensured Firebase UID upsert repository export is available for `/api/register` builds.
- Added Firebase UID + last login fields and role defaults to keep schema aligned.
- Updated auth typing to allow `pending_onboarding` role during demo signup.

**Integration Points**
- API: `POST /api/register`, `GET /api/me`
- DB: `users.firebase_uid`, `users.last_login`, `user_role` enum default

**File Paths**
- `api/_src/repositories/users.repository.ts`
- `api/_src/db/schema/users.ts`
- `api/_src/db/migrations/0034_add_firebase_uid_last_login.sql`
- `api/_src/middleware/auth.ts`

**Next Priority Task**
- Confirm Vercel build passes and demo signup completes without 500s.

**Code Organization & Quality**
- Kept schema and repo updates scoped to user creation/upsert logic.

---

#### 2026-01-21: Demo Migration Push + Register Fallback Guard

**Core Components**
- Drizzle config (`api/drizzle.config.ts`)
- Registration route (`api/_src/routes/users.ts`)
- User sync polling guard (`src/hooks/useUserSync.ts`)

**Key Features**
- Pointed Drizzle migrations output to `api/_src/db/migrations` and pushed schema directly to Neon for the demo.
- Added `/api/register` fallback that ignores missing `firebase_uid` column by matching users via email only.
- Ensured user sync is silent on `/onboarding` to stop polling loops during the demo.

**Integration Points**
- Drizzle CLI: `npx drizzle-kit push`
- API: `POST /api/register`, `GET /api/me`

**File Paths**
- `api/drizzle.config.ts`
- `api/_src/routes/users.ts`
- `src/hooks/useUserSync.ts`

**Next Priority Task**
- Verify demo signup flow succeeds against the Neon DB without auth loops.

**Code Organization & Quality**
- Kept fallback logic localized to register flow and preserved existing auth guards.

---

#### 2026-01-21: Google Signup Upsert + Pending Onboarding Role

**Core Components**
- Registration route (`api/_src/routes/users.ts`)
- Users repository (`api/_src/repositories/users.repository.ts`)
- Users schema + migration (`api/_src/db/schema/users.ts`, `api/_src/db/migrations/0034_add_firebase_uid_last_login.sql`)
- Auth middleware role handling (`api/_src/middleware/auth.ts`)
- User sync polling guard (`src/hooks/useUserSync.ts`)

**Key Features**
- Added Firebase UID upsert path for `/api/register`, updating `last_login` and returning existing users safely.
- Introduced `pending_onboarding` role defaults plus Firebase UID/last login tracking fields.
- Silenced `/api/me` polling on `/signup` and `/onboarding` to avoid loop noise during auth transitions.

**Integration Points**
- API: `POST /api/register`, `GET /api/me`
- DB: `users.firebase_uid`, `users.last_login`, `user_role` enum default

**File Paths**
- `api/_src/routes/users.ts`
- `api/_src/repositories/users.repository.ts`
- `api/_src/db/schema/users.ts`
- `api/_src/db/migrations/0034_add_firebase_uid_last_login.sql`
- `api/_src/middleware/auth.ts`
- `src/hooks/useUserSync.ts`

**Next Priority Task**
- Run the new migration on the beta database and verify Google signup creates `pending_onboarding` users.

**Code Organization & Quality**
- Kept auth changes isolated to registration/upsert logic and avoided touching unrelated routes.

---

#### 2026-01-21: COOP Redirect Auth + Register Idempotency Guard

**Core Components**
- Firebase auth entrypoints (`src/lib/auth.ts`, `src/lib/firebase.ts`)
- User sync polling guard (`src/hooks/useUserSync.ts`)
- Registration route (`api/_src/routes/users.ts`)

**Key Features**
- Switched production Google auth to redirect flow while keeping localhost popup support to avoid COOP popup blocks.
- Added a strict `/login` + `/signup` guard to silence `/api/me` polling during auth pages.
- Returned 200 with existing user data when `/api/register` hits a unique constraint to avoid 500s on duplicate registration.
- Updated the profile sync timeout message to a more human, demo-safe prompt.

**Integration Points**
- Firebase auth: `signInWithRedirect`
- API: `POST /api/register`, `GET /api/me`

**File Paths**
- `src/lib/firebase.ts`
- `src/lib/auth.ts`
- `src/hooks/useUserSync.ts`
- `api/_src/routes/users.ts`

**Next Priority Task**
- Verify Google sign-in redirect flow on production demo host (no COOP popup blocks).

**Code Organization & Quality**
- Kept changes localized to auth and registration flows without introducing new patterns.

---

#### 2026-01-21: Demo Lockdown Auth Guards

**Core Components**
- User sync polling (`src/hooks/useUserSync.ts`)
- Auth 401 handling (`src/contexts/AuthContext.tsx`)
- Stripe bootstrap (`src/lib/stripe.ts`)

**Key Features**
- Added a landing-page hard guard to block `/api/me` polling without a Firebase user or token.
- Restricted 401 redirects to `/login` only when the user is on dashboard/profile paths.
- Verified Stripe initialization remains lazy and does not trigger auth-bound network calls on landing.

**Integration Points**
- Auth polling: `GET /api/me`
- Auth redirect handling: `/dashboard`, `/profile`, `/onboarding`, `/signup`

**File Paths**
- `src/hooks/useUserSync.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/stripe.ts`

**Next Priority Task**
- Validate the demo flow end-to-end: landing → login → onboarding without 401 loops.

**Code Organization & Quality**
- Kept guards localized to existing auth flows to minimize behavior drift.

---

#### 2026-01-21: Production Auth E2E Setup + Lockdown Coverage

**Core Components**
- Playwright configuration (`playwright.config.ts`)
- Production auth setup (`tests/auth.prod.setup.ts`)
- Auth integrity coverage (`tests/e2e/auth-integrity.spec.ts`)

**Key Features**
- Added a production-auth Playwright setup project that saves authenticated storage state for reuse across browser projects.
- Introduced auth integrity E2E checks for public path access and draft recovery prompts without redirect loops.
- Kept the existing local E2E auth bypass intact behind a production auth toggle.

**Integration Points**
- Playwright setup project (auth dependency)
- `E2E_AUTH_MODE=production` for production auth runs
- `/api/shifts/drafts` for draft recovery verification

**File Paths**
- `playwright.config.ts`
- `tests/auth.prod.setup.ts`
- `tests/e2e/auth-integrity.spec.ts`

**Next Priority Task**
- Run the production auth E2E suite against `https://hospogo.com` and confirm Google login + draft recovery flow.

**Code Organization & Quality**
- Isolated production auth flow to a dedicated setup file and kept config toggles minimal and explicit.

---

#### 2026-01-21: Absolute Silence Guard for /api/me

**Core Components**
- Auth context initialization gate (`src/contexts/AuthContext.tsx`)
- User sync polling guard (`src/hooks/useUserSync.ts`)

**Key Features**
- Added a hard guard to skip `/api/me` polling when Firebase user or token is missing.
- Aligned auth initialization state with the first auth response to block app render until `onAuthStateChanged` fires.

**Integration Points**
- Firebase auth: `onAuthStateChanged`
- API endpoint: `GET /api/me`

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/hooks/useUserSync.ts`

**Next Priority Task**
- Re-test Google signup loop to confirm 401 silence.

**Code Organization & Quality**
- Kept changes scoped to auth sync and provider gating logic.

---

#### 2026-01-21: Google Signup 401 Loop Sync Guard

**Core Components**
- Auth context initialization (`src/contexts/AuthContext.tsx`)
- User sync polling (`src/hooks/useUserSync.ts`)
- Auth bridge token flow (`src/pages/auth/Bridge.tsx`)
- Staff onboarding gate (`src/pages/Onboarding.tsx`)

**Key Features**
- Added an `isSyncing` guard to prevent concurrent `/api/me` polling during signup/onboarding.
- Preserved Firebase sessions on `/signup` + `/onboarding` when `/api/me` returns 401 and flagged the user as new instead of redirecting to login.
- Removed forced ID token refreshes from useEffect-driven auth bridge/sync flows to reduce listener churn.
- Updated onboarding-facing sync error copy to a Brisbane-friendly profile setup message.

**Integration Points**
- Firebase auth: `getIdToken()` (non-forced refresh)
- API endpoint: `GET /api/me`
- Router paths: `/signup`, `/onboarding`

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/hooks/useUserSync.ts`
- `src/pages/auth/Bridge.tsx`
- `src/pages/Onboarding.tsx`

**Next Priority Task**
- Re-test Google signup on `/signup` → `/onboarding` to confirm no 401 render loop.

**Code Organization & Quality**
- Kept auth sync changes localized to AuthContext/useUserSync and avoided new auth patterns.

---

#### 2026-01-21: Auth Initialization Guard + 401 Loop Hardening

**Core Components**
- Auth context initialization state (`src/contexts/AuthContext.tsx`)
- User sync polling (`src/hooks/useUserSync.ts`)
- Loading screen copy (`src/components/ui/loading-screen.tsx`)

**Key Features**
- Added an explicit initializing state to hold rendering until the first Firebase auth response is received.
- Forced `/api/me` polling to refresh a token before each fetch and to skip requests while initializing.
- Redirects on `/api/me` 401 now respect public paths and use history replace to avoid loops.
- Updated the loading screen message to a more human tone.

**Integration Points**
- Firebase auth listener: `onAuthStateChange`
- API endpoint: `GET /api/me`
- Router navigation: `useNavigate` with `replace: true`

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/hooks/useUserSync.ts`
- `src/components/ui/loading-screen.tsx`

**Next Priority Task**
- Re-test Google signup from `/` and `/venue-guide` to confirm the 401 loop is gone.

**Code Organization & Quality**
- Kept auth gating localized to AuthContext/useUserSync without introducing new auth patterns.

---

#### 2026-01-21: Google Calendar Mirror Sync Service

**Core Components**
- Google Calendar sync service (`api/_src/services/google-calendar.ts`)
- Shift creation route (`api/_src/routes/shifts.ts`)

**Key Features**
- Added a calendar mirror service that maps shifts into Google Calendar events with role-based summaries and direct HospoGo links.
- Applied production lockdown guards so sync only attempts when a valid `google_calendar_token` exists (safe no-op if missing).
- Triggered fire-and-forget sync for single and split-day/recurring shift creation to avoid blocking the Create Shift UI.

**Integration Points**
- Google Calendar API: `POST https://www.googleapis.com/calendar/v3/calendars/primary/events`
- API endpoint: `POST /api/shifts`

**File Paths**
- `api/_src/services/google-calendar.ts`
- `api/_src/routes/shifts.ts`

**Next Priority Task**
- Add refresh-token handling to keep Google Calendar sync stable when access tokens expire.

**Code Organization & Quality**
- Centralized calendar mapping and guard logic in a dedicated service to keep routes lean and consistent.

---

#### 2026-01-21: Zero-Failure Demo Audit Guardrails

**Core Components**
- Auth context (`src/contexts/AuthContext.tsx`)
- Stripe initialization (`src/lib/stripe.ts`)
- Stripe onboarding + billing (`src/pages/onboarding/hub.tsx`, `src/components/payments/billing-settings.tsx`)
- Shift drafts API + schema (`api/_src/routes/shifts.ts`, `api/_src/db/schema/shifts.ts`)

**Key Features**
- Added explicit public-path guard when Firebase user is null to prevent `/api/me`-adjacent redirects on landing paths.
- Normalized shift draft JSONB payloads (safe `recurringOptions` parsing + null-safe timestamps) to avoid crashy draft saves.
- Centralized Stripe key selection so `hospogo.com` resolves to the live publishable key.

**Integration Points**
- `GET /api/me`
- `GET /api/shifts/drafts`
- `POST /api/shifts/drafts`
- Stripe Elements (Hub onboarding + Billing settings)

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/lib/stripe.ts`
- `src/pages/onboarding/hub.tsx`
- `src/components/payments/billing-settings.tsx`
- `api/_src/routes/shifts.ts`
- `api/_src/db/schema/shifts.ts`

**Next Priority Task**
- Smoke test Google auth, draft resume, and Stripe Elements on the demo build.

**Code Organization & Quality**
- Centralized Stripe key routing and draft normalization to reduce duplication and edge-case failures.

---

#### 2026-01-21: Auth 401 Loop and User Sync Guardrails

**Core Components**
- Auth context (`src/contexts/AuthContext.tsx`)
- User sync hook (`src/hooks/useUserSync.ts`)
- Onboarding session messaging (`src/pages/Onboarding.tsx`)

**Key Features**
- Gated `/api/me` fetches on active Firebase users and kept `/` + `/venue-guide` public during 401s.
- Skipped user sync without an active token and stopped polling on 401 with local state cleared.
- Humanized session-break messaging and reduced user-dependent effect churn.

**Integration Points**
- `GET /api/me`
- Auth/session sync (`useUserSync`, `AuthContext`)

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/hooks/useUserSync.ts`
- `src/pages/Onboarding.tsx`

**Next Priority Task**
- Verify `/` and `/venue-guide` no longer redirect on 401 and onboarding sync stabilizes.

**Code Organization & Quality**
- Reduced auth-side effects by gating sync and narrowing dependencies.

---

#### 2026-01-21: Auth Init Guard for /api/me 401 Loops

**Core Components**
- Auth middleware (`api/_src/middleware/auth.ts`)

**Key Features**
- Switched to lazy Firebase Admin access and returned `503` when auth initialization fails.
- Prevents invalid-token 401 loops when backend auth config is missing or misconfigured.

**Integration Points**
- `GET /api/me`
- `POST /api/register`

**File Paths**
- `api/_src/middleware/auth.ts`

**Next Priority Task**
- Confirm production Firebase Admin env configuration so `/api/me` returns 200 after login.

**Code Organization & Quality**
- Centralized auth init failure handling to avoid misleading 401s.

---

#### 2026-01-21: Registration Fallback for Legacy DB Schema

**Core Components**
- User creation repository (`api/_src/repositories/users.repository.ts`)

**Key Features**
- Added a legacy insert fallback when newer user columns are missing to prevent 500s on `/api/register`.
- Ensures `/api/me` auto-create flow can succeed even if schema is behind in some environments.

**Integration Points**
- `POST /api/register`
- `GET /api/me` (auto-create path in auth middleware)

**File Paths**
- `api/_src/repositories/users.repository.ts`

**Next Priority Task**
- Verify Google sign-in registration succeeds in production and `/api/register` no longer returns 500.

**Code Organization & Quality**
- Added a narrowly-scoped fallback path for schema drift without changing core behavior.

---

#### 2026-01-21: Preflight Console Log Cleanup (Frontend)

**Core Components**
- Frontend debug logging (`src/pages/Onboarding.tsx`, `src/pages/signup.tsx`, `src/pages/messages.tsx`, `src/pages/auth/Bridge.tsx`)
- Firebase logging (`src/lib/firebase.ts`)
- Calendar/debug tooling (`src/components/calendar/professional-calendar.tsx`)
- Business settings automation (`src/components/settings/business-settings.tsx`)
- One-off branding test script (`src/scripts/test-branding-email.ts`)
- App boot logs (`src/main.tsx`)

**Key Features**
- Replaced `console.log` usage with structured debug logging or stdout helpers to satisfy preflight hygiene.
- Kept existing debug context while routing through the centralized logger where applicable.

**Integration Points**
- Preflight: `npm run preflight`

**File Paths**
- `src/pages/Onboarding.tsx`
- `src/pages/signup.tsx`
- `src/pages/messages.tsx`
- `src/pages/auth/Bridge.tsx`
- `src/lib/firebase.ts`
- `src/components/calendar/professional-calendar.tsx`
- `src/components/settings/business-settings.tsx`
- `src/scripts/test-branding-email.ts`
- `src/main.tsx`

**Next Priority Task**
- Re-run preflight and confirm console-log warning is cleared.

**Code Organization & Quality**
- Logging is now centralized; no runtime flow changes.

---

#### 2026-01-21: Beta QA Prep (Draft Persistence + Stripe Guide Copy + Error Messaging)

**Core Components**
- Shift draft persistence (`api/_src/db/migrations/0033_add_shift_drafts.sql`, `api/_src/routes/shifts.ts`, `src/components/calendar/create-shift-modal.tsx`)
- Venue Guide Stripe setup copy (`src/pages/venue-guide.tsx`)
- Auth + shift creation error messaging (`src/pages/login.tsx`, `src/components/auth/google-auth-unified.tsx`, `src/components/calendar/professional-calendar.tsx`, `src/pages/shop/schedule.tsx`, `src/pages/venue-dashboard.tsx`)
- Doc/roadmap brand string cleanup (`HOSPOGO_LAUNCH_ROADMAP.md`, `SNIPSHIFT_FINAL_COMPLETION_ROADMAP.md`, `docs/GOOGLE_AUTH_TROUBLESHOOTING.md`)

**Key Features**
- Added a `shift_drafts` migration to guarantee autosave storage exists across environments, with venue-scoped indexes for fast recovery.
- Aligned Venue Guide “First time setup” copy to the actual Stripe payment method setup flow used in venue onboarding.
- Humanized common auth and shift creation errors with a clear recovery path + support email.
- Completed a final legacy brand-string sweep in docs/roadmaps for HospoGo consistency.

**Integration Points**
- Draft persistence: `GET/POST/DELETE /api/shifts/drafts`
- Venue onboarding billing: `POST /api/stripe-connect/setup-intent`
- Create Shift modal autosave + recovery dialog

**File Paths**
- `api/_src/db/migrations/0033_add_shift_drafts.sql`
- `HOSPOGO_LAUNCH_ROADMAP.md`
- `DEVELOPMENT_TRACKING_PART_02.md`
- `SNIPSHIFT_FINAL_COMPLETION_ROADMAP.md`
- `docs/GOOGLE_AUTH_TROUBLESHOOTING.md`
- `src/pages/venue-guide.tsx`
- `src/pages/login.tsx`
- `src/components/auth/google-auth-unified.tsx`
- `src/components/calendar/professional-calendar.tsx`
- `src/pages/shop/schedule.tsx`
- `src/pages/venue-dashboard.tsx`
- `src/components/landing/ContactSalesForm.tsx`
- `src/pages/forgot-password.tsx`

**Next Priority Task**
- Swap Stripe publishable/secret keys to live in beta envs and re-run preflight.

**Code Organization & Quality**
- Kept changes scoped to migrations, copy updates, and toast messaging without altering core flow logic.

---

#### 2026-01-21: Stripe Live Key Sync (Beta Env)

**Core Components**
- Root env config (`.env`)
- API env config (`api/.env`)

**Key Features**
- Swapped Stripe publishable/secret keys to live for beta readiness.
- Re-ran preflight to confirm test-key warnings cleared.

**Integration Points**
- Preflight: `npm run preflight`

**File Paths**
- `.env`
- `api/.env`

**Next Priority Task**
- Set live `STRIPE_WEBHOOK_SECRET` in production API env.

**Code Organization & Quality**
- Env-only update; no code changes.

---

#### 2026-01-21: Stripe Webhook Secret Sync (Beta Env)

**Core Components**
- API env config (`api/.env`)

**Key Features**
- Updated Stripe webhook signing secret for the production webhook endpoint.
- Re-ran preflight to confirm Stripe env hygiene.

**Integration Points**
- Webhooks: `/api/webhooks/stripe`
- Preflight: `npm run preflight`

**File Paths**
- `api/.env`

**Next Priority Task**
- Remove or gate frontend `console.log` entries flagged by preflight.

**Code Organization & Quality**
- Env-only update; no runtime code changes.

---

#### 2026-01-18: Marketplace Guardrails (AuthZ Hardening + Payout Atomicity + Financial Ledger + Realtime Sync)

**Core Components**
- Authorization helpers (`api/_src/middleware/authorization.ts`)
- Optional auth for public endpoints (`api/_src/middleware/auth.ts`)
- Community feed personalization hardening (`api/_src/routes/community.ts`)
- Self-only payments + chats enforcement (`api/_src/routes/payments.ts`, `api/_src/routes/chats.ts`)
- Idempotent shift completion + payout reconciliation (`api/_src/routes/shifts.ts`, `api/_src/repositories/payouts.repository.ts`)
- Weekly Pulse correctness (completed payouts only) (`api/_src/services/reporting.service.ts`)
- Worker earnings totals based on completed payouts (`api/_src/routes/worker.ts`)
- React Query ↔ Pusher correctness fix (`src/contexts/PusherContext.tsx`)
- Immutable financial ledger (`api/_src/db/schema/financial-ledger.ts`, `api/_src/repositories/financial-ledger.repository.ts`)
- Financial reconciliation cron (`api/_src/services/financial-reconciliation.service.ts`, `api/_src/routes/cron/financial-reconcile.ts`)

**Key Features**
- Prevented cross-user preference leakage by disallowing unauthenticated/foreign `userId` like-state enrichment on the public community feed.
- Standardized “self-only” route enforcement via a shared middleware (`requireSelfParam`) to reduce future drift.
- Refactored shift completion to be idempotent and concurrency-safe: payout is created as `processing`, then atomically transitioned to `completed`/`failed` based on Stripe capture outcome.
- Ensured lifetime earnings and Weekly Pulse transaction volume are computed from **completed** payouts only (protects against inflated metrics under partial failures).
- Fixed a realtime correctness gap: Pusher no longer relies on a non-existent `window.queryClient` and uses `useQueryClient()` directly with throttled reconnection refetch and stale-event dropping.
- Added an append-only financial ledger + a secured cron reconciliation endpoint to support $100M-grade payment auditing and self-healing.

**Integration Points**
- Cron reconciliation endpoint: `GET/POST /api/cron/financial-reconcile` (requires `CRON_SECRET`)
- Shift completion: `PATCH /api/shifts/:id/complete` now writes ledger entries and only counts earnings after payout completion.
- Weekly Pulse: `getWeeklyMetrics()` now counts only `payouts.status='completed'` for transaction volume.
- Realtime: `SHIFT_STATUS_UPDATE` invalidates `['shift', shiftId]` and drops out-of-order events by timestamp.

**File Paths**
- `api/_src/middleware/authorization.ts`
- `api/_src/middleware/auth.ts`
- `api/_src/routes/community.ts`
- `api/_src/routes/payments.ts`
- `api/_src/routes/chats.ts`
- `api/_src/routes/shifts.ts`
- `api/_src/repositories/payouts.repository.ts`
- `api/_src/services/reporting.service.ts`
- `api/_src/routes/worker.ts`
- `api/_src/db/schema/financial-ledger.ts`
- `api/_src/db/schema.ts`
- `api/_src/db/migrations/0032_add_financial_ledger_entries.sql`
- `api/_src/repositories/financial-ledger.repository.ts`
- `api/_src/services/financial-reconciliation.service.ts`
- `api/_src/routes/cron/financial-reconcile.ts`
- `api/_src/index.ts`
- `src/contexts/PusherContext.tsx`
- `api/_src/tests/routes/community.feed-auth.test.ts`
- `api/_src/tests/routes/payments.require-self.test.ts`
- `api/_src/tests/routes/shifts.complete.payout.test.ts`
- `api/_src/tests/repositories/financial-ledger.repository.test.ts`

**Next Priority Task**
- Configure a daily schedule (Vercel Cron) to call `/api/cron/financial-reconcile` with `CRON_SECRET`.

**Code Organization & Quality**
- Authorization logic centralized to reduce duplication and audit surface area.
- Financial workflows are now explicitly modeled as state transitions with an append-only audit trail.

#### 2026-01-16: Geofenced Check-in Verification

**Core Components**
- Updated attendance_status enum to include 'checked_in' (`api/_src/db/schema/shifts.ts`)
- Added actual_start_time field to shifts table
- Check-in API endpoint (`PATCH /api/shifts/:id/check-in`)
- Check-in button on shift detail page (`src/pages/shift-details.tsx`)
- Client-side geofencing validation with Haversine formula

**Key Features**
- Geofenced check-in system restricts 'Check-in' action to workers within 200m of venue
- Client-side distance calculation using Haversine formula before API call
- Server-side validation with precise distance logging for audit purposes
- Clear error messages when geofence check fails (e.g., "You must be at the venue to check in")
- Distance logged in shift_logs table for audit trail
- Sets attendance_status = 'checked_in' and actual_start_time = NOW() on successful check-in

**Integration Points**
- Check-in endpoint: `PATCH /api/shifts/:id/check-in` with latitude/longitude in request body
- GPS coordinates requested only when Check-in button is pressed
- Distance validation: < 200m required (client-side and server-side)
- Failed attempts logged with eventType 'CHECK_IN_ATTEMPT_FAILED'
- Successful check-ins logged with eventType 'CHECK_IN' including precise distance

**File Paths**
- `api/_src/db/schema/shifts.ts` (added 'checked_in' to enum, added actualStartTime field)
- `api/_src/routes/shifts.ts` (added PATCH /:id/check-in endpoint, updated GET /:id to return new fields)
- `api/_src/repositories/shifts.repository.ts` (added actualStartTime support)
- `src/lib/api.ts` (added checkInShift function, updated ShiftDetails interface)
- `src/pages/shift-details.tsx` (added Check-in button with geofencing logic)

**Next Priority Task**
- Test geofencing with various distances and edge cases
- Verify distance logging in shift_logs table
- Test check-in flow for assigned workers

**Code Organization & Quality**
- Client-side validation prevents unnecessary API calls when user is too far
- Server-side validation ensures security and logs precise distance for audit
- Error messages clearly indicate distance and maximum allowed radius
- Uses existing geofencing utilities for consistency

---

#### 2026-01-16: Geo Proximity Shift Discovery

**Core Components**
- Marketplace shifts endpoint with proximity search (`api/_src/routes/marketplace.ts`)
- Haversine formula distance calculation in SQL
- Updated fetchShifts API function (`src/lib/api.ts`)
- Enhanced job feed with location-based search (`src/pages/job-feed.tsx`)

**Key Features**
- Proximity-based shift search using GET /api/marketplace/shifts?lat=-27.47&lng=153.02&radius=10
- Database-side distance calculation using Haversine formula for efficient pagination
- Distance displayed on shift cards (e.g., "1.2 km away" or "500m away")
- "Use My Location" button functionality (already existed, enhanced with fallback)
- Automatic fallback to user's home suburb when GPS permissions are denied
- Geocoding of user's location string when GPS is unavailable

**Integration Points**
- Marketplace shifts endpoint: `/api/marketplace/shifts` with lat/lng/radius parameters
- Distance calculation performed on database side for pagination efficiency
- Frontend automatically uses marketplace endpoint when location is available
- Falls back to regular `/api/shifts` endpoint when location is not provided
- Enhanced job cards display distance from API response or calculate client-side as fallback

**File Paths**
- `api/_src/routes/marketplace.ts` (added /shifts endpoint)
- `src/lib/api.ts` (updated fetchShifts to support lat/lng/radius)
- `src/pages/job-feed.tsx` (enhanced location handling with fallback)
- `src/components/job-feed/enhanced-job-card.tsx` (already supports distance display)

**Next Priority Task**
- Test proximity search with various locations and radius values
- Verify distance calculations match expected results
- Ensure pagination works correctly with distance-based sorting

**Code Organization & Quality**
- Haversine formula implemented in SQL for database-side calculation
- Efficient query with proper indexing on lat/lng columns
- Graceful fallback to user's home suburb when GPS is denied
- Distance displayed in user-friendly format (meters for <1km, km for >=1km)

---

#### 2026-01-16: Push Notification Engine Integration

**Core Components**
- Push tokens database schema (`api/_src/db/schema/push-tokens.ts`)
- Firebase Cloud Messaging service worker (`public/firebase-messaging-sw.js`)
- Client-side push notification service (`src/lib/push-notifications.ts`)
- Push notification hook (`src/hooks/usePushNotifications.ts`)
- Push tokens repository (`api/_src/repositories/push-tokens.repository.ts`)
- Push tokens API routes (`api/_src/routes/push-tokens.ts`)
- Push notification dispatcher service (`api/_src/services/push-notification.service.ts`)

**Key Features**
- Integrated Firebase Cloud Messaging (FCM) for real-time push notifications
- Service worker registration and permission request flow
- User push token management (register, update, deactivate)
- Push notification dispatcher with active user checking (only sends if user is not viewing the conversation)
- Integration with existing notification service for messages and application status changes
- Brisbane timezone support (inherited from existing notification service)

**Integration Points**
- Push token registration API (`POST /api/push-tokens`)
- Push token deactivation API (`DELETE /api/push-tokens/:token`)
- Automatic push notification sending on:
  - New messages (only if user not active in conversation)
  - Application status changes (accepted/rejected)
  - New applications received (for venue owners)
- Firebase Admin SDK for server-side push sending
- Client-side FCM token registration on user login

**File Paths**
- `api/_src/db/schema/push-tokens.ts`
- `api/_src/db/schema.ts` (updated exports)
- `public/firebase-messaging-sw.js`
- `src/lib/push-notifications.ts`
- `src/lib/firebase.ts` (exported app instance)
- `src/hooks/usePushNotifications.ts`
- `src/App.tsx` (added hook initialization)
- `api/_src/repositories/push-tokens.repository.ts`
- `api/_src/routes/push-tokens.ts`
- `api/_src/index.ts` (registered push-tokens router)
- `api/_src/services/push-notification.service.ts`
- `api/_src/services/notification.service.ts` (integrated push notifications)
- `api/_src/index.ts` (added push notification for messages)

**Next Priority Task**
- Add VAPID key to environment variables and configure Firebase Cloud Messaging
- Test push notifications in development and production environments
- Write tests for push notification functionality

**Code Organization & Quality**
- Follows existing repository and service patterns
- Proper error handling for invalid tokens (auto-deactivation)
- Non-blocking push notification sending to avoid impacting main request flow
- Active user detection prevents unnecessary push notifications when user is viewing content

---

#### 2026-01-15: Auth Resilience Cleanup (Role Guards + Socket.IO Removal)

**Core Components**
- Auth guard (`src/components/auth/auth-guard.tsx`)
- Dashboard pages (`src/pages/professional-dashboard.tsx`, `src/pages/hub-dashboard.tsx`)
- Calendar component (`src/components/calendar/professional-calendar.tsx`)
- Hosting headers (`vercel.json`)
- Frontend dependencies (`package.json`)

**Key Features**
- Redirects authenticated users with `role === null` directly to `/onboarding` after loading; Access Denied only shows for true role mismatches.
- Added role-loading guards so dashboard and calendar views mount only after roles resolve, avoiding hydration crashes.
- Removed Socket.IO client usage to eliminate websocket error spam.
- Aligned COOP headers for `/__/auth/*` with Firebase popup requirements.

**Integration Points**
- Auth routing guards (`AuthGuard`, `ProtectedRoute`)
- Vercel headers for Firebase auth handler (`/__/auth/*`)
- Frontend dependency cleanup (Socket.IO client removal)

**File Paths**
- `src/components/auth/auth-guard.tsx`
- `src/pages/professional-dashboard.tsx`
- `src/pages/hub-dashboard.tsx`
- `src/components/calendar/professional-calendar.tsx`
- `vercel.json`
- `package.json`

**Next Priority Task**
- Verify onboarding redirect and dashboard/calendar stability across role-loading edge cases.

**Code Organization & Quality**
- Used lightweight wrapper guards to prevent premature component initialization and removed unused realtime context.

---

#### 2026-01-15: COOP Relaxation for OAuth Popups

**Core Components**
- Vercel edge headers (`vercel.json`)

**Key Features**
- Set `Cross-Origin-Opener-Policy` to `same-origin-allow-popups` so Google OAuth popups can communicate with the opener without breaking the auth handshake.

**Integration Points**
- Vercel headers for the app shell

**File Paths**
- `vercel.json`

**Next Priority Task**
- Verify the Google popup login completes without COOP blocked-window warnings in production.

**Code Organization & Quality**
- Scoped the COOP relaxation to the shared app header set without introducing new routing or auth logic.

---

#### 2026-01-15: Legacy Auth Domain Reset + Brute-Force Message Sync

**Core Components**
- Firebase SDK init (`src/lib/firebase.ts`)
- Auth context message handling (`src/contexts/AuthContext.tsx`)
- Signup UX (`src/pages/signup.tsx`)
- Vercel headers (`vercel.json`)

**Key Features**
- Forced Firebase SDK init to use the legacy auth domain `snipshift-75b04.firebaseapp.com` to avoid storage partitioning during the handshake.
- Added a brute-force window `message` listener that reacts to any payload containing `uid` or `stsTokenManager`, with token extraction from `stsTokenManager` when available.
- Replaced the Signup loading block with a lightweight "Connecting..." toast to keep the UI accessible during auth stalls.
- Removed CSP and COOP headers from Vercel to return to default security behavior while debugging auth flow.

**Integration Points**
- Firebase Auth SDK initialization
- Firebase proxy iframe postMessage bridge
- Vercel edge headers for auth handler and app shell

**File Paths**
- `src/lib/firebase.ts`
- `src/contexts/AuthContext.tsx`
- `src/pages/signup.tsx`
- `vercel.json`

**Next Priority Task**
- Validate production login completes and the UI stays interactive even if auto-redirect fails.

**Code Organization & Quality**
- Reused existing hard-sync helpers in AuthContext; changes remain localized to auth plumbing and hosting headers.

---

#### 2026-01-15: Manual LocalStorage Bridge Auth (Bypass SDK Handshake)

**Core Components**
- Google popup auth function (`src/lib/auth.ts`)
- Auth context storage listener (`src/contexts/AuthContext.tsx`)
- Signup page redirect guard (`src/pages/signup.tsx`)

**Key Features**
- **Popup Manual Write**: After `signInWithPopup` resolves, manually writes `hospogo_auth_bridge` to localStorage with `uid` and timestamp.
- **Main Window Listener**: Added `storage` event listener in AuthContext that detects bridge key changes and immediately triggers `auth.reload()` and redirects to `/onboarding`.
- **Immediate Redirect Guard**: Signup page checks for bridge key on mount; if present and < 30s old, shows "Finalizing..." spinner and redirects immediately without showing signup UI.

**Integration Points**
- Firebase Auth: `signInWithPopup` → localStorage bridge → `storage` event → `auth.reload()` → redirect
- Router navigation via `useNavigate` and `navigateRef`
- localStorage cross-window communication (bypasses COOP/CORS/Partitioning)

**File Paths**
- `src/lib/auth.ts` - Added localStorage bridge write after popup auth
- `src/contexts/AuthContext.tsx` - Added storage event listener for bridge detection
- `src/pages/signup.tsx` - Added immediate redirect guard with "Finalizing..." state

**Next Priority Task**
- Deploy to production and verify popup auth completion immediately triggers main window redirect.

**Code Organization & Quality**
- Kept bridge logic centralized: popup writes, main window listens, signup guards. All bridge operations are timestamped and age-validated (30s window).

---

#### 2026-01-15: Manual Auth Polling Bridge + 10s Reload Safety

**Core Components**
- Auth context provider (`src/contexts/AuthContext.tsx`)
- Google auth button (`src/components/auth/google-auth-button.tsx`)
- Vercel headers (`vercel.json`)

**Key Features**
- Added a manual 500ms auth polling interval triggered by Google sign-in clicks to detect `auth.currentUser` and push onboarding immediately.
- Added a 10-second loading safety reload to recover from COOP/storage-partitioned auth stalls.
- Hardcoded `Access-Control-Allow-Origin: https://hospogo.com` in Vercel headers for production alignment.

**Integration Points**
- Firebase Auth: `auth.currentUser`
- Router navigation via `useNavigate`
- Vercel headers for `/__/auth/*` and app shell

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/components/auth/google-auth-button.tsx`
- `vercel.json`

**Next Priority Task**
- Validate popup sign-in now forces immediate onboarding/dashboard transition in production.

**Code Organization & Quality**
- Kept polling and recovery logic centralized in AuthContext with a single entrypoint from the Google auth button.

---

#### 2026-01-15: Forced Auth Token Observer + Immediate Post-Login Push

**Core Components**
- Auth context provider (`src/contexts/AuthContext.tsx`)

**Key Features**
- Added a secondary Firebase `onIdTokenChanged` observer to catch popup token handshakes that miss `onAuthStateChanged`.
- Forced immediate navigation away from `/login` and `/signup` to `/onboarding` or `/dashboard` as soon as a user token is detected.
- Cleared the global loading state the moment a Firebase user is detected to avoid infinite spinners.

**Integration Points**
- Firebase Auth listeners: `onIdTokenChanged`, `onAuthStateChange`
- Router navigation via `useNavigate`

**File Paths**
- `src/contexts/AuthContext.tsx`

**Next Priority Task**
- Verify popup sign-in instantly routes to onboarding/dashboard on production.

**Code Organization & Quality**
- Kept changes localized to the auth context and reused existing hard-sync helpers.

---

#### 2026-01-15: Auth Hard Sync + Handler Cache Bust

**Core Components**
- AuthContext hard sync handling (`src/contexts/AuthContext.tsx`)
- Vercel headers (`vercel.json`)

**Key Features**
- Added a message listener to capture auth tokens from the Firebase proxy iframe and trigger a hard sync.
- Added a 4-second circuit breaker to clear loading, show a recovery toast, and attempt a silent Firebase reload.
- Forced `Cache-Control: no-store` on `/__/auth/handler` to avoid stale auth handler caching.

**Integration Points**
- Firebase auth handshake (`onAuthStateChanged`, proxy handler postMessage)
- API: `GET /api/me`
- Vercel headers for `/__/auth/handler`

**File Paths**
- `src/contexts/AuthContext.tsx`
- `vercel.json`

**Next Priority Task**
- Deploy and confirm the loading spinner clears within 4 seconds on auth flows.

**Code Organization & Quality**
- Kept changes localized to auth context hardening and Vercel header config without new auth patterns.

---

#### 2026-01-15: Network-Request-Failed Proxy + Popup Fallback

**Core Components**
- Firebase auth config (`src/lib/firebase.ts`)
- AuthContext redirect handling (`src/contexts/AuthContext.tsx`)
- Vercel headers (`vercel.json`)

**Key Features**
- Ensured Firebase auth domain uses `VITE_FIREBASE_AUTH_DOMAIN` with a `hospogo.com` fallback.
- Added a `auth/network-request-failed` fallback that attempts a popup sign-in to bypass redirect failures.
- Applied CSP + no-store headers for `/__/auth/*` to allow Google scripts and avoid stale handler caching.

**Integration Points**
- Firebase Auth: `getRedirectResult`, `signInWithPopup`
- Vercel header rules for `/__/auth/:path*`

**File Paths**
- `src/lib/firebase.ts`
- `src/contexts/AuthContext.tsx`
- `vercel.json`

**Next Priority Task**
- Verify `/__/auth/handler` returns 200 OK and login completes without a loading loop.

**Code Organization & Quality**
- Reused existing Firebase provider configuration and kept fallback logic scoped to AuthContext.

---

#### 2026-01-15: Auth Handler Proxy Rewrite + COOP Alignment

**Core Components**
- Vercel routing config (`vercel.json`)
- Firebase client config (`src/lib/firebase.ts`)
- Auth redirect safety clear (`src/contexts/AuthContext.tsx`)

**Key Features**
- Added a Vercel rewrite to proxy `/__/auth/**` to the Firebase auth handler so popup completion stays on `hospogo.com`.
- Enforced `authDomain = hospogo.com` in the Firebase client to align the redirect handler with the production hostname.
- Preserved the 5-second redirect-result safety clear and fixed the timeout cleanup path to avoid stalled loading states.

**Integration Points**
- Vercel rewrites (`/__/auth/:path*`)
- Firebase Auth redirect flow (`getRedirectResult`)
- Security headers: COOP `same-origin-allow-popups`

**File Paths**
- `vercel.json`
- `src/lib/firebase.ts`
- `src/contexts/AuthContext.tsx`

**Next Priority Task**
- Verify `https://hospogo.com/__/auth/handler` responds without 404 after deploy.

**Code Organization & Quality**
- Kept changes localized to auth config + redirect safety handling without new patterns.

---
#### 2026-01-15: Align Auth Domain + Remove Force Sync + Navbar Profile Menu

**Core Components**
- Firebase client config (`src/lib/firebase.ts`)
- Auth init guard (`src/contexts/AuthContext.tsx`)
- Loading UI (`src/components/ui/loading-screen.tsx`)
- Navbar profile dropdown (`src/components/layout/Navbar.tsx`)

**Key Features**
- Aligned Firebase `authDomain` to `hospogo.com` with legacy-domain override and env alias support.
- Added a redirect-result fallback timer so auth loading clears even when `getRedirectResult()` is null.
- Removed the Force Sync button and logic from the loading screen.
- Updated the profile dropdown labels and removed the redundant dashboard entry from the mobile menu.

**Integration Points**
- Firebase Auth redirect flow (`getRedirectResult`, `onAuthStateChanged`)
- Navbar navigation (`/profile`, `/dashboard`, `/settings`)

**File Paths**
- `src/lib/firebase.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/ui/loading-screen.tsx`
- `src/components/layout/Navbar.tsx`

**Next Priority Task**
- Verify Google sign-in completes instantly on `hospogo.com` without a loading loop.

**Code Organization & Quality**
- Kept auth guard changes localized to AuthContext without introducing new patterns.

---
#### 2026-01-15: Holistic Codebase Audit v1 (HospoGo)

**Core Components**
- Full repo audit coverage (API, frontend, schema, infra)
- Audit report artifact (`HOSPOGO_AUDIT_REPORT.md`)

**Key Features**
- Completed end-to-end audit focusing on infra/security, auth/onboarding flow, separation of concerns, dead code, UI/UX, and schema scalability.
- Documented critical findings and hardening checklist in a single root report for stakeholder review.

**Integration Points**
- Docs: `HOSPOGO_AUDIT_REPORT.md`

**File Paths**
- `HOSPOGO_AUDIT_REPORT.md`

**Next Priority Task**
- Remove committed service account JSON and enforce Firebase project id allowlist.

**Code Organization & Quality**
- Kept changes doc-only; no production code paths modified during audit.

---
#### 2026-01-13: Automated Strike Recovery Service

**Core Components**
- Users Schema Update (`api/_src/db/schema/users.ts`)
- Strike Recovery Migration (`api/_src/db/migrations/006_strike_recovery_progress.sql`)
- Reputation Service (`api/_src/lib/reputation-service.ts`)
- Shifts Route Integration (`api/_src/routes/shifts.ts`)
- Users Route Integration (`api/_src/routes/users.ts`)
- Users Repository (`api/_src/repositories/users.repository.ts`)
- ProReliabilityTracker Update (`src/components/dashboard/ProReliabilityTracker.tsx`)

**Key Features**
- **New `recovery_progress` Field**: Tracks shifts with 4.5+ rating toward strike removal (0-5)

- **`processShiftSuccess(userId, rating)` Function**:
  - If `user.strikes > 0` AND `rating >= 4.5`: Increment `recovery_progress` by 1
  - If `recovery_progress >= 5`: Decrement `strikes` by 1, reset `recovery_progress` to 0
  - If `rating < 3.0`: Reset `recovery_progress` to 0 (poor performance resets redemption)

- **Notifications**:
  - Strike removed notification when recovery progress reaches 5
  - Recovery progress reset notification when rating < 3.0

- **Frontend Integration**:
  - ProReliabilityTracker now uses `recoveryProgress` instead of `shiftsSinceLastStrike`
  - Progress bar shows 0/5 progress toward strike removal

**Integration Points**
- Triggered during shift review finalization (`POST /api/shifts/:id/review`)
- Only processes when shop reviews barber (SHOP_REVIEWING_BARBER) and not a no-show
- API endpoint `/api/me/reputation` returns `recoveryProgress` field

**File Paths**
- `api/_src/db/schema/users.ts` (added `recoveryProgress` column)
- `api/_src/db/migrations/006_strike_recovery_progress.sql` (new)
- `api/_src/lib/reputation-service.ts` (added `processShiftSuccess` function)
- `api/_src/routes/shifts.ts` (integrated recovery processing)
- `api/_src/routes/users.ts` (returns `recoveryProgress` in reputation stats)
- `api/_src/repositories/users.repository.ts` (mock user includes `recoveryProgress`)
- `src/components/dashboard/ProReliabilityTracker.tsx` (uses `recoveryProgress`)

**Next Priority Task**
- Add admin dashboard view for monitoring strike recovery across all professionals

---

#### 2026-01-13: Pro Reliability Tracker Component

**Core Components**
- ProReliabilityTracker (`src/components/dashboard/ProReliabilityTracker.tsx`)
- Professional Dashboard Integration (`src/pages/professional-dashboard.tsx`)

**Key Features**
- **State-Based UI Display**:
  - 0 Strikes: "Elite Professional" (lime/neon green #BFFF00) - "You have a perfect reliability record!"
  - 1 Strike: "Good Standing" (amber #FBBF24) - "1 Strike active. Reliability is key to high-paying shifts."
  - 2+ Strikes: "At Risk" (red #EF4444) - "2 Strikes active. High risk of permanent deactivation."

- **Strike Recovery Progress**:
  - Progress bar showing 0/5 progress toward strike removal
  - Text: "Complete X more shifts with 4.5+ stars to remove a strike."
  - Only shown when strikes > 0

- **Suspension Overlay**:
  - Full-screen countdown timer when account is suspended
  - Timer format: HH:MM:SS with real-time updates
  - Shows restrictions during suspension
  - Support contact link

**Integration Points**
- Uses existing `/api/me/reputation` endpoint
- Lazy-loaded at top of Professional Dashboard overview
- Auto-refreshes on window focus

**File Paths**
- `src/components/dashboard/ProReliabilityTracker.tsx` (new)
- `src/pages/professional-dashboard.tsx` (integration)

**Next Priority Task**
- Add reliability badge to public professional profile views

---

#### 2026-01-13: Automated Strike Notifications

**Core Components**
- Suspension Alert Email Template (`api/_src/emails/SuspensionAlertEmail.tsx`)
- Strike Warning Email Template (`api/_src/emails/StrikeWarningEmail.tsx`)
- Account Restored Email Template (`api/_src/emails/AccountRestoredEmail.tsx`)
- Email Service Extensions (`api/_src/services/email.service.ts`)
- Reputation Service Updates (`api/_src/lib/reputation-service.ts`)
- Shift Completion Cron Updates (`api/_src/services/shift-completion-cron.ts`)

**Key Features**
- **No-Show Email (suspension-alert)**:
  - Template: `SuspensionAlertEmail.tsx` - red alert banner, strike stats, suspension end date
  - Timing: Immediate - sent when strikes increment by 2 in a single event
  - Logic: Triggered in `handleNoShow()` after 48h suspension is applied

- **Late Cancellation Email (strike-warning)**:
  - Template: `StrikeWarningEmail.tsx` - warning banner, status indicator, strike prevention tips
  - Timing: Immediate - sent when strikes reach 1 or 2 via late cancellation
  - Logic: Triggered in `handleLateCancellation()` when < 4h notice given

- **Reactivation Email (account-restored)**:
  - Template: `AccountRestoredEmail.tsx` - success banner, tips for staying in good standing
  - Timing: After 48 hours - sent when suspension period expires
  - Logic: Cron job checks for expired suspensions every 5 minutes

**Integration Points**
- Reputation Service: `handleNoShow()` and `handleLateCancellation()` now send emails
- Cron Service: `checkSuspensionExpirations()` sends reactivation emails
- Email Service: New functions `sendSuspensionAlertEmail()`, `sendStrikeWarningEmail()`, `sendAccountRestoredEmail()`

**File Paths**
- `api/_src/emails/SuspensionAlertEmail.tsx` (new)
- `api/_src/emails/StrikeWarningEmail.tsx` (new)
- `api/_src/emails/AccountRestoredEmail.tsx` (new)
- `api/_src/services/email.service.ts` (3 new email functions added)
- `api/_src/lib/reputation-service.ts` (email triggers + `checkAndSendReactivationEmails()`)
- `api/_src/services/shift-completion-cron.ts` (calls `checkSuspensionExpirations()`)

**Next Priority Task**
- Add email preference settings to allow Pros to opt out of non-critical notifications

---

#### 2026-01-13: Automated Pro Verification Logic

**Core Components**
- Pro Verification Service (`api/_src/services/pro-verification.service.ts`)
- Users Schema Update (`api/_src/db/schema/users.ts`)
- Pro Verification Migration (`api/_src/db/migrations/005_pro_verification.sql`)
- Verification Badge Components (`src/components/profile/VerificationBadge.tsx`, `VerificationStatusCard.tsx`)
- Shift Completion Cron Updates (`api/_src/services/shift-completion-cron.ts`)
- Shifts Route Integration (`api/_src/routes/shifts.ts`)
- Users Route Integration (`api/_src/routes/users.ts`)

**Key Features**
- **Profile Requirements**:
  - Pros must upload RSA certificate photo to unlock 'Alcohol Service' shifts (rsaRequired flag on shifts)
  - New accounts marked as 'Pending Review' until first successful shift completion (verification_status field)

- **Search Algorithm**:
  - Prioritizes Pros with 4.8+ rating AND zero 'No-Shows' in the last 30 days
  - 'Top Rated' badge automatically awarded to Pros with 5+ consecutive 5-star reviews
  - New `/api/professionals?prioritized=true` endpoint for venues to find best staff

- **Automated Notifications**:
  - Warning sent to any Pro whose rating drops below 4.0 (verification_status changes to 'at_risk')
  - Account verified notification on first completed shift
  - No-show warning notification when incident is recorded
  - Top Rated badge earned notification

- **New User Fields**: verificationStatus, completedShiftCount, noShowCount, lastNoShowAt, consecutiveFiveStarCount, topRatedBadge, ratingWarningAt

**Integration Points**
- Shift acceptance: RSA verification check before accepting alcohol service shifts
- Review submission: Updates verification status, Top Rated badge, and sends rating warnings
- Shift completion: Upgrades verification status from 'pending_review' to 'verified'
- Cron service: Hourly sync of Top Rated badges and rating-based status changes
- New API endpoints: `GET /api/me/verification-status`, `GET /api/me/can-work-alcohol-shifts`

**File Paths**
- `api/_src/services/pro-verification.service.ts` (new)
- `api/_src/db/schema/users.ts` (updated with new enum and columns)
- `api/_src/db/migrations/005_pro_verification.sql` (new)
- `api/_src/services/shift-completion-cron.ts` (integrated pro verification sync)
- `api/_src/routes/shifts.ts` (added verification checks and status updates)
- `api/_src/routes/users.ts` (added verification status endpoints)
- `src/components/profile/VerificationBadge.tsx` (new)
- `src/components/profile/VerificationStatusCard.tsx` (new)

**Next Priority Task**
- Add verification status display to Professional Dashboard and public profile views

---

#### 2026-01-13: Deep Architecture Audit Phase 2 Fixes

**Core Components**
- Subscription Downgrade Logic (`api/_src/routes/webhooks.ts`)
- Venue Downgrade Notification (`api/_src/lib/notifications-service.ts`)
- Contact Masking Helpers (`api/_src/routes/shifts.ts`)
- Review Status Validation (`api/_src/routes/shifts.ts`)
- Complete Setup Banner (`src/components/onboarding/CompleteSetupBanner.tsx`)
- Hub Dashboard Integration (`src/pages/hub-dashboard.tsx`)

**Key Features**
- **Subscription Downgrade**: Auto-downgrades Business users to Starter tier after 3 failed payment attempts, re-enabling $20 booking fees
- **Contact Masking**: Masks applicant email/phone until they are hired (prevents off-platform deals)
- **Review Validation**: Prevents reviews on cancelled/draft shifts (only completed/pending_completion allowed)
- **Onboarding Banner**: Dismissible banner prompts hub users without subscription to complete setup

**Integration Points**
- Stripe Webhooks: `invoice.payment_failed` handler enhanced with attempt tracking
- Shifts API: `GET /:id/applications` now masks contact details
- Shifts API: `POST /:id/review` validates shift status before allowing reviews
- Hub Dashboard: Displays setup banner when subscription is missing

**File Paths**
- `api/_src/routes/webhooks.ts` (lines 169-210)
- `api/_src/lib/notifications-service.ts` (new `notifyVenueOfDowngrade` function)
- `api/_src/routes/shifts.ts` (lines 50-75, 480-510, 2547-2560)
- `src/components/onboarding/CompleteSetupBanner.tsx` (new file)
- `src/pages/hub-dashboard.tsx` (banner integration)

**Next Priority Task**
- Add in-platform messaging system to further reduce platform leakage

---

#### 2026-01-13: Enterprise Lead API Implementation

**Core Components**
- Leads Repository (`api/_src/repositories/leads.repository.ts`)
- Enterprise Lead Validation Schema (`api/_src/validation/schemas.ts`)
- Enterprise Lead Email Templates (`api/_src/emails/EnterpriseLeadEmail.tsx`)
- Leads Route Handler (`api/_src/routes/leads.ts`)
- Database Migration (`api/_src/db/migrations/0019_add_enterprise_leads.sql`)

**Key Features**
- POST `/api/leads/enterprise` endpoint for receiving enterprise lead submissions
- Stores leads in PostgreSQL database via Drizzle ORM
- Sends internal notification email to admin when new lead is received
- Sends automated "Thank You" email to the lead
- Supports flexible field naming (frontend-style and API-style field names)
- Includes lead status management (new, contacted, qualified, proposal_sent, closed_won, closed_lost)
- React Email templates for professional email formatting

**Integration Points**
- Frontend: `ContactSalesForm.tsx` component on landing page
- Email: Resend service (`api/_src/lib/resend.ts`)
- Database: PostgreSQL via Drizzle ORM
- Environment Variables: `ADMIN_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

**File Paths**
- `api/_src/routes/leads.ts`
- `api/_src/repositories/leads.repository.ts`
- `api/_src/validation/schemas.ts`
- `api/_src/emails/EnterpriseLeadEmail.tsx`
- `api/_src/db/schema/leads.ts` (existing schema)
- `api/_src/db/migrations/0019_add_enterprise_leads.sql`
- `api/_src/index.ts` (route registration)

**Next Priority Task**
- Add admin dashboard UI to view and manage enterprise leads

---

#### 2026-01-11: Fix Landing Page Skip & Auth Handshake (Public Root + Google Prompt + Legacy Storage Reset)

**Core Components**
- Routing (public root route) (`src/App.tsx`)
- Firebase Google provider configuration (`src/lib/firebase.ts`)
- Auth compatibility shim (provider hardening helper) (`src/lib/auth.ts`)
- App shell pre-hydration cleanup (`index.html`)
- Landing E2E regression suite (`tests/e2e/landing-layout.spec.ts`)

**Key Features**
- Ensured the landing route `/` is truly public by removing the auth guard wrapper in the route tree.
- Hardened Google auth handshake by forcing the account picker via `prompt: 'select_account'` on the Google provider.
- Added a temporary “clean break” that wipes `localStorage` if any legacy `snipshift` keys are detected (prevents stale redirect/auth artifacts from influencing HospoGo).
- Updated landing E2E coverage to align with current HospoGo copy and the app’s enforced dark-mode behavior.

**Integration Points**
- Firebase Auth: `GoogleAuthProvider.setCustomParameters({ prompt: 'select_account' })`
- E2E: `npm run test:e2e -- tests/e2e/landing-layout.spec.ts`
- Dev: `npm run dev:all` (Vite + API) after clearing `node_modules/.vite`

**File Paths**
- `src/App.tsx`
- `src/lib/firebase.ts`
- `src/lib/auth.ts`
- `index.html`
- `tests/e2e/landing-layout.spec.ts`

**Next Priority Task**
- Confirm end-to-end Google sign-in (popup + redirect fallback) from `/` in Mobile Safari with a previously “stuck” browser profile.

**Code Organization & Quality**
- Kept changes tightly scoped to routing/auth bootstrap and avoided introducing new auth patterns; reused existing `AuthGuard`/`ProtectedRoute` structure.

---

#### 2026-01-11: Local Dev Auth Debugging + Env Cache Bust (Popup-Only + No-Store Headers)

**Core Components**
- Landing routing verification (`src/App.tsx`)
- Local-dev Google auth wrapper + error logging (`src/lib/auth.ts`)
- Firebase sign-in fallback behavior (`src/lib/firebase.ts`)
- Google auth button wiring (`src/components/auth/google-auth-button.tsx`)
- Vite dev server caching headers (`vite.config.ts`)
- Localhost session ghost purge (`src/main.tsx`)

**Key Features**
- Confirmed `/` (Landing Page) is the first route and remains unwrapped by any `ProtectedRoute`/auth wall.
- Implemented a localhost-only **popup-only** Google sign-in path to avoid redirect-based issues on `localhost:3000`, and added logging of the **exact** error object for debugging.
- Prevented redirect fallback from being triggered on localhost when a popup is blocked (surfaced as an error instead).
- Added dev server `Cache-Control: no-store` headers (safe alternative to the non-existent `server.force` setting) to reduce “stale bundle/env” confusion during local debugging.
- Added a localhost-only localStorage cleanup for `firebase:previous_external_idp_params`.

**Integration Points**
- Auth UI: `GoogleAuthButton` uses `signInWithGoogleDevAware()` (popup-only on localhost).
- Vite dev: `server.headers['Cache-Control']='no-store'`
- Build verification: `npm run build`
- E2E verification: `npm run test:e2e -- tests/e2e/landing-layout.spec.ts`

**File Paths**
- `src/App.tsx`
- `src/lib/auth.ts`
- `src/lib/firebase.ts`
- `src/components/auth/google-auth-button.tsx`
- `vite.config.ts`
- `src/main.tsx`

**Next Priority Task**
- Re-test Google sign-in on localhost with popups blocked/unblocked to confirm the new error logging surfaces the real root cause (and doesn’t silently redirect).

**Code Organization & Quality**
- Kept localhost-specific behavior behind runtime hostname checks; production behavior remains unchanged.

---

#### 2026-01-11: Loading Splash Logo Matches Navbar Banner (No Style Regression)

**Core Components**
- App shell splash screen (`index.html`)
- Global navigation branding (`src/components/layout/Navbar.tsx`)
- In-app loading overlay (`src/components/ui/loading-screen.tsx`)

**Key Features**
- Kept the navbar logo exactly as-is (banner logo).
- Updated the loading splash to use the **same banner asset** (`/hospogo-navbar-banner.png`) so the first paint matches the navbar.
- Removed splash-only logo filters that were changing the mark’s appearance across themes.
- Bumped the one-time service-worker recovery key to force stale clients to refresh cached HTML/assets.

**Integration Points**
- Dev verification: `npm run dev`
- Build verification: `npm run build`

**File Paths**
- `index.html`
- `src/components/layout/Navbar.tsx`
- `src/components/ui/loading-screen.tsx`

**Next Priority Task**
- Confirm whether any OS-level PWA install splash surfaces should mirror the banner logo or remain the square app icon.

**Code Organization & Quality**
- Changes are isolated to branding surfaces (no new patterns; reused existing assets/scripts).

---

#### 2026-01-11: Final Branding & Path Refactor (Venue/Staff + E2E Guardrails)

**Core Components**
- Branded schedule + dashboard routing (`src/App.tsx`)
- E2E auth/socket reliability (`src/contexts/AuthContext.tsx`, `src/contexts/SocketContext.tsx`)
- Venue schedule UI copy (`src/pages/shop/schedule.tsx`)
- Playwright E2E specs (`tests/e2e/*.spec.ts`)
- Vite client env wiring (`vite.config.ts`)

**Key Features**
- Added branded route alias **`/venue/schedule`** (keeps legacy `/shop/schedule` working).
- Added branded dashboard routes **`/venue/dashboard`** and **`/worker/dashboard`** without introducing new dashboard page trees.
- Ensured Socket.io is disabled during automated E2E runs (prevents noisy websocket/auth failures) while staying enabled for production usage.
- Hardened E2E auth hydration so Mobile Safari consistently uses the injected `hospogo_test_user` state.
- Renamed legacy E2E specs:
  - `tests/e2e/shop-schedule.spec.ts` → `tests/e2e/venue-schedule.spec.ts`
  - `tests/e2e/professional-applications.spec.ts` → `tests/e2e/staff-applications.spec.ts`

**Integration Points**
- E2E: `npm run test:e2e -- tests/e2e/{calendar-lifecycle,venue-schedule,staff-applications}.spec.ts`
- Client env exposure: `vite define` for `process.env.NODE_ENV`

**File Paths**
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/contexts/SocketContext.tsx`
- `src/pages/shop/schedule.tsx`
- `tests/e2e/calendar-lifecycle.spec.ts`
- `tests/e2e/seed_data.ts`
- `tests/e2e/staff-applications.spec.ts`
- `tests/e2e/venue-schedule.spec.ts`
- `tests/e2e/shop-schedule.spec.ts` (deleted)
- `tests/e2e/professional-applications.spec.ts` (deleted)
- `vite.config.ts`

**Next Priority Task**
- Re-run and triage the full Playwright suite to decide which failing specs are release-gating vs flaky/non-blocking.

**Code Organization & Quality**
- Kept branding changes constrained to UI-facing strings and routing; avoided introducing new dashboard page trees/patterns.

---

#### 2026-01-10: Branded Venue Welcome Email (Stripe Connect Onboarding Completion Trigger)

**Core Components**
- Email template (HTML) (`api/_src/templates/emails/venue-welcome.html`)
- Email template loader + variable injection (`api/_src/services/email-templates.ts`)
- Email send helper + sender defaults (`api/_src/services/email.service.ts`)
- Stripe webhook onboarding completion trigger (`api/_src/routes/webhooks.ts`)
- Users repository lookup helper (`api/_src/repositories/users.repository.ts`)
- Webhook tests (`api/_src/tests/webhooks.test.ts`)

**Key Features**
- Added a HospoGo-branded **venue welcome** email template using:
  - Deep Charcoal `#0B0E11` background
  - Neon Green `#BAFF39` header + primary CTA button (50px pill radius)
  - Electric Purple `#8B5CF6` accent divider
  - Footer includes `info@hospogo.com` and an unsubscribe link
- Triggered `venue-welcome` **immediately after Stripe Connect onboarding completion** is confirmed via `account.updated`, and guarded it to send **only once** on the first `false → true` completion transition.
- Standardized sender metadata defaults to **HospoGo Support** `<info@hospogo.com>` (env override still supported via `RESEND_FROM_EMAIL`).

**Integration Points**
- Stripe: `account.updated` webhook → updates `users.stripeOnboardingComplete` and fires welcome email on first completion
- Resend: `RESEND_FROM_EMAIL` (optional override), `RESEND_API_KEY` (send vs mock/log mode)
- Tests: `cd api && npm run test:integration`

**File Paths**
- `api/_src/templates/emails/venue-welcome.html`
- `api/_src/services/email-templates.ts`
- `api/_src/services/email.service.ts`
- `api/_src/routes/webhooks.ts`
- `api/_src/repositories/users.repository.ts`
- `api/_src/tests/webhooks.test.ts`

**Next Priority Task**
- Add an `/unsubscribe` handling page/endpoint (and preference persistence) so the footer link has a canonical destination.

**Code Organization & Quality**
- Kept webhook logic thin by reusing repository helpers and a dedicated email service method; added an idempotent “send once” guard to avoid webhook re-delivery spam.

---

#### 2026-01-10: Propagate Brand Neon Palette Across App Buttons (Global Tokens + Button Variants)

**Core Components**
- Theme tokens (`src/index.css`, `tailwind.config.js`)
- Shared Button variants (`src/components/ui/button.tsx`)
- High-traffic CTA surfaces (Navbar + Landing + Onboarding hub) (`src/components/layout/Navbar.tsx`, `src/components/landing/Hero.tsx`, `src/pages/LandingPage.tsx`, `src/pages/onboarding/hub.tsx`)

**Key Features**
- **Global primary token migrated**: updated `--primary` and `--ring` to match HospoGo `brand-neon` so any `bg-primary` / `text-primary` buttons automatically adopt the new palette.
- **Accent button variant migrated**: changed `Button` `variant="accent"` from `red-accent` styling to **brand neon** (with correct dark foreground + glow) so existing usages update without per-page edits.
- **Hardcoded red-accent buttons removed**: updated Navbar + landing CTAs + hub onboarding submit button to use semantic variants/tokens instead of inline `bg-red-accent` classes.

**Integration Points**
- Theme variables: `--primary`, `--primary-foreground`, `--ring`
- UI components: `Button` (`variant="default"` + `variant="accent"`)
- Build verification: `npm run build`

**File Paths**
- `src/index.css`
- `src/components/ui/button.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/landing/Hero.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/onboarding/hub.tsx`
- `src/components/demo/design-system-showcase.tsx`

**Next Priority Task**
- Convert remaining non-button `red-accent` visuals (badges/icons) to the new `brand-neon` palette for full brand consistency.

**Code Organization & Quality**
- Centralized button color changes into theme tokens + shared `Button` variants to avoid repeated inline Tailwind class strings.

---

#### 2026-01-10: Apply Neon Glow & Pulse Styling (CTA Button System)

**Core Components**
- Tailwind animation config (`tailwind.config.js`)
- Global neon button classes (`src/index.css`)
- Landing hero CTA wiring (`src/pages/LandingPage.tsx`)

**Key Features**
- Added `neon-pulse` and `neon-flicker` keyframes + animations in Tailwind for reusable neon motion styling.
- Introduced reusable CTA button classes:
  - `.btn-neon-primary`: filled electric-lime with pulsing neon glow
  - `.btn-neon-outline`: outlined electric-lime with hover fill
- Updated Landing hero:
  - Added a consistent dark overlay (`bg-black/40`) to boost neon contrast
  - Swapped “Find Staff” / “Find Shifts” to the new `.btn-neon-*` classes

**Integration Points**
- Tailwind: `keyframes.neon-pulse`, `keyframes.neon-flicker`, `animation.neon-pulse`, `animation.neon-flicker`
- Build verification: `npm run build`

**File Paths**
- `tailwind.config.js`
- `src/index.css`
- `src/pages/LandingPage.tsx`

**Next Priority Task**
- Apply the new `.btn-neon-*` classes to the remaining landing CTAs (e.g. the final CTA section) for full CTA consistency.

**Code Organization & Quality**
- Centralized CTA styling into global component-layer utilities to avoid repeated inline Tailwind class strings.

---

#### 2026-01-10: Refine Neon Glow to Realistic Hum (Primary CTA)

**Core Components**
- Tailwind shadow utilities (`tailwind.config.js`)
- Global neon CTA styling (`src/index.css`)

**Key Features**
- Added a realistic multi-layer glow shadow utility: `shadow-neon-realistic`.
- Replaced the primary CTA “pulse” with a subtle neon “hum”:
  - Stable layered glow for a tube-like core + halo
  - Minimal brightness dip animation (`neon-hum`) instead of expanding shadow radius
  - Slightly hotter glow on hover to reinforce interactivity

**Integration Points**
- Tailwind utility: `shadow-neon-realistic`
- CSS keyframes: `@keyframes neon-hum`

**File Paths**
- `tailwind.config.js`
- `src/index.css`

**Next Priority Task**
- Apply `shadow-neon-realistic` to other neon-highlight surfaces (badges/labels) where appropriate for visual consistency.

**Code Organization & Quality**
- Kept glow styling centralized in the global component layer to avoid ad-hoc inline shadows.

---

#### 2026-01-10: Remove Landing Hero Darkening Overlay

**Core Components**
- Landing hero background layering (`src/pages/LandingPage.tsx`)

**Key Features**
- Removed the full-screen dark overlay so the hero background image renders without darkening.

**Integration Points**
- Build verification: `npm run build`

**File Paths**
- `src/pages/LandingPage.tsx`

**Next Priority Task**
- If readability needs it, add back a *non-global* readability scrim (e.g. behind copy only) instead of darkening the entire hero image.

**Code Organization & Quality**
- Kept the change scoped to the Landing hero layer stack only.

---

#### 2026-01-10: Refine Global Color Palette (Brand Tokens + Landing CTA Buttons)

**Core Components**
- Tailwind theme tokens (`tailwind.config.js`)
- Landing page hero CTAs (`src/pages/LandingPage.tsx`, `src/pages/landing.tsx`)
- Global CSS utilities (`src/index.css`)

**Key Features**
- Added explicit HospoGo brand palette tokens in Tailwind:
  - `brand-neon`: `#BAFF39`
  - `brand-dark`: `#0B0E11`
  - `brand-accent`: `#8B5CF6`
  - `brand-surface`: `#1A1D21`
- Updated Landing hero CTAs to use the new tokens:
  - **Find Staff**: `bg-brand-neon text-brand-dark` + neon glow shadow + hover scale
  - **Find Shifts**: neon outline + neon hover fill with dark text
- Added a reusable `.neon-glow` text utility for consistent neon highlight styling.

**Integration Points**
- Tailwind: `bg-brand-neon`, `text-brand-dark`, `border-brand-neon`
- Build: `npm run build`

**File Paths**
- `tailwind.config.js`
- `src/pages/LandingPage.tsx`
- `src/pages/landing.tsx`
- `src/index.css`

**Next Priority Task**
- Swap remaining landing “red-accent” visuals (badges/icons) to `brand-neon` for full palette consistency.

**Code Organization & Quality**
- Kept routing stable by making `src/pages/landing.tsx` a thin re-export of `src/pages/LandingPage.tsx`.

---

#### 2026-01-10: Fix Vercel Build Failure (Missing Refund Policy Page Import)

**Core Components**
- Refund policy page (canonical) (`src/pages/legal/refunds.tsx`)
- Compatibility wrapper page (`src/pages/RefundPolicy.tsx`)
- App routing (legal pages) (`src/App.tsx`)

**Key Features**
- Fixed Vercel/Linux production builds failing with `ENOENT` by ensuring the Refund Policy route imports a real module.
- Added the missing Refund & Dispute Policy page implementation under `src/pages/legal/` and kept a small compatibility wrapper for older imports.

**Integration Points**
- Build: `npm run vercel-build` (Vite production build) now completes successfully.
- Route: `/refunds` renders the refund policy content.

**File Paths**
- `src/App.tsx`
- `src/pages/legal/refunds.tsx`
- `src/pages/RefundPolicy.tsx`

**Next Priority Task**
- Add a Footer “Refund Policy” link to `/refunds` for discoverability.

**Code Organization & Quality**
- Followed the existing legal-page pattern (SEO + `card-chrome` + prose typography) and avoided introducing new layout patterns.

---

#### 2026-01-10: Staff Onboarding Wizard + Government ID Verification Gate (RSA + ID)

**Core Components**
- Staff onboarding wizard (`src/pages/Onboarding.tsx`, `src/pages/onboarding/index.tsx`)
- Staff verification hook + browse redirect (`src/hooks/useVerificationStatus.ts`, `src/pages/BrowseShifts.tsx`, `src/App.tsx`)
- Government ID upload UI (`src/components/profile/GovernmentIDLocker.tsx`)
- Navbar verification pending indicator (`src/components/layout/Navbar.tsx`, `src/contexts/AuthContext.tsx`)
- Profiles schema (ID verification fields) (`api/_src/db/schema/profiles.ts`, `api/_src/db/schema/profiles.js`)
- Profile uploads middleware (Government ID field) (`api/_src/middleware/upload.ts`, `api/_src/middleware/upload.js`)
- `/api/me` upload + profile sync (Government ID → profiles) (`api/_src/routes/users.ts`, `api/_src/routes/users.js`)
- Profiles repository (compliance shape extended) (`api/_src/repositories/profiles.repository.ts`, `api/_src/repositories/profiles.repository.js`)
- Test DB optional migration wiring (`api/_src/db/migrations/0018_add_profiles_id_verification.sql`, `api/_src/tests/globalSetup.ts`)

**Key Features**
- **Multi-step staff onboarding**: Implemented a 4-step wizard:
  - Step 1: Personal Details + Profile Photo
  - Step 2: Document Upload (RSA + Government ID)
  - Step 3: Role & Experience Selection (hospitality role + rate preference + experience summary)
  - Step 4: Stripe Payout Account Setup (reuses existing `PayoutSettings`)
- **Government ID verification tracking**: Added `profiles.id_document_url` and `profiles.id_verified_status`, and automatically sets status to **`PENDING`** whenever a Government ID is uploaded/re-uploaded.
- **Browse verification gate**: `/browse-shifts` now redirects to `/onboarding` until `profiles.rsa_cert_url` is present and `profiles.id_verified_status === 'APPROVED'`.
- **Navbar verification badge**: Shows a “Verification Pending” icon next to the user name when documents are uploaded but not yet fully audited.

**Integration Points**
- API: `PUT /api/me` now accepts multipart upload field `governmentId` (PDF/image) and persists URL + sets `profiles.id_verified_status = PENDING`.
- UI Routes: Added `/browse-shifts` alias route for shift browsing verification gate.
- DB/Test: Added an idempotent optional SQL migration to keep test schema deterministic when using `vitest` integration setup.

**File Paths**
- `src/pages/Onboarding.tsx`
- `src/pages/onboarding/index.tsx`
- `src/hooks/useVerificationStatus.ts`
- `src/pages/BrowseShifts.tsx`
- `src/App.tsx`
- `src/components/profile/GovernmentIDLocker.tsx`
- `src/components/layout/Navbar.tsx`
- `src/contexts/AuthContext.tsx`
- `api/_src/db/schema/profiles.ts`
- `api/_src/db/schema/profiles.js`
- `api/_src/middleware/upload.ts`
- `api/_src/middleware/upload.js`
- `api/_src/routes/users.ts`
- `api/_src/routes/users.js`
- `api/_src/repositories/profiles.repository.ts`
- `api/_src/repositories/profiles.repository.js`
- `api/_src/db/migrations/0018_add_profiles_id_verification.sql`
- `api/_src/tests/globalSetup.ts`

**Next Priority Task**
- Add an Admin review workflow for Government ID (list pending uploads + approve/reject to set `profiles.id_verified_status`) and surface clearer “pending review / rejected” messaging in onboarding.

**Code Organization & Quality**
- Reused established patterns (`RSALocker`, `/api/me` upload middleware, Stripe Connect `PayoutSettings`) instead of introducing a new upload or payout system.
- Kept schema changes additive and made test migrations idempotent to avoid cross-environment drift.

---

#### 2026-01-10: Manual Payout State Tracking (PENDING/RELEASED/DISPUTED) + Support Contact Standardization

**Core Components**
- Shifts schema (payout status enum + column) (`api/_src/db/schema/shifts.ts`, `api/_src/db/schema/shifts.js`)
- Drizzle schema barrel exports (`api/_src/db/schema.ts`, `api/_src/db/schema.js`)
- Shifts repository (selects + legacy fallback hydration) (`api/_src/repositories/shifts.repository.ts`, `api/_src/repositories/shifts.repository.js`)
- Support contact surfaces (Footer + account deletion prompt) (`src/components/layout/Footer.tsx`, `src/pages/edit-profile.tsx`)

**Key Features**
- **Payout lifecycle state**: Added `payout_status` enum and `shifts.payoutStatus` column with default **`PENDING`** to align with Manual Payout strategy (separate from `payment_status` / Stripe intent state).
- **API contract stays consistent**: Threaded `payoutStatus` through repository reads and legacy-schema hydration to avoid runtime 500s on partially-migrated DBs.
- **Support contact**: Standardized support contact details across key UI support surfaces to **`info@hospogo.com`** and **`+61 478 430 822`**.

**Integration Points**
- DB schema sync: `cd api && npm run db:push` (drizzle-kit) to apply the new enum + column to the target DB.
- API: Shift read endpoints indirectly include the new `payoutStatus` field via the repository layer.

**File Paths**
- `api/_src/db/schema/shifts.ts`
- `api/_src/db/schema/shifts.js`
- `api/_src/db/schema.ts`
- `api/_src/db/schema.js`
- `api/_src/repositories/shifts.repository.ts`
- `api/_src/repositories/shifts.repository.js`
- `src/components/layout/Footer.tsx`
- `src/pages/edit-profile.tsx`

**Next Priority Task**
- Add an admin/business workflow to mark a shift payout as **RELEASED** (and set **DISPUTED** when a dispute is opened), then surface this status on the Professional Earnings/Payouts UI.

**Code Organization & Quality**
- Kept payout state as a dedicated enum/column to avoid overloading `payment_status` with manual payout semantics.
- Maintained legacy-DB compatibility by extending existing “missing column” fallback patterns in the shifts repository.

---

#### 2026-01-10: Audit Authentication & Authorized Domains (HospoGo)

**Core Components**
- Firebase client initialization (`src/lib/firebase.ts`)
- OAuth callback handling (`src/pages/oauth-callback.tsx`, `src/pages/signup.tsx`, `src/App.tsx`)
- Google auth flow entrypoint (`src/components/auth/google-auth-button.tsx`, `src/contexts/AuthContext.tsx`)
- Env/documentation templates (`docs/env.vercel.example`, `docs/env.production.example`, `docs/FIREBASE_VERCEL_GUIDE.md`, `PRODUCTION_DEPLOYMENT.md`)
- E2E/test fixtures cleanup (domain pivot) (`tests/**`, `e2e/**`)
- Drizzle schema export for test DB sync (`api/_src/db/schema.ts`)
- API auth middleware (E2E bypass email) (`api/_src/middleware/auth.ts`, `api/_src/middleware/auth.js`)

**Key Features**
- **Firebase Auth domain hardening**: Verified there are **no hardcoded** `snipshift.com.au` domains in client Firebase init; `authDomain` is now sourced from `VITE_FIREBASE_AUTH_DOMAIN` with a backwards-compatible alias `VITE_AUTH_DOMAIN`.
- **Authorized domains guidance**: Documented that Firebase Authorized Domains are configured in the Firebase Console (expected `hospogo.com` / `www.hospogo.com`) and legacy HospoGo domains should be removed.
- **Redirect safety**: Removed/disabled the insecure “manual Google OAuth code callback” flows and ensured `/oauth/callback` + Firebase’s `/__/auth/handler` route simply returns the user to `/login` so Firebase `getRedirectResult()` can complete the redirect sign-in safely.
- **Domain pivot cleanup in fixtures**: Replaced `@snipshift.com` emails in tests/fixtures/docs with `@hospogo.com` to prevent brand leakage and confusion.
- **Test infra fix (enum export)**: Fixed `drizzle-kit push` schema sync in tests by exporting `payoutStatusEnum` from the schema barrel so `payout_status` is created before being referenced.

**Integration Points**
- Firebase Console: Authentication → Settings → Authorized domains
- Frontend env vars: `VITE_FIREBASE_AUTH_DOMAIN` (preferred) / `VITE_AUTH_DOMAIN` (alias)
- Test DB: `cd api && npm run test:db:up && npm test && npm run test:db:down`

**File Paths**
- `src/lib/firebase.ts`
- `src/pages/oauth-callback.tsx`
- `src/pages/signup.tsx`
- `src/App.tsx`
- `docs/env.vercel.example`
- `docs/env.production.example`
- `docs/FIREBASE_VERCEL_GUIDE.md`
- `PRODUCTION_DEPLOYMENT.md`
- `tests/**`
- `e2e/**`
- `api/_src/db/schema.ts`
- `api/_src/middleware/auth.ts`
- `api/_src/middleware/auth.js`

**Next Priority Task**
- Verify in Firebase Console that **Authorized domains** includes `hospogo.com` + `www.hospogo.com` and remove any legacy HospoGo domains; then confirm Google sign-in redirect works on production with popup-blocked fallback.

**Code Organization & Quality**
- Kept changes scoped to auth/config/test fixtures; avoided introducing new auth patterns beyond existing Firebase + backend session handshake.
- Added a safe, non-secret env template under `docs/` since `.env.production` files are intentionally protected from editing in this workspace.


#### 2026-01-10: Landing Visual Polish (Navbar Logo Blend + Hero De-Clutter)

**Core Components**
- Theme tokens (navbar background) (`src/index.css`)
- Landing hero layout (`src/pages/landing.tsx`, `src/components/landing/Hero.tsx`)

**Key Features**
- **Navbar logo blend**: Updated the navbar background token to match the wordmark asset’s base charcoal so the logo no longer reads as a “boxed” rectangle on the header.
- **Logo edge cleanup**: Reduced the aggressive `logo-sharp` filter so it doesn’t amplify the baked-in dark background edges.
- **Hero de-clutter**: Adjusted hero spacing so the content sits lower and the background image reads cleaner.

**Integration Points**
- Frontend build: `npm run build`
- Lint:
  - `npm run lint` (reports warnings but does not fail)
  - `npm run lint:strict` (fails on warnings; use when tackling the warning backlog)

**File Paths**
- `src/index.css`
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`
- `package.json`

**Next Priority Task**
- Replace the wordmark/nav asset with a true transparent-background PNG (or SVG) so it blends on any header color without relying on token alignment.

**Code Organization & Quality**
- Kept changes scoped to theme tokens and landing layout only; no routing/auth logic touched.

---

#### 2026-01-10: Landing Hero + Navbar Brand Polish (Transparent Wordmark + Professional Hero Panel)

**Core Components**
- Brand asset pipeline (transparent wordmark export) (`scripts/crop-hospogo-logo.mjs`)
- Public brand asset (`public/brand-wordmark-transparent.png`)
- Global navigation branding (`src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx`, `src/components/ui/loading-screen.tsx`)
- Landing hero layout (`src/pages/landing.tsx`, `src/components/landing/Hero.tsx`)
- Global styling utilities (`src/index.css`)

**Key Features**
- **Logo clarity**: Removed “sharpening” filters from logo rendering and switched navbar/footer/loading to a **transparent-background** wordmark asset to prevent blur/box artifacts.
- **Hero cleanup**: Rebuilt the hero using a subtle **gradient scrim** plus a **backdrop-blur content panel**, improving legibility and reducing visual clutter over photography.
- **Layout best practices**: Switched hero content to a left-aligned, bottom-anchored composition with tighter typographic scale for a more premium feel.

**Integration Points**
- Asset generation: `node scripts/crop-hospogo-logo.mjs`
- Frontend build: `npm run build`

**File Paths**
- `scripts/crop-hospogo-logo.mjs`
- `public/brand-wordmark-transparent.png`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/ui/loading-screen.tsx`
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`
- `src/index.css`

**Next Priority Task**
- Replace the PNG wordmark with an SVG (or a true transparent export from source design) for perfect scaling across all DPIs.

**Code Organization & Quality**
- Kept the transparency conversion in the existing asset pipeline script to avoid one-off manual image editing and keep branding repeatable.

---

#### 2026-01-10: Hero Brand Color Preservation (Remove Global Scrim)

**Core Components**
- Landing hero readability layers (`src/pages/landing.tsx`, `src/components/landing/Hero.tsx`)

**Key Features**
- Removed the full-image darkening scrim that was muting the hero’s greens.
- Kept a lighter **left-side-only** readability gradient + text shadows so brand colors stay vivid while copy remains readable.

**Integration Points**
- Frontend build: `npm run build`

**File Paths**
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`

**Next Priority Task**
- Add a quick visual regression check for hero color vibrancy across breakpoints (desktop + mobile).

---

#### 2026-01-10: Navbar Neon Logo Restored (Correct Asset + Better Sizing)

**Core Components**
- Brand asset pipeline (neon logo alias) (`scripts/crop-hospogo-logo.mjs`)
- Public neon logo asset (`public/hospogoneonlogo.png`)
- Navigation + shell logo usage (`src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx`, `src/components/ui/loading-screen.tsx`)

**Key Features**
- Restored the navbar logo to the **HospoGo neon** wordmark asset (`/hospogoneonlogo.png`).
- Increased logo sizing to better fill the navbar height and added a subtle neon drop-shadow for brightness without blurring.

**Integration Points**
- Asset generation: `node scripts/crop-hospogo-logo.mjs`
- Frontend build: `npm run build`

**File Paths**
- `scripts/crop-hospogo-logo.mjs`
- `public/hospogoneonlogo.png`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/ui/loading-screen.tsx`

---

#### 2026-01-10: Navbar Logo Updated to App Icon (hospogoappicon.png)

**Core Components**
- Public app icon asset (`public/hospogoappicon.png`)
- Navbar branding (`src/components/layout/Navbar.tsx`)

**Key Features**
- Updated the navbar logo to use the provided root asset `hospogoappicon.png` (served from `public/`).
- Increased navbar logo sizing to better fill the header space and added a subtle neon glow.

**Integration Points**
- Frontend build: `npm run build`

**File Paths**
- `public/hospogoappicon.png`
- `src/components/layout/Navbar.tsx`

---

#### 2026-01-10: Navbar Logo Crop + Blend (hospogoappicon → navbar asset)

**Core Components**
- Brand asset pipeline (auto-trim + background keying) (`scripts/crop-hospogo-logo.mjs`)
- Public navbar logo asset (`public/hospogoappicon-navbar.png`)
- Navbar branding (`src/components/layout/Navbar.tsx`)

**Key Features**
- Cropped and enlarged the provided icon into a navbar-optimized asset (tight trim, transparent background) so it blends cleanly into the charcoal navbar.
- Increased navbar logo height for better fill while keeping the image crisp on high-DPI screens.

**Integration Points**
- Asset generation: `node scripts/crop-hospogo-logo.mjs`
- Frontend build: `npm run build`

**File Paths**
- `scripts/crop-hospogo-logo.mjs`
- `public/hospogoappicon-navbar.png`
- `src/components/layout/Navbar.tsx`

#### 2026-01-10: Refund & Dispute Policy Page (Refunds + Kill Fee)

**Core Components**
- Refund policy content page (`src/pages/RefundPolicy.tsx`)
- App routing (legal pages) (`src/App.tsx`)
- Footer legal navigation (`src/components/layout/Footer.tsx`)
- Contact/support email alignment (`src/pages/company/contact.tsx`, `src/pages/edit-profile.tsx`, `src/pages/legal/sitemap.tsx`)

**Key Features**
- Added a dedicated **Refund & Dispute Policy** page with the provided HospoGo policy text and updated contact details (email + phone).
- Registered the new route at **`/refunds`** and added a **Refund Policy** link in the site footer.
- Aligned “support” email references in-app to **`info@hospogo.com`** (per branding/contact requirements) and added Refund Policy to the Sitemap legal section.

**Integration Points**
- Route: `react-router-dom` route registered in `src/App.tsx` (`/refunds`)
- SEO: `SEO` component used for metadata (`title`, `description`, `url`)
- Navigation: Footer and Sitemap link to `/refunds`

**File Paths**
- `src/pages/RefundPolicy.tsx`
- `src/App.tsx`
- `src/components/layout/Footer.tsx`
- `src/pages/company/contact.tsx`
- `src/pages/edit-profile.tsx`
- `src/pages/legal/sitemap.tsx`

**Next Priority Task**
- Verify `/refunds` renders correctly across authenticated/unauthenticated sessions and appears in Footer/Sitemap on production.

**Code Organization & Quality**
- Followed the existing “legal page” UI pattern (SEO + `card-chrome` + prose typography) to keep styling consistent and avoid new one-off layouts.

---

#### 2026-01-10: Staff Penalty Persistence (Reliability Strikes + Auto Suspension)

**Core Components**
- Profiles schema + strikes storage (`api/_src/db/schema/profiles.ts`, `api/_src/db/schema/profiles.js`, `api/_src/db/schema.ts`)
- Profiles repository (atomic strike increment) (`api/_src/repositories/profiles.repository.ts`)
- Cancellation penalty implementation (`api/_src/services/cancellationService.ts`)
- Test DB optional migration wiring (`api/_src/tests/globalSetup.ts`, `api/_src/db/migrations/0017_add_profiles_reliability_strikes.sql`)
- Cancellation service tests (`api/_src/tests/services/cancellationService.test.ts`)
- Reliability UI component (`src/components/profile/ReliabilityBadge.tsx`)

**Key Features**
- **Reliability strikes persisted**: Added `profiles.reliability_strikes` (default 0) and an atomic UPSERT increment in `profiles.repository`.
- **Penalty enforcement**: `triggerPenalty(...)` now:
  - Increments `reliability_strikes`
  - If strikes ≥ 3, **suspends** the account by setting `users.isActive = false` (maps to `account_status = SUSPENDED`)
  - Sends an in-app notification to the staff member explaining the strike/suspension
- **UI badge**: Added `ReliabilityBadge` component with green (0), yellow (1), red warning (≥2) states.

**Integration Points**
- Service: `api/_src/services/cancellationService.ts` → `triggerPenalty(staffId, { shiftId, timeUntilShiftHours })`
- Repo: `api/_src/repositories/profiles.repository.ts` → `incrementReliabilityStrikes(userId)`
- Tests: `cd api && npm run test:db:up && npm test -- cancellationService && npm run test:db:down`

**File Paths**
- `api/_src/db/schema/profiles.ts`
- `api/_src/db/schema/profiles.js`
- `api/_src/db/schema.ts`
- `api/_src/db/migrations/0017_add_profiles_reliability_strikes.sql`
- `api/_src/tests/globalSetup.ts`
- `api/_src/repositories/profiles.repository.ts`
- `api/_src/services/cancellationService.ts`
- `api/_src/tests/services/cancellationService.test.ts`
- `src/components/profile/ReliabilityBadge.tsx`

**Next Priority Task**
- Expose `reliability_strikes` on `GET /api/me` (and/or staff profile endpoints) so the badge can be displayed in Settings/Profile without additional client-side calls.

**Code Organization & Quality**
- Kept persistence in a repository and business rules in `cancellationService` (clear separation of concerns).
- Implemented the strike increment with a single-statement UPSERT for race safety.

---

#### 2026-01-10: RSA Compliance Gate (Browse Shifts Lock + RSA Locker UI)

**Core Components**
- RSA compliance hook (`src/hooks/useCompliance.ts`)
- RSA locker UI component (`src/components/profile/RSALocker.tsx`)
- Shift browsing feed overlay gate (`src/pages/job-feed.tsx`, `src/pages/BrowseShifts.tsx`)
- Settings deep-link + verification section composition (`src/pages/settings.tsx`)
- User/profile compliance API response + profile upsert (`api/_src/routes/users.ts`, `api/_src/routes/users.js`, `api/_src/repositories/profiles.repository.ts`, `api/_src/repositories/profiles.repository.js`)
- Profiles DB schema (RSA fields) (`api/_src/db/schema/profiles.ts`, `api/_src/db/schema/profiles.js`)
- Users DB schema (RSA fields + backwards-compatible cert URL columns) (`api/_src/db/schema/users.ts`, `api/_src/db/schema/users.js`)
- Admin RSA review endpoints + UI (`api/_src/routes/admin.ts`, `api/_src/routes/admin.js`, `src/pages/admin/dashboard.tsx`)
- Admin route tests (RSA) (`api/_src/tests/admin.test.ts`)

**Key Features**
- **Hard gate on shift browsing**: `/jobs` is now blurred/locked when staff are not compliant, showing an overlay: “RSA Verification Required to View Shifts”.
- **Compliance logic encapsulated**: `useIsStaffCompliant()` returns a boolean based on:
  - `rsa_verified === true`
  - current date is **before** `rsa_expiry`
  - safe parsing for `YYYY-MM-DD` to avoid timezone drift.
- **RSA Locker UI**: Added a dedicated RSA capture component:
  - Upload RSA certificate (PDF/image)
  - RSA certificate number
  - Expiry date picker
  - State of issue (AU states dropdown)
- **Backend profile sync**: `/api/me` now includes a `profile` object containing the canonical RSA fields (`rsa_verified`, `rsa_expiry`, `rsa_cert_url`, `rsa_state_of_issue`) and upserts those fields when users update RSA details/upload their certificate.
- **Admin review workflow**: Admins can review pending RSA submissions and approve them (sets `profiles.rsa_verified=true` and keeps `users.rsa_verified` in sync) from the Admin Dashboard.
- **DB sync**: Added RSA fields to the `profiles` table and ensured `users` retains backwards compatibility for existing RSA certificate URL storage.

**Integration Points**
- UI:
  - `/jobs` (shift feed) uses `useIsStaffCompliant()` to lock/unlock browsing
  - `/settings?category=verification` deep-links to the RSA verification section
  - `/admin/dashboard` → RSA Review tab shows pending RSA submissions and approve actions
- API:
  - `GET /api/me` now returns `profile` compliance fields
  - `PUT /api/me` uploads `rsaCertificate` and upserts profile RSA fields (verification remains server-controlled)
  - `GET /api/admin/rsa/pending` lists pending RSA submissions
  - `PATCH /api/admin/rsa/:userId/verify` sets `rsa_verified` for the user (admin-only)
- DB:
  - `profiles.rsa_verified` (bool)
  - `profiles.rsa_expiry` (date)
  - `profiles.rsa_cert_url` (text)
  - `profiles.rsa_state_of_issue` (varchar)

**File Paths**
- `src/hooks/useCompliance.ts`
- `src/components/profile/RSALocker.tsx`
- `src/pages/job-feed.tsx`
- `src/pages/BrowseShifts.tsx`
- `src/pages/settings.tsx`
- `src/pages/admin/dashboard.tsx`
- `api/_src/routes/users.ts`
- `api/_src/routes/users.js`
- `api/_src/routes/admin.ts`
- `api/_src/routes/admin.js`
- `api/_src/repositories/profiles.repository.ts`
- `api/_src/repositories/profiles.repository.js`
- `api/_src/db/schema/profiles.ts`
- `api/_src/db/schema/profiles.js`
- `api/_src/db/schema/users.ts`
- `api/_src/db/schema/users.js`
- `api/_src/tests/admin.test.ts`

**Next Priority Task**
- Add “Reject RSA” and “Request re-upload” actions (with optional reason) and surface review status messaging/ETA in `RSALocker`.

**Code Organization & Quality**
- Kept compliance logic isolated in a hook and returned a simple boolean gate for reuse across pages.
- Preserved legacy compatibility while introducing `profiles` as the canonical compliance store.

---

#### 2026-01-10: Hospitality Cancellation Logic (Emergency Fill + Windowed Penalties)

**Core Components**
- Shifts DB schema (cancellation + emergency fill fields) (`api/_src/db/schema/shifts.ts`)
- Test DB optional migration wiring (`api/_src/tests/globalSetup.ts`, `api/_src/db/migrations/0016_add_shift_cancellation_fields.sql`)
- Cancellation service (staff cancellation decisioning) (`api/_src/services/cancellationService.ts`)
- Shift repository projections (field plumbing to API responses) (`api/_src/repositories/shifts.repository.ts`)
- Shift details/listings payload shaping (expose emergency flag) (`api/_src/routes/shifts.ts`)
- Shift card UI (Emergency badge) (`src/components/shifts/ShiftCard.tsx`)
- Shared shift types (include new fields) (`src/shared/types.ts`)

**Key Features**
- **Shift cancellation window support**: Added `cancellationWindowHours` (default **24**) as a per-shift setting to drive “late cancellation” behavior.
- **Emergency fill flag**: Added `isEmergencyFill` and ensured it flows through repository selects and API payload shaping so the frontend can render it reliably.
- **Staff cancellation handler**: Implemented `handleStaffCancellation` to compare \(now → shift start\) against the window:
  - Within the window: triggers `triggerPenalty(...)`, notifies the venue with a **CRITICAL** message, and republishes the shift as **Emergency Fill**.
  - Outside the window: republishes the shift normally.
- **Cancellation reason capture**: Supports persisting `staffCancellationReason` when a staff member cancels.

**Integration Points**
- `api/_src/services/cancellationService.ts`: `handleStaffCancellation({ shiftId, staffId, reason })`
- Notifications: uses `createInAppNotification(...)` for venue alerting (default behavior)
- Tests: `cd api && npm run test:db:up && npm test -- cancellationService && npm run test:db:down`

**File Paths**
- `api/_src/db/schema/shifts.ts`
- `api/_src/db/schema/shifts.js`
- `api/_src/db/migrations/0016_add_shift_cancellation_fields.sql`
- `api/_src/tests/globalSetup.ts`
- `api/_src/repositories/shifts.repository.ts`
- `api/_src/repositories/shifts.repository.js`
- `api/_src/routes/shifts.ts`
- `api/_src/routes/shifts.js`
- `api/_src/services/cancellationService.ts`
- `api/_src/tests/services/cancellationService.test.ts`
- `src/shared/types.ts`
- `src/components/shifts/ShiftCard.tsx`

**Next Priority Task**
- Add an authenticated API endpoint for staff to cancel a confirmed shift that calls `handleStaffCancellation` (and define the penalty mechanism persistence strategy).

**Code Organization & Quality**
- Kept the cancellation decision logic isolated in a single service (testable via dependency injection and module mocks).
- Maintained legacy-schema resilience patterns by extending fallback guards in `shifts.repository`.

---

#### 2026-01-10: Pivot Audit Complete (Brand + Vercel Env)

**Core Components**
- Vercel project linkage + production env audit (`.vercel/*`, `.env.production`)
- Firebase client initialization (`src/lib/firebase.ts`)
- Service worker recovery key branding (`index.html`)
- Socket base URL fallback (avoid localhost in prod) (`src/contexts/SocketContext.tsx`)
- Support contact docs (`README.md`, `HANDOVER.md`)
- Production deployment guide examples (`PRODUCTION_DEPLOYMENT.md`)

**Key Features**
- **Vercel env audit complete**: Linked the repo to `dojo-pool-team/hospogo-web`, pulled Production env vars for review, and inspected the latest Production deployment aliases (`hospogo.com`, `www.hospogo.com`).
- **No legacy app URL vars found**: Confirmed Production env does **not** include `VITE_APP_URL` or `NEXT_PUBLIC_APP_URL` (so they cannot be pointing at a HospoGo domain in Vercel).
- **Brand string sweep (targeted)**: Removed remaining `HospoGo/hospogo/HOSPOGO` occurrences from `src/` and `index.html`.
- **Firebase config hardening**: Removed the committed Firebase fallback config and now fail-fast if required `VITE_FIREBASE_*` env vars are missing (prevents accidental initialization against the wrong project).
- **Docs compliance**: Updated support email references to `info@hospogo.com` and refreshed production env examples to use `hospogo.com`/`hospogo.com/api`.

**Integration Points**
- Vercel CLI:
  - `vercel link --project hospogo-web --yes`
  - `vercel env pull .env.production --environment production --yes`
  - `vercel list hospogo-web --environment production`
  - `vercel inspect <latest-production-deployment-url>`

**File Paths**
- `.env.production` (pulled for audit; do not commit)
- `.vercel/*` (project link metadata)
- `src/lib/firebase.ts`
- `src/contexts/SocketContext.tsx`
- `index.html`
- `README.md`
- `HANDOVER.md`
- `PRODUCTION_DEPLOYMENT.md`

**Next Priority Task**
- Add/verify a single canonical public URL env var in Vercel (e.g. `VITE_APP_URL=https://hospogo.com`) if you want runtime-configurable canonical links (otherwise continue using hard-coded `https://hospogo.com/` in SEO).

**Code Organization & Quality**
- Removed a risky fallback path (harder-to-debug) in favor of explicit env requirements.
- Kept changes scoped to branding/environment surfaces; no feature behavior refactors.

---

#### 2026-01-10: Native Package Id Check (Capacitor/Android)

**Core Components**
- Repo structure audit (Capacitor config + native Android project folders)

**Key Features**
- Verified this repository does **not** contain `capacitor.config.json` (or any `capacitor.config.*`) and does **not** include a native `android/` folder.
- Confirmed `com.snipshift.app` is **not present** in this repo, so the package id update to `com.hospogo.app` must be performed in the **native wrapper repository/project** used to build your APK/AAB (Capacitor/Android Studio project).

**Integration Points**
- Android build tooling (external): `android/app/build.gradle(.kts)` `applicationId`, and/or `capacitor.config.*` `appId`

**File Paths**
- N/A (no native wrapper files found in this repo)

**Next Priority Task**
- In your native wrapper project, update `applicationId/appId` from `com.snipshift.app` → `com.hospogo.app` before generating the next APK/AAB.

---

#### 2026-01-10: Final Visual Branding Sweep (HospoGo)

**Core Components**
- App shell theme persistence (`src/App.tsx`)
- Auth E2E hydration key (`src/contexts/AuthContext.tsx`)
- Password reset UX copy (`src/pages/forgot-password.tsx`)
- Legal pages (Terms + Sitemap) (`src/pages/legal/terms.tsx`, `src/pages/legal/sitemap.tsx`)
- API email/signature branding + dev/ops labeling (`api/_src/lib/notifications-service.ts`, `api/_src/services/stripe-connect.service.ts`, `api/_src/db/schema/shifts.ts`, `api/_src/scripts/seed-plans.ts`, `api/scripts/audit-db.ts`, `api/Dockerfile`, `api/package.json`)
- Test fixtures/docs references (`tests/*`, `e2e/*`, tracking/docs markdown)

**Key Features**
- **HospoGo branding consistency**: Removed remaining user-facing “HospoGo” strings (legal copy, sitemap social links, email signatures, docs/scripts).
- **Auth/test alignment**: Standardized Playwright/session hydration key to `hospogo_test_user` and updated fixtures/docs accordingly.
- **Password reset copy**: Removed the hard-coded Firebase sender domain from the “check your email” guidance to avoid brand mismatch/confusion.

**Integration Points**
- Playwright E2E: session hydration via `sessionStorage['hospogo_test_user']` (when `VITE_E2E=1`)
- Dev UX: Vite HMR refreshed branding changes without a full rebuild

**File Paths**
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/pages/forgot-password.tsx`
- `src/pages/legal/terms.tsx`
- `src/pages/legal/sitemap.tsx`
- `api/_src/lib/notifications-service.ts`
- `api/_src/services/stripe-connect.service.ts`
- `api/_src/db/schema/shifts.ts`
- `api/_src/scripts/seed-plans.ts`
- `api/scripts/audit-db.ts`
- `api/Dockerfile`
- `api/package.json`
- `tests/**`

**Next Priority Task**
- Verify the deployed UI on `hospogo.com` has no remaining “HospoGo” user-facing branding (including transactional emails + legal pages).

---

#### 2026-01-10: Landing Hero Image Swap (HospoGo Hero + Navbar Crop)

**Core Components**
- Landing hero section (`src/pages/landing.tsx`)
- Shared hero component (`src/components/landing/Hero.tsx`)
- Hero crop pipeline (`scripts/crop-hospogo-hero.mjs`)
- Public hero assets (`public/hospogohero.webp`, `public/hospogohero.jpg`)
- Source hero image (`hospogohero.png`)

**Key Features**
- **Hero image replaced**: Swapped the previous landing hero background (`/herobarber (2).*`) to the new HospoGo hero asset (`/hospogohero.*`).
- **Navbar removed from source**: Cropped only the embedded navbar strip off the top of the provided hero image (keeps the hero’s HospoGo wordmark visible) and generated optimized **WebP + JPG** outputs for fast loading. Crop amount is **overrideable via env** (`HOSPOGO_HERO_CROP_TOP_PX`) if the source image changes.
- **Consistent delivery**: Kept assets served from `public/` and retained `<picture>` WebP-first + JPG fallback behavior.

**Integration Points**
- Vite static assets served from `public/` at `/hospogohero.webp` and `/hospogohero.jpg`
- Asset generation: `node scripts/crop-hospogo-hero.mjs`

**File Paths**
- `hospogohero.png`
- `public/hospogohero.webp`
- `public/hospogohero.jpg`
- `scripts/crop-hospogo-hero.mjs`
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`

**Next Priority Task**
- Run a quick visual regression sweep (desktop + mobile) to confirm the new hero crop/composition looks correct across breakpoints.

**Code Organization & Quality**
- Reused the existing approach from `scripts/crop-hospogo-logo.mjs` (Sharp-based asset pipeline) to keep branding workflows consistent and repeatable.

---

#### 2026-01-10: Landing Hero Top Edge Trim (Remove Green Artifact Line)

**Core Components**
- Landing hero section (`src/pages/landing.tsx`)
- Shared hero component (`src/components/landing/Hero.tsx`)

**Key Features**
- **Removed residual top-edge artifact**: Applied a tiny pixel-level “trim” to the hero image render (slight negative Y translate + small scale) so the remaining thin green line at the very top is no longer visible.
- **No asset regeneration needed**: Kept the existing `public/hospogohero.*` outputs unchanged; this is a rendering-only adjustment.

**Integration Points**
- Vite HMR (landing hero refresh)

**File Paths**
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`

**Next Priority Task**
- Verify the hero crop/composition on desktop + mobile breakpoints in production (no top-edge artifacts, wordmark still framed well).

**Code Organization & Quality**
- Kept the change minimal and localized to the hero image element (no navbar/theme changes).

---

#### 2026-01-10: Landing Hero Overlay Removed (Preserve Brand Green Drink Highlight)

**Core Components**
- Landing hero section (`src/pages/landing.tsx`)
- Shared hero component (`src/components/landing/Hero.tsx`)

**Key Features**
- **Removed hero dimming overlays**: Dropped the dark overlay + gradient filter layers so the hero image’s bright green drink stays vivid and matches the HospoGo logo color.

**Integration Points**
- Vite HMR (landing hero refresh)

**File Paths**
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`

**Next Priority Task**
- Quick readability check on desktop/mobile to ensure hero text remains legible without overlays.

**Code Organization & Quality**
- Kept the change scoped to overlay elements only; no asset changes required.

#### 2026-01-10: Landing Hero Layout Polish (Reduce Clutter / Improve Readability)

**Core Components**
- Landing hero section (`src/pages/landing.tsx`)
- Shared hero component (`src/components/landing/Hero.tsx`)

**Key Features**
- **Reduced clutter**: Repositioned hero content lower in the hero so it doesn’t fight with the baked-in HospoGo wordmark, while keeping the original “text over image” style (no panel overlay).
- **Improved legibility**: Strengthened bottom gradient + tuned overlay opacity for a cleaner read over photography.
- **Responsive sizing**: Reduced headline/body/button sizing and spacing for better balance on both desktop and mobile.

**Integration Points**
- Vite HMR updates to landing page layout

**File Paths**
- `src/pages/landing.tsx`
- `src/components/landing/Hero.tsx`

**Next Priority Task**
- Run a quick content sweep to align remaining barber/shop copy on the landing page with venue/staff terminology.

**Code Organization & Quality**
- Kept changes scoped to layout/styling only; no routing/auth logic touched.

---

#### 2026-01-10: Hospitality Shift Details (Roles + Uniform/RSA/Pax + Hourly Pricing)

**Core Components**
- Shift creation modal (`src/components/calendar/create-shift-modal.tsx`)
- Shift posting pages (`src/pages/post-job.tsx`, `src/pages/salon-create-job.tsx`)
- Shop schedule quick-create (`src/pages/shop/schedule.tsx`)
- Professional profile resume (`src/components/profile/professional-digital-resume.tsx`)
- Shared hospitality constants (`src/utils/hospitality.ts`)
- Shifts API + schema (`api/_src/routes/shifts.ts`, `api/_src/repositories/shifts.repository.ts`, `api/_src/db/schema/shifts.ts`, `api/_src/validation/schemas.ts`)
- Test DB setup (idempotent SQL add-on) (`api/_src/tests/globalSetup.ts`, `api/_src/db/migrations/0015_add_shift_hospitality_fields.sql`)
- Theme + action button styling (`src/index.css`, `src/components/ui/button.tsx`)

**Key Features**
- **Role selector**: Shift creation now starts with “Select Shift Role” with hospitality roles (Bartender, Waitstaff, Barista, Barback, Kitchen Hand, Duty Manager).
- **Shift-specific fields**: Added `uniformRequirements`, `rsaRequired`, and `expectedPax` to shift create/post flows and persisted them on the backend.
- **Pricing logic**: UI now shows duration in **hours** plus an **estimated total** using \(Hourly Rate × Duration\).
- **Profile pivot**: Removed the portfolio gallery and surfaced hospitality compliance badges (RSA/RCG/Covid Safety/Manual Handling) alongside existing verification badges.
- **API compatibility**: Added `shiftLengthHours` in shift responses, and maintained compatibility aliases (`pay`, `requirements`, `date`) for older clients.

**Integration Points**
- API endpoint: `POST /api/shifts` (accepts hospitality fields)
- API endpoints: `GET /api/shifts`, `GET /api/shifts?employer_id=me`, `GET /api/shifts/:id` (returns `shiftLengthHours` + hospitality fields)
- DB schema: `shifts.role`, `shifts.uniform_requirements`, `shifts.rsa_required`, `shifts.expected_pax`
- Dev server: Vite HMR (theme + component changes)

**File Paths**
- `src/utils/hospitality.ts`
- `src/components/calendar/create-shift-modal.tsx`
- `src/pages/shop/schedule.tsx`
- `src/pages/hub-dashboard.tsx`
- `src/pages/post-job.tsx`
- `src/pages/salon-create-job.tsx`
- `src/components/profile/professional-digital-resume.tsx`
- `src/components/ui/button.tsx`
- `src/index.css`
- `api/_src/db/schema/shifts.ts`
- `api/_src/repositories/shifts.repository.ts`
- `api/_src/routes/shifts.ts`
- `api/_src/validation/schemas.ts`
- `api/_src/tests/globalSetup.ts`
- `api/_src/db/migrations/0015_add_shift_hospitality_fields.sql`

**Next Priority Task**
- Update remaining barber/salon terminology in shift/job flows (notifications + labels) to hospitality-first wording, and verify new hospitality fields display in Shift Details.

**Code Organization & Quality**
- Reused existing shift posting and scheduling surfaces; added a small shared constants module to avoid duplication.
- Backend changes are additive (new optional columns + compatibility transforms), minimizing risk to existing environments.

---

#### 2026-01-10: Hospitality Terminology Pass + Shift Details Display (Venue/Staff)

**Core Components**
- Shift details page (`src/pages/shift-details.tsx`)
- Staff assignment modal (`src/components/calendar/assign-staff-modal.tsx`)
- Shift review surfaces (`src/components/shifts/shift-review-modal.tsx`, `src/components/shifts/pending-review-notification.tsx`, `src/components/shifts/ShiftCard.tsx`)
- Backend notification copy (`api/_src/lib/notifications-service.ts`)

**Key Features**
- **Shift Details now shows hospitality fields**: role, duration (hours), estimated total (Hourly Rate × Duration), RSA requirement, expected pax, and uniform requirements.
- **RSA gating fixed**: RSA certificate enforcement now triggers **only when the shift is marked `rsaRequired`** (instead of blocking all applications).
- **Terminology cleanup**: Replaced “barber/shop” strings in shift-related UI and notification copy with hospitality-first wording (“staff member/professional/venue”).

**Integration Points**
- UI route: `/shifts/:id` (Shift Details)
- API: `GET /api/shifts/:id` provides `role`, `rsaRequired`, `expectedPax`, `uniformRequirements`, `shiftLengthHours`
- Notifications: copy updated in `notifyProfessionalOfShiftChange` + `notifyShopOfPaymentFailure`

**File Paths**
- `src/pages/shift-details.tsx`
- `src/components/calendar/assign-staff-modal.tsx`
- `src/components/shifts/shift-review-modal.tsx`
- `src/components/shifts/pending-review-notification.tsx`
- `src/components/shifts/ShiftCard.tsx`
- `api/_src/lib/notifications-service.ts`

**Next Priority Task**
- Replace remaining barber/salon strings in legacy “job” posting modals and onboarding copy (where still visible), keeping behavior unchanged.

**Code Organization & Quality**
- Kept changes scoped to user-facing copy + Shift Details display; no behavioral changes beyond correcting RSA gating to match the shift flag.

---

#### 2026-01-10: SEO & Metadata Finalization (HospoGo Home)

**Core Components**
- App shell metadata (`index.html`)
- React Helmet defaults (`src/components/seo/SEO.tsx`)
- Landing page SEO overrides (`src/pages/landing.tsx`)
- Social preview image asset (`public/og-image.jpg`)

**Key Features**
- Updated homepage `<title>` and description to match the Brisbane/RSA positioning.
- Aligned OpenGraph + Twitter card tags to the requested copy and canonical URL (`https://hospogo.com/`).
- Standardized OG/Twitter image URL to `https://hospogo.com/og-image.jpg`.
- Removed the “double HospoGo” title issue on the landing page by using shared defaults and only overriding the social share title.

**Integration Points**
- Browser metadata + social previews: `<meta property="og:*">`, `twitter:*` tags in `index.html`
- React Helmet: `SEO` component defaults/overrides
- Static asset served from `/og-image.jpg`

**File Paths**
- `index.html`
- `src/components/seo/SEO.tsx`
- `src/pages/landing.tsx`
- `public/og-image.jpg`
- `vercel.json`

**Next Priority Task**
- Verify social previews render correctly on `hospogo.com` (Facebook/Twitter/X/LinkedIn caches) using `https://hospogo.com/og-image.jpg`.

**Code Organization & Quality**
- Kept changes scoped to metadata + SEO defaults; avoided touching unrelated UI/business logic.

---

#### 2026-01-10: Landing CTA Copy Fix (Hospitality Pivot - “Find Staff”)

**Core Components**
- Landing page hero CTA (`src/pages/landing.tsx`)

**Key Features**
- Updated the primary landing CTA from “Find a Barber” to **“Find Staff”** to match HospoGo’s hospitality staffing positioning.
- Updated the test id from `button-find-barber` → `button-find-staff` (no E2E references found in repo).

**Integration Points**
- Route: `/` (Landing)
- Signup entry: `/signup?role=hub` (business/venue onboarding)

**File Paths**
- `src/pages/landing.tsx`

**Next Priority Task**
- Sweep remaining barber/salon strings in landing/supporting marketing copy (e.g. hero subheading) to hospitality language.

**Code Organization & Quality**
- Single-string UI change; no behavioral impact.

---

#### 2026-01-10: Landing “For Staff” Card Copy (Hospitality Pivot)

**Core Components**
- Landing page audience cards (`src/pages/landing.tsx`)

**Key Features**
- Updated the landing audience card heading from “For Barbers” to **“For Staff”**.
- Updated the associated CTA button copy from “Get Started as Barber” to **“Get Started as Staff”**.

**Integration Points**
- Route: `/` (Landing)
- Signup entry: `/signup?role=professional` (staff onboarding)

**File Paths**
- `src/pages/landing.tsx`

**Next Priority Task**
- Continue the landing content sweep: replace remaining “shop owner” / “shops” terminology where user-facing on the landing page (copy-only), keeping routes/roles unchanged.

**Code Organization & Quality**
- Copy-only edits; no component logic changes.

---

#### 2026-01-10: Asset Cleanup (Remove HospoGo-Era Hero Asset)

**Core Components**
- Public static assets (`public/`)
- PWA precache include list (`vite.config.ts`)
- Social preview defaults (`index.html`, `src/components/seo/SEO.tsx`)

**Key Features**
- **Removed legacy (non-HospoGo) asset**: Deleted `public/herobarber (2).webp` (barber-era imagery) to reduce brand confusion.
- **PWA precache cleaned**: Removed `herobarber (2).*` from `VitePWA.includeAssets` and removed the Workbox ignore for the old legacy PNG.
- **Social previews fixed**: Ensured OpenGraph/Twitter images point to `https://hospogo.com/og-image.jpg` and set `SEO` default image to `/og-image.jpg` (avoids missing `/hospogo-og.png`).
- **Meta lint hygiene**: Added `apple-touch-icon`, removed `maximum-scale/user-scalable` from viewport meta, and replaced the splash fallback inline styles with a CSS class.

**Integration Points**
- Build: `npm run build`
- Lint (changed files): `npx eslint vite.config.ts src/components/seo/SEO.tsx --max-warnings 0`

**File Paths**
- `public/herobarber (2).webp` (deleted)
- `vite.config.ts`
- `index.html`
- `src/components/seo/SEO.tsx`

**Next Priority Task**
- Remove/rename remaining legacy “HospoGo” references in docs/scripts that are no longer relevant to HospoGo (copy-only cleanup; no behavior changes).

**Code Organization & Quality**
- Kept the cleanup strictly scoped to static assets + SEO defaults (no app logic touched).

---

#### 2026-01-10: Pricing Tier Copy (Venue Starter / Venue Unlimited)

**Core Components**
- Landing pricing component (`src/components/landing/Pricing.tsx`)

**Key Features**
- Updated pricing tier names from “Salon Starter” / “Salon Unlimited” to **“Venue Starter”** / **“Venue Unlimited”** to match HospoGo hospitality terminology.
- Kept pricing, fees, features, and CTAs unchanged (copy-only rename).

**Integration Points**
- Landing pricing section (`/` → `#pricing`)

**File Paths**
- `src/components/landing/Pricing.tsx`

**Next Priority Task**
- Continue the landing copy sweep for remaining “salon/shop/barber” terminology in marketing components (copy-only), keeping routes/roles unchanged.

**Code Organization & Quality**
- Minimal string-only change; no new components/patterns introduced.

---

#### 2026-01-10: Landing Final CTA Copy (Ready to Get Started - Venue/Staff)

**Core Components**
- Landing final CTA section (`src/pages/landing.tsx`)

**Key Features**
- Updated the “Ready to Get Started?” card copy to hospitality-first wording:
  - “barbers and shops” → “venues and staff”
  - “Shop Owner Sign Up” → “Venue Sign Up”
  - “Barber Sign Up” → “Staff Sign Up”
- Updated test ids accordingly (`button-join-shop` → `button-join-venue`, `button-join-barber` → `button-join-staff`) after confirming no repo references.

**Integration Points**
- Route: `/` (Landing)
- Signup entry: `/signup?role=hub` and `/signup?role=professional`

**File Paths**
- `src/pages/landing.tsx`

**Next Priority Task**
- Continue the landing sweep: update remaining “shop owner” copy in the earlier “For Venues” card CTA (copy-only) if you want all employer-facing language to standardize on “venue”.

**Code Organization & Quality**
- Copy-only edits; no behavior/routing changes.

---

#### 2026-01-09: HospoGo Pivot (Brand, RSA Compliance Gate, User Schema Extensions)

**Core Components**
- API user schema (`api/_src/db/schema/users.ts`)
- Profile upload middleware (`api/_src/middleware/upload.ts`)
- User profile routes (`api/_src/routes/users.ts`)
- Applications route enforcement (`api/_src/routes/applications.ts`)
- Settings compliance UI (`src/pages/settings.tsx`)
- Shift apply UI guard (`src/pages/shift-details.tsx`)
- Brand/SEO/PWA metadata (`src/components/seo/SEO.tsx`, `index.html`, `public/manifest.json`, `public/robots.txt`, `public/sitemap.xml`)
- Icon placeholder swap (`src/components/dashboard/dashboard-stats.tsx`, auth/role pages)
- API test DB setup (`api/_src/tests/globalSetup.ts`)

**Key Features**
- **HospoGo branding foundation**: Updated core SEO defaults, site metadata, and PWA manifest/robots/sitemap to the new brand and domain (`hospogo.com`).
- **Logo/icon placeholder updates**: Replaced scissors-style branding icons with `FastForward` to match the “Go” brand direction.
- **Color system update**: Updated base theme tokens to align with Deep Charcoal + Lime Green + White (primary/secondary/accent).
- **Compliance Check (RSA)**:
  - Added DB fields for RSA metadata + certificate URL and hospitality role/rate preferences.
  - Added backend enforcement: users cannot apply without an uploaded RSA certificate (`code: RSA_REQUIRED`).
  - Added frontend guardrail: Shift Details blocks apply and routes users to Settings when RSA is missing/expired.
  - Added Settings UX for uploading RSA certificate (PDF/image) via `PUT /api/me` multipart upload and saving compliance details.
- **Testing infra hardening**: Updated API test global setup to use `drizzle-kit push --force` for schema sync (SQL migrations are not committed in this repo). Note: API tests still require a reachable test Postgres.

**Integration Points**
- API endpoints:
  - `GET /api/me` (returns RSA/compliance fields)
  - `PUT /api/me` (accepts RSA fields; accepts `rsaCertificate` file upload)
  - `POST /api/applications` (now blocks without RSA certificate)
- Storage: Firebase Admin Storage upload in `/api/me` for `rsaCertificate`

**File Paths**
- `api/_src/db/schema/users.ts`
- `api/_src/middleware/upload.ts`
- `api/_src/routes/users.ts`
- `api/_src/routes/applications.ts`
- `api/_src/tests/globalSetup.ts`
- `src/contexts/AuthContext.tsx`
- `src/pages/settings.tsx`
- `src/pages/shift-details.tsx`
- `src/components/seo/SEO.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/dashboard/dashboard-stats.tsx`
- `src/pages/login.tsx`
- `src/pages/signup.tsx`
- `src/pages/home.tsx`
- `src/pages/role-selection.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/Pricing.tsx`
- `src/index.css`
- `src/lib/queryClient.ts`
- `index.html`
- `public/manifest.json`
- `public/robots.txt`
- `public/sitemap.xml`

**Next Priority Task**
- Finish the HospoGo terminology sweep (barber→staff, shop→venue, haircut→service, chair→shift) in **user-facing copy only**, then update remaining SEO/docs references and remove remaining scissors/comb iconography.

**Code Organization & Quality**
- Reused existing upload patterns (`PUT /api/me`) for compliance documents instead of introducing a separate upload service.
- Enforced RSA compliance server-side to prevent UI bypass.

---

#### 2025-12-25: Harden Google Auth When Database Is Unavailable (DB Quota Exceeded → 503)

**Core Components**
- API registration route (`/api/register`) and user lookup path (`/api/me` via auth middleware)
- DB outage/quota detection utility
- Google auth UI error surfacing (toast messaging)
- Auth flow tests

**Key Features**
- **Correct status code**: Database “compute quota exceeded” failures now return **503 Service Unavailable** (instead of generic 500/401).
- **Stable error code**: Added a consistent API error code `DB_QUOTA_EXCEEDED` for the frontend to key off.
- **No more misleading auth failures**: Prevents the auth middleware from misclassifying DB outages as “invalid token”.
- **Clearer UX**: Google sign-in now shows a specific toast when Firebase auth succeeds but DB user creation fails due to DB unavailability.

**Integration Points**
- API endpoints:
  - `POST /api/register`
  - `GET /api/me` (via `authenticateUser`)
- Frontend: Google sign-in flow (`GoogleAuthButton` → `/api/register`)
- Tests: `cd api && npm test`

**File Paths**
- `api/_src/utils/dbErrors.ts`
- `api/_src/utils/dbErrors.js`
- `api/_src/routes/users.ts`
- `api/_src/routes/users.js`
- `api/_src/middleware/auth.ts`
- `api/_src/middleware/auth.js`
- `src/components/auth/google-auth-button.tsx`
- `api/_src/tests/auth-flow.test.ts`

**Next Priority Task**
- Restore/upgrade the Postgres provider compute quota so `/api/register` can create users again (this will fully unblock Google auth end-to-end).

**Code Organization & Quality**
- Centralized DB outage detection behind a small utility and reused it across both the registration route and auth middleware to keep behavior consistent.

---

#### 2025-12-25: Local Dev Database Bootstrap (Docker Postgres + Non-Interactive Schema Push)

**Core Components**
- Local dev database container definition (Docker Compose)
- Local dev DB initialization (pgcrypto extension for UUIDs)
- One-command local dev bootstrap for Windows (PowerShell)

**Key Features**
- **Local Postgres for dev**: Added a `postgres-dev` container on port `5434` (`snipshift_dev`) for local development.
- **UUID support**: Ensures `pgcrypto` is enabled so UUID defaults (`gen_random_uuid()`) work.
- **Non-interactive schema sync**: Uses `drizzle-kit push --force` to avoid prompts during automated setup.
- **Clean restart**: Bootstrap script stops dev servers on ports `3000` and `5000`, then restarts them against the local DB.

**Integration Points**
- Docker: `cd api && npm run dev:db:up`
- DB schema sync: `cd api && npm run db:push:force`
- Dev bootstrap: `powershell -ExecutionPolicy Bypass -File scripts/start-dev-localdb.ps1`

**File Paths**
- `api/docker-compose.dev.yml`
- `api/docker/dev-init.sql`
- `api/package.json`
- `scripts/start-dev-localdb.ps1`

**Next Priority Task**
- If production is still impacted, restore/upgrade the hosted Postgres provider compute quota so deployed Google auth can create/read users.

**Code Organization & Quality**
- Reused existing Docker usage patterns already present for test DB; kept changes additive and dev-scoped (no `.env` overwrites).

---

#### 2025-12-16: Final UX and SEO Cleanup (Date Guards, Footer Links, Contact Form, Verification UX, Landing H1)

**Core Components**
- Job posting date inputs (Hub dashboard + multi-step job form + job posting modal)
- Footer navigation (`Footer`)
- Contact page (`ContactPage`)
- Professional profile verification UX (`ProfessionalDigitalResume`)
- Landing page SEO heading (`LandingPage`)

**Key Features**
- **Block past dates**: Prevented selecting/publishing job dates in the past (UI `min` + guardrails for submit/progression).
- **Footer link repairs**: Fixed “Pricing” to jump correctly to the landing pricing section and updated the LinkedIn URL to a valid company link.
- **Contact form UX**: Replaced `mailto:` behavior with an in-app submit handler that shows a responsive “Message sent” toast and clears the form.
- **Verification logic corrected**: “Verify Identity” and “Verify License” no longer instantly toggle to verified; verification now only flips to `true` after selecting an upload file.
- **SEO H1 restored**: Added a visually hidden H1 for the landing page and demoted the hero heading to H2 to preserve a single-page H1.

**Integration Points**
- UI routes: `/` (Landing), `/contact` (Contact), `/hub-dashboard` (job posting), Hub job creation flows
- Client toasts: `useToast`

**File Paths**
- `src/pages/hub-dashboard.tsx`
- `src/components/hub/multi-step-job-form.tsx`
- `src/components/content-creation/job-posting-modal.tsx`
- `src/components/layout/Footer.tsx`
- `src/pages/company/contact.tsx`
- `src/components/profile/professional-digital-resume.tsx`
- `src/pages/landing.tsx`

**Next Priority Task**
- Run a quick pre-launch UX smoke pass on job posting (date selection), profile verification uploads, and the contact form.

**Code Organization & Quality**
- Kept changes localized to the affected UX surfaces and reused existing date formatting/toast utilities (no new patterns introduced).

---

#### 2025-12-16: Fix Critical API Date Parsing Crash (`shift.startTime.toISOString`)

**Core Components**
- API date utility (`api/_src/lib/date.ts`)
- Shifts routes (date shaping + offers + invitations + details) (`api/_src/routes/shifts.ts`)
- Payments routes (earnings history shaping) (`api/_src/routes/payments.ts`)
- Cursor ignore config (allow tracking files to be maintained) (`.cursorignore`)

**Key Features**
- **Crash prevention**: Removed unsafe calls like `shift.startTime.toISOString()` that crash when DB timestamps arrive as **strings**.
- **Centralized safety**: Introduced `toISOStringSafe()` and reused it across shift/job API response shaping.
- **Earnings unblocked**: Hardened the payments history mapping so the Earnings UI can render even when `startTime` isn’t a `Date`.
- **Safer shift surfaces**: Covered shift details, offers, pending invitations, and pending review payloads (common high-traffic endpoints).

**Integration Points**
- API endpoints:
  - `GET /api/shifts/:id`
  - `GET /api/shifts/offers/me`
  - `GET /api/shifts/invitations/pending`
  - `GET /api/shifts/pending-review`
  - `GET /api/payments/history/:userId`
- Tests: `cd api && npm test`
- Dev: `npm run dev:all` (frontend at `http://localhost:3000/`)

**File Paths**
- `api/_src/lib/date.ts`
- `api/_src/routes/shifts.ts`
- `api/_src/routes/payments.ts`
- `.cursorignore`

**Next Priority Task**
- Fix the “Job Not Found” 404 by verifying the Job Card link uses the correct id and that `GET /api/jobs/:id` matches the same identifier.

**Code Organization & Quality**
- Avoided copy/paste date guards by centralizing date normalization in a shared API utility and keeping changes tightly scoped to the failing routes.

---

#### 2025-12-16: Fix Job/Shift 404 + Status Update Mismatch (Hub Dashboard + Shift Feeds)

**Core Components**
- Hub dashboard mixed listings actions (`src/pages/hub-dashboard.tsx`)
- Shift marketplace quick-apply navigation (`src/pages/job-feed.tsx`, `src/pages/travel.tsx`)

**Key Features**
- **Job/Shift routing fixed**: Hub dashboard now routes listing actions by `_type`:
  - `shift` → `/shifts/:id` and shift status update
  - `job` → `/jobs/:id` and job status update
- **404 eliminated**: Clicking a listing title no longer sends shift ids to `/jobs/:id` (which returned “Job not found”).
- **Status updates corrected**: “Open → Filled/Completed” now targets the correct API based on listing type.
- **Shift feeds fixed**: “Quick Apply” on the shift-based Job Feed and Travel Mode now routes to `/shifts/:id` (previously `/jobs/:id/apply`).

**Integration Points**
- UI routes: `/hub-dashboard`, `/job-feed`, `/travel`, `/shifts/:id`, `/jobs/:id`
- API endpoints:
  - `PATCH /api/shifts/:id`
  - `PATCH /api/jobs/:id/status`
- Verification:
  - `cd api && npm test`
  - `npm run build`
  - `npm run dev:all`

**File Paths**
- `src/pages/hub-dashboard.tsx`
- `src/pages/job-feed.tsx`
- `src/pages/travel.tsx`

**Next Priority Task**
- Block past-date selection in the job/shift creation calendar UI to prevent invalid postings.

**Code Organization & Quality**
- Kept the fix localized to action routing logic without introducing new patterns; reused existing `_type` detection already present for deletes/ownership.

---

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

---

#### 2026-01-09: Apply New HospoGo Logo Across App Shell (Navbar/Footer/Loading + PWA Icons)

**Core Components**
- App shell branding (favicon + splash screen in `index.html`)
- Global UI branding (Navbar, Footer, Loading screen)
- SEO defaults (OpenGraph/Twitter fallback image)
- PWA manifest branding (VitePWA manifest config)

**Key Features**
- **New logo used across UI**: Updated the primary brand logo usage in Navbar/Footer/Loading states to reference the new public logo asset.
- **Splash screen updated**: Swapped the pre-hydration splash logo to use the new brand logo and corrected the fallback label to “HospoGo”.
- **Cropped composite into real assets**: Added a small crop pipeline to split `hospogologo.png` (which contains full logo + icon + wordmark) into separate files in `public/`.
- **SEO/OG aligned to banner**: Set the default SEO image and HTML OG/Twitter image to `public/og-image.jpg` (1200x630) instead of using the full logo.
- **PWA icons use icon crop**: Generated square icon assets (including 192x192 and 512x512) from the cropped icon so installs/home-screen icons render correctly.

**Integration Points**
- Frontend build: `npm run build` (verifies Vite + VitePWA generation succeeds with the updated branding assets)
- Public assets consumed by:
  - Favicon: `index.html` (`/brand-icon.png`)
  - PWA: `public/manifest.json` and VitePWA manifest (`/brand-logo-192.png`, `/brand-logo-512.png`)
  - Social previews: `public/og-image.jpg`

**File Paths**
- `hospogologo.png` (source logo added to repo root)
- `scripts/crop-hospogo-logo.mjs` (cropping + export pipeline)
- `public/brand-logo.png` (cropped full logo)
- `public/brand-wordmark.png` (cropped wordmark)
- `public/brand-icon.png` (cropped icon)
- `public/brand-logo-192.png` (icon 192x192)
- `public/brand-logo-512.png` (icon 512x512)
- `public/og-image.jpg` (OG banner 1200x630)
- `public/logo.png` (kept in sync for legacy references)
- `public/logo-white.png` (kept in sync for legacy references)
- `index.html`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/ui/loading-screen.tsx`
- `src/components/seo/SEO.tsx`
- `vite.config.ts`

**Next Priority Task**
- Replace `public/logo-white.png` with a true white-on-transparent variant (current pipeline exports the icon/logo against a dark background).

**Code Organization & Quality**
- Standardized brand logo usage to a single public path (`/brand-logo.png`) to avoid duplicating imported image modules across components.

---

#### 2026-01-09: Use HospoGo Wordmark in Navbar/Footer

**Core Components**
- Global navigation branding (`Navbar`, `Footer`)

**Key Features**
- **Wordmark in primary UI**: Switched the header/footer brand mark to the cropped wordmark (`/brand-wordmark.png`) for a cleaner, more compact nav presentation.

**Integration Points**
- Frontend build: `npm run build`

**File Paths**
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`

**Next Priority Task**
- If you want the splash/loading visuals to match the wordmark too, swap the splash + loading screen to `/brand-wordmark.png` (currently they use the full logo).

---

#### 2026-01-10: Finalize HospoGo Domain Pivot (Vite + Vercel)

**Core Components**
- Environment config (`.env`, `.cursorignore`)
- Vercel SPA routing config (`vercel.json`)
- Transactional email templates + sender defaults (`api/_src/services/email.service.ts`, `api/_src/services/email-templates.ts`, `api/_src/emails/*`)
- Ops/docs references updated to the new canonical domain

**Key Features**
- **Domain pivot finalized**: Standardized the canonical public URLs to `https://hospogo.com` and `https://hospogo.com/api` for Vite runtime config.
- **New root env added (non-secret)**: Added `VITE_APP_URL`, `VITE_API_URL`, and `VITE_APP_NAME` for local/dev parity with Vercel env configuration.
- **Email links/logo updated**: Updated transactional emails to use `https://hospogo.com` for logo assets and deep-links.
- **Legacy domain cleanup**: Removed remaining `snipshift.com.au` hardcodes across backend scripts and operational docs.
- **Project close-out note**: This marks the formal end of the HospoGo collaboration and transition under the acquired `hospogo.com` domain.

**Integration Points**
- Vite env: `import.meta.env.VITE_*`
- Vercel: SPA rewrites already handle client-side routing (`/(.*)` → `/index.html`) and API routing (`/api/(.*)` → `/api`)
- Resend: `RESEND_FROM_EMAIL` (fallback sender updated for HospoGo)

**File Paths**
- `.cursorignore`
- `.env`
- `vercel.json`
- `api/_src/services/email.service.ts`
- `api/_src/services/email-templates.ts`
- `api/_src/emails/WelcomeEmail.tsx`
- `api/_src/emails/NewMessageEmail.tsx`
- `api/_src/emails/JobAlertEmail.tsx`
- `api/_src/emails/ApplicationStatusEmail.tsx`
- `api/scripts/sync-production-db.ts`
- `api/scripts/migrate-production.ts`
- `VERCEL_DEPLOYMENT_REMINDER.md`
- `FIX_PRODUCTION_DB.md`
- `FIREBASE_STORAGE_CORS_FIX.md`

**Next Priority Task**
- Update OAuth provider redirect URIs (Google/Facebook/Apple) to `https://hospogo.com/api/auth/callback`.

**Code Organization & Quality**
- Kept changes scoped to configuration + domain references (no new patterns introduced).

---

#### 2026-01-10: Swap Navbar + Splash/Loading to Neon HospoGo Wordmark

**Core Components**
- App shell splash screen branding (`index.html`)
- Global navigation branding (`src/components/layout/Navbar.tsx`)
- Global footer branding (`src/components/layout/Footer.tsx`)
- In-app loading state branding (`src/components/ui/loading-screen.tsx`)
- Public brand asset (`public/brand-wordmark.png`)

**Key Features**
- **Neon wordmark applied**: Replaced the public wordmark asset with the new neon HospoGo logo so the primary brand mark is consistent across the app.
- **Navbar color correctness**: Removed the prior invert/brightness filters on the Navbar logo so the neon colors render accurately.
- **Footer color correctness**: Removed the prior invert/brightness filters on the Footer logo so it matches the Navbar.
- **Splash/loading alignment**: Updated the pre-hydration splash logo and in-app loading screen to use the wordmark asset for consistent first-paint branding.

**Integration Points**
- Static asset served from `public/` at `/brand-wordmark.png`
- App shell splash rendered before React hydration (`index.html`)

**File Paths**
- `public/brand-wordmark.png`
- `index.html`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/ui/loading-screen.tsx`

**Next Priority Task**
- Review the wordmark sizing on small mobile widths and adjust only if needed (keep it crisp; avoid heavy filters).

**Code Organization & Quality**
- Kept changes localized to asset + direct consumers; no new components or patterns introduced.

---

#### 2026-01-10: Stripe Keys Rotation Support (Env Wiring + Local CLI + Docs Consistency)

**Core Components**
- Backend Stripe initialization (`api/_src/lib/stripe.ts`)
- Deployment documentation (env var naming consistency)
- Local dev tooling (secure key input + `.env` updates)
- Vercel env template (safe placeholders)

**Key Features**
- **Hardened backend env loading for Stripe**: Stripe SDK now attempts `api/.env` first and cleanly falls back to root `.env` when needed (matches the API entrypoint behavior).
- **Docs corrected to the real frontend env var**: Removed lingering references to `STRIPE_PUBLISHABLE_KEY` and standardized on `VITE_STRIPE_PUBLISHABLE_KEY`.
- **Safe local keys updater**: Added a PowerShell CLI that prompts for Stripe keys (secret key as `SecureString`) and updates `.env` + `api/.env` without printing secrets.
- **Vercel env example added**: Introduced `docs/env.vercel.example` with placeholders for all required vars (including Stripe).

**Integration Points**
- Env vars:
  - Frontend: `VITE_STRIPE_PUBLISHABLE_KEY`
  - Backend: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Preflight: `npm run preflight:local`
- Backend tests: `cd api && npm run test:integration`

**File Paths**
- `api/_src/lib/stripe.ts`
- `PRODUCTION_DEPLOYMENT.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `docs/env.vercel.example`
- `scripts/set-stripe-keys.ps1`

**Next Priority Task**
- Rotate/update Stripe keys in hosting providers (Vercel/Render/etc.) and ensure webhook signing secret is also updated where applicable.

**Code Organization & Quality**
- No secrets committed; tooling avoids echoing secret values and keeps changes localized to Stripe/env docs + helper script.

---

#### 2026-01-10: Hospo-Specific Legal Content (Terms + Privacy Updates)

**Core Components**
- Terms of Service content updates (roles + cancellation/penalties) (`src/pages/legal/terms.tsx`)
- Privacy Policy updates (Stripe + Firebase + RSA/ID docs security) (`src/pages/legal/privacy.tsx`)
- Compatibility wrapper pages for requested file paths (`src/pages/TermsOfService.tsx`, `src/pages/PrivacyPolicy.tsx`)

**Key Features**
- **Venue vs Staff roles clarified**: Added explicit definitions for “Venue”, “Staff”, “Shift”, and “Emergency Fill”.
- **24-hour cancellation window described**: Documented the default 24h cancellation window (and that a Shift may override the window when shown in Shift details).
- **Kill Fee defined (Venue-side penalty)**: Documented a Venue late-cancellation Kill Fee that may apply when displayed on a Shift.
- **Reliability Strike defined (Staff-side penalty)**: Documented reliability strikes for staff late cancellation and noted potential suspension at 3 strikes.
- **Privacy disclosures updated**: Added explicit mention of Firebase Authentication (login/session) and secure storage of RSA/ID documents for compliance, alongside existing Stripe disclosures.

**Integration Points**
- Routes: `/terms` and `/privacy` are registered in `src/App.tsx` and served by the legal pages under `src/pages/legal/`.
- Payments: Stripe Connect is referenced as the payment processor in both Terms and Privacy.
- Auth/Docs: Firebase Authentication + Firebase Storage are referenced for authentication and secure document uploads.

**File Paths**
- `src/pages/legal/terms.tsx`
- `src/pages/legal/privacy.tsx`
- `src/pages/TermsOfService.tsx`
- `src/pages/PrivacyPolicy.tsx`

**Next Priority Task**
- Have counsel review and finalize Terms/Privacy for the target jurisdictions (including kill-fee enforceability and retention obligations).

**Code Organization & Quality**
- Kept routing stable by updating the existing `src/pages/legal/*` route targets and adding lightweight wrapper exports to satisfy alternate file path expectations.

---

#### 2026-01-10: Navbar Logo Banner Crop (Keep Existing Neon Mark) + Enlarge

**Core Components**
- Navbar logo crop pipeline (`scripts/crop-hospogo-logo.mjs`)
- Global navigation branding (`src/components/layout/Navbar.tsx`)
- Public navbar banner asset (`public/hospogo-navbar-banner.png`)

**Key Features**
- **Banner-shaped navbar logo**: Generated `public/hospogo-navbar-banner.png` by cropping the existing `hospogoappicon.png` around the “HospoGo” wordmark (keeps the same neon mark) and keying out the dark background to blend with the navbar.
- **Larger navbar logo**: Updated the navbar to render the banner logo larger and kept the existing green drop-shadow glow effect.

**Integration Points**
- Asset generation: `node scripts/crop-hospogo-logo.mjs`
- Dev verification: `npm run dev -- --port 3002`

**File Paths**
- `scripts/crop-hospogo-logo.mjs`
- `public/hospogo-navbar-banner.png`
- `src/components/layout/Navbar.tsx`

**Next Priority Task**
- Tune the crop box/background key thresholds if any edge artifacts show on certain displays, and verify the logo still fits cleanly on small mobile widths.

**Code Organization & Quality**
- Reused the existing logo crop script (no new tooling/patterns introduced); kept changes localized to branding assets + navbar.

---

#### 2026-01-12: Auth Redirect Hardening (Keep `/` Public on Refresh) + Remove Legacy OAuth Code-Flow

**Core Components**
- Auth redirect state machine (`src/contexts/AuthContext.tsx`)
- Firebase client configuration (`src/lib/firebase.ts`)
- OAuth redirect landing route (`src/pages/oauth-callback.tsx`, `src/App.tsx`)
- API profile upload Firebase app selection (`api/_src/routes/users.ts`)
- Legacy auth surfaces removal (unused) (`src/lib/google-oauth-direct.ts`, `src/components/auth/google-oauth-fallback.tsx`, `src/components/auth/simple-google-auth.tsx`, `src/components/auth/google-demo.tsx`)

**Key Features**
- **Landing refresh stability**: Prevented hard-refreshing `/` from being redirected to `/login` when a Firebase session exists but the backend profile handshake (`/api/me`) fails (e.g. API down / DB paused).
- **Redirect scope tightening**: Limited app-level auto-redirect behavior to auth/callback pages only (login/signup/dashboard/oauth handler), avoiding disruptive redirects during normal browsing.
- **Safer unauth target**: Updated null-user redirect target to `/login` (instead of `/onboarding`, which is auth-protected and can cause confusing bounce loops).
- **Env alias support**: Added the documented `VITE_AUTH_DOMAIN` alias for Firebase `authDomain` (fallback when `VITE_FIREBASE_AUTH_DOMAIN` is not set).
- **Legacy OAuth removal**: Removed unused, insecure/manual Google OAuth “code flow” helpers and demo components to eliminate configuration confusion and ensure the Firebase redirect result flow remains canonical.
- **Brand-safe Firebase Admin appName**: Removed a hardcoded legacy Firebase Admin app name (`snipshift-worker-v2`) used for Storage access and aligned it with `FIREBASE_ADMIN_APP_NAME` / `hospogo-worker-v2` to prevent “Firebase app not initialized” errors during profile uploads.

**Integration Points**
- Frontend: Firebase Auth (popup/redirect) + backend handshake (`POST /api/register`, `GET /api/me`)
- Routes: `/oauth/callback`, `/__/auth/handler`

**File Paths**
- `src/contexts/AuthContext.tsx`
- `src/lib/firebase.ts`
- `src/pages/oauth-callback.tsx`
- `src/App.tsx`
- `api/_src/routes/users.ts`
- `src/lib/google-oauth-direct.ts` (deleted)
- `src/components/auth/google-oauth-fallback.tsx` (deleted)
- `src/components/auth/simple-google-auth.tsx` (deleted)
- `src/components/auth/google-demo.tsx` (deleted)

**Next Priority Task**
- Verify local Google sign-in end-to-end with the API running: confirm `/api/register` (idempotent) and `/api/me` succeed and that role-based redirects land on `/venue/dashboard` or `/worker/dashboard` without intermediate `/login` bounces.

**Code Organization & Quality**
- Kept changes scoped to auth routing/handshake logic; removed unused legacy OAuth surfaces rather than introducing new patterns.

---

#### 2026-01-12: Debug Stuck Auth Popup (Error Logging + Clean-Break Reset Guard)

**Core Components**
- Google sign-in UI error handling (`src/components/auth/google-auth-button.tsx`)
- Local-dev auth wrapper + clean-break reset (`src/lib/auth.ts`)
- Local env audit (`.env`) (no changes applied)

**Key Features**
- **Auth error catcher**: Added explicit console logging of `error.code` and `error.message` from Google popup sign-in failures to speed up diagnosis of “stuck popup” reports.
- **Targeted popup failures**: Explicitly handles `auth/popup-blocked` and `auth/unauthorized-domain` (with clear user messaging and actionable console guidance).
- **Clean-break session guard**: If a prior auth attempt fails with a “400-style” error, the next attempt forces a Firebase sign-out and clears known redirect artifacts (`firebase:previous_external_idp_params`) before retrying.
- **Env verification**: Confirmed `VITE_REDIRECT_URI` format is correct for local dev (no trailing slash) without modifying `.env`.

**Integration Points**
- Firebase Auth: `signInWithPopup`, `signOut`
- Backend handshake: `POST /api/register` (idempotent)

**File Paths**
- `src/components/auth/google-auth-button.tsx`
- `src/lib/auth.ts`
- `.env` (audited only)

**Next Priority Task**
- Reproduce the “stuck popup” on localhost and capture the logged `{ code, message }` pair; then validate Firebase Console Authorized Domains includes `localhost` and that the Google OAuth client’s JS origins match the running origin.

**Code Organization & Quality**
- Kept logic isolated to existing auth UI + auth utility wrapper; reset behavior is best-effort and does not block sign-in attempts if cleanup fails.

---

#### 2026-01-15: URL-Param Auth Bridge (Cookie Handoff + Popup Redirect)

**Core Components**
- Auth bridge page (`src/pages/auth/Bridge.tsx`)
- Auth popup flow (`src/lib/auth.ts`)
- Auth observer + redirect logic (`src/contexts/AuthContext.tsx`)
- Signup UI fallback (`src/pages/signup.tsx`)
- Route wiring (`src/App.tsx`)

**Key Features**
- Added a dedicated `/auth/bridge` page that reads `uid` from URL params, writes a short-lived same-origin cookie, and closes itself.
- Updated Google popup sign-in to open a bridge popup to `/auth/bridge?uid=...` on success to bypass storage partitioning.
- Added a cookie observer in AuthContext that hard-redirects to `/onboarding` when the bridge cookie is detected.
- Allowed `/auth/bridge` to render even while global auth loading is active (prevents the loader from blocking the bridge page).
- Added a "Manual Dashboard" backup link on the Signup page if loading exceeds 3 seconds.

**Integration Points**
- Firebase Auth popup: `signInWithPopup`
- Route: `/auth/bridge`
- Cookie: `hospogo_auth_bridge`

**File Paths**
- `src/pages/auth/Bridge.tsx`
- `src/lib/auth.ts`
- `src/contexts/AuthContext.tsx`
- `src/pages/signup.tsx`
- `src/App.tsx`

**Next Priority Task**
- Verify production Google popup flow: popup → `/auth/bridge` cookie → main window hard redirect to `/onboarding`.

**Code Organization & Quality**
- Kept bridge logic localized to auth surfaces with a short-lived cookie and minimal UI.

---

#### 2026-01-16: Venue Dashboard Migration (Hub → Venue URL)

**Core Components**
- Venue dashboard page (`src/pages/venue-dashboard.tsx`)
- App routing (`src/App.tsx`)
- Auth redirect logic (`src/contexts/AuthContext.tsx`)
- Venue onboarding flow redirects (`src/pages/onboarding/hub.tsx`)
- Role selection routing (`src/pages/home.tsx`)

**Key Features**
- Migrated the full Hub dashboard content into the new Venue dashboard and renamed the component to `VenueDashboard`.
- Routed `/venue/dashboard` exclusively to the new `VenueDashboard` implementation.
- Removed the legacy Hub dashboard file and updated legacy `/hub-dashboard` redirects to point at `/venue/dashboard`.
- Ensured business-role redirects and onboarding flows land on `/venue/dashboard`.

**Integration Points**
- Router: `/venue/dashboard`
- Auth role home resolution (`deriveRoleHome`)
- Venue onboarding completion flow

**File Paths**
- `src/pages/venue-dashboard.tsx`
- `src/pages/hub-dashboard.tsx` (deleted)
- `src/App.tsx`
- `src/contexts/AuthContext.tsx`
- `src/pages/onboarding/hub.tsx`
- `src/pages/home.tsx`

**Next Priority Task**
- Validate `/venue/dashboard` renders Calendar, Jobs, Applications tabs and the Stripe setup banner in a real session.

**Code Organization & Quality**
- Reused the existing dashboard implementation and consolidated venue routing to a single canonical path.

---

#### 2026-01-16: Shift Instant Messaging Channel Implementation

**Core Components**
- Shift messages database schema (`api/_src/db/schema/shifts.ts`)
- Shift messages repository (`api/_src/repositories/shift-messages.repository.ts`)
- Shift messages API endpoints (`api/_src/routes/shifts.ts`)
- Shift messaging service (`src/lib/shift-messaging.ts`)
- Shift chat component (`src/components/shifts/shift-chat.tsx`)
- Dashboard unread badge integration (`src/pages/venue-dashboard.tsx`, `src/pages/professional-dashboard.tsx`)

**Key Features**
- Created `shift_messages` table for ephemeral chat channels between venue owners and assigned workers
- Implemented POST `/api/shifts/:id/messages` and GET `/api/shifts/:id/messages` endpoints
- Added authorization checks: only assigned worker and venue owner can access shift threads
- Implemented archive/disable logic: channels are disabled 24 hours after shift completion
- Created ShiftChat component using existing ChatBubble UI patterns
- Added unread notification badge to dashboard stats (combines regular messages + shift messages)
- Messages are automatically marked as read when fetching the thread

**Integration Points**
- API endpoints: `/api/shifts/:id/messages` (GET, POST), `/api/shifts/messages/unread-count` (GET)
- Database migration: `0030_add_shift_messages.sql`
- Dashboard stats integration for unread count
- Real-time polling for message updates (2-second interval)

**File Paths**
- `api/_src/db/schema/shifts.ts` (added shiftMessages table)
- `api/_src/db/schema.js` (exported shiftMessages)
- `api/_src/db/migrations/0030_add_shift_messages.sql`
- `api/_src/repositories/shift-messages.repository.ts`
- `api/_src/routes/shifts.ts` (added message endpoints)
- `src/lib/shift-messaging.ts`
- `src/components/shifts/shift-chat.tsx`
- `src/pages/venue-dashboard.tsx` (added unread count query)
- `src/pages/professional-dashboard.tsx` (added unread count query)

**Next Priority Task**
- Write tests for shift messaging functionality (API endpoints, repository, component)
- Integrate ShiftChat component into shift details page or dashboard for easy access

**Code Organization & Quality**
- Followed existing patterns from messaging service and conversation component
- Used proper authorization checks and validation
- Implemented graceful error handling and loading states
- Messages are ephemeral and automatically archived after 24 hours post-completion