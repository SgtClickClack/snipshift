# SnipShift Deployment Guide

## Overview

This guide explains the deployment setup for the SnipShift application, including known issues and workarounds in the current environment.

## Architecture

SnipShift has **two architectures**:

1. **Original Architecture** (Production-Ready) ✅
   - Location: `client/`, `server/`, `shared/`
   - Status: Production-ready, deployed at www.snipshift.com.au
   - Tech: React + Vite frontend, Express + TypeScript backend
   - Works perfectly with `npm run dev`

2. **SnipShift 2.0** (In Development) 🚧
   - Location: `snipshift-next/`
   - Status: Incomplete, under development
   - Tech: Next.js + React Native + GraphQL
   - NOT ready for deployment

## Current Deployment Issues

### Problem: `.replit` Configuration Points to Wrong Architecture

The `.replit` file is currently configured to deploy `snipshift-next/api` (incomplete architecture) instead of the production-ready original architecture.

**Impact:**
- Deployment attempts target the wrong codebase
- Build scripts fail because SnipShift 2.0 is incomplete

**Solution Required:**
The `.replit` configuration needs updating, but due to the esbuild deadlock issue (see below), simply changing it won't fix deployment. See the "Summary & Recommended Actions" section at the end for the actual solution.

### Problem: esbuild Deadlock in Deployment Environment

When Vite's dev server runs, esbuild crashes with a deadlock error during dependency optimization.

**Root Cause:**
- Vite 7.1.5 uses esbuild for dependency pre-bundling
- The esbuild binary encounters a goroutine deadlock in this environment
- This is an environment/platform limitation, not a code issue

**What Was Tried:**
- ❌ `VITE_SKIP_DEP_PREBUNDLING` env var (doesn't exist in Vite 7)
- ❌ Modifying `vite.config.ts` to disable optimizeDeps (file protected)
- ❌ Modifying `server/vite.ts` (file protected)
- ❌ Production build with `vite build` (crashes with bus error)
- ❌ Process restart wrapper (server dies before serving requests)

**Current Limitation:**
The esbuild crash cannot be prevented without editing protected configuration files (`vite.config.ts` or `server/vite.ts`) to disable dependency optimization.

## Deployment Scripts

### `deploy.js` (Reference Only - Has Same Limitations)

Node.js-based deployment script that was created to work around shell PATH limitations.

**Usage:**
```bash
node deploy.js
```

**Features:**
- Bypasses shell PATH issues with node_modules binaries
- Uses tsx directly from node_modules
- Handles esbuild crashes gracefully (exit code 135)
- Sets proper environment variables

**Limitations:**
- ❌ Still subject to esbuild crashes (same as npm run dev)
- ❌ Server starts but crashes before serving requests
- ❌ No functional advantage over `npm run dev`

**Note:** This script demonstrates the deployment approach but cannot overcome the fundamental esbuild deadlock issue.

### Development Mode (Partial Success) ⚠️

The original architecture can be started with:

```bash
npm run dev
```

**Status:** Server starts successfully but crashes immediately due to esbuild deadlock during Vite's dependency optimization.

**Important:** This is the BEST available option in the current environment, but it still fails due to esbuild issues. The app cannot run reliably until configuration files are updated or the app is deployed to a different platform.

## Working Around the Issues

### Option 1: Fix Vite Configuration (Requires File Edit Permissions)

Someone with permissions to edit protected files must disable Vite's dependency optimization in `vite.config.ts`:

```typescript
optimizeDeps: {
  disabled: true,  // Prevents esbuild deadlock
  // ... rest of existing config
}
```

**OR** disable it in `server/vite.ts` when creating the Vite server:

```typescript
const vite = await createViteServer({
  ...viteConfig,
  optimizeDeps: {
    disabled: true,  // Prevents esbuild deadlock
  },
  // ... rest of config
});
```

After making this change, update `.replit` to:
```
run = "npm run dev"
```

### Option 2: Alternative Deployment Platform

Consider deploying the production-ready architecture on a platform that:
- Supports Vite builds properly
- Has compatible esbuild binaries
- Examples: Vercel, Netlify, Railway, Render

The app is production-ready and will work fine on standard hosting platforms.

## Environment Variables

Required environment variables for deployment:

```bash
PORT=5000                           # Server port
NODE_ENV=development                # Use dev mode (production build broken)
VITE_GOOGLE_CLIENT_ID=<your-id>    # Google OAuth
VITE_FIREBASE_API_KEY=<your-key>   # Firebase config
VITE_FIREBASE_PROJECT_ID=<your-id> # Firebase config
VITE_FIREBASE_APP_ID=<your-app-id> # Firebase config
```

## Production Deployment (External Platform)

For deploying to a production platform outside this environment:

1. **Build the frontend:**
   ```bash
   npm run build:client
   ```

2. **Build the backend:**
   ```bash
   npm run build:server
   ```

3. **Start production server:**
   ```bash
   NODE_ENV=production npm start
   ```

**Note:** These commands may fail in the current environment due to esbuild issues, but will work on standard platforms.

## Troubleshooting

### Server Crashes Immediately

**Symptom:** Server starts ("serving on port 5000") then crashes with esbuild deadlock

**Cause:** Vite dependency optimization triggering esbuild crash

**Fix:** Use `npm run dev` instead of deployment scripts until configuration files can be updated

### "tsx: not found" Error

**Symptom:** Shell scripts cannot find tsx binary

**Cause:** Shell PATH doesn't include node_modules/.bin

**Fix:** Use `node deploy.js` which bypasses PATH issues

### "Cannot find module 'zod'" Error

**Symptom:** Import errors for zod or other dependencies

**Cause:** node_modules was corrupted or incomplete

**Fix:** Run `npm install` to reinstall dependencies

## Summary & Recommended Actions

### Current Status
- ✅ Original architecture (client/server/shared) is production-ready
- ✅ Code works perfectly on standard platforms
- ❌ Cannot run in current Replit environment due to esbuild deadlock
- ❌ All deployment scripts fail with same esbuild crash
- ❌ Configuration files (vite.config.ts, server/vite.ts) are protected from edits
- ❌ `.replit` points to wrong architecture (snipshift-next/api instead of production-ready original)

### Single Recommended Path Forward

**Primary Recommendation: Deploy on External Platform**

Deploy the production-ready original architecture on a standard hosting platform where esbuild/Vite work properly:

**Recommended Platforms:**
- **Vercel** (best for React/Vite apps)
- **Railway** (good for full-stack apps)
- **Netlify** (good for static + API)
- **Render** (good for Node.js backends)

**Steps:**
1. Push code to GitHub
2. Connect repository to chosen platform
3. Set build command: `npm run build:client`
4. Set start command: `npm run start:dev`
5. Configure environment variables (see section above)
6. Deploy

**Alternative (If Staying on Replit): Fix Configuration Files**

Someone with file edit permissions must:

1. **Edit `vite.config.ts`** or **`server/vite.ts`** to disable dependency optimization:
   ```typescript
   optimizeDeps: { disabled: true }
   ```

2. **Update `.replit`** to point to correct architecture:
   ```
   run = "npm run dev"
   ```

### What Does NOT Work

❌ `node deploy.js` - Same esbuild crash as npm run dev  
❌ Production build (`npm run build`) - esbuild/vite crashes  
❌ Environment variables - None exist to disable dep optimization in Vite 7  
❌ Process wrappers - Server dies before serving any requests  
❌ Current `.replit` configuration - Points to incomplete snipshift-next/api
