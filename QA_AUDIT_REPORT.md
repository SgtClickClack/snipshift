# QA Audit Report - Snipshift

## 🚨 Critical Issues (Feature Broken)

### 1. Data Flow Disconnection: Shifts vs Jobs (Parallel Universes)
**Severity:** 🔴 CRITICAL  
**Impact:** The application is fundamentally broken. Employers post "Jobs", but Candidates search for "Shifts".

- **The Issue:**
  - **Employers (Hub/Business Dashboard):** Post new listings using `POST /api/jobs`. These are stored in the `jobs` table.
  - **Candidates (Job Feed):** The "Find Shifts" page fetches data from `GET /api/shifts`. These are retrieved from the `shifts` table.
- **Result:**
  - Jobs posted by employers **do not appear** in the Job Feed.
  - Employers are posting into a void; Candidates see an empty feed (or only legacy/mock shifts).

### 2. Job Details 404 on Feed Click
**Severity:** 🔴 CRITICAL  
**Impact:** Clicking any item in the Job Feed leads to a "Job Not Found" error.

- **The Issue:**
  - `JobFeedPage` displays items from the `shifts` API.
  - Clicking an item navigates to `/jobs/:id`.
  - `JobDetailsPage` calls `fetchJobDetails` -> `GET /api/jobs/:id`.
  - The backend `GET /api/jobs/:id` searches the `jobs` table.
  - Since the ID belongs to a `shift` (not a `job`), the backend returns 404.
- **Result:** The application flow is broken at the "View Details" step for all listings.

### 3. Orphaned & Broken Code: `ShopDashboard`
**Severity:** 🔴 CRITICAL (Code Quality/Confusion)  
**Impact:** Dead code that references broken API endpoints.

- **The Issue:**
  - `src/pages/shop-dashboard.tsx` is not routed in `App.tsx` (orphaned).
  - It attempts to fetch `GET /api/shifts/shop` using an implicit query key. The backend route is `/api/shifts/shop/:userId`.
  - This file appears to be a legacy implementation of the "Business" dashboard but uses the "Shifts" endpoint (which is technically the correct *target* table, but the wrong implementation).

## ⚠️ Warnings (UX & Interaction Issues)

### 1. Dead Interaction: Map Selection
**Severity:** 🟡 WARNING  
**Location:** `src/pages/job-details.tsx`  
- **Issue:** `<GoogleMapView onJobSelect={() => {}} ... />`
- **Impact:** Clicking a pin on the map in the Details view does nothing. It should likely center the map or show a tooltip.

### 2. Conflicting Terminology & Schemas
**Severity:** 🟡 WARNING  
**Location:** `api/_src/routes` vs `src/pages`
- **Issue:**
  - `Shifts` Schema: `hourlyRate`, `startTime`, `endTime`.
  - `Jobs` Schema: `payRate`, `date` + `startTime` + `endTime`.
  - The frontend `HubDashboard` uses `Jobs` schema but the domain is moving to `Shifts`.
  - `PostJobPage` uses `createJob` (Jobs endpoint).

## ℹ️ Info (Cleanup & Cleanup)

### 1. Navigation Cleanliness
- **Observation:** `ComingSoonPage` is linked correctly for incomplete features (`/community`, `/social-feed`).
- **Observation:** `DashboardRedirect` correctly routes users based on role, but relies on the "Jobs" ecosystem which is disconnected from the Feed.

## Recommendations (Immediate Fixes)

1.  **Unify on Shifts:**
    - Update `HubDashboard` and `PostJobPage` to use `POST /api/shifts` instead of `POST /api/jobs`.
    - Update `JobDetailsPage` to handle fetching from `/api/shifts/:id` OR update the backend `GET /api/jobs/:id` to check *both* tables (or unify them).
    - Ideally, deprecate the `jobs` table entirely and migrate everything to `shifts` (or vice versa, but "Shifts" seems to be the intended direction).

2.  **Fix Details Page Routing:**
    - If keeping separate tables, `JobFeedPage` needs to know if an item is a Job or a Shift and route to `/jobs/:id` or `/shifts/:id`.
    - Or, create a unified `GET /api/listings/:id` that resolves either.

3.  **Delete Orphaned Code:**
    - Remove `src/pages/shop-dashboard.tsx`.

