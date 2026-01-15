# HospoGo Codebase Audit Report (v1)

Date: 2026-01-15  
Scope: Full repo (API, frontend, infrastructure, schema, docs)

## Executive Summary
This audit focused on infrastructure/security, auth/onboarding flow, code quality, UI/UX best practices, and database scalability. The core platform is feature-complete, but there are critical security/config risks and some architecture/quality debt that should be addressed before scale-up for Brisbane.

## Infrastructure & Security Audit
### Firebase Admin SDK Initialization (`api/_src/config/firebase.ts`)
- Initialization is lazy and resilient, with fallback paths for service account JSON and individual env vars.
- `FIREBASE_PROJECT_ID` is trimmed, but not strictly enforced against the expected project (`snipshift-75b04`).
- The admin config does not validate env values for `"undefined"`, `"null"`, or empty strings.

### Project Enforcement
- Frontend (`src/lib/firebase.ts`) sanitizes env values and fails fast, but does not enforce a specific project id.
- Backend admin config derives project id from env or service account without allowlisting.

### React2Shell (CVE-2025-55182)
- No server-side React rendering or shell execution in API routes.
- No user input is passed to `child_process` or shell execution in route handlers.
- Only `dangerouslySetInnerHTML` usage is a client-side chart style injector with internal config (no direct user input).

### Security Red Flags
- A service account file exists in the repo: `snipshift-75b04-service-account.json`. This is a critical secret exposure risk if committed or deployed.

## Authentication & Onboarding Flow
### Julian Roberts User Path (Login → Onboarding FSM)
1. **Login**: Firebase auth completes; AuthContext handles redirect + token refresh.
2. **Backend handshake**: `/api/me` is called via AuthContext. Auth middleware auto-creates a DB user if missing.
3. **Routing**:
   - If `user.isOnboarded === false`, AuthContext routes to `/onboarding`.
   - `AuthGuard` enforces onboarding access until role/onboarding completion.
4. **Onboarding FSM**: `src/pages/Onboarding.tsx` manages step transitions and persists progress in localStorage.

### `/api/me` 401 Edge Cases
- Middleware auto-creates missing DB users to mitigate auth race conditions.
- A valid token can still fail if:
  - Firebase Admin is misconfigured (wrong project/service account), resulting in `verifyIdToken` failure.
  - Token was minted for a different Firebase project (no strict project enforcement).

## Code Quality & Architecture
### Separation of Concerns
- `src/pages/Onboarding.tsx` mixes FSM state logic, API calls, storage persistence, and UI. This is a high-complexity component that would benefit from extraction into services/hooks.
- `AuthContext.tsx` handles auth state, routing decisions, token refresh, and retry logic in one place; consider splitting network/auth orchestration from navigation behavior.

### Dead Code / Diagnostic Tools
Potential debug-only artifacts that should be gated or removed:
- `window.DEBUG_ONBOARDING` globals in `src/pages/Onboarding.tsx`
- "Always render the button for now to debug visibility" in `src/components/pwa/install-button.tsx`
- Debug-oriented comments/logs in `StartupErrorBoundary` and related components

## Database & Scalability (PostgreSQL/Supabase)
### Strengths
- Key indexes exist for primary query patterns (`shifts` by status, employer, startTime; `users` by role, rating, verification status).
- Schema includes compliance fields (RSA, ID verification), suitable for AU hospitality requirements.

### Risks / Growth Areas (Brisbane Launch)
- Geo queries use `lat/lng` numeric indexes; consider PostGIS + GIST for scale/nearby queries.
- Hot paths like open shift feed may need composite indexes on `(status, start_time)` plus locality filters.
- Shift/activity history could benefit from partitioning or archival strategies if volume grows quickly.

## UI/UX & Best Practices
### Navbar
- Dashboard access is correctly consolidated into the profile dropdown (desktop) and mobile sheet menu.
- No redundant primary "Dashboard" button on desktop; behavior aligns with best practices.

### Tailwind Consistency & Responsiveness
- Overall layout appears consistent with app-wide tokens (`bg-background`, `text-foreground`, brand tokens).
- Some screens (notably Onboarding) use direct color classes (`zinc-*`) alongside tokenized colors; consider unifying for consistent theming.

## Critical Issues
1. **Service account JSON in repo**: `snipshift-75b04-service-account.json` present at repo root.
2. **Firebase project enforcement not strict**: backend and frontend allow misconfigured project ids.
3. **Onboarding file complexity + debug globals**: risk of accidental production leakage and maintainability issues.

## Performance Optimizations
- Consider extracting onboarding FSM logic into dedicated hooks/services to reduce render cost and improve testability.
- Add memoized selectors for heavy components (Onboarding + dashboards) where repeated state recomputation occurs.
- Evaluate DB query windows and caching for shift feed endpoints used by mobile clients.

## Security Hardening Checklist
- [ ] Remove any committed service account files; rotate Firebase keys immediately.
- [ ] Enforce project id allowlist (`snipshift-75b04`) in both admin and client initialization.
- [ ] Validate all Firebase env vars (reject `"undefined"`, `"null"`, empty, whitespace-only).
- [ ] Gate debug-only globals (e.g., `DEBUG_ONBOARDING`) behind `VITE_DEBUG_LOGS` or `DEV` checks.
- [ ] Confirm API endpoints do not accept input for shell or eval sinks (no current findings).

## Key File References
- Firebase Admin: `api/_src/config/firebase.ts`
- Firebase Client: `src/lib/firebase.ts`
- Auth Middleware: `api/_src/middleware/auth.ts`
- `/api/me` route: `api/_src/routes/users.ts`
- Onboarding FSM: `src/pages/Onboarding.tsx`
- Navbar: `src/components/layout/Navbar.tsx`
- DB schema: `api/_src/db/schema/users.ts`, `api/_src/db/schema/shifts.ts`
