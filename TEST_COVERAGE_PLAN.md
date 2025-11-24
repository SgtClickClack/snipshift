# Test Coverage & Audit Plan

## Status Overview

**Date:** November 24, 2025
**Project:** Snipshift API
**Test Runner:** Vitest (configured with `@vitest/coverage-v8`)
**Current Health:** ✅ **Stable**. Global Error Handling verified. Critical path tests passing.
**Overall Coverage:** **38.41%** (Lines).

## Coverage Breakdown

| File/Module | Coverage (Lines) | Status |
|-------------|------------------|--------|
| **Middleware** | | |
| `_src/middleware/errorHandler.ts` | **70.58%** | 🟢 Verified |
| **Repositories** | | |
| `_src/repositories/users.repository.ts` | **53.84%** | 🟢 Verified |
| `_src/repositories/jobs.repository.ts` | **40.67%** | 🟢 Verified |
| `_src/repositories/applications.repository.ts` | **37.93%** | 🟢 Verified |
| `_src/repositories/subscriptions.repository.ts` | **31.37%** | 🟢 Verified |
| `_src/repositories/conversations.repository.ts` | **57.89%** | 🟢 Verified |
| `_src/repositories/messages.repository.ts` | **76.00%** | 🟢 Verified |
| **Services** | | |
| `_src/services/email.service.ts` | **53.57%** | 🟢 Verified |
| `_src/services/notification.service.ts` | **68.75%** | 🟢 Strong |
| **Routes** | | |
| `_src/routes/webhooks.ts` | **69.62%** | 🟢 Strong |
| `_src/routes/admin.ts` | **66.33%** | 🟢 Verified |

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

### Remaining Gaps (Future)
- `payments.repository.ts` (0%)
- `reviews.repository.ts` (0%)
- `notifications.repository.ts` (0%)
- `reports.repository.ts` (0%)
