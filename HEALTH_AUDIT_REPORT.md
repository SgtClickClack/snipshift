# Health Audit Report

## 1. Static Analysis (Type Check)
- **Total Errors:** ~197 type errors detected.
- **Critical Issues:**
  - `Job` interface in `@shared/firebase-schema` is missing properties used in `professional-dashboard.tsx` (`applicants`, `payType`, `hubId`).
  - `User` interface issues with `currentRole` type narrowing.
  - `JobDetails` vs `Job` type mismatches in `job-details.tsx`.
- **Minor Issues:**
  - Numerous unused variables (`TS6133`) and imports.
  - Unused hooks (`useEffect`, `useState`) in some components.

## 2. Dead Code / Dead Buttons
- **Potential Dead Handlers:**
  - `handleComment` in `community-feed.tsx` is defined but unused.
  - Several unused imports of icons and components suggest abandoned UI features.
- **Button Verification:**
  - `Apply` button in `job-details.tsx` is wired to `applyMutation`.
  - `Status` toggle in `hub-dashboard.tsx` is wired to `updateStatusMutation`.

## 3. API Route Verification
- **Frontend Calls:**
  - `fetchJobDetails` -> `/api/shifts/:id`
  - `applyToJob` -> `/api/applications` (for shifts)
  - `createShift` -> `/api/shifts`
  - `fetchShopShifts` -> `/api/shifts/shop/:userId`
- **Backend Routes:**
  - `POST /shifts`
  - `GET /shifts`
  - `GET /shifts/:id`
  - `PATCH /shifts/:id`
  - `GET /shifts/shop/:userId`
- **Status:** Matches. Frontend correctly calls Shift API endpoints. `fetchJobDetails` has a fallback to `/api/jobs/:id` which appears to be legacy.

## 4. Recommendations
1. Update `Job` interface in `firebase-schema.ts` to match actual data usage.
2. Fix strict null checks in `professional-dashboard.tsx`.
3. Remove unused imports and variables to clean up the codebase.
4. Ensure `Job` and `Shift` types are unified or clearly distinguished.
