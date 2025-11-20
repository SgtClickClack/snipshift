
#### 2025-11-20: Visual Polish & Google Auth Fix

**Core Components**
- `src/components/Navbar.tsx`
- `src/components/Hero.tsx`
- `src/components/Pricing.tsx`
- `src/components/auth/google-auth-button.tsx`
- `public/brand-logo.png`
- `package.json`

**Key Features**
- **Asset Recovery**: Located user's uploaded logo and normalized it to `public/brand-logo.png`.
- **Visual Polish**:
  - Replaced generic `<Scissors />` icons with the actual brand logo in Navbar and Hero.
  - Updated Hero background with overlay for better text contrast.
  - Standardized button styles in Pricing component to match the global `red-accent`/`steel` theme.
- **Auth Fix**:
  - Switched Google Auth implementation from manual redirect to Firebase SDK (`signInWithGoogle`).
  - Added robust error handling for popup blocking and unauthorized domains.
  - Implemented backend session creation flow after successful Firebase auth.
- **Build Fixes**:
  - Downgraded `firebase` to stable `^11.0.0` to avoid potential build issues with future versions.
  - Added `vercel-build` script to `package.json` to explicitly force the build command on Vercel.

**Integration Points**
- Firebase Auth SDK ↔ `GoogleAuthButton`
- `AuthContext` ↔ Login Flow
- Public Assets ↔ UI Components

**File Paths**
- `src/components/Navbar.tsx`
- `src/components/Hero.tsx`
- `src/components/Pricing.tsx`
- `src/components/auth/google-auth-button.tsx`
- `public/brand-logo.png`
- `package.json`

**Next Priority Task**
- Verify Google Auth on production (requires User to add Vercel URL to Google Cloud Console).

**Code Organization & Quality**
- Removed unused imports.
- Centralized auth logic using existing Firebase configuration.
- Enforced consistent branding across key landing pages.
