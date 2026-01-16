# HospoGo Launch Readiness Report
**Date:** 2026-01-16  
**Auditor Role:** Lead Systems Architect & Senior QA Engineer  
**Scope:** Production-Ready Global Scaling Audit

---

## Executive Summary

This audit examined five critical systems for HospoGo's marketplace platform: Marketplace Integrity (Post → Apply → Hire → Pay), Real-Time Reliability (Pusher), Geofencing & Clock-in, Internationalization & Standards (ISO 8601/4217), and Security & Auth.

**Overall Launch Readiness Score: 6.5/10** ⚠️

| System | Score | Status |
|--------|-------|--------|
| Marketplace Integrity | 7/10 | 🟡 Needs Attention |
| Real-Time Reliability | 6/10 | 🟡 Needs Attention |
| Geofencing & Clock-in | 2/10 | 🔴 **BLOCKER** |
| Internationalization | 7/10 | 🟡 Needs Attention |
| Security & Auth | 8/10 | 🟢 Mostly Secure |

---

## 1. Marketplace Integrity: Post → Apply → Hire → Pay Cycle

### ✅ Strengths

1. **Atomic Shift Claim Protection** (Lines 1485-1499 in `api/_src/routes/shifts.ts`)
   - Uses PostgreSQL row-level locking with `WHERE assigneeId IS NULL`
   - Prevents race conditions in first-to-accept scenarios
   - Returns HTTP 409 Conflict when shift already taken

2. **Idempotency Keys for Payment Intents** (Lines 417-419 in `api/_src/services/stripe-connect.service.ts`)
   - Uses `shift_payment_{shiftId}_{customerId}` pattern
   - Prevents double-charging on retries

3. **Application Approval Transaction** (Lines 261-327 in `api/_src/routes/applications.ts`)
   - Uses `FOR UPDATE` row locking
   - Auto-declines other pending applications atomically

### 🔴 [BLOCKER] Critical Issues

#### Issue 1.1: Payment Intent Created Before Atomic Shift Claim
**Location:** `api/_src/routes/shifts.ts:1445-1473`

**Problem:**
```typescript
// Payment intent created FIRST (lines 1448-1463)
paymentIntentId = await stripeConnectService.createAndConfirmPaymentIntent(...);

// THEN atomic shift claim happens (lines 1485-1499)
const [updatedShift] = await db.update(shifts).where(assigneeId IS NULL)...
```

**Impact:** If the atomic shift claim fails (e.g., another user claimed it), the PaymentIntent is already created and authorized, leaving orphaned payment authorizations.

**Recommendation:**
1. **Option A (Preferred):** Use a two-phase commit pattern:
   - Create PaymentIntent with `capture_method: 'manual'` and `confirm: false`
   - Perform atomic shift claim
   - If successful, confirm PaymentIntent; if failed, cancel PaymentIntent
   
2. **Option B:** Reverse the order:
   - Perform atomic shift claim first
   - Only create PaymentIntent if shift claim succeeds
   - Use database transaction to ensure both succeed or both fail

**Severity:** 🔴 **BLOCKER** - Financial integrity risk

---

#### Issue 1.2: Transaction Helper Doesn't Use Real Transactions
**Location:** `api/_src/db/transactions.ts:16-38`

**Problem:**
```typescript
// This is NOT a real transaction - just executes callbacks sequentially
export async function withTransaction<T>(callback: ...) {
  return await callback(db); // No BEGIN/COMMIT/ROLLBACK
}
```

**Impact:** Multi-step operations (e.g., application approval + shift assignment + auto-decline) are not atomic. If one step fails, partial state changes remain.

**Recommendation:**
Implement proper PostgreSQL transactions using `postgres-js`:
```typescript
import { sql } from 'drizzle-orm';
export async function withTransaction<T>(callback: ...) {
  const db = getDb();
  await db.execute(sql`BEGIN`);
  try {
    const result = await callback(db);
    await db.execute(sql`COMMIT`);
    return result;
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    throw error;
  }
}
```

**Severity:** 🟡 **HIGH** - Data consistency risk

---

#### Issue 1.3: Payment Status Desynchronization Risk
**Location:** `api/_src/routes/webhooks.ts:315-364`

**Problem:** Webhook handler updates `paymentStatus` to `PAID` independently of shift completion flow. If shift completion fails but webhook succeeds, status becomes inconsistent.

**Recommendation:**
- Add idempotency checks in webhook handler
- Verify shift status before updating payment status
- Use database constraints or triggers to enforce state machine

**Severity:** 🟡 **MEDIUM** - State consistency risk

---

### 🟡 [SCALABILITY] Recommendations

#### Recommendation 1.1: Add Composite Index for Shift Queries
**Location:** `api/_src/db/schema/shifts.ts:61`

**Current:** `statusStartTimeIdx: index('shifts_status_start_time_idx').on(table.status, table.startTime)`

**Recommendation:** Add index for common query pattern:
```typescript
assigneeStatusStartTimeIdx: index('shifts_assignee_status_start_time_idx')
  .on(table.assigneeId, table.status, table.startTime)
```

**Benefit:** Faster queries for "my upcoming shifts" and "available shifts for professional"

---

#### Recommendation 1.2: Add Payment Intent Status Index
**Location:** `api/_src/db/schema/shifts.ts:65`

**Current:** `paymentIntentIdIdx` exists but no composite index with payment status

**Recommendation:**
```typescript
paymentStatusIntentIdx: index('shifts_payment_status_intent_idx')
  .on(table.paymentStatus, table.paymentIntentId)
```

**Benefit:** Faster reconciliation queries for payment status checks

---

## 2. Real-Time Reliability: Pusher Implementation

### ✅ Strengths

1. **Connection State Management** (Lines 115-135 in `src/contexts/PusherContext.tsx`)
   - Properly binds to `connected`, `disconnected`, and `error` events
   - Sets connection state appropriately

2. **Cleanup on Unmount** (Lines 170-175)
   - Disconnects Pusher instance
   - Clears channels map
   - Resets connection state

3. **Channel Subscription Management** (Lines 179-226)
   - Tracks subscribed channels in `channelsRef`
   - Prevents duplicate subscriptions

### 🔴 [BLOCKER] Critical Issues

#### Issue 2.1: Memory Leak in Callback Sets
**Location:** `src/contexts/PusherContext.tsx:60-62, 260-286`

**Problem:**
```typescript
const messageCallbacksRef = useRef<Set<(message: Message) => void>>(new Set());
// Callbacks are added but never removed on component unmount
onMessage((callback) => {
  messageCallbacksRef.current.add(callback);
  return () => {
    messageCallbacksRef.current.delete(callback); // Only removed if caller calls cleanup
  };
});
```

**Impact:** If components using `onMessage` unmount without calling the cleanup function, callbacks accumulate in memory, causing:
- Memory leaks over time
- Duplicate event handling
- Performance degradation

**Recommendation:**
1. Add cleanup in `useEffect` return function:
```typescript
useEffect(() => {
  return () => {
    messageCallbacksRef.current.clear();
    shiftStatusCallbacksRef.current.clear();
    shiftInviteCallbacksRef.current.clear();
    errorCallbacksRef.current.clear();
  };
}, []);
```

2. Or use WeakMap/WeakSet for automatic garbage collection (if supported)

**Severity:** 🟡 **HIGH** - Memory leak risk

---

#### Issue 2.2: No Reconnection Strategy
**Location:** `src/contexts/PusherContext.tsx:120-135`

**Problem:** When connection fails, Pusher disconnects but there's no automatic reconnection with exponential backoff.

**Impact:** Users lose real-time updates after network hiccups and must refresh the page.

**Recommendation:**
Implement reconnection logic:
```typescript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

pusher.connection.bind('disconnected', () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    setTimeout(() => {
      pusher.connect();
      reconnectAttempts++;
    }, delay);
  }
});

pusher.connection.bind('connected', () => {
  reconnectAttempts = 0; // Reset on successful connection
});
```

**Severity:** 🟡 **MEDIUM** - User experience degradation

---

#### Issue 2.3: Channel Leak Risk
**Location:** `src/contexts/PusherContext.tsx:179-226`

**Problem:** If `leaveConversation` is not called before component unmount, channels remain subscribed server-side.

**Impact:** Unnecessary Pusher channel subscriptions consume quota and resources.

**Recommendation:**
Add cleanup in main `useEffect`:
```typescript
useEffect(() => {
  // ... existing connection logic ...
  
  return () => {
    // Unsubscribe from all channels
    channelsRef.current.forEach((channel, channelName) => {
      pusherRef.current?.unsubscribe(channelName);
    });
    channelsRef.current.clear();
    pusherRef.current?.disconnect();
    pusherRef.current = null;
  };
}, [user, token]);
```

**Severity:** 🟡 **MEDIUM** - Resource waste

---

### 🟡 [SCALABILITY] Recommendations

#### Recommendation 2.1: Implement Connection Pooling
For high-traffic scenarios, consider connection pooling or multiplexing to reduce Pusher connection overhead.

#### Recommendation 2.2: Add Connection Health Monitoring
Track connection uptime, reconnection frequency, and message delivery success rate for observability.

---

## 3. Geofencing & Clock-in: Brisbane-Based Validation

### 🔴 [BLOCKER] Critical Issues

#### Issue 3.1: Clock-in Endpoint Missing in Production
**Location:** Search results show clock-in only in test mocks (`tests/pro-marketplace.spec.ts:1259-1293`)

**Problem:** No actual `/api/shifts/:id/clock-in` endpoint found in `api/_src/routes/shifts.ts` or other route files.

**Impact:** 
- Staff cannot clock in for shifts
- Geofencing validation is not implemented
- Critical feature is non-functional

**Recommendation:**
Implement clock-in endpoint with geofencing:
```typescript
router.post('/:id/clock-in', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id: shiftId } = req.params;
  const userId = req.user?.id;
  const { latitude, longitude } = req.body;

  // 1. Verify shift exists and user is assignee
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift || shift.assigneeId !== userId) {
    res.status(403).json({ message: 'Unauthorized' });
    return;
  }

  // 2. Get venue coordinates from shift location
  if (!shift.lat || !shift.lng) {
    res.status(400).json({ message: 'Shift location not set' });
    return;
  }

  // 3. Calculate distance using Haversine formula
  const distance = calculateDistance(
    latitude,
    longitude,
    parseFloat(shift.lat.toString()),
    parseFloat(shift.lng.toString())
  );

  // 4. Validate within 100 meters (configurable)
  const MAX_DISTANCE_METERS = 100;
  if (distance > MAX_DISTANCE_METERS) {
    res.status(403).json({
      error: 'TOO_FAR_FROM_VENUE',
      message: `You must be within ${MAX_DISTANCE_METERS} meters of the venue to clock in`,
      distance: Math.round(distance)
    });
    return;
  }

  // 5. Record clock-in time
  await shiftsRepo.updateShift(shiftId, {
    clockInTime: new Date(),
    attendanceStatus: 'completed'
  });

  res.json({
    success: true,
    clockInTime: new Date().toISOString(),
    message: 'Clocked in successfully'
  });
}));
```

**Severity:** 🔴 **BLOCKER** - Feature not implemented

---

#### Issue 3.2: Geofencing Logic Only in Tests
**Location:** `tests/pro-marketplace.spec.ts:1245-1256`

**Problem:** Haversine distance calculation exists only in test mocks, not in production code.

**Recommendation:**
Create shared utility:
```typescript
// api/_src/utils/geofencing.ts
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}
```

**Severity:** 🔴 **BLOCKER** - Missing production implementation

---

#### Issue 3.3: No Spoof-Proof Validation
**Problem:** Client-sent coordinates can be spoofed. No server-side validation of GPS accuracy, timestamp freshness, or device location services.

**Recommendation:**
1. **Require GPS accuracy metadata:**
   ```typescript
   const { latitude, longitude, accuracy, timestamp } = req.body;
   if (accuracy > 50) { // Require accuracy within 50 meters
     res.status(400).json({ message: 'GPS accuracy insufficient' });
     return;
   }
   ```

2. **Validate timestamp freshness:**
   ```typescript
   const locationAge = Date.now() - timestamp;
   if (locationAge > 60000) { // Location must be < 1 minute old
     res.status(400).json({ message: 'Location data too old' });
     return;
   }
   ```

3. **Consider additional signals:**
   - IP geolocation cross-check (for basic validation)
   - Device motion sensors (if available via API)
   - Historical location patterns (anomaly detection)

**Severity:** 🟡 **HIGH** - Security vulnerability

---

#### Issue 3.4: Missing Clock-in Time Field in Schema
**Location:** `api/_src/db/schema/shifts.ts:23-67`

**Problem:** No `clockInTime` field in shifts table schema.

**Recommendation:**
Add migration:
```sql
ALTER TABLE shifts ADD COLUMN clock_in_time TIMESTAMP;
CREATE INDEX shifts_clock_in_time_idx ON shifts(clock_in_time);
```

**Severity:** 🟡 **MEDIUM** - Schema gap

---

## 4. Internationalization & Standards: ISO 8601 & ISO 4217

### ✅ Strengths

1. **ISO 8601 Timestamp Handling** (`api/_src/lib/date.ts`, `src/utils/date-formatter.ts`)
   - `toISOStringSafe()` utility handles various date formats
   - Consistent ISO 8601 output across API responses
   - Brisbane timezone conversion using `Intl.DateTimeFormat`

2. **ISO 4217 Currency Support** (`src/utils/currency-formatter.ts`)
   - Supports multiple currencies with proper locale mapping
   - Uses ISO 4217 codes (AUD, USD, EUR, etc.)

### 🟡 [SCALABILITY] Issues

#### Issue 4.1: Currency Hardcoded in Payment Flows
**Location:** `api/_src/routes/shifts.ts:1450, 1777`

**Problem:**
```typescript
paymentIntentId = await stripeConnectService.createAndConfirmPaymentIntent(
  shiftAmount,
  'aud', // Hardcoded - should be configurable
  ...
);
```

**Impact:** Cannot support multi-currency operations if expanding to other markets.

**Recommendation:**
1. Store currency in shift/job schema (add `currency` column)
2. Default to AUD for Brisbane, but allow override
3. Validate currency against ISO 4217 list

**Severity:** 🟡 **MEDIUM** - Scalability limitation

---

#### Issue 4.2: Currency Schema Default Mismatch
**Location:** `api/_src/db/schema.ts:301` vs `api/_src/routes/shifts.ts:1450`

**Problem:**
- Schema default: `currency: varchar('currency', { length: 3 }).notNull().default('usd')`
- Payment code uses: `'aud'`

**Impact:** Inconsistent currency defaults could cause payment failures.

**Recommendation:**
1. Update schema default to `'aud'` for Australian market
2. Or remove default and require explicit currency in all payment operations

**Severity:** 🟡 **MEDIUM** - Data consistency risk

---

#### Issue 4.3: Hardcoded Currency in Earnings Page
**Location:** `src/pages/earnings.tsx:158-163`

**Problem:**
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { // Hardcoded locale
    style: 'currency',
    currency: 'USD', // Hardcoded currency
  }).format(amount);
};
```

**Impact:** Earnings display shows USD instead of AUD for Australian users.

**Recommendation:**
Use shared currency formatter:
```typescript
import { formatCurrency } from '@/utils/currency-formatter';
// formatCurrency(amount, 'AUD')
```

**Severity:** 🟡 **LOW** - UI inconsistency

---

#### Issue 4.4: Missing Timezone in Database Timestamps
**Location:** `api/_src/db/schema/shifts.ts:30-31`

**Problem:** Timestamps stored as `timestamp` without timezone (`TIMESTAMP` vs `TIMESTAMPTZ`).

**Impact:** Ambiguity when interpreting stored times across timezones.

**Recommendation:**
Use `timestamptz` (timestamp with timezone) for all timestamp columns:
```typescript
startTime: timestamp('start_time', { withTimezone: true }).notNull(),
```

**Severity:** 🟡 **MEDIUM** - Data integrity risk

---

## 5. Security & Auth: Firebase & Bi-Directional Rating System

### ✅ Strengths

1. **Firebase Authentication Integration** (`api/_src/middleware/auth.ts`)
   - Proper token verification
   - User lookup with error handling
   - Auto-user creation for valid tokens

2. **Pusher Channel Authorization** (`api/_src/routes/pusher.ts:34-59`)
   - Validates channel name patterns
   - Verifies user access to conversations
   - Prevents unauthorized channel subscriptions

3. **Route Protection** (`api/_src/middleware/auth.ts:30-53`)
   - Admin role checks
   - Email-based admin list
   - Proper 401/403 responses

### 🟡 [VULNERABILITY] Issues

#### Issue 5.1: Rating System Allows Duplicate Reviews by Type
**Location:** `api/_src/routes/shifts.ts:2700-2705`

**Problem:**
```typescript
// Check for duplicate review
const hasReviewed = await shiftReviewsRepo.hasUserReviewedShift(shiftId, userId, reviewData.type);
```

**Impact:** A user can submit multiple reviews of the same type if they manipulate the `type` field, or if the unique constraint doesn't cover all cases.

**Recommendation:**
1. Verify unique constraint in schema includes `type`:
   ```typescript
   shiftReviewerUnique: index('shift_reviews_shift_reviewer_unique')
     .on(table.shiftId, table.reviewerId, table.type)
   ```
   ✅ This exists (line 133 in `api/_src/db/schema/shifts.ts`)

2. Add server-side validation to prevent type manipulation:
   ```typescript
   // Verify user can only submit their allowed review type
   if (reviewData.type === 'SHOP_REVIEWING_BARBER' && shift.employerId !== userId) {
     res.status(403).json({ message: 'Only shop owner can submit shop reviews' });
     return;
   }
   if (reviewData.type === 'BARBER_REVIEWING_SHOP' && shift.assigneeId !== userId) {
     res.status(403).json({ message: 'Only assigned staff can submit staff reviews' });
     return;
   }
   ```
   ✅ This exists (lines 2675-2688 in `api/_src/routes/shifts.ts`)

**Severity:** 🟢 **LOW** - Already protected, but worth verifying in production

---

#### Issue 5.2: No Rate Limiting on Review Submission
**Location:** `api/_src/routes/shifts.ts:2633`

**Problem:** No rate limiting on review creation endpoints.

**Impact:** Potential for review bombing or spam attacks.

**Recommendation:**
Implement rate limiting middleware:
```typescript
import rateLimit from 'express-rate-limit';

const reviewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 reviews per window
  message: 'Too many review submissions, please try again later'
});

router.post('/:id/review', authenticateUser, reviewRateLimit, asyncHandler(...));
```

**Severity:** 🟡 **MEDIUM** - Abuse prevention

---

#### Issue 5.3: Missing Input Validation on Geofencing Coordinates
**Location:** Clock-in endpoint (when implemented)

**Problem:** No validation that latitude/longitude are within valid ranges.

**Recommendation:**
```typescript
const { latitude, longitude } = req.body;

// Validate coordinate ranges
if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
  res.status(400).json({ message: 'Invalid latitude' });
  return;
}
if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
  res.status(400).json({ message: 'Invalid longitude' });
  return;
}
```

**Severity:** 🟡 **MEDIUM** - Input validation gap

---

#### Issue 5.4: API Route Permission Guards
**Status:** ✅ **PASS** (per `SECURITY_AUDIT_REPORT.md`)

All critical routes are protected with `authenticateUser` middleware. Job management routes have ownership checks.

---

## Summary of Blockers

### 🔴 Must Fix Before Launch

1. **Issue 1.1:** Payment Intent created before atomic shift claim (financial integrity risk)
2. **Issue 3.1:** Clock-in endpoint missing (critical feature not implemented)
3. **Issue 3.2:** Geofencing logic only in tests (missing production code)

### 🟡 High Priority (Fix Soon)

1. **Issue 1.2:** Transaction helper doesn't use real transactions
2. **Issue 2.1:** Memory leak in Pusher callback sets
3. **Issue 3.3:** No spoof-proof geofencing validation
4. **Issue 4.2:** Currency schema default mismatch

### 🟢 Medium/Low Priority (Nice to Have)

1. **Issue 2.2:** No Pusher reconnection strategy
2. **Issue 2.3:** Channel leak risk
3. **Issue 4.1:** Currency hardcoded in payment flows
4. **Issue 4.4:** Missing timezone in database timestamps
5. **Issue 5.2:** No rate limiting on reviews

---

## Recommended Action Plan

### Phase 1: Critical Blockers (Week 1)
1. Implement clock-in endpoint with geofencing
2. Fix payment intent creation order (two-phase commit)
3. Implement proper database transactions

### Phase 2: High Priority (Week 2)
1. Fix Pusher memory leaks
2. Add spoof-proof geofencing validation
3. Fix currency schema defaults

### Phase 3: Scalability & Polish (Week 3)
1. Add database indexes (Recommendations 1.1, 1.2)
2. Implement Pusher reconnection strategy
3. Add rate limiting to review endpoints
4. Standardize currency handling

---

## Testing Recommendations

1. **Load Testing:** Use Artillery or k6 to simulate concurrent shift claims and verify atomicity
2. **Geofencing Tests:** Test with spoofed coordinates, invalid ranges, and edge cases (poles, date line)
3. **Payment Flow Tests:** Verify payment intent cancellation on failed shift claims
4. **Pusher Stress Tests:** Monitor memory usage over extended sessions with multiple channel subscriptions

---

**Report Generated:** 2026-01-16  
**Next Review:** After Phase 1 completion
