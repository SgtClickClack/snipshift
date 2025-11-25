#### 2025-11-25: Fix Stale User State After Onboarding

**Core Components Implemented:**
- Auth State Refresh Logic
- Location Input UI Fix

**Key Features**
- **Stale State Fix:**
  - Updated `src/pages/onboarding/hub.tsx` and `src/pages/onboarding/professional.tsx` to manually update user state using `login()` with the response from the API.
  - Updated `src/contexts/AuthContext.tsx` to disable caching for `/api/me` requests (`cache: 'no-store'`) and force token refresh.
  - This ensures the frontend immediately reflects the new role without relying on potentially stale cache or delayed DB consistency.
- **UI Fixes:**
  - Updated `src/components/ui/location-input.tsx` to add explicit background color (`bg-white`/`dark:bg-slate-950`) and Z-index to the suggestion dropdown, fixing legibility issues.

**Integration Points**
- `src/pages/onboarding/hub.tsx`
- `src/pages/onboarding/professional.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ui/location-input.tsx`

**File Paths**
- `src/pages/onboarding/hub.tsx`
- `src/pages/onboarding/professional.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ui/location-input.tsx`

**Next Priority Task**
- Deploy and verify fix in production.
