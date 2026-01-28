# Targeted Logic Audit — Critical Files

**Date:** 2026-01-28  
**Scope:** Security and financial logic on three critical paths.

---

## 1. STRIPE — `api/_src/routes/stripe.ts` (Payout security)

### Findings

- **stripeAccountId source:** Only set from server-side. `accountId` comes from `stripeConnectService.createConnectAccountWithIdentity(...)`; `updateUser(userId, { stripeAccountId: accountId })` uses `userId` from `req.user?.id`. No request body or query parameter is used for `stripeAccountId`.
- **ID guessing:** No endpoint in this file (or in `stripe-connect.ts`) accepts `stripeAccountId` from the client. Same pattern in `stripe-connect.ts`: account ID is always created by Stripe and then stored for the authenticated user.
- **Residual risk:** `users.repository.updateUser(id, userData)` accepts `Partial<typeof users.$inferSelect>`, so it *could* set `stripeAccountId` if any caller passed it. Current user routes (PUT /me, settings, onboarding) only pass validated, explicit fields and do not include `stripeAccountId`. Risk is future regressions or a new route that forwards body to `updateUser`.

**Verdict:** Payout path is currently safe from ID guessing; hardening should prevent sensitive fields from ever being updated via generic profile/settings flows.

---

## 2. ROLES — `api/_src/repositories/shifts.repository.ts` (Role enforcement)

### Findings

- **createShift:** Accepts `role?: string` and persists `shiftData.role || null`. No normalization to `business` and no check that the creator is a business.
- **Caller:** `api/_src/routes/shifts.ts` POST `/` uses `employerId: userId` (so the creator is the employer) but does **not** check that the user has role `business` (or `roles` including `business`) before calling `createShift`. Any authenticated user can create a shift and become the employer.
- **Normalization:** `normalizeRole` exists in `users.repository` (venue → business, etc.) but is not used in the shifts route for shift creation. Shift creation is **not** strictly limited to users with `business` role after normalization.

**Verdict:** Role enforcement for “only business can create shifts” is missing at the route layer. Repository does not enforce or normalize role for creation.

---

## 3. PRIVACY — `src/components/common/GlobalErrorBoundary.tsx` (Data leaks)

### Findings

- **UI:** The boundary does **not** render `error` or `error.stack` in the DOM. Users do not see stack traces in the UI.
- **Logging:** `componentDidCatch` calls:
  - `console.error('[GlobalErrorBoundary] Uncaught error:', error);`
  - `console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);`
  In production, these can be collected by log aggregation (e.g. Sentry, CloudWatch, browser console export) and **leak stack traces and component hierarchy**.
- **Comparison:** `ErrorFallback.tsx` correctly gates technical details (message + stack) with `process.env.NODE_ENV === 'development'`. GlobalErrorBoundary does not gate or strip before logging.

**Verdict:** Stack traces are not stripped in production; they are logged in full and can leak via logs. Behavior should be aligned with production-safe logging (e.g. strip stack or log only in dev).

---

# 3-Point Hardening Plan

### 1. Stripe / Payout — Lock sensitive fields in user updates

- **Goal:** Prevent `stripeAccountId` (and other sensitive financial/identity fields) from ever being set via generic profile/settings updates.
- **Action:** In `api/_src/repositories/users.repository.ts`, change `updateUser` to use a **whitelist** of allowed keys for general updates. Do **not** allow `stripeAccountId`, `stripeCustomerId`, `stripeOnboardingComplete`, `firebaseUid`, or other sensitive fields in that whitelist. Introduce a separate internal function (e.g. `updateUserStripeFields`) or allowlist used only by Stripe/Connect routes that can set Stripe-related fields, and keep the public `updateUser` contract to profile/settings fields only.
- **Result:** Even if a future route mistakenly forwards `req.body` to `updateUser`, ID guessing or overwriting Stripe state will not be possible.

### 2. Roles — Enforce business role for shift creation

- **Goal:** Ensure only users with `business` role (after normalization) can create shifts.
- **Action:** In `api/_src/routes/shifts.ts`, before creating a shift (single or recurring), load the current user (if not already available with roles), normalize role (e.g. via `normalizeRole` and existing roles array), and require that the user has role `business` (or `roles` includes `business`). Return `403 Forbidden` with a clear message if the user is not a business. Optionally, in `shifts.repository.createShift`, when the caller is the employer, set or normalize `role` to `'business'` for the shift so that stored data is consistent.
- **Result:** Shift creation is strictly gated by business role after normalization; no professional-only user can create shifts as employer.

### 3. Privacy — Strip stack traces in production in GlobalErrorBoundary

- **Goal:** Avoid leaking stack traces and component stacks in production logs.
- **Action:** In `src/components/common/GlobalErrorBoundary.tsx`, in `componentDidCatch`, check the environment (e.g. `import.meta.env.PROD` or `process.env.NODE_ENV === 'production'`). In production: log only a short, generic message (e.g. “Uncaught error”) and optionally `error.message` **without** `error` (so no stack) and **without** `errorInfo.componentStack`. In development: keep current behavior (full error and component stack in console).
- **Result:** Production logs no longer contain stack traces or component hierarchy from this boundary; behavior is consistent with ErrorFallback’s dev-only technical details.

---

**Summary**

| Area        | Current status                         | Hardening focus                                  |
|------------|----------------------------------------|--------------------------------------------------|
| Stripe     | Safe from ID guessing; repo is permissive | Whitelist allowed fields in `updateUser`; separate Stripe-only updates |
| Shifts     | No business-role check on create       | Require business role at route; optional repo normalization |
| ErrorBoundary | Stack traces logged in all envs      | Strip stack / component stack in production logs |
