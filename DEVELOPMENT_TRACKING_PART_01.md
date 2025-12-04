
#### 2025-12-04: Vercel Build Warnings Fix

**Core Components Implemented:**
- Build Configuration
- API Configuration

**Key Features**
- **Build Optimization:**
  - Updated `engines` to Node 22.x to match Vercel project settings.
  - Enabled ESM (`type: "module"`) for API package to prevent CommonJS compilation warnings.
  - Implemented intelligent chunk splitting in `vite.config.ts`, reducing main vendor chunk size from ~800kB to ~327kB.
- **Code Quality:**
  - Updated API scripts (`fix-imports.js`) to use ESM syntax.
  - Fixed relative import paths in API tests and schema files to comply with ESM standards (added `.js` extensions).

**Integration Points**
- `package.json` scripts
- Vercel build pipeline

**File Paths**
- `package.json`
- `api/package.json`
- `vite.config.ts`
- `api/fix-imports.js`
- `api/_src/db/schema/notifications.ts`
- `api/_src/tests/applications.test.ts`
- `api/_src/tests/auth-flow.test.ts`
- `api/_src/tests/error-handling.test.ts`
- `api/_src/tests/jobs.test.ts`
- `api/_src/tests/payments.test.ts`

**Next Priority Task**
- Deployment to Vercel.
