# Test Coverage & Audit Plan

## Status Overview

**Date:** November 25, 2025
**Project:** HospoGo API
**Test Runner:** Vitest (configured with `@vitest/coverage-v8`)
**Current Health:** ⚠️ **Attention Needed**. Core critical paths passed in previous runs, but v1.3.0 updates introduced regression in test stability (mocking issues).
**Overall Coverage:** **Unknown** (Last valid run: 36.91%). Current runs failing due to ESM mocking constraints.

## v1.3.0 Post-Release Audit (New)

**Goal:** Verify coverage for Real-time Notifications (SSE), Auth Query Params, and Mobile adjustments.

| Feature Area | File(s) | Status | Coverage Gap / Risk |
| :--- | :--- | :--- | :--- |
| **Real-time Notifications** | `_src/routes/notifications.ts` | 🔴 Failing | **High**. New route file. Tests implemented but failing due to auth mock issues. No verified coverage. |
| **Notification Logic** | `_src/services/notification.service.ts` | 🔴 Failing | **Medium**. Existing tests failing due to persistent DB connection attempts (mocking failure). |
| **Auth Query Params** | `_src/middleware/auth.ts` | ⚠️ Partial | **Low**. `authenticateUser` logic for `req.query.token` is not explicitly unit tested. `admin.test.ts` mocks this middleware, bypassing the logic. |
| **Notifications Repo** | `_src/repositories/notifications.repository.ts` | ⚠️ Untested | **Medium**. Listed as 0% in previous audit. Still 0% as new tests fail to mock it or integration tests are missing. |

### Findings & Recommendations
1.  **Mocking Architecture**: The current `vi.mock` strategy with relative ESM imports is fragile. Tests for `notification.service.ts` and `admin.test.ts` are hitting real dependencies (DB/Auth), causing failures.
    *   *Recommendation*: Refactor to Dependency Injection or use `__mocks__` directory pattern for robust mocking of Repositories and Middleware.
2.  **Auth Middleware**: New support for `req.query.token` (used by SSE) is crucial but verified only by inspection.
    *   *Recommendation*: Create `_src/tests/unit/auth.middleware.test.ts` to test `authenticateUser` in isolation.
3.  **SSE Routes**: `GET /stream` logic involves event emitters.
    *   *Recommendation*: Ensure `notificationBus` is properly mocked to verify event subscription/unsubscription without leaks.

## Coverage Breakdown (Previous Stable)

| File/Module | Coverage (Lines) | Status |
|-------------|------------------|--------|
| **Middleware** | | |
| `_src/middleware/errorHandler.ts` | **70.58%** | 🟢 Verified |
| **Repositories** | | |
| `_src/repositories/users.repository.ts` | **40.38%** | 🟢 Verified |
| `_src/repositories/jobs.repository.ts` | **40.67%** | 🟢 Verified |
| `_src/repositories/applications.repository.ts` | **37.93%** | 🟢 Verified |
| `_src/repositories/subscriptions.repository.ts` | **31.37%** | 🟢 Verified |
| `_src/repositories/conversations.repository.ts` | **57.89%** | 🟢 Verified |
| `_src/repositories/messages.repository.ts` | **76.00%** | 🟢 Verified |
| **Services** | | |
| `_src/services/email.service.ts` | **53.57%** | 🟢 Verified |
| `_src/services/notification.service.ts` | **68.75%** | 🔴 Regression (Failing) |
| **Routes** | | |
| `_src/routes/webhooks.ts` | **43.03%** | 🟢 Verified (Critical Path) |
| `_src/routes/admin.ts` | **66.00%** | 🔴 Regression (Failing) |

## Phase 3: Data Layer & Reliability

**Status:** ✅ **Completed**. All critical repositories and routes have integration tests.

| Priority | Area | Key Files | Reasoning |
| :---: | :--- | :--- | :--- |
| **1** | **Final Audit** | `TEST_COVERAGE_PLAN.md` | Final aggregation of coverage stats. |

## Critical Path Audit (Completed Phase 1 & 2)

### 1. Authentication & User Management
- **Status:** ✅ Passed
- **Files:** `_src/routes/users.ts`, `_src/index.ts`

### 2. Data Persistence (Repositories)
- **Status:** ✅ Passed
- **Infrastructure:** ✅ **Docker + Drizzle Integration Setup**.
- **Files:** `users`, `jobs`, `applications`, `subscriptions`, `conversations`, `messages`.
- **Tests Implemented:**
  - **Integration:** Full CRUD verification against real Postgres instance using `test:integration`.
  - **Relationships:** Verified Foreign Keys (Job -> User, App -> Job) and cascading deletes.

### 3. Payment & Subscriptions
- **Status:** ✅ Passed
- **Files:** `_src/routes/webhooks.ts`

### 4. Communication Services
- **Status:** ✅ Passed
- **Files:** `_src/services/email.service.ts`, `notification.service.ts`

### 5. Global Error Handling
- **Status:** ✅ Passed
- **Files:** `_src/middleware/errorHandler.ts`
- **Verification:** Verified 404/500/Async errors and production stack trace security.

## Action Plan

### Completed
- [x] Setup Vitest & Coverage
- [x] Implement Auth/Chat/Job/App Tests
- [x] Secure Admin Routes (Implemented `admin.test.ts`)
- [x] Secure Stripe Webhooks (Implemented `webhooks.test.ts`)
- [x] Unit Test Services (Implemented `services/*.test.ts`)
- [x] Setup Repository Integration Infrastructure (Docker, Global Setup)
- [x] **Implement Core Repository Tests:** (`jobs`, `applications`, `subscriptions`)
- [x] **Global Error Handling:** Verified `errorHandler.ts` logic explicitly.
- [x] **Admin Route Completion:** Added and tested all admin endpoints.
- [x] **Chat Repository Integration:** Implemented tests for `conversations.repository.ts` and `messages.repository.ts`.
- [x] **Final Coverage Scan:** Generated final heat map.

### Remaining Gaps (Future)
- `payments.repository.ts` (0%)
- `reviews.repository.ts` (0%)
- `notifications.repository.ts` (0%)
- `reports.repository.ts` (0%)
- **Fix ESM Mocking:** Resolve `vi.mock` issues to restore green CI.
