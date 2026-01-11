# HospoGo - Brand Pivot Roadmap

## 🎉 v1.0 Launch Status

**Launch Date:** December 2024  
**Status:** ✅ **PRODUCTION READY**  
**Production URL:** https://hospogo.com

---

### Update: 2026-01-11 - Splash Screen Branding Consistency (Match Navbar Banner Logo)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Standardized the loading splash to use the exact same navbar banner logo (`/hospogo-navbar-banner.png`) so the first paint matches the header.
- Removed splash-only CSS filters that were altering the logo’s appearance across dark/light modes.

**Impact:**
- Users see a consistent HospoGo brand mark from first paint (splash) through the app shell (navbar).

---

### Update: 2026-01-11 - Final Project Hard-Lock & Separation Audit (HospoGo)

**Status:** ✅ **COMPLETED**

**Action Taken:**
- Repaired root `.env` encoding (stripped UTF-16/NUL artifacts and rewrote as UTF-8).
- Hard-locked Google auth to the Firebase redirect handler flow (`/__/auth/handler`) by removing unused manual OAuth code-flow helpers.
- Completed a repo-wide legacy brand string scrub across `.ts/.tsx/.json/.md`, updating test fixtures and operational docs to HospoGo naming.
- Standardized local dev/test DB names to `hospogo_dev` / `hospogo_test` and aligned Docker container naming in production compose/docs.
- Created a durable separation audit record: `SEPARATION_COMPLETE.md`.

**Impact:**
- Reduces configuration drift risk and eliminates remaining legacy brand leakage across code, tests, and docs.

---

### Update: 2026-01-11 - Role-Based Redirects (Venue/Worker Clean-Break)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Hardened post-auth routing so users are redirected to the correct clean-break home based on role:
  - Venue-side → `/venue/dashboard`
  - Worker-side → `/worker/dashboard`
  - Not onboarded / missing app user → `/onboarding`
- Ensured Google sign-in reliably triggers the centralized redirect logic with a clear redirect spinner state.

**Impact:**
- Prevents role confusion (e.g., workers landing on venue dashboards) and eliminates “stuck after Google sign-in” redirect edge cases.

### Update: 2026-01-10 - Branded Venue Welcome Email (Stripe Connect Completion Trigger)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Added a HospoGo-branded venue welcome email template (`api/_src/templates/emails/venue-welcome.html`) using Deep Charcoal `#0B0E11`, Neon Green `#BAFF39`, and Electric Purple `#8B5CF6`.
- Wired a one-time trigger off Stripe `account.updated` so the `venue-welcome` email is sent immediately after Stripe Connect onboarding is confirmed complete (first `false → true` transition).
- Standardized default sender metadata to **HospoGo Support** `<info@hospogo.com>` (env override supported).

**Impact:**
- Provides a polished post-onboarding “first touch” and reduces drop-off after Stripe Connect setup by sending immediate next-step guidance.

---

### Update: 2026-01-10 - Refine Global Color Palette (Brand Neon Tokens)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Added explicit brand palette tokens to Tailwind: `brand-neon` (`#BAFF39`), `brand-dark` (`#0B0E11`), `brand-accent` (`#8B5CF6`), `brand-surface` (`#1A1D21`).
- Updated the Landing hero CTAs to use the new `brand-neon` styling (neon fill primary + neon outline secondary).
- Added a reusable `.neon-glow` text utility for consistent neon highlight styling.
- Updated global theme `--primary` / `--ring` and the shared `Button` `accent` variant so app-wide primary actions inherit the new palette consistently.

**Impact:**
- Establishes a consistent, reusable neon-forward HospoGo palette and applies it to the highest-traffic conversion CTAs.

---

### Update: 2026-01-10 - Neon Glow & Pulse Styling (Hero CTA Buttons)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Added Tailwind keyframes/animations for `neon-pulse` (glow spread pulse) and `neon-flicker` (tube-like opacity variance).
- Added reusable global CTA button classes: `.btn-neon-primary` and `.btn-neon-outline`.
- Updated the Landing hero to use the new neon CTA classes and added a consistent dark overlay to increase contrast.

**Impact:**
- Creates a reusable “neon CTA” system and improves hero readability/contrast so the neon buttons visually pop.

---

### Update: 2026-01-10 - Refine Neon Glow to Realistic Hum (Primary CTA)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Added a realistic multi-layer glow shadow (`shadow-neon-realistic`) to Tailwind for consistent neon depth.
- Replaced the hero primary CTA glow “pulse” with a subtle “hum” (brightness dip) while keeping a stable, layered neon halo and a slightly brighter hover state.

**Impact:**
- More realistic neon: a steady tube-like glow with a gentle electrical hum, instead of a noticeable size pulse.

---

### Update: 2026-01-10 - Remove Landing Hero Darkening Overlay

**Status:** ✅ **UPDATED**

**Action Taken:**
- Removed the full-hero dark overlay layer so the background image is not darkened.

**Impact:**
- Restores the original hero image brightness while keeping the neon CTA styling unchanged.

---

### Update: 2026-01-10 - Manual Payout Tracking (Payout Status Enum)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Added a dedicated `payout_status` enum with states **PENDING / RELEASED / DISPUTED** and wired it into the `shifts` model as `payoutStatus` (default **PENDING**).
- Updated the shifts repository to return `payoutStatus` and to safely fall back on legacy DBs missing the new column.

**Impact:**
- Enables a **Manual Payout strategy** by tracking payout lifecycle separately from `payment_status` / Stripe intent state, with safe behavior across partially-migrated environments.

---

### Update: 2026-01-10 - RSA Compliance Browse Lock (Verification Gate)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Added an RSA compliance gate to shift browsing so staff cannot view the shift feed until RSA is **verified** and **not expired**.
- Added a dedicated RSA Locker UI for uploading the certificate (PDF/image) plus capturing RSA number, expiry date, and state of issue.
- Synced canonical RSA fields into the `profiles` table (`rsa_verified`, `rsa_expiry`, `rsa_cert_url`) and returned them in `GET /api/me` as `profile`.
- Added an admin review workflow (Admin Dashboard RSA Review tab) to approve RSA submissions and set `rsa_verified=true`.

**Impact:**
- **Clear compliance enforcement** at the marketplace entry point: staff must verify RSA before browsing shifts.

---

### Update: 2026-01-10 - Staff Onboarding Wizard (RSA + Government ID + Stripe Payout Setup)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Replaced `/onboarding` with a staff-focused 4-step wizard:
  - Personal Details + Profile Photo
  - RSA + Government ID document uploads
  - Role & Experience selection
  - Stripe payout setup (Connect onboarding)
- Added Government ID upload support and persisted verification state on `profiles` (`id_document_url`, `id_verified_status`), setting status to **PENDING** on upload/re-upload.
- Added `/browse-shifts` route alias with a verification gate that redirects to `/onboarding` until required verification conditions are met.
- Added a Navbar “Verification Pending” indicator next to the user name when documents are uploaded but not yet fully audited.

**Impact:**
- Staff onboarding now captures the compliance and payout requirements in a guided flow, reducing drop-off and ensuring verification state is visible throughout the app.

---

### Update: 2026-01-10 - SEO & Metadata Brand Transformation (HospoGo)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Updated the app shell title/description to match the HospoGo positioning (“On-Demand Hospitality Staff” + RSA-verified messaging).
- Updated OpenGraph/Twitter metadata to use canonical `https://hospogo.com/` + the share image path `/og-image.jpg` (1200x630).
- Updated PWA manifest branding (app name + dark theme/background) and added a dedicated `public/favicon.ico`.

**Impact:**
- **Cleaner brand consistency** in browser tabs, installs, and social shares.

---

### Update: 2026-01-10 - Landing Hero Image Updated (HospoGo Hero)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Replaced the old landing hero background image with the new HospoGo hero asset (`/hospogohero.webp` with JPG fallback).
- Cropped the embedded navbar off the top of the source hero image and generated optimized outputs in `public/`.
- Added a tiny render-level top-edge trim so no residual green artifact line shows at the very top of the hero.

**Impact:**
- **Cleaner landing visuals**: the hero background no longer includes a visible navbar baked into the image.

---

### Update: 2026-01-10 - Landing Hero Layout Polish (Reduce Clutter)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Repositioned the landing hero copy/CTAs using a bottom-anchored layout and refined spacing so the background image reads cleaner.
- Added a subtle readability scrim and a lightweight blurred content panel so text remains legible without cluttering the hero photography.

**Impact:**
- **Cleaner conversion surface**: hero content is easier to read and no longer visually clashes with the background branding.

---

### Update: 2026-01-10 - Final Visual Branding Sweep (HospoGo)

**Status:** ✅ **COMPLETE**

**Action Taken:**
- Completed a final pass to remove remaining legacy branding across legal pages, docs/scripts, and API email signatures.
- Aligned E2E/session hydration naming to `hospogo_test_user` for HospoGo-branded test fixtures.

**Impact:**
- **Consistent HospoGo branding** across UI, docs, and transactional messaging surfaces.

---

### Update: 2026-01-10 - Hospo-Specific Legal Content (Terms + Privacy)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Updated Terms of Service to define **Venue** vs **Staff** roles and reflect hospitality shift terminology.
- Documented the default **24-hour cancellation window** behavior and the **Emergency Fill** concept.
- Added detailed penalty definitions:
  - **Kill Fee** (Venue-side penalty for late cancellation when applicable)
  - **Reliability Strike** (Staff-side penalty for late cancellation, with potential suspension on repeated strikes)
- Updated Privacy Policy disclosures to explicitly mention:
  - **Stripe** for payment processing
  - **Firebase** for authentication
  - Secure storage of **RSA/ID documents** for compliance and verification workflows

**Impact:**
- Legal pages now match the hospitality marketplace model and the platform’s implemented cancellation/penalty concepts.

---

### Update: 2026-01-10 - Refund & Dispute Policy Page

**Status:** ✅ **ADDED**

**Action Taken:**
- Added a dedicated Refund & Dispute Policy page at `/refunds` with clear rules for:
  - Venue cancellations (>4 hours)
  - Late venue cancellations (Kill Fee = 1 hour)
  - Staff cancellations (automatic Emergency Fill re-listing)
  - Refunds for staff no-shows and the dispute submission window
- Added a Footer link for “Refund Policy” and ensured support contact details match:
  - Email: `info@hospogo.com`
  - Phone: `+61 478 430 822`

**Impact:**
- Clear, centralized policy reference for venues and staff, improving dispute handling expectations and reducing support ambiguity.

---

### Update: 2026-01-10 - Fix Vercel Build Failure (Missing Refund Policy Page Module)

**Status:** ✅ **FIXED**

**Action Taken:**
- Fixed a production build failure caused by a missing `RefundPolicy` page import.
- Implemented the canonical Refund & Dispute Policy page at `src/pages/legal/refunds.tsx` and added a compatibility wrapper at `src/pages/RefundPolicy.tsx`.

**Impact:**
- Vercel/Linux builds no longer fail with `ENOENT` for the Refund Policy route.

---

### Update: 2026-01-10 - Native Package Identifier Audit (Android/Capacitor)

**Status:** ✅ **VERIFIED (THIS REPO)**

**Action Taken:**
- Searched for Capacitor config files (`capacitor.config.*`) and native Android project folders (`android/`) in this repository.
- Confirmed the legacy Android package id is not present here.

**Impact:**
- The Android package id (`com.hospogo.app`) must be configured in the **native wrapper project** used to build your APK/AAB (Android Studio / Capacitor project), not in this web repo.

---

### Update: 2026-01-10 - Neon Logo Applied (Navbar + Splash/Loading)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Replaced the header/footer wordmark asset with the new neon HospoGo logo.
- Removed the prior invert/brightness filters so the logo renders with correct colors.
- Updated the app splash screen and in-app loading screen to match the wordmark branding.

**Impact:**
- **Consistent first-paint branding**: users see the same neon wordmark from initial load through the app shell.

---

### Update: 2026-01-10 - Hospitality Shift Model & UI (Roles + Uniform/RSA/Pax + Hourly Pricing)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Added hospitality shift fields end-to-end (`role`, `uniformRequirements`, `rsaRequired`, `expectedPax`) and computed `shiftLengthHours` for pricing display.
- Updated shift creation/posting UI to use “Select Shift Role” and show **Hourly Rate × Duration** estimated totals.
- Removed the profile portfolio gallery in favor of Work History/Certifications focus and surfaced compliance badges (RSA/RCG/Covid Safety/Manual Handling).
- Updated theme tokens + primary action button styling to match Electric Lime + Deep Charcoal direction.

**Impact:**
- **Clearer hospitality-first posting flow**: venues can post shifts with the details staff actually need.
- **Consistent pricing UX**: duration is shown in hours and total cost is transparent at creation time.

---

### Update: 2026-01-10 - Hospitality Terminology Pass + Shift Details Display (Venue/Staff)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Updated Shift Details to display hospitality fields (role, uniform requirements, expected pax, duration + estimated total).
- Fixed RSA enforcement to only apply when the shift is flagged `rsaRequired`.
- Replaced barber/shop terminology in shift-related UI and notification copy with venue/staff language.

**Impact:**
- **Less user confusion**: terminology now matches the hospitality staffing model.
- **Correct compliance behavior**: RSA is required only when the shift requires it.

---

### Update: 2026-01-10 - Hospitality Cancellation Logic (Emergency Fill + Late Cancellation Penalties)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Extended the `shifts` model with cancellation-window + emergency-fill fields:
  - `cancellation_window_hours` (default 24)
  - `kill_fee_amount`
  - `staff_cancellation_reason`
  - `is_emergency_fill`
- Implemented `handleStaffCancellation` to compare time-to-start vs cancellation window:
  - Late cancellation → notify venue with **CRITICAL** message, trigger penalty, republish as **Emergency Fill**
  - Early cancellation → republish normally
- Added a pulsing Electric Lime **Emergency** badge on shift cards when `is_emergency_fill` is true.

**Impact:**
- Venues can immediately identify last-minute gaps and prioritize fill workflows.
- The platform now has a single, reusable cancellation decision function for consistent behavior.

---

### Update: 2026-01-10 - Staff Penalty Persistence (Reliability Strikes + Auto Suspension)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Added `profiles.reliability_strikes` to persist reliability penalties per staff member (default 0).
- Implemented an atomic increment (UPSERT) when a penalty is triggered.
- Added enforcement: at **3 strikes**, the staff account is **suspended** (implemented as `users.is_active = false`).
- Notified the staff member in-app with a clear explanation of the strike/suspension.
- Added a `ReliabilityBadge` UI component (green/yellow/red) for profile surfaces.

**Impact:**
- Penalties are now persistent and enforceable, enabling consistent reliability controls across shifts.

---

### Update: 2026-01-10 - Landing CTA Copy (Find Staff)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Updated the main landing hero CTA from “Find a Barber” to **“Find Staff”** to match the HospoGo hospitality pivot.

**Impact:**
- **Immediate brand alignment** on the highest-traffic conversion surface (landing hero).

---

### Update: 2026-01-10 - Landing Audience Card Copy (For Staff)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Updated the landing audience card heading/CTA from “For Barbers” / “Get Started as Barber” to **“For Staff”** / **“Get Started as Staff”**.

**Impact:**
- **Reduced brand mismatch** on the landing page while keeping onboarding routes/roles unchanged.

---

### Update: 2026-01-10 - Pricing Tier Terminology (Venue Starter / Venue Unlimited)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Updated landing pricing tier names from “Salon Starter” / “Salon Unlimited” to **“Venue Starter”** / **“Venue Unlimited”**.

**Impact:**
- **Cleaner hospitality-first positioning** in the pricing section without changing the underlying plans/pricing behavior.

---

### Update: 2026-01-10 - Landing Final CTA Copy (Venues/Staff)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Updated the landing “Ready to Get Started?” CTA section to use **venues/staff** terminology and updated the two signup button labels accordingly.

**Impact:**
- **Consistent hospitality-first messaging** through the bottom-of-page conversion CTA.

---

### Update: 2025-12-25 - Google Auth Resilience When DB Is Paused/Over-Quota

**Status:** ✅ **HARDENED**

**Action Taken:**
- Normalized hosted Postgres “compute time quota exceeded” failures into a clear **503 Service Unavailable** response with a stable `DB_QUOTA_EXCEEDED` code.
- Updated auth middleware to avoid misreporting DB outages as “invalid token” / 401.
- Improved Google sign-in UX to surface a specific error message when Firebase auth succeeds but DB user creation cannot complete.

**Impact:**
- **Less confusion:** Users get a clear “database temporarily unavailable” message instead of a misleading auth failure.
- **Faster diagnosis:** The error code makes it obvious when the fix is external (restore DB compute/quota).

---

### Update: 2025-12-25 - Local Dev DB Bootstrap (Docker Postgres)

**Status:** ✅ **UNBLOCKED (LOCAL DEV)**

**Action Taken:**
- Added a local Postgres dev container + init SQL (pgcrypto) and a one-command PowerShell bootstrap to run the app against `postgres://dev:dev@localhost:5434/hospogo_dev`.

**Impact:**
- **Local development unblocked** even when the hosted DB is paused/over-quota (Google auth can create/read users again locally).

---

### Update: 2025-12-16 - Final UX and SEO Cleanup (Pre-Launch Polish)

**Status:** ✅ **POLISH COMPLETE**

**Action Taken:**
- Blocked past-date selection in shop job/shift creation flows (UI `min` + submit guards).
- Fixed broken Footer links (Pricing anchor + LinkedIn URL).
- Replaced Contact form `mailto:` behavior with an in-app submit handler + success toast.
- Corrected Professional verification UX so “Verify Identity” / “Verify License” only mark verified after an upload is selected.
- Added a visually hidden landing-page H1 for SEO while keeping the hero heading visually unchanged.

**Impact:**
- **Higher conversion UX:** No more accidental “past job” postings or dead-end interactions.
- **SEO hygiene:** Homepage now has a clear H1 for crawlers without changing design.

---

### Update: 2025-12-15 - Security Hygiene (Secret Scanning Remediation + Audit Fixes + CI Stabilization)

**Status:** ✅ **IMPROVED**

**Action Taken:**
- Removed committed secret-bearing files (including a tracked `.env` file) and eliminated secret-like patterns from docs/tests.
- Enabled GitHub **Dependabot Security Updates** to keep dependency patches flowing via PRs.
- Enabled GitHub **CodeQL** code scanning for JavaScript/TypeScript on PRs, pushes, and a weekly schedule.
- Resolved `npm audit` findings in both root + API via targeted overrides (no forced major toolchain upgrade).
- Stabilized the Playwright CI workflow by aligning Node version to `22.x` and installing API dependencies before E2E runs.

**Notes:**
- Two GitHub Secret Scanning alerts remain open for **Google API keys** that were previously committed; these must be **rotated/revoked** externally, then the alerts can be marked resolved.

---

### Update: 2025-12-14 - Fix Professional Calendar Crash in Production (React Query Hook Import)

**Status:** ✅ **FIXED**

**Action Taken:**
- Fixed `ReferenceError: useQuery is not defined` in the Professional Calendar bundle by importing `useQuery` where it’s used.
- Removed duplicate import declarations in the calendar module to keep the calendar chunk parse-safe and stable in production builds.

**Impact:**
- **Calendar Stability:** Professional Calendar loads without crashing at runtime.

---

### Update: 2025-12-15 - Fix Hub Dashboard Calendar Bottom Cut-Off (Month View)

**Status:** ✅ **FIXED**

**Action Taken:**
- Adjusted the shared `ProfessionalCalendar` layout to avoid clipping the month grid by:
  - Removing `overflow-hidden` on the calendar container (scrolls instead of clipping)
  - Increasing the month/week/day calendar height constants to ensure full rendering

**Impact:**
- **Scheduling UX:** The Hub Dashboard calendar no longer cuts off the bottom of the month view.

---

### Update: 2025-12-16 - Add Forgot Password Flow (Firebase Password Reset Email)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Added a new `/forgot-password` page that sends a Firebase password reset email for the provided address.
- Added a “Forgot password?” link on the Login screen for quick access.
- Implemented neutral success messaging (“If an account exists…”) to reduce account enumeration risk.
- Added Playwright coverage for the forgot-password flow (and made the reset call E2E-safe behind `VITE_E2E=1`).

**Impact:**
- **Auth UX:** Users can recover access to email/password accounts without support intervention.

---

### Update: 2025-12-16 - Fix Password Reset Email Delivery (Firebase Continue URL Misconfig Guard)

**Status:** ✅ **FIXED**

**Action Taken:**
- Removed the custom reset-email “continue URL” parameter so Firebase uses its default reset handler (prevents silent failures when the URL/domain isn’t authorized in Firebase).
- Added a small UI hint clarifying that password reset emails only apply to email/password accounts (Google-only signups should use Google sign-in).

**Impact:**
- **Higher success rate:** Password reset emails are much less likely to be blocked by Firebase console configuration.

---

### Update: 2025-12-16 - Fix Business Calendar Mobile Horizontal Overflow

**Status:** ✅ **FIXED**

**Action Taken:**
- Updated the shared calendar toolbar to wrap controls on small screens (prevents the header from forcing a wider-than-viewport layout).
- Hardened the calendar container overflow behavior so mobile screens don’t get horizontal page scroll (“blow out”).
- Added a Playwright regression check to ensure `/shop/schedule` does not introduce horizontal overflow at mobile viewport widths.

**Impact:**
- **Mobile scheduling UX:** Business calendar stays within the viewport on mobile without widening the page.

---

### Update: 2025-12-16 - Fix Critical API Date Parsing Crash (Earnings / Shifts 500)

**Status:** ✅ **FIXED**

**Action Taken:**
- Added a shared API date normalizer (`toISOStringSafe`) to safely handle timestamps returned as **strings** or **Date** objects.
- Updated shift- and payment-related API routes to stop calling `.toISOString()` directly on DB values (prevents `shift.startTime.toISOString is not a function`).

**Impact:**
- **No more 500s** on shift payloads and earnings history when the DB driver returns timestamp fields as strings.

---

### Update: 2025-12-16 - Fix Hub Dashboard Listing 404 + Status Update Mismatch (Jobs vs Shifts)

**Status:** ✅ **FIXED**

**Action Taken:**
- Corrected Hub dashboard mixed listing behavior to route **shifts** to `/shifts/:id` and **jobs** to `/jobs/:id`, and to call the correct status update API for each.
- Fixed shift-based “Quick Apply” flows to route to shift details instead of job apply routes.

**Impact:**
- Prevents “Job not found” 404s when clicking shift items.
- Allows “Open → Filled/Completed” status updates to succeed consistently across mixed job/shift listings.

---

### Update: 2025-12-15 - Optimize Shop Schedule Calendar Performance (Windowed Fetching)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Enforced windowed fetching for employer shift reads: `GET /api/shifts?employer_id=me` now requires `start` and `end` query params and queries only that range.
- Tightened the backend range filter to constrain shifts within the requested window and verified DB indexing (`shifts_start_time_idx`).
- Updated the Shop Schedule calendar to derive its fetch range from the visible calendar range and memoized key handlers to reduce re-render churn.

**Impact:**
- **Much faster calendar loads:** Shop Schedule no longer pulls “all shifts” payloads and avoids needless re-renders while navigating.

---

### Update: 2025-12-15 - Fix Business Calendar Slot Times (Date-Only UTC Parsing)

**Status:** ✅ **FIXED**

**Action Taken:**
- Fixed a bug where records with `date: "YYYY-MM-DD"` were being parsed as **UTC** by the browser, rendering as **10:00am** local in AU timezones.
- Updated calendar event mapping to prefer ISO `startTime/endTime` and to correctly combine `date + HH:mm` into local `Date` objects.

**Impact:**
- **Consistent schedule slots:** Month view now shows the expected slot times consistently across the whole month (no “10:00am drift”).

---

### Update: 2025-12-15 - Fix “Clear All Shifts” 404 (API Route Conflict)

**Status:** ✅ **FIXED**

**Action Taken:**
- Fixed API route ordering so `DELETE /api/shifts/clear-all` is matched correctly (instead of being treated as `DELETE /api/shifts/:id` with `id="clear-all"`).

**Impact:**
- **Cleanup available:** Businesses can now clear old generated/shifted roster items directly from Calendar Settings without hitting a 404.

---

### Update: 2025-12-14 - Smart Fill Roster + Calendar Slot Assignment Reliability

**Status:** ✅ **FIXED**

**Action Taken:**
- Fixed the **Smart Fill Roster** 500 by adding legacy-schema fallbacks for shift inserts and adding a migration to restore missing `shifts.lat/lng` columns.
- Replaced calendar **mock professional lists** with a real authenticated endpoint (`GET /api/professionals`) and wired calendar slot assignment to create **invited** shifts and send invites.

**Impact:**
- **Scheduling UX:** Opening-hours segments can be generated and filled without server errors.
- **Invites:** Slot assignment now targets real professionals and triggers the invite flow.

---

### Update: 2025-12-14 - Deployment Preparation: Automated Pre-Flight Checks Added

**Status:** ✅ **READY FOR LAUNCH QA**

**Action Taken:**
- Added `npm run preflight` / `npm run preflight:local` to automatically scan for common production foot-guns:
  - Missing required environment variables (Vite Firebase/Stripe/Maps + API DB/Stripe/Firebase Admin)
  - Suspicious production settings (e.g. test Stripe keys in prod mode, `VITE_E2E` enabled)
  - Debug hygiene (`debugger` statements) and frontend `console.log` leftovers
  - Accessibility hygiene: warns on `<img>` tags missing `alt`

**Impact:**
- **Fewer deployment surprises:** One command surfaces the most common “it works locally” issues before pushing live.

---

### Update: 2025-12-14 - Fix Shop Listings Fetch (500) + Calendar Re-render Stability

**Status:** ✅ **FIXED**

**Action Taken:**
- Fixed `GET /api/shifts/shop/:userId` returning 500 by normalizing legacy `jobs.createdAt` values and adding a safe repository fallback for older shift schemas.
- Prevented the Professional calendar settings sync from repeatedly re-setting state when values haven’t changed (reduces excessive re-renders) and rate-limited the “excessive re-render” warning to only fire on true high-frequency loops.

**Impact:**
- **Shop Dashboard & Calendars:** Listings/shifts load reliably instead of failing with server 500s.
- **Stability:** Calendar renders stabilize and stop looping on settings updates.

---

### Update: 2025-12-14 - Salon “Post Job” Submission Wired (createShift + toasts + redirect)

**Status:** ✅ **WIRING COMPLETE**

**Action Taken:**
- Wired `src/pages/salon-create-job.tsx` to actually submit by calling `createShift(payload)` (with `try/catch`).
- Added user feedback toasts for success/error and redirected on success to the Dashboard (role-based routing).

**Impact:**
- **Job Posting:** Salon job posts now reach the backend and provide clear success/failure UX instead of silently doing nothing.

---

### Update: 2025-12-14 - Shop Scheduling Command Center (Weekly Calendar + Bulk Actions)

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
- Added a dedicated shop scheduling calendar at `/shop/schedule` with click-to-create draft shifts and drag-and-drop rescheduling.
- Added bulk actions: Copy Previous Week (draft duplication) and Publish All (draft → open).
- Added confirmed-shift safety requiring a reason and notifying the assigned Professional.

**Impact:**
- **Scheduling UX:** Shops can schedule shifts visually and publish them faster (less form-driven friction).
- **Sync:** Changes invalidate relevant queries so the Job/Shift marketplace and dashboards reflect updates immediately.

---

### Update: 2025-12-14 - Shop Calendar Whack-a-Mole Fixes (Clean UI + Reliable Shift Deletes)

**Status:** ✅ **FIXED**

**Action Taken:**
- Removed calendar “identity confusion” by tightening the Shop Schedule event mapping to only render managed roster **Shifts** (with valid Date objects + intended statuses).
- Moved the status Legend into the top calendar header controls for constant visibility and ensured the calendar layout remains full-width.
- Fixed shift deletion 500s by updating `DELETE /api/shifts/:id` to transactionally delete dependent records (`shift_invitations`, `shift_offers`, `applications.shift_id` when present) before deleting the shift, with schema-existence guards for legacy DBs.

**Impact:**
- **Cleaner schedule UI:** Less clutter and clearer status meaning while scheduling.
- **Deletion reliability:** Shifts can be deleted without FK/missing-column 500s across partially-migrated environments.

---

### Update: 2025-12-14 - E2E Coverage Added for Shop Schedule + Auth Stability

**Status:** ✅ **TEST COVERAGE IMPROVED**

**Action Taken:**
- Added Playwright coverage for `/shop/schedule` (Copy Previous Week, Publish All, Quick Create draft).
- Stabilized E2E auth by hydrating the session user from sessionStorage and using the API’s `mock-test-token` bypass (scoped to `VITE_E2E=1`).

**Impact:**
- **CI confidence:** Reduced flakiness caused by UI-driven Firebase auth in automation.
- **Regression protection:** Core shop scheduling workflows now have deterministic E2E coverage.

---

### Update: 2025-12-14 - “My Listings” Now Refreshes Instantly After Posting

**Status:** ✅ **WIRING COMPLETE**

**Action Taken:**
- After a successful salon “Post Job” (`createShift`), invalidated the shop listing and feed query caches so the Dashboard’s “My Listings” reflects the new post immediately.

**Impact:**
- **No manual refresh:** Newly posted shifts appear immediately when returning to the dashboard.

---

### Update: 2025-12-14 - Comprehensive Functional & Wiring Audit (Auth, API Handshake, Map Lat/Lng)

**Status:** ✅ **CRITICAL WIRING FIXES APPLIED**

**Action Taken:**
- Audited interactive wiring and frontend↔backend API contracts across auth, payments, and key job/shift flows.
- Fixed Google OAuth redirect fallback (popup-blocked) so it still establishes backend session + DB user and never gets stuck loading.
- Fixed application submission payload mismatch (`coverLetter` → `message`) and added missing `GET /api/shifts/:id` route with numeric lat/lng normalization.

**Impact:**
- **Auth Flow:** More reliable Google sign-in across browsers with popup restrictions.
- **Applications:** Frontend submissions now match backend zod validation (no silent rejects).
- **Maps:** Shift location coordinates are consistently numeric, preventing map type/runtime issues.

---

### Update: 2025-12-14 - Map Details Page Marker Interactivity Corrected

**Status:** ✅ **WIRING COMPLETE**

**Action Taken:**
- Updated Details pages (`/shifts/:id`, `/jobs/:id`) to render the single-pin map in **static mode** (`interactive={false}`) instead of passing a no-op `onJobSelect={() => {}}`.
- Enhanced `GoogleMapView` with an explicit `interactive` toggle so the marker cursor/selection UI matches actual behavior.

**Impact:**
- **No misleading affordance:** Details page markers no longer appear clickable when they don’t navigate anywhere.
- **Preserved feed behavior:** Job feed / multi-pin map interactions remain interactive.

---

### Update: 2025-12-13 - Vercel Build Errors Fixed

**Status:** ✅ **BUILD GREEN (LOCAL VERCEL PIPELINE)**

**Action Taken:**
- Pulled Vercel project settings locally (`vercel pull --yes`) and reproduced the build pipeline via `vercel build`.
- Fixed API TypeScript compilation issues (ES2021 lib/target, safer external JSON parsing, script typing fixes).

**Impact:**
- **Deployment Confidence:** Local `vercel build` completes successfully, matching the Vercel pipeline more closely.
- **Reduced Risk:** Removed TypeScript errors that could fail CI/deploy checks during API packaging.

---

### Update: 2025-12-13 - Vite/Rollup Warning Removed

**Status:** ✅ **BUILD OUTPUT CLEANER**

**Action Taken:**
Removed an invalid Rollup input option (`preserveModules`) from the Vite config and verified the warning no longer appears during builds.

**Impact:**
- **Cleaner build logs:** Less noise in CI/Vercel build output.
- **Lower confusion:** Avoids misleading Rollup option warnings during `vite build`.

---

### Update: 2025-12-13 - Vendor Chunk Size Reduced (Vite manualChunks)

**Status:** ✅ **PERF/BUILD HYGIENE IMPROVED**

**Action Taken:**
Refined Vite Rollup chunking to split the previously oversized vendor bundle into multiple stable vendor chunks (react/ui/firebase/maps/calendar/charts/realtime).

**Impact:**
- **Performance:** Better long-term caching (users don’t re-download the entire vendor bundle for small changes).
- **Build Output:** Removed the >1MB chunk warning by keeping bundles under the warning threshold.

---

### Update: 2025-12-13 - Production Black Screen Hotfix (React-dependent chunk ordering)

**Status:** ✅ **RUNTIME STABILITY RESTORED**

**Action Taken:**
Adjusted Vite chunking so React-dependent libraries (Radix UI + charts + calendar libs) ship with the `vendor-react` chunk to prevent runtime load-order edge cases (`forwardRef` undefined).

**Impact:**
- **Fixes black screen:** Prevents the `forwardRef` crash observed in vendor chunks.
- **Keeps perf gains:** Still retains smaller vendor bundles for better caching.

---

### Update: 2025-12-13 - PWA Cache Recovery Script (Stale Chunk Mitigation)

**Status:** ✅ **SAFER CLIENT RECOVERY**

**Action Taken:**
Added a one-time recovery script to the app shell that unregisters existing service workers and clears relevant caches when present, then reloads before booting the app bundle.

**Impact:**
- **Mitigates stuck clients:** Helps users who are pinned to stale Workbox precaches serving broken chunk URLs.
- **Faster incident recovery:** Reduces need for manual cache clearing when a bad cached build causes a black screen.

---

### Update: 2025-12-13 - Chunking Strategy Stabilized (React Runtime Crash Fix)

**Status:** ✅ **RUNTIME PRIORITIZED**

**Action Taken:**
Reduced custom vendor chunking to only split a few heavy dependencies (Firebase/Maps/Stripe) and let Vite/Rollup handle the rest, avoiding load-order issues that caused `useLayoutEffect`/`forwardRef` undefined crashes.

**Impact:**
- **Stops black screen:** Prevents React exports from being undefined due to brittle chunk ordering.
- **Still performant:** Keeps the biggest known-heavy libraries isolated for caching, without forcing the rest into custom vendor buckets.

---

### Update: 2025-11-20 - Forensic Feature Restoration

**Status:** ✅ **MAJOR RECOVERY COMPLETE**

**Action Taken:**
Identified that significant completed work (Landing Page, Google Auth, Shadcn UI, Dashboards) was missing from the current HEAD but present in the git history as a detached tree.
Executed a forensic recovery to restore the `src/` directory from tree `15cda7ef0072e0310afbc088cb53ead853c4a624`.

**Impact:**
- **Feature Completeness:** Jumped significantly. Dashboards, Authentication, and Landing Page are now present.
- **Next Steps:** Verify these restored features against the "Missing Components" list above. Many items listed as "Missing" (e.g., Onboarding UI, Dashboards) may now be PRESENT.
- **Plan Adjustment:** We need to re-audit the "Missing Components" list in light of this restoration. The estimated effort for Phase 1 & 2 may be reduced.

---

### Update: 2025-11-20 - Pricing Component Restoration

**Status:** ✅ **COMPONENT RESTORED**

**Action Taken:**
Re-implemented the Pricing component (`src/components/Pricing.tsx`) which was identified as missing. Integrated it into the Landing Page.

**Impact:**
- **Landing Page:** Now feature-complete with Hero, How It Works, Pricing, and CTA sections.
- **Design Consistency:** Pricing section matches the restored "Barbershops & Salons" visual theme.

---

### Update: 2025-11-20 - Hero UI Polish

**Status:** ✅ **POLISH COMPLETE**

**Action Taken:**
Updated Hero section logo to use transparent white version and increased size for better visibility and brand presence.

**Impact:**
- **Improved visual appeal and legibility of the landing page hero section.**

---

### Update: 2025-11-24 - Notification System Complete (v1.1.0)

**Status:** ✅ **FULL IMPLEMENTATION & RELEASED**

**Action Taken:**
Full-stack implementation of the Notification System, including DB Schema, API, SSE Real-time Service, and Frontend Context. Released as **v1.1.0**.

**Impact:**
- **Real-Time Alerts:** Users receive instant updates without refreshing via Server-Sent Events (SSE).
- **Robust Architecture:** Modular schema, repository pattern, and auto-reconnecting SSE stream.
- **User Experience:** Integrated toast notifications, optimistic UI updates, notification bell, and dropdown.
- **Database:** Refactored schema to avoid circular dependencies.

---

### Update: 2025-11-24 - UI Enhancements

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Added explicit "Dashboard" link to the Navbar to improve navigation for authenticated users. Link dynamically routes to the correct dashboard based on user role (Hub vs Professional vs Default).

**Impact:**
- **Improved UX:** Users can now easily navigate back to their main dashboard from anywhere in the app without relying on the logo click.

---

### Update: 2025-11-24 - Mobile Navigation Upgrade

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Implemented a responsive Mobile Menu (Hamburger) using shadcn/ui `Sheet`.
Moved "Dashboard" and "Find Shifts" links to the mobile menu on small screens to prevent clutter.
Added Role Switching functionality to the mobile menu.

**Impact:**
- **Mobile Accessibility:** Critical navigation links are now easily accessible on phones without cluttering the main header.
- **Consistent UX:** Uses the standard "Hamburger" menu pattern familiar to users.

---

### Update: 2025-11-24 - Navbar Logo Link Fix

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Updated the Navbar logo to be a clickable link. It now intelligently directs users to the Landing Page (if logged out) or their specific Dashboard (if logged in).

**Impact:**
- **Standard Navigation Pattern:** Users expect the logo to be a "home" link; this matches standard web expectations.
- **Smoother Navigation:** Removes the need for a button click handler, using standard routing instead.

---

### Update: 2025-11-24 - Shop Onboarding Flow

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Implemented the missing Shop Onboarding page (`/onboarding/hub`) and wired it up to the API. Users can now create a shop profile from the navbar link.

**Impact:**
- **Fixed Broken Link:** The "Create Shop Profile" link now correctly leads to the onboarding form instead of a 404.
- **Hub Registration:** Enables users to register as a Shop/Hub.

---

### Update: 2025-11-25 - Multi-Role E2E Testing

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
Implemented a comprehensive E2E test suite for role-based navigation.
- **Auth Bypass:** Enhanced AuthContext to support role injection via URL parameters and session persistence.
- **Test Coverage:** Automated scenarios for Professional view, Shop Owner view, and Multi-role switching.

**Impact:**
- **Quality Assurance:** Ensures critical user flows (dashboard access, role switching) work correctly across different user types.
- **Regression Testing:** Protects against future regressions in authentication and routing logic.

---

### Update: 2025-11-25 - Professional Onboarding Flow

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
Implemented the Professional Onboarding page (`/onboarding/professional`) and registered its route in `src/App.tsx`.
- **UI:** Created a form for Professionals to enter their details (Profession, Bio, Location).
- **API:** Integrated with the backend to update the user's role to 'professional'.
- **Routing:** Added a protected route to the App configuration.

**Impact:**
- **User Flow:** Enables authenticated users to seamlessly create a Professional profile from the navbar "Grow" menu.
- **Completeness:** Fills the gap where the Professional onboarding link was previously leading to a 404.

---

### Update: 2025-11-25 - Navbar Avatar Upgrade

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Replaced the raw email text in the Navbar with a standard User Avatar component.
- Implemented a Dropdown Menu triggered by the Avatar for Profile, Settings, and Logout.
- Optimized layout to hide full email text on mobile while keeping the Avatar accessible.

**Impact:**
- **Visual Polish:** Enhances the professional look of the application by using standard UI patterns.
- **Space Efficiency:** Saves horizontal space in the Navbar, especially on mobile devices.

---

### Update: 2025-11-25 - Landing Page Aesthetics

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Refactored the landing page aesthetics to improve brand consistency and logo resolution.
- Updated Hero and Navbar logos with `object-contain` and standardized dimensions.
- Unified "Perfect For" section icon colors to `text-steel-800`.

**Impact:**
- **Visual Consistency:** Ensures a sharp, professional look across all devices.
- **Brand Alignment:** Removes ad-hoc colors in favor of the unified steel color palette.

---

### Update: 2025-11-25 - Business Dashboard Icons Refactor

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Refactored the Business Dashboard statistics to remove generic colored backgrounds and adopt a minimalist chrome/steel aesthetic.
- Implemented brand-specific icons (Scissors, FileText, MessageSquare, Handshake) in a monochromatic style.
- Removed gradients and simplified the UI to align with the industrial design system.
- Unified the `HubDashboard` to use the shared `DashboardStats` component for consistency.

**Impact:**
- **Brand Alignment:** Matches the "Black & Chrome" design language better than colorful generic cards.
- **Visual Consistency:** Ensures all dashboards share the same high-quality look.

---

### Update: 2025-11-25 - Map View Container Refactor

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Refactored the Job Feed Map View container to unify the header and map into a single Card component.
- Removed redundant double borders and nested containers.
- Improved spacing and integration of the "Job Locations" header.

**Impact:**
- **Visual Polish:** Cleaner, less cluttered interface for the map view.
- **Improved UX:** Better spatial relationship between the map header and the map itself.

---

### Update: 2025-11-25 - Business Dashboard Icons Refresh (Red & Chrome)

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Updated the Business Dashboard statistics and Quick Actions to use solid "Red Accent" and "Chrome/Steel" backgrounds for icon containers, replacing outlines and gradients.
- Applied high-contrast solid colors to icon containers in stats cards.
- Refactored Quick Action list items to include matching solid-colored icon containers.

**Impact:**
- **Visual Hierarchy:** Key actions like "Post New Job" now stand out with a bold Red Accent.
- **Modern Aesthetic:** Solid chrome/steel accents align better with the "Red & Chrome" design request.

---

### Update: 2025-11-25 - Job Feed UI Polish

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Polished the Job Feed UI to fix layout bugs and apply the new design system tokens.
- **Quick Locations:** Fixed heart icon overflow by improving button layout (flex/gap) and using responsive grid sizing.
- **Theme Updates:** Refactored `JobFeedPage` and `JobFilters` to use semantic color tokens (`bg-background`, `bg-card`, etc.) instead of outdated `steel`/`gray` colors.
- **Contrast:** Verified and improved text readability in search settings and filters.

**Impact:**
- **Bug Fixes:** Resolved visual clipping on "Quick Locations" buttons.
- **Visual Consistency:** Job Feed now matches the global design system (semantic colors).
- **Accessibility:** Improved text contrast in key filter areas.

---

### Update: 2025-11-25 - Mobile Layout Audit Automation

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
Implemented an automated E2E test suite (`e2e/mobile-layout.spec.ts`) to detect horizontal overflow regressions on mobile devices.
- Created `checkNoHorizontalScroll` helper.
- Audited critical routes: `/professional-dashboard`, `/hub-dashboard`, `/job-feed`, `/messages`.
- Detected a layout overflow on `/professional-dashboard` (Mobile Chrome).

**Impact:**
- **Automated Quality Control:** Prevents mobile layout regressions (horizontal scroll) from slipping into production.
- **Targeted Fixes:** Identified specific pages needing layout remediation.

---

### Update: 2025-12-01 - Mobile Performance Optimization

**Status:** ✅ **IMPLEMENTED**

**Action Taken:**
Optimized mobile navigation and responsiveness to address user reports of "sluggishness" and "double clicking".
- **Caching:** Increased React Query `staleTime` to 5 minutes for "instant back" behavior.
- **Visual Feedback:** Added `nprogress` top bar for navigation status.
- **Tactile Feedback:** Added global `active` state animations (scale 0.98) to all interactive elements.

**Impact:**
- **Perceived Performance:** App feels significantly faster due to instant page loads from cache.
- **UX:** Users get immediate confirmation of their actions, reducing frustration and errors.

---

### Update: 2025-12-01 - Interactive Dashboard Cards

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Enabled click interactions for Professional Dashboard statistics cards.
- "Applications" navigates to Applications tab.
- "Bookings" navigates to Calendar tab.
- "Messages" opens Messages modal.
- "Rating" navigates to Profile tab.

**Impact:**
- **Improved Usability:** Users can now intuitively tap/click dashboard stats to access relevant sections.
- **Mobile Responsiveness:** Fixed issue where cards appeared actionable but were unresponsive on mobile.

---

### Update: 2025-12-01 - Business Dashboard UI Fixes

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Fixed "blow out" on business dashboard buttons by implementing responsive layout (wrapping).
- Changed header buttons container to flex-wrap.
- Added column stacking for small screens.

**Impact:**
- **Improved Responsiveness:** Buttons no longer overflow or break layout on smaller screens.

---

### Update: 2025-12-02 - Business Dashboard Cards Fix

**Status:** ✅ **DEPLOYED**

**Action Taken:**
Enabled click interactions for Business Dashboard statistics cards.
- "Open Jobs" navigates to Jobs tab.
- "Applications" navigates to Applications tab.
- "Messages" navigates to Messages page.
- "This Month" (Hires) navigates to Jobs tab.

**Impact:**
- **Improved Usability:** Users can now tap/click stats cards to quickly access relevant sections, matching the Professional Dashboard behavior.
- **Consistency:** Ensures both dashboard types behave similarly for stats interaction.

---

## ✅ Completed Features

### Core Platform Features
- [x] User Authentication (Firebase Auth with Google OAuth)
- [x] User Onboarding Flow (4-step wizard)
- [x] Role-Based Dashboards (Professional, Business, Hub, Brand, Trainer)
- [x] Job Marketplace (Post, Browse, Apply)
- [x] Real-time Messaging System
- [x] Payment Processing (Stripe Integration)
- [x] Review & Rating System
- [x] Notification System
- [x] Admin Dashboard
- [x] PWA Support

### UI/UX Features
- [x] Landing Page with Hero, Pricing, How It Works
- [x] Industrial/Chrome Design System
- [x] Responsive Mobile Design
- [x] Loading States & Error Handling
- [x] Toast Notifications
- [x] Image Upload (Firebase Storage)

### Legal & Compliance
- [x] Terms of Service Page
- [x] Privacy Policy Page (GDPR/CCPA Compliant)
- [x] Site Footer with Legal Links

### Content Pages
- [x] About Page
- [x] Contact Page

### SEO & Analytics
- [x] React Helmet Async Integration
- [x] Open Graph Meta Tags
- [x] Vercel Analytics
- [x] Vercel Speed Insights

### Database & Backend
- [x] PostgreSQL Database Schema
- [x] Drizzle ORM Integration
- [x] RESTful API (Express)
- [x] Database Migrations
- [x] Email Service (Resend)

### Testing & Quality
- [x] Playwright E2E Tests
- [x] TypeScript Type Safety
- [x] ESLint Configuration

### DevOps & Deployment
- [x] Vercel Deployment Configuration
- [x] Environment Variable Management
- [x] Production Build Optimization
- [x] Git Version Control

---

## 🔄 Enhancements & Maintenance

### Database Schema Updates
- [x] Notification Schema Redesign (Modularized, Drizzle ORM)
- [x] Notification Service & API Implementation
- [x] Frontend Notification Hook (SSE)
- [x] Notification UI (Bell, Dropdown, Toasts)

---

## 🚀 v1.0 Release Summary

HospoGo v1.0 is a fully-featured marketplace platform connecting barbers, stylists, and industry professionals with flexible work opportunities. The platform includes:

- **Complete User Journey:** Signup → Onboarding → Dashboard → Job Discovery → Application → Communication → Payment
- **Multi-Role Support:** Professionals, Business Owners, Hubs, Brands, and Trainers
- **Production-Ready Infrastructure:** Secure authentication, payment processing, real-time messaging, and comprehensive admin tools
- **Professional Design:** Industrial aesthetic with chrome accents, fully responsive, and accessible
- **Legal Compliance:** Terms of Service, Privacy Policy, GDPR/CCPA compliant
- **Observability:** Analytics and performance monitoring integrated

**All roadmap items have been completed and the platform is ready for production use.**

---

## 📝 Notes

This roadmap documents the journey from initial development through v1.0 launch. All features have been implemented, tested, and deployed to production.

For ongoing development and feature requests, please refer to the project's issue tracker or contact the development team.

---

### Update: 2026-01-10 - Stripe Key Rotation Support (Docs + Local CLI)

**Status:** ✅ **READY**

**Action Taken:**
- Standardized documentation to use `VITE_STRIPE_PUBLISHABLE_KEY` (frontend) and `STRIPE_SECRET_KEY` (backend).
- Added a safe local PowerShell helper to update `.env` + `api/.env` without printing secrets.
- Added `docs/env.vercel.example` as a non-secret template for deployment environments.

**Impact:**
- **Safer key rotation + fewer deployment foot-guns:** Clear variable naming, safe local setup, and a single place to copy env keys for hosting providers.

---

### Update: 2026-01-10 - Authentication & Authorized Domains Audit (HospoGo)

**Status:** ✅ **VERIFIED + HARDENED**

**Action Taken:**
- Verified Firebase client initialization does **not** hardcode legacy domains and now supports `VITE_AUTH_DOMAIN` as a backwards-compatible alias for `VITE_FIREBASE_AUTH_DOMAIN`.
- Removed insecure “manual Google OAuth code callback” behavior and routed `/oauth/callback` and Firebase’s `/__/auth/handler` to safely complete sign-in via the standard Firebase redirect result flow.
- Added clear documentation on Firebase Console **Authorized domains** (ensure `hospogo.com` + `www.hospogo.com`, remove any legacy domains).

**Impact:**
- Reduces risk of `auth/unauthorized-domain` errors and prevents accidental auth flows pointing at legacy domains or unsafe callback handlers.

---

### Update: 2026-01-11 - Sync Firebase Auth Handshake & Domains (Production Env Alignment)

**Status:** ✅ **UPDATED**

**Action Taken:**
- Ensured Firebase `authDomain` supports `VITE_AUTH_DOMAIN` (alias) in addition to `VITE_FIREBASE_AUTH_DOMAIN`.
- Hardened `/oauth/callback` and `/__/auth/handler` as safe landing routes that forward users back to `/login` while the app-level Firebase redirect processing completes.
- Updated production environment values to align with the new Google Cloud configuration:
  - `VITE_AUTH_DOMAIN=hospogo.com`
  - `VITE_REDIRECT_URI=https://hospogo.com/__/auth/handler`

**Impact:**
- Keeps auth redirects and domain config consistent with HospoGo’s production domain, reducing misconfiguration risk during Google sign-in.