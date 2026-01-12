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
- **Authorized domains guidance**: Documented that Firebase Authorized Domains are configured in the Firebase Console (expected `hospogo.com` / `www.hospogo.com`) and legacy Snipshift domains should be removed.
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
- Verify in Firebase Console that **Authorized domains** includes `hospogo.com` + `www.hospogo.com` and remove any legacy Snipshift domains; then confirm Google sign-in redirect works on production with popup-blocked fallback.

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
- **No legacy app URL vars found**: Confirmed Production env does **not** include `VITE_APP_URL` or `NEXT_PUBLIC_APP_URL` (so they cannot be pointing at a Snipshift domain in Vercel).
- **Brand string sweep (targeted)**: Removed remaining `Snipshift/snipshift/SNIPSHIFT` occurrences from `src/` and `index.html`.
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
- **HospoGo branding consistency**: Removed remaining user-facing “Snipshift” strings (legal copy, sitemap social links, email signatures, docs/scripts).
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
- Verify the deployed UI on `hospogo.com` has no remaining “Snipshift” user-facing branding (including transactional emails + legal pages).

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

#### 2026-01-10: Asset Cleanup (Remove Snipshift-Era Hero Asset)

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
- Remove/rename remaining legacy “Snipshift” references in docs/scripts that are no longer relevant to HospoGo (copy-only cleanup; no behavior changes).

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