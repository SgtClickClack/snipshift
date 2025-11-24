#### 2025-11-24: Backend Core Logic Tests Implementation

**Core Components Implemented:**
- `api/_src/tests/applications.test.ts`
- `api/_src/tests/payments.test.ts`
- `TEST_COVERAGE_PLAN.md`

**Key Features**
- **Applications Testing**:
  - Implemented integration tests for `POST /api/jobs/:id/apply` (Apply for a job).
  - Implemented integration tests for `GET /api/me/applications` (List my applications).
  - Validated success, not found, and duplicate application scenarios.
- **Payments Testing**:
  - Implemented integration tests for `POST /api/subscriptions/checkout`.
  - Mocked Stripe SDK (`stripe.checkout.sessions.create`) to avoid external API calls.
  - Validated session creation and error handling for invalid plans/existing subscriptions.
- **Coverage Update**:
  - Updated `TEST_COVERAGE_PLAN.md` to reflect new tests and coverage status (~21%).
  - Identified uncovered logic in `index.ts` and route gaps.

**Integration Points**
- `vitest` test runner
- `drizzle-orm` (mocked)
- `stripe` SDK (mocked)

**File Paths**
- `api/_src/tests/applications.test.ts`
- `api/_src/tests/payments.test.ts`
- `TEST_COVERAGE_PLAN.md`

**Next Priority Task**
- Address uncovered repository logic by implementing database seeding for tests.

Expected completion time: N/A

### 2025-11-24: Refactor Monolithic Index & Extract Routes

Refactored `api/_src/index.ts` to improve maintainability and testability by extracting inline route handlers into dedicated router modules.

**Core Components Implemented:**
- `api/_src/routes/webhooks.ts`: Extracted Stripe webhook handling.
- `api/_src/routes/admin.ts`: Extracted admin-related endpoints (stats, users, jobs, reports).
- `api/_src/index.ts`: Cleaned up entry point to mount new routers.

**File Paths:**
- `api/_src/index.ts`
- `api/_src/routes/webhooks.ts`
- `api/_src/routes/admin.ts`

**Next Priority Task:**
- Continue adding tests for the newly extracted routes and remaining coverage gaps.

Expected completion time: 30 mins