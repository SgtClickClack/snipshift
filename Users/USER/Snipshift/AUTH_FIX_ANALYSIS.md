# Authentication Fix Analysis & Implementation Plan

## Phase 1: Investigation Complete

### Issues Identified

#### 1. AuthGuard TypeScript Interface Missing 'shop' and 'admin' Roles
**Location**: `snipshift/snipshift-next/web/src/components/auth/AuthGuard.tsx` line 10

**Problem**: The `requiredRole` prop only accepts 'professional' or 'business', but App.tsx line 146 uses `requiredRole="shop"` which is not in the type definition.

**Current Code**:
```typescript
requiredRole?: 'professional' | 'business';
```

**Should Be**:
```typescript
requiredRole?: 'professional' | 'business' | 'shop' | 'admin';
```

#### 2. Login Flow Analysis
**Backend**: Session saving is implemented correctly (lines 179-184 in `firebase-routes.ts`)
**Frontend**: Login page properly sets localStorage and calls login() function
**Issue**: The redirect logic uses `getDashboardRoute()` which needs to support all roles

#### 3. Session Management
- Backend saves session correctly ✅
- Frontend stores user in localStorage ✅
- AuthContext syncs with server via `/api/users/:id` ✅
- The sync endpoint requires authentication, which could fail if session is not properly set

### Test User Configuration
- Shop owner: `shop.owner@snipshift.com` / `SecurePass123!`
- Role: 'shop'
- Expected dashboard: `/shop-dashboard`

## Phase 2: Fixes Required

### Fix 1: Update AuthGuard TypeScript Interface
Update the `requiredRole` prop type to include all AppRole types.

**File**: `snipshift/snipshift-next/web/src/components/auth/AuthGuard.tsx`
**Change**: Line 10

```typescript
// FROM:
requiredRole?: 'professional' | 'business';

// TO:
requiredRole?: AppRole;
```

And add import:
```typescript
import { AppRole } from '@/lib/roles';
```

### Fix 2: Verify Role Support Throughout Frontend
- Check that `roles.ts` has all roles defined ✅ (already fixed)
- Check that all dashboard routes exist
- Verify role selection works for all types

### Fix 3: Add Debug Logging
Add console logging to track session state during login flow.

## Phase 3: Manual Testing Checklist

Once servers are running at:
- Backend: http://localhost:5000
- Frontend: http://localhost:3002

### Test Scenario 1: Shop Owner Login

1. Open browser to http://localhost:3002/login
2. Open DevTools (F12)
3. Go to Network tab
4. Enter credentials:
   - Email: `shop.owner@snipshift.com`
   - Password: `SecurePass123!`
5. Click Sign In button
6. **Capture Data**:
   - POST /api/login response status
   - POST /api/login response body
   - POST /api/login response headers (check for Set-Cookie)
   - Current URL after login attempt
   - Console errors (if any)
   - Application tab: check if `sid` cookie exists

### Expected Results After Fix
- Login POST returns 200 OK
- Response body contains user data with `currentRole: 'shop'`
- Set-Cookie header sets `sid` session cookie
- Browser redirects to `/shop-dashboard`
- Session cookie sent with subsequent requests

## Phase 4: Root Cause Hypothesis

Based on the code analysis, the most likely issues are:

1. **TypeScript type mismatch**: AuthGuard doesn't accept 'shop' role
2. **Potential session cookie issues**: Cookie not being set or not being sent back
3. **CORS/Credentials issues**: Frontend might not be sending credentials properly

## Next Steps

1. Apply Fix 1 (update AuthGuard types)
2. Start both servers
3. Perform manual testing as described
4. Capture network/console data
5. Apply additional fixes based on findings
6. Re-run E2E tests to validate

