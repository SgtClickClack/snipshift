# User Onboarding Test Analysis Report

**Date:** 2025-11-14  
**Test File:** `01-user-onboarding-debug.cy.ts`  
**Status:** ⚠️ **CRITICAL FUNCTIONAL GAPS IDENTIFIED**

---

## Executive Summary

The E2E test for user onboarding is failing due to **fundamental mismatches** between the test expectations and the actual application implementation. The test expects a React-based landing page with specific test IDs and a signup route, but the application currently serves a static HTML landing page from the API server and lacks the required React components and routes.

---

## Test Expectations vs. Application Reality

### Test Expectations

The test (`01-user-onboarding-debug.cy.ts`) expects:

1. **Landing Page Component:**
   - Element with `data-testid="landing-page"`
   - Signup link with `data-testid="link-signup"`
   - Navigation to `/signup` route

2. **Signup Page:**
   - Route: `/signup`
   - Heading with `data-testid="heading-signup"` containing "Create Account"

3. **Navigation Flow:**
   - Click signup link → Navigate to `/signup` → Verify signup page loads

### Application Reality

**Current React App Routes** (`snipshift/snipshift-next/web/src/App.tsx`):
```tsx
<Route path="/" element={<div>Welcome to SnipShift</div>} />
<Route path="/login" element={<Login />} />
// ... other routes, but NO /signup route
```

**API Server Landing Page** (`snipshift-next-restored/api/src/index.ts`):
- Serves static HTML at `/` with links to `/auth/register` (not `/signup`)
- No React components or test IDs
- Links point to `/auth/register?role=...` instead of `/signup`

---

## Identified Functional Bugs

### ❌ **Bug #1: Missing Landing Page Component**

**Issue:** The root route (`/`) renders only a simple `<div>Welcome to SnipShift</div>` instead of a proper landing page component.

**Expected:** A React component with:
- `data-testid="landing-page"`
- `data-testid="link-signup"` on the signup link
- Proper navigation structure

**Impact:** Test cannot find landing page element or signup link.

**Location:** `snipshift/snipshift-next/web/src/App.tsx:26`

---

### ❌ **Bug #2: Missing Signup Route**

**Issue:** No `/signup` route is defined in the React Router configuration.

**Expected:** 
- Route: `<Route path="/signup" element={<Signup />} />`
- Signup page component with `data-testid="heading-signup"` containing "Create Account"

**Impact:** Test fails when trying to navigate to `/signup` - route doesn't exist.

**Location:** `snipshift/snipshift-next/web/src/App.tsx` - Missing route definition

---

### ❌ **Bug #3: Route Mismatch**

**Issue:** API server serves links to `/auth/register`, but test expects `/signup`.

**Expected:** Either:
- Update test to use `/auth/register`, OR
- Add `/signup` route that redirects to `/auth/register`, OR
- Create a dedicated `/signup` route

**Impact:** Navigation fails because routes don't match.

**Location:** 
- API: `snipshift-next-restored/api/src/index.ts:636, 644, 650, 656, 662`
- React App: Missing `/signup` route

---

### ❌ **Bug #4: Missing Test IDs**

**Issue:** No `data-testid` attributes on landing page or signup elements.

**Expected:**
- Landing page: `data-testid="landing-page"`
- Signup link: `data-testid="link-signup"`
- Signup heading: `data-testid="heading-signup"`

**Impact:** Test cannot locate elements for interaction.

---

## Test Execution Analysis

### Test Structure

The test has extensive debugging and multiple timeout configurations:

1. **beforeEach Hook:**
   - Logs out user
   - Visits `/`
   - Waits for loaders to disappear (60s timeout)
   - Waits for React root to populate (60s timeout)
   - Waits for AuthContext to initialize
   - Extensive debug logging

2. **Test Case:**
   - Waits 2 seconds
   - Searches for signup link with `data-testid="link-signup"`
   - If not found, throws detailed error with diagnostic info
   - Clicks signup link
   - Verifies URL includes `/signup`
   - Verifies heading contains "Create Account"

### Likely Failure Points

Based on the code analysis, the test is likely failing at:

1. **Line 198:** `cy.get('[data-testid="link-signup"]').should('be.visible').click()`
   - **Reason:** No signup link exists with this test ID
   - **Error:** "Timed out retrying: Expected to find element: [data-testid="link-signup"], but never found it."

2. **Line 201:** `cy.url().should('include', '/signup')`
   - **Reason:** Even if navigation worked, `/signup` route doesn't exist
   - **Error:** "Expected URL to include '/signup', but got '/...'"

3. **Line 202:** `cy.get('[data-testid="heading-signup"]').should('contain', 'Create Account')`
   - **Reason:** Signup page component doesn't exist
   - **Error:** "Timed out retrying: Expected to find element: [data-testid="heading-signup"], but never found it."

---

## Root Cause Analysis

### Primary Issue: Architecture Mismatch

The application has two different landing page implementations:

1. **API Server Landing Page** (Static HTML):
   - Served at `http://localhost:5000/`
   - Contains links to `/auth/register`
   - No React components or test IDs

2. **React App Landing Page** (Minimal):
   - Served at `http://localhost:3002/`
   - Just a simple div: "Welcome to SnipShift"
   - No signup link or navigation

The test is running against the React app (`baseUrl: http://localhost:3002`), but the React app doesn't have the required components or routes.

---

## Required Fixes

### Priority 1: Create Landing Page Component

**File:** `snipshift/snipshift-next/web/src/pages/Landing.tsx` (new file)

**Requirements:**
- Component with `data-testid="landing-page"`
- Signup link with `data-testid="link-signup"` pointing to `/signup`
- Proper styling and layout
- Navigation structure

### Priority 2: Create Signup Page Component

**File:** `snipshift/snipshift-next/web/src/pages/Signup.tsx` (new file)

**Requirements:**
- Heading with `data-testid="heading-signup"` containing "Create Account"
- Signup form or redirect to registration
- Proper routing integration

### Priority 3: Add Routes to App.tsx

**File:** `snipshift/snipshift-next/web/src/App.tsx`

**Changes:**
```tsx
import Landing from './pages/Landing';
import Signup from './pages/Signup';

// In Routes:
<Route path="/" element={<Landing />} />
<Route path="/signup" element={<Signup />} />
```

### Priority 4: Ensure Test IDs Match

All components must include the exact test IDs expected by the test:
- `data-testid="landing-page"`
- `data-testid="link-signup"`
- `data-testid="heading-signup"`

---

## Next Steps

1. **Create Landing Page Component** with required test IDs
2. **Create Signup Page Component** with required test IDs
3. **Add Routes** to App.tsx
4. **Re-run Test** to verify fixes
5. **Update Test** if route structure changes (e.g., if using `/auth/register` instead of `/signup`)

---

## Test Output Capture Status

**Current Status:** Test is still running (has been running for 10+ minutes)

**Reason for Long Runtime:**
- Multiple 60-second timeouts in beforeEach hook
- Test waiting for elements that don't exist
- Extensive debug logging and waits

**Expected Test Result:** ❌ **FAILURE**

**Expected Failure Message:**
```
Timed out retrying after 10000ms: Expected to find element: [data-testid="link-signup"], but never found it.
```

---

## Conclusion

The user onboarding test is failing due to **missing React components and routes**, not due to test infrastructure issues. The application needs:

1. A proper Landing page component
2. A Signup page component  
3. Route definitions for both
4. Correct test IDs on all elements

Once these components are created and routes are added, the test should pass (assuming no other functional issues exist).

