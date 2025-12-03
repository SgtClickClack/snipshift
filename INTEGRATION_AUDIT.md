# Post-Refactor Integration & Data Integrity Audit

## 1. Data Shape Mismatch Scan

### `src/pages/job-details.tsx`
- **Pay Rate:** Displays `job.rate || job.payRate || 'Rate TBD'`.
  - **Status:** Safe. The `fetchJobDetails` in `api.ts` maps `hourlyRate` from Shifts to `rate`, `payRate`, and `hourlyRate` in the returned object.
- **Date/Time:** Displays `job.date` and range `job.startTime - job.endTime`.
  - **Status:** Safe. `fetchJobDetails` maps `startTime` to `date` and `startTime`.
- **Description:** Displays `job.description`.
  - **Status:** Safe.
- **Location:** Displays `job.location`.
  - **Status:** Safe.

### `src/components/job-feed/JobCard.tsx`
- **Pay Rate:** Displays `job.rate || job.payRate || 'Rate TBD'`.
  - **Status:** Safe. The normalized `JobCardData` type includes `rate` and `payRate`. `JobFeedPage` normalizes shifts to include these fields (mapping from `pay` or `hourlyRate`).
- **Date:** Displays `job.date`.
  - **Status:** Safe. `JobFeedPage` maps `startTime` to `date` for shifts.

**Conclusion:** The frontend components are resilient to the schema change because the data mapping happens in the API layer (`fetchJobDetails`) and the feed page normalization.

## 2. Navigation & ID Handling

### `src/App.tsx`
- Route: `<Route path="/jobs/:id" element={<JobDetailsPage />} />`
  - **Status:** Correct. Standard parameter routing.

### `src/pages/job-details.tsx`
- **ID Usage:** `const { id } = useParams<{ id: string }>();`
  - **Status:** Correct. Reads the ID directly from the URL.
- **Apply Button:** Calls `applyMutation.mutate(applicationData)` where `applicationData` includes `type: job?.type || 'shift'`.
  - **Status:** **Verified.** The `type` field is correctly passed to `applyToJob`, ensuring the backend receives the correct context.

## 3. Dashboard Consistency

### `src/pages/hub-dashboard.tsx`
- **Data Source:** `fetchShopShifts` returns an array mapped to `MyJob` interface.
- **Columns:**
  - **Title:** Uses `job.title`. (Safe)
  - **Status:** Uses `job.status`. (Safe)
  - **Date:** Uses `job.date`. (Safe - mapped from `startTime`)
  - **Pay:** Uses `job.payRate`. (Safe - mapped from `hourlyRate`)
  - **Applicants:** Uses `job.applicationCount`. (Safe - defaults to 0 in mapping)
- **Stats:** Aggregates `job.applicationCount`. (Safe)

**Conclusion:** The dashboard correctly displays Shift data.

## 4. Dead Legacy Routes

### `api/_src/index.ts` (and implicitly `routes/jobs.ts` logic if separated)
- **POST /api/jobs:**
  - **Status:** **Technically Deprecated** for the Hub Dashboard (which now uses `createShift` -> `/api/shifts`), but potentially still used by other legacy clients or scripts?
  - **Action:** Marked as legacy in the audit.

## Summary
The integration is solid. The "Parallel Universes" are bridged by:
1.  **Frontend:** Hub Dashboard posting Shifts.
2.  **Backend/API Lib:** `fetchJobDetails` handling both types and normalizing the response structure.
3.  **Application Flow:** `applyToJob` routing based on the derived type.

No critical blocking issues found. The `Apply` button logic is safe.

