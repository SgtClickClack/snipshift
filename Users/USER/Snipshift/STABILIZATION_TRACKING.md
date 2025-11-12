### Snipshift Stabilization Tracking - Code Audit Fixes
---
This file tracks progress on the critical issues identified by the holistic code audit.
#### Critical Priority 1: Authentication & Session Stability (Completed: 90%)
- [x] Migrate in-memory session (global.sessions) to Redis.
- [x] Implement Google ID token verification (GraphQL/REST).

#### Critical Priority 2: Architectural Integrity (In Progress)
- [x] Restore TypeScript source files for API backend.
  - Completed 2025-11-12: ported all GraphQL resolvers, session services, and the server bootstrap (`src/index.ts`) to TypeScript with successful recompilation and tests.
- [x] Fix root scripts targeting missing 'server/index.ts'.
  - Updated 2025-11-12: Root scripts now target `snipshift-next-restored/api/src/index.ts` for local dev, Doppler, and build workflows.
- [x] Break up overly complex 'mobile-api.ts' file.
  - Completed 2025-01-13: Refactored monolithic 1,166-line `mobile-api.ts` into maintainable service modules:
    - Created `mobileStorageService.ts` to replace non-existent `hybridStorage` module with proper database access abstraction
    - Extracted authentication logic into `mobileAuthService.ts` (login, register, refresh, session management)
    - Extracted job/marketplace logic into `mobileJobService.ts` (jobs, applications, saved shifts)
    - Extracted social/user profile logic into `mobileSocialService.ts` (social posts, user profiles)
    - Refactored `mobile-api.ts` to be a routing index (~300 lines) that delegates to service handlers
    - All endpoints remain unchanged for backward compatibility
    - File paths: `snipshift/server/services/mobileStorageService.ts`, `mobileAuthService.ts`, `mobileJobService.ts`, `mobileSocialService.ts`
- [x] Align mobile API (snipshift/server) with monorepo build structure.
  - Completed 2025-01-13: Aligned mobile API service structure for consistent compilation and module resolution:
    - Created `snipshift/server/tsconfig.json` with proper TypeScript configuration matching API tsconfig structure (commonjs, ES2021 target)
    - Created `snipshift/server/utils/logger.ts` to re-export appLogger and errorLogger from API logger, fixing broken imports
    - Updated `build:server` script in root package.json to compile both `snipshift-next-restored/api` and `snipshift/server` directories using project references
    - Ensures proper module resolution for Drizzle ORM and database imports from `snipshift-next-restored/api/src/`
    - File paths: `snipshift/server/tsconfig.json`, `snipshift/server/utils/logger.ts`, `snipshift/package.json`
- [x] Align test helpers (Cypress/Playwright) with actual API endpoints.
  - Completed 2025-11-03: Verified and documented that all test helpers are correctly using the `/api/testing/sessions` endpoint:
    - Cypress `cy.instantLogin()` and `cy.loginWithSession()` commands use `/api/testing/sessions` (lines 130, 217 in `snipshift/cypress/support/commands.ts`)
    - Playwright `loginAsUser()` helper uses `/api/testing/sessions` (line 99 in `snipshift/tests/utils/auth-helpers.ts`)
    - All helpers properly send session payload with userId, email, roles, currentRole, provider, and mode
    - Debug test files that intercept `/api/login` are intentionally testing UI login flow, separate from programmatic helpers
    - File paths: `snipshift/cypress/support/commands.ts`, `snipshift/tests/utils/auth-helpers.ts`
- [x] Implement VITE proxy configuration for API connectivity.
  - Completed 2025-01-13: Added proxy configuration to VITE dev server to forward `/api` and `/graphql` requests from client (port 3002) to backend API (port 5000):
    - Added `server.proxy` block to `vite.config.ts` with proxy rules for `/api` and `/graphql` endpoints
    - Configured both proxies to target `http://localhost:5000` with `changeOrigin: true` and `secure: false` for local development
    - Resolves API connectivity mismatch between VITE client and backend server
    - File path: `snipshift/vite.config.ts`

#### Critical Priority 3: Frontend Module Health
- [ ] Restore or implement missing shared/UI components (e.g., '@shared/types', '@/components/ui/button').
  - [x] Recreated `Job` and `User` interfaces within `@shared/types` to unblock marketplace modules (2025-11-12).

#### Critical Priority 4: E2E Test Infrastructure
- [x] Restore missing Cypress test fixture files to unblock E2E test execution.
  - Completed 2025-11-12: Created critical test fixture files required by Cypress E2E suite:
    - Created `cypress/fixtures/users.json` with testUsers (professional, hub, business, admin) and testJob data structure
    - Created `cypress/fixtures/snipshift-v2-test-data.json` with users (shop, professional, hub), jobs, social_posts, and subscriptionPlans
    - Fixtures match expected structure used by test files (hubOwnerApplications.cy.ts, professionalApplications.cy.ts, paymentSubscriptionFlow.cy.ts)
    - File paths: `snipshift/cypress/fixtures/users.json`, `snipshift/cypress/fixtures/snipshift-v2-test-data.json`

---
Tracking file created and pre-populated with initial status.
