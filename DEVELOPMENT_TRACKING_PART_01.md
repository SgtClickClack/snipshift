#### 2025-11-24: Standardize Terminology (Creative -> Industry/Barbering)

**Core Components Implemented:**
- Content updates across multiple pages.

**Key Features**
- **Terminology Update:**
  - Removed references to "creative industries" and "creative spaces".
  - Removed remaining references to "creative professional" and "creative community".
  - Replaced with "barbering and beauty industry", "industry", "shops", "salons", or "professionals".
  - Updated subtext and descriptions in Landing Page, Home, Role Selection, About, Signup, Demo, Footer, and Terms pages.

**Integration Points**
- `src/pages/landing.tsx`
- `src/pages/home.tsx`
- `src/pages/role-selection.tsx`
- `src/pages/company/about.tsx`
- `src/pages/signup.tsx`
- `src/pages/demo.tsx`
- `src/components/layout/footer.tsx`
- `src/pages/legal/terms.tsx`

**File Paths**
- `src/pages/landing.tsx`
- `src/pages/home.tsx`
- `src/pages/role-selection.tsx`
- `src/pages/company/about.tsx`
- `src/pages/signup.tsx`
- `src/pages/demo.tsx`
- `src/components/layout/footer.tsx`
- `src/pages/legal/terms.tsx`

**Next Priority Task**
- Verify in production deployment.

#### 2025-11-24: Shop Onboarding Flow & Backend API

**Core Components Implemented:**
- Shop Onboarding Page
- User Role Management API

**Key Features**
- **Shop Onboarding:**
  - Created `src/pages/onboarding/hub.tsx` with form for Shop Name, Location, and Description.
  - Integrated API call to create shop profile (role: hub).
  - Registered new route `/onboarding/hub` in `src/App.tsx`.
  - Verified Navbar link for creating shop profile.
- **Backend API:**
  - Added `POST /api/users/role` endpoint to handle role updates.
  - Mapped 'hub' frontend role to 'business' backend role.
  - Updates user details (Shop Name -> Name, Location, Description -> Bio) and sets `isOnboarded` to true.

**Integration Points**
- `src/App.tsx` (Route registration)
- `src/pages/onboarding/hub.tsx` (New page)
- `src/pages/onboarding/index.tsx` (Renamed from `src/pages/onboarding.tsx`)
- `api/_src/routes/users.ts` (New endpoint)

**File Paths**
- `src/pages/onboarding/hub.tsx`
- `src/pages/onboarding/index.tsx`
- `src/App.tsx`
- `api/_src/routes/users.ts`

**Next Priority Task**
- Verify in production deployment.