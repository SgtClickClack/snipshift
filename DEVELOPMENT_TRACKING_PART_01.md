### 2025-09-04: Multi-Role User System & Dashboard Toggle

Refactored the authentication and user model to support multiple roles per user, added UI for role switching, and updated onboarding to allow selecting multiple roles. Implemented new backend endpoints for role management.

**Core Components Implemented:**
- Shared schema `userSchema` now uses `roles[]` and `currentRole`
- Backend storage and routes support multi-role
- Endpoints: `PATCH /api/users/:id/roles`, `PATCH /api/users/:id/current-role`
- Auth context updated with `setCurrentRole` and `hasRole`
- Navbar role switcher and multi-select role onboarding
- Guards and dashboards adapted to `currentRole`

**File Paths:**
- `shared/firebase-schema.ts`
- `server/storage.ts`, `server/firebase-storage.ts`, `server/routes.ts`, `server/firebase-routes.ts`
- `client/src/contexts/AuthContext.tsx`
- `client/src/lib/roles.ts`
- `client/src/components/auth/AuthGuard.tsx`
- `client/src/components/navbar.tsx`
- `client/src/pages/role-selection.tsx`, `client/src/pages/home.tsx`
- `client/src/pages/*-dashboard.tsx`
- `client/src/components/onboarding/tutorial-overlay.tsx`
- `client/src/components/profile/profile-form.tsx`
- `client/src/components/social/community-feed.tsx`
- `client/src/components/messaging/*`

**Next Priority Task:**
- Add role-aware permissions and feature gating (e.g., hide actions by role) with tests.

Expected completion time: 6 hours

### 2025-09-06: E2E Stabilization (Playwright/Cypress), A11y, and Mobile Fixes

Implemented fixes to stabilize Playwright and Cypress E2E suites and address accessibility assertions:

**Core Components Implemented:**
- Default `type="button"` in shared `Button` to satisfy a11y checks
- Added `data-testid` hooks for onboarding and design system tests
- Ensured demo quick logins set `roles` and `currentRole` for direct dashboard access
- Added `data-testid="heading-dashboard"` on all dashboards
- Fixed design-system showcase structure and added `data-testid="design-showcase"`

**File Paths:**
- `client/src/components/ui/button.tsx`
- `client/src/components/demo/design-system-showcase.tsx`
- `client/src/pages/landing.tsx`, `client/src/pages/signup.tsx`, `client/src/pages/demo.tsx`
- `client/src/pages/hub-dashboard.tsx`, `client/src/pages/professional-dashboard.tsx`, `client/src/pages/trainer-dashboard.tsx`, `client/src/pages/brand-dashboard.tsx`

**Next Priority Task:**
- Monitor CI run; if any tests still fail, add/adjust selectors and refine guards to align expected URLs.

Expected completion time: 2 hours

### 2025-09-07: CI Playwright Port Conflict Fix and Smoke Test

Resolved Playwright CI failure caused by port 5000 already in use by ensuring CI does not start an additional server and that diagnostics are captured.

**Core Components Implemented:**
- Updated workflow to free port 5000, start prod server, wait-on health, and emit diagnostics (netstat, curl)
- Forced Playwright CI to not start webServer by using CI config and `PW_NO_SERVER=1`
- Limited CI Playwright to Chromium for stability; baseURL set to `http://localhost:5000`
- Added `tests/smoke.spec.ts` to verify server responds at root

**File Paths:**
- `.github/workflows/main.yml`
- `playwright.ci.config.ts`
- `tests/smoke.spec.ts`

**Next Priority Task:**
- Re-run CI; if Playwright still tries to start a server, capture last 100 lines and refine config/env.

Expected completion time: 1 hour