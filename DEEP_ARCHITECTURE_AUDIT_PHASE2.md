# HospoGo Deep Architecture & Transactional Logic Audit (Phase 2)

**Audit Date:** January 13, 2026  
**Auditor Role:** Principal Software Architect & Financial Systems Expert  
**Project:** HospoGo (formerly SnipShift)

---

## Executive Summary

This audit examines critical transactional integrity, concurrency handling, subscription lifecycle management, and platform trust mechanics in the HospoGo codebase. The findings reveal both strong architectural patterns and significant gaps that require attention before scaling.

### Transactional Integrity Score: **7.5/10**

| Area | Score | Status |
|------|-------|--------|
| Shift Claim Concurrency | 9/10 | ✅ Excellent |
| Subscription Downgrade Logic | 4/10 | 🔴 Critical Gap |
| Onboarding State Recovery | 6/10 | 🟡 Moderate Risk |
| Review Bombing Protection | 7/10 | 🟡 Partial Coverage |
| Data Privacy (Contact Leakage) | 5/10 | 🟡 Platform Leakage Risk |
| Environment Variable Security | 9/10 | ✅ Well Protected |

---

## 1. Shift Concurrency Analysis

### Finding: ✅ EXCELLENT - Database-Level Race Condition Protection

**Location:** `api/_src/routes/shifts.ts` (Lines 1399-1425)

The shift acceptance flow implements **atomic UPDATE with conditional WHERE** clause:

```typescript
// Lines 1401-1415: Atomic update with race condition protection
const [updatedShift] = await db
  .update(shifts)
  .set({
    assigneeId: userId,
    status: 'confirmed',
    paymentStatus: 'AUTHORIZED',
    // ... other fields
  })
  .where(and(
    eq(shifts.id, id),
    sql`${shifts.assigneeId} IS NULL`  // Critical: atomic check
  ))
  .returning();
```

**Analysis:**
- ✅ Uses PostgreSQL's row-level locking during UPDATE
- ✅ The `WHERE assigneeId IS NULL` check is part of the atomic UPDATE statement
- ✅ If another transaction claims the shift first, `returning()` returns empty array
- ✅ Returns HTTP 409 Conflict with "Already Taken" message

**Playwright Gap:** E2E tests cannot easily simulate sub-millisecond race conditions. Recommend adding load tests with Artillery or k6.

---

## 2. Stripe Webhook & Subscription Downgrade Logic

### Finding: 🔴 CRITICAL GAP - No Auto-Downgrade After Failed Payment

**Location:** `api/_src/routes/webhooks.ts` (Lines 169-189)

```typescript
case 'invoice.payment_failed': {
  // ...
  await subscriptionsRepo.updateSubscription(subscription.id, {
    status: 'past_due',  // Only sets status, NO DOWNGRADE
  });
  console.warn(`⚠️  Payment failed for subscription ${subscription.id}`);
  break;
}
```

**Current Behavior:**
- When a Business user's subscription payment fails after 14-day trial:
  - Status changes to `past_due`
  - **User retains Business perks** (booking fee waiver continues)
  - No automatic downgrade to Starter tier
  - $20 booking fee is NOT re-enabled

**Business Impact:**
- Revenue leakage: Venues can use Business features indefinitely without paying
- Stripe will eventually cancel after multiple failed attempts, but `customer.subscription.deleted` only marks as `canceled`, still no fee re-enablement

**Recommended Fix:**

```typescript
case 'invoice.payment_failed': {
  const invoice = event.data.object as any;
  const stripeSubscriptionId = invoice.subscription;
  const attemptCount = invoice.attempt_count || 1;

  // After 3 failed attempts (Stripe default), downgrade to Starter
  if (attemptCount >= 3) {
    await subscriptionsRepo.updateSubscription(subscription.id, {
      status: 'canceled',
      canceledAt: new Date(),
    });
    
    // Notify venue owner of downgrade
    await notificationsService.notifyVenueOfDowngrade(
      subscription.userId,
      'Your Business subscription has been canceled due to payment failure. ' +
      'A $20 booking fee will now apply to each shift booking.'
    );
    
    console.warn(`⚠️ Subscription ${subscription.id} downgraded to Starter after payment failure`);
  } else {
    await subscriptionsRepo.updateSubscription(subscription.id, {
      status: 'past_due',
    });
  }
  break;
}
```

---

## 3. Onboarding State Recovery (Zombie Account Analysis)

### Finding: 🟡 MODERATE RISK - Partial Recovery, But Functional Zombies Possible

**Location:** `src/pages/onboarding/hub.tsx` (Lines 297-337)

**Scenario:** Venue Owner closes browser during Stripe Payment step (Step 2)

**Current State Machine:**

```
Step 1: Venue Details → API POST /api/users/role (Hub role assigned)
Step 2: Payment Setup → SetupIntent created, awaiting card input
Step 3: Subscription Creation → POST /api/subscriptions/create-with-trial
```

**Analysis of Failure Points:**

| Failure Point | State After | Recovery Path |
|---------------|-------------|---------------|
| Browser closes after Step 1 | Hub role ✓, No subscription | ✅ Can visit /hub-dashboard |
| Browser closes during Step 2 | Hub role ✓, SetupIntent orphaned | ✅ Can subscribe from Wallet |
| Network error in Step 3 | Hub role ✓, Payment method saved | 🟡 Navigates to dashboard anyway (L324-333) |

**Lines 324-333 show graceful degradation:**
```typescript
} catch (error: any) {
  // ...
  // Still navigate to dashboard even if subscription fails
  clearSessionStorage();
  navigate('/hub-dashboard');  // User can function as Starter tier
}
```

**Zombie Prevention:**
- ✅ No hard zombie state (user can always access dashboard)
- ✅ Can subscribe later from Wallet page
- 🟡 No pending onboarding indicator in dashboard

**Recommendation:** Add an "onboarding incomplete" banner to hub-dashboard when subscription is missing for users who selected Business/Enterprise plan.

---

## 4. Marketplace Trust Logic (Review Bombing)

### Finding: 🟡 PARTIAL COVERAGE - Missing Relationship Verification

**Location:** `api/_src/routes/shifts.ts` (Lines 2526-2665) & `api/_src/repositories/shift-reviews.repository.ts`

**Current Protections:**

```typescript
// Line 2584: Duplicate review check
const hasReviewed = await shiftReviewsRepo.hasUserReviewedShift(shiftId, userId, reviewData.type);
if (hasReviewed) {
  res.status(409).json({ message: 'You have already reviewed this shift' });
  return;
}
```

**What's Checked:**
- ✅ One review per shift per user per type (SHOP_REVIEWING_BARBER / BARBER_REVIEWING_SHOP)
- ✅ Review type must match user role (shop can't submit barber review)
- ✅ Shift must exist

**What's NOT Checked:**
- ❌ Staff reviewing venue they were never confirmed for
- ❌ Venue reviewing staff who never worked the shift
- ❌ Reviews for shifts in `draft` or `open` status (before work completed)

**Vulnerability Scenario:**
A malicious user could theoretically review a shift they were *invited* to but never *confirmed* for, if the relationship check only validates shift existence.

**Review of Line 2547-2558:**
```typescript
// Verify user is authorized to review this shift
const isShop = shift.employerId === userId;
const isBarber = shift.assigneeId === userId;

if (!isShop && !isBarber) {
  res.status(403).json({ message: 'You are not authorized to review this shift' });
  return;
}
```

**✅ Actually Protected:** The check uses `assigneeId` which is only set when shift is confirmed. Invited-but-not-accepted users won't have `assigneeId` matching.

**Remaining Gap:** No shift status check. Could technically review a `cancelled` shift.

**Recommendation:**
```typescript
// Add status check
if (shift.status !== 'completed' && shift.status !== 'pending_completion') {
  res.status(400).json({ message: 'Can only review completed shifts' });
  return;
}
```

---

## 5. Data Privacy Analysis (Platform Leakage Risk)

### Finding: 🟡 CONTACT DETAILS EXPOSED BEFORE CONFIRMATION

**Location:** `api/_src/routes/shifts.ts` (Lines 480-504)

```typescript
// GET /:id/applications - Returns to shift OWNER
const transformed = applications.map((app) => {
  const user = app.user;
  return {
    id: app.id,
    name: app.name,
    email: app.email,          // ⚠️ EXPOSED BEFORE CONFIRMATION
    coverLetter: app.coverLetter,
    // ...
    applicant: user ? {
      id: user.id,
      name: user.name,
      email: user.email,        // ⚠️ EXPOSED BEFORE CONFIRMATION
      avatarUrl: user.avatarUrl,
    } : null,
  };
});
```

**Platform Leakage Scenario:**
1. Venue posts shift
2. Multiple professionals apply
3. Venue sees all applicant emails in application list
4. Venue contacts professionals directly via email
5. HospoGo loses commission on future bookings

**Mitigation Strategy:**

| Data Field | Before Confirmation | After Confirmation |
|------------|--------------------|--------------------|
| Name | ✅ Show | ✅ Show |
| Profile Photo | ✅ Show | ✅ Show |
| Email | ❌ Mask as `j***@g***.com` | ✅ Show |
| Phone | ❌ Hide completely | ✅ Show |
| Reviews/Rating | ✅ Show | ✅ Show |

**Recommended Code Change:**

```typescript
// Helper function for email masking
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0].charAt(0) + '***.' + domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomain}`;
}

// In applications endpoint
const transformed = applications.map((app) => {
  const isConfirmed = shift.status === 'confirmed' && shift.assigneeId === app.userId;
  
  return {
    ...app,
    email: isConfirmed ? app.email : maskEmail(app.email),
    phone: isConfirmed ? (user?.phone || null) : null,
  };
});
```

---

## 6. Environment Variable Security

### Finding: ✅ WELL PROTECTED

**Frontend Analysis:**

| Variable | Exposure | Risk |
|----------|----------|------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ Client-safe (pk_*) | None - designed for frontend |
| `VITE_FIREBASE_API_KEY` | ✅ Client-safe | None - Firebase designed for client |
| `STRIPE_SECRET_KEY` | ❌ Never in frontend | Correct |
| `STRIPE_WEBHOOK_SECRET` | ❌ Never in frontend | Correct |

**Code Evidence:**
- `src/lib/firebase.ts` - Uses `VITE_` prefix correctly
- `src/pages/onboarding/hub.tsx:19` - Uses publishable key only
- `src/components/payments/billing-settings.tsx:14` - Uses publishable key only

**Backend Verification:**
- API routes import `stripe` from server-side lib, not exposed to client
- Webhook secret used only in server-side verification

---

## 7. Legacy Code Detection

### Remaining Legacy Patterns Found

| File | Legacy Pattern | Impact |
|------|----------------|--------|
| `api/_src/db/schema.ts:54` | `jobRoleEnum` with barber/hairdresser | Low - Deprecated enum |
| `api/_src/routes/shifts.ts` | `getShiftsByAssignee` fallback | Low - Backward compat |
| `api/_src/repositories/applications.repository.ts` | `shouldFallbackToJobsOnly` | Medium - Complex fallback |

The codebase shows evidence of migration from a barber/salon model to hospitality (`hospitalityRoleEnum`). Most legacy patterns are properly isolated with fallback handlers.

---

## 8. Platform Leakage Prevention Features (Recommended)

### 3 Features to Add

1. **In-Platform Messaging System**
   - All communication between venues and staff happens in-app
   - Email/phone revealed only after shift completion
   - Creates audit trail for disputes

2. **Shift Completion Verification Gate**
   - Staff must "check in" via GPS or QR code
   - Venue must "confirm arrival" for shift to be payable
   - Both parties must complete to unlock contact details

3. **Repeat Booking Incentives**
   - "Book Again" button after successful shift
   - Loyalty discounts for repeat pairings through platform
   - Make staying on-platform more attractive than off-platform

---

## 9. Corner Cases Playwright Would Miss

| Corner Case | Why Playwright Misses It | Impact |
|-------------|-------------------------|--------|
| Sub-millisecond shift claim race | Can't simulate precise timing | Double-booking |
| Stripe webhook retry storm | Requires webhook simulation | Duplicate records |
| Trial-end grace period edge | Time-based, hard to test | Free Business perks |
| Payment method expiration | Requires real card lifecycle | Silent payment failures |
| Firebase token refresh edge | Auth timing is non-deterministic | Intermittent 401s |
| Timezone DST shift overlap | Date math edge case | Wrong shift times |

---

## 10. Action Items Summary

### 🔴 Critical (Fix Before Launch)
1. **Add subscription downgrade logic** to `webhooks.ts` for payment failures
2. **Mask applicant emails** until shift is confirmed

### 🟡 High Priority (Fix Within 2 Weeks)
3. **Add shift status check** before allowing reviews
4. **Add "onboarding incomplete" banner** for hub users without subscription
5. **Implement load testing** for shift claim concurrency

### 🟢 Medium Priority (Roadmap Items)
6. **Build in-platform messaging** to reduce leakage incentive
7. **Add shift completion verification gate**
8. **Create repeat booking incentive system**

---

## Appendix: Files Reviewed

- `api/_src/routes/shifts.ts` (2726 lines)
- `api/_src/routes/webhooks.ts` (381 lines)
- `api/_src/repositories/subscriptions.repository.ts` (205 lines)
- `api/_src/repositories/shift-reviews.repository.ts` (212 lines)
- `api/_src/repositories/reviews.repository.ts` (165 lines)
- `api/_src/repositories/applications.repository.ts` (659 lines)
- `api/_src/db/schema.ts` (529 lines)
- `src/pages/onboarding/hub.tsx` (567 lines)
- `src/pages/Onboarding.tsx` (259 lines)
- `src/lib/firebase.ts` (157 lines)

---

*Generated by HospoGo Architecture Audit System*  
*Audit Version: Phase 2.0*
