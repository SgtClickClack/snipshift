### 2025-09-04: Multi-Role User System & Dashboard Toggle

Refactored the authentication and user model to support multiple roles per user, added UI for role switching, and updated onboarding to allow selecting multiple roles. Implemented new backend endpoints for role management.

**Core Components Implemented:**
- Shared schema `userSchema` now uses `roles[]` and `currentRole`
- Backend storage and routes support multi-role
- Endpoints: `PATCH /api/users/:id/roles`, `PATCH /api/users/:id/current-role`
- Auth context updated with `setCurrentRole` and `hasRole`
- Navbar role switcher and multi-select role onboarding
- Guards and dashboards adapted to `currentRole`

**File Paths:**
- `shared/firebase-schema.ts`
- `server/storage.ts`, `server/firebase-storage.ts`, `server/routes.ts`, `server/firebase-routes.ts`
- `client/src/contexts/AuthContext.tsx`
- `client/src/lib/roles.ts`
- `client/src/components/auth/AuthGuard.tsx`
- `client/src/components/navbar.tsx`
- `client/src/pages/role-selection.tsx`, `client/src/pages/home.tsx`
- `client/src/pages/*-dashboard.tsx`
- `client/src/components/onboarding/tutorial-overlay.tsx`
- `client/src/components/profile/profile-form.tsx`
- `client/src/components/social/community-feed.tsx`
- `client/src/components/messaging/*`

**Next Priority Task:**
- Add role-aware permissions and feature gating (e.g., hide actions by role) with tests.

Expected completion time: 6 hours
