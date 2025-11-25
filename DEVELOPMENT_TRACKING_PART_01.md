#### 2025-11-25: Fix Stale User State After Onboarding

**Core Components Implemented:**
- Auth State Refresh Logic
- Location Input UI Fix
- Missing Role Switching Endpoint

**Key Features**
- **Stale State Fix:**
  - Updated `src/pages/onboarding/hub.tsx` and `src/pages/onboarding/professional.tsx` to manually update user state using `login()` with the response from the API.
  - Updated `src/contexts/AuthContext.tsx` to disable caching for `/api/me` requests (`cache: 'no-store'`) and force token refresh.
  - This ensures the frontend immediately reflects the new role without relying on potentially stale cache or delayed DB consistency.
- **UI Fixes:**
  - Updated `src/components/ui/location-input.tsx` to add explicit background color (`bg-white`/`dark:bg-slate-950`) and Z-index to the suggestion dropdown, fixing legibility issues.
- **Backend Fixes:**
  - Implemented missing `PATCH /api/users/:id/current-role` endpoint to support role switching in Navbar.
  - Added comprehensive logging to `POST /api/users/role` to debug potential update failures.

**Integration Points**
- `src/pages/onboarding/hub.tsx`
- `src/pages/onboarding/professional.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ui/location-input.tsx`
- `api/_src/routes/users.ts`

**File Paths**
- `src/pages/onboarding/hub.tsx`
- `src/pages/onboarding/professional.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ui/location-input.tsx`
- `api/_src/routes/users.ts`

**Next Priority Task**
- Deploy and verify fix in production.
