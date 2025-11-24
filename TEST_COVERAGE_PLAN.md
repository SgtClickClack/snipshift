# Test Coverage & Audit Plan

## Status Overview

**Date:** November 24, 2025
**Project:** Snipshift API
**Test Runner:** Vitest (configured with `@vitest/coverage-v8`)
**Current Health:** ✅ **Stable**. All critical path tests are passing (Auth, Jobs, Chats, Applications, Payments).
**Overall Coverage:** ~21% (Routes covered, Repositories mocked).

## Critical Path Audit

### 1. Authentication & User Management
- **Status:** ✅ Passed
- **Files:** `_src/routes/users.ts`, `_src/index.ts`
- **Tests Implemented:**
  - `POST /api/login`: Verified (Success & Failure cases).
  - `POST /api/register`: Verified (Success & Duplicate cases).
- **Notes:**
  - Mocks for `usersRepository` and `firebase` are working correctly using `vi.mock` with factory functions to avoid hoisting issues.

### 2. Messaging / Chats
- **Status:** ✅ Passed
- **Files:** `_src/routes/chats.ts`
- **Tests Implemented:**
  - `GET /api/chats/user/:id`: Verified (Success & Auth check).
- **Resolution:**
  - Fixed 404 issue by ensuring correct mock implementation for middleware.
  - Fixed mock hoisting issues by defining mocks inside `vi.mock` factory.

### 3. Core Business Logic
- **Status:** ✅ Passed (Integration Layer)
- **Files:** `_src/index.ts` (routes)
- **Tests Implemented:**
  - `POST /api/jobs`: Verified creation flow.
  - `GET /api/jobs`: Verified list flow.
  - `GET /api/jobs/:id`: Verified detail flow.
  - `POST /api/jobs/:id/apply`: Verified application flow (Success, NotFound, Duplicate).
  - `GET /api/me/applications`: Verified list applications flow.
  - `POST /api/subscriptions/checkout`: Verified checkout session creation (Mocked Stripe).

## Uncovered Lines Report (Route Files)
- `_src/index.ts`: ~23% coverage.
  - **Major Gaps:**
    - `GET /api/applications` (Admin/Professional dashboard view).
    - `POST /api/credits/purchase` (Alternative payment flow).
    - Error handling branches where database fallbacks are triggered (e.g., lines 744, 851).
    - Webhook handlers (`POST /api/webhooks/stripe`).
    - Admin endpoints (`/api/admin/*`).

## Coverage Gaps (0% Coverage)
The following areas have **0%** coverage because they are mocked in the integration tests. To increase coverage, we need to implement **Unit Tests** for these files or switch to a Test Database strategy.

| Priority | Area | Key Files | Risk Level |
|----------|------|-----------|------------|
| 1 | **Repositories** | `_src/repositories/*.ts` | Medium (Logic is simple SQL wrappers) |
| 2 | **Services** | `_src/services/email.service.ts`, `notification.service.ts` | Low (External integrations) |
| 3 | **DB Schema** | `_src/db/schema.ts` | Low |

## Action Plan

### Completed
- [x] Setup Vitest & Coverage
- [x] Implement Auth Tests
- [x] Implement Chat Tests
- [x] Implement Job Tests
- [x] Implement Applications Tests
- [x] Implement Payments Tests
- [x] Fix Mock Hoisting Issues

### Next Steps
1.  **Database Seeding for Tests:** Instead of mocking repositories, configure a **test database** (Docker or temporary SQLite/Postgres) to test the actual `drizzle-orm` queries. This is the only way to get meaningful coverage for `repositories/*.ts`.
2.  **Full Coverage Report:** Configure `vitest.config.ts` to enforce coverage thresholds.
3.  **E2E Testing:** Implement Playwright tests for the full user journey.

## Configuration Notes

- **Vitest Config:** `api/vitest.config.ts` created with path aliases.
- **Mocks:** All mocks are now self-contained within test files using `vi.mock` factories.
