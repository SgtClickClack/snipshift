#### 2025-11-24: Standardize Terminology (Hub -> Shop)

**Core Components Implemented:**
- Terminology updates across multiple pages.
- UI Text Replacements.

**Key Features**
- **Terminology Update:**
  - Replaced "Hub Owner" with "Shop Owner".
  - Replaced "Hub Owners" with "Shop Owners".
  - Updated subtext and descriptions in Landing Page, Home, and Role Selection.
- **Consistency:**
  - Updated Dashboard, Job Application Modal, and Quick Actions to use "Shop Owner" terminology.
- **Testing:**
  - Updated E2E tests (`tests/core-flow.spec.ts` moved to `e2e/core-flow.spec.ts`) to verify new terminology.

**Integration Points**
- `src/pages/landing.tsx`
- `src/pages/home.tsx`
- `src/pages/role-selection.tsx`
- `src/pages/professional-dashboard.tsx`
- `src/components/dashboard/quick-actions.tsx`
- `src/components/job-feed/job-application-modal.tsx`

**File Paths**
- `src/pages/landing.tsx`
- `src/pages/home.tsx`
- `src/pages/role-selection.tsx`
- `src/pages/professional-dashboard.tsx`
- `src/pages/demo.tsx`
- `src/components/dashboard/quick-actions.tsx`
- `src/components/job-feed/job-application-modal.tsx`
- `e2e/core-flow.spec.ts`

**Next Priority Task**
- Verify in production deployment.
