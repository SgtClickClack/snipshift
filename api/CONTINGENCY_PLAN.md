# Contingency Plan: Bypass Vercel's On-the-Fly Compilation

If Vercel ignores the `dist/` folder and re-compiles `api/index.ts` on-the-fly, causing the `Cannot find module .../src/index` error, follow these steps:

## Steps to Implement Contingency

1. **Rename the TypeScript entry point:**
   ```bash
   git mv api/index.ts api/server.ts
   ```

2. **Create a new JavaScript entry point** (`api/index.js`):
   ```javascript
   // api/index.js
   // Vercel will see this as the handler and run it directly.
   // It imports the pre-compiled (and fixed) code from dist.
   import app from './dist/index.js';
   
   export default app;
   ```

3. **Update vercel.json** to point to the new entry:
   Change line 28 from:
   ```json
   "api/index.ts": {
   ```
   to:
   ```json
   "api/index.js": {
   ```

4. **Commit and push:**
   ```bash
   git add api/index.js api/server.ts vercel.json
   git commit -m "fix(api): bypass Vercel compiler with pre-compiled dist"
   git push origin main
   ```

This forces Vercel to use YOUR compiled/patched code from `postinstall` instead of re-compiling TypeScript on-the-fly.

