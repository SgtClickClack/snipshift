#### 2025-11-25: Fix Stale User State After Onboarding

**Core Components Implemented:**
- Auth State Refresh Logic
- Location Input UI Fix
- Missing Role Switching Endpoint
- Multi-Role Backend Support

**Key Features**
- **Stale State Fix:**
  - Updated `src/pages/onboarding/hub.tsx` and `src/pages/onboarding/professional.tsx` to manually update user state using `login()` with the response from the API.
  - Updated `src/contexts/AuthContext.tsx` to disable caching for `/api/me` requests (`cache: 'no-store'`) and force token refresh.
- **UI Fixes:**
  - Updated `src/components/ui/location-input.tsx` to add explicit background color (`bg-white`/`dark:bg-slate-950`) and Z-index to the suggestion dropdown.
- **Backend Fixes:**
  - **DB Schema Update:** Added `roles` column (array of enums) to `users` table to correctly store multiple roles per user.
  - **API Logic:**
    - Updated `POST /users/role` (Onboarding) to append the new role to the `roles` array instead of overwriting the user's existence.
    - Updated `GET /me` and `PUT /me` to return the correct `roles` list from the DB.
    - Implemented `PATCH /api/users/:id/current-role` to allow switching the active view (`currentRole`) without affecting the unlocked roles list.

**Integration Points**
- `src/pages/onboarding/hub.tsx`
- `src/pages/onboarding/professional.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ui/location-input.tsx`
- `api/_src/routes/users.ts`
- `api/_src/db/schema/users.ts`
- `api/_src/repositories/users.repository.ts`

**File Paths**
- `src/pages/onboarding/hub.tsx`
- `src/pages/onboarding/professional.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ui/location-input.tsx`
- `api/_src/routes/users.ts`
- `api/_src/db/schema/users.ts`
- `api/_src/repositories/users.repository.ts`

**Next Priority Task**
- Deploy and verify fix in production.

#### 2025-11-25: Refactor Map View Colors

**Core Components Implemented:**
- Map Theme Configuration
- Google Maps Refactoring
- Design System Consistency

**Key Features**
- **Map Theme:** Created `MAP_THEME` constant in `src/components/job-feed/google-map-view.tsx` referencing CSS variables (`--steel-*`, `--primary`, etc.).
- **Refactoring:**
  - Replaced hardcoded hex colors in Google Maps markers, circles, and fallback SVG.
  - Updated UI elements to use semantic classes (`text-muted-foreground`, `bg-muted`) instead of `neutral-*`/`gray-*`.
  - Fixed unused variables in map initialization.

**Integration Points**
- `src/components/job-feed/google-map-view.tsx`

**File Paths**
- `src/components/job-feed/google-map-view.tsx`

**Next Priority Task**
- Continue with CSS Audit Plan: Fix Admin Dashboard hardcoded dark mode.