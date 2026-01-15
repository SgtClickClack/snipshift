# Production Auth CLI Audit Report
**Date:** 2026-01-14  
**Task:** 9_production_auth_cli_audit  
**Priority:** High  
**Status:** Root Cause Identified

## Executive Summary

The 401 Unauthorized errors on `/api/me` are caused by **missing Firebase Admin credentials** in Vercel production. The backend cannot verify Firebase Auth tokens because `FIREBASE_SERVICE_ACCOUNT` is not configured.

## Root Cause Analysis

### 1. Environment Variable Status (Production)

**Current State:**
```
✅ FIREBASE_PROJECT_ID: Set (value: encrypted)
❌ FIREBASE_SERVICE_ACCOUNT: NOT SET
❌ FIREBASE_CLIENT_EMAIL: NOT SET
❌ FIREBASE_PRIVATE_KEY: NOT SET
```

**Backend Requirements:**
The backend (`api/_src/config/firebase.ts`) requires **ONE** of the following:
- Option A: `FIREBASE_SERVICE_ACCOUNT` (JSON string) - **RECOMMENDED**
- Option B: All three: `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`

**Current State:** Only `FIREBASE_PROJECT_ID` is set, causing Firebase Admin to fall back to application default credentials, which **do not work in Vercel's serverless environment**.

### 2. Debug Endpoint Results

```json
{
  "env": {
    "FIREBASE_SERVICE_ACCOUNT": {
      "exists": false,
      "validJson": false
    },
    "FIREBASE_INDIVIDUAL_VARS": {
      "FIREBASE_PROJECT_ID": true,
      "FIREBASE_CLIENT_EMAIL": false,
      "FIREBASE_PRIVATE_KEY": false
    }
  },
  "services": {
    "firebase": {
      "initialized": true  // ⚠️ Initialized but cannot verify tokens
    }
  }
}
```

**Critical Finding:** Firebase shows as "initialized" but lacks proper credentials to verify tokens, resulting in 401 errors when `authenticateUser` middleware calls `verifyIdToken()`.

### 3. Project ID Verification

**Expected:** `snipshift-75b04`  
**Status:** ✅ `FIREBASE_PROJECT_ID` is set in production (value encrypted, but confirmed present)

**Frontend Configuration:**
- `VITE_FIREBASE_PROJECT_ID`: Set to `snipshift-75b04` ✅
- `VITE_FIREBASE_AUTH_DOMAIN`: Set to `hospogo.com` ✅

**Backend Configuration:**
- `FIREBASE_PROJECT_ID`: Set (value encrypted) ✅
- Missing: `FIREBASE_SERVICE_ACCOUNT` ❌

### 4. Proxy Configuration Verification

**vercel.json Rewrite:**
```json
{
  "source": "/__/auth/:path*",
  "destination": "https://snipshift-75b04.firebaseapp.com/__/auth/:path*"
}
```

**Status:** ✅ Configuration is correct. The proxy should return 200/204 for auth handler requests.

## Error Flow

1. User signs in via Firebase Auth (frontend) → Token issued by `snipshift-75b04`
2. Frontend calls `/api/me` with `Authorization: Bearer <token>`
3. Backend `authenticateUser` middleware calls `firebaseAuth.verifyIdToken(token)`
4. Firebase Admin lacks proper credentials → **Token verification fails**
5. Backend returns `401 Unauthorized`

## Required Fix

### Step 1: Generate Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **snipshift-75b04**
3. Click ⚙️ **Settings** → **Project settings**
4. Navigate to **Service accounts** tab
5. Ensure "Node.js" is selected
6. Click **Generate new private key**
7. Confirm and download the JSON file (e.g., `snipshift-75b04-firebase-adminsdk-xyz.json`)

### Step 2: Add to Vercel Environment Variables

1. Open the downloaded JSON file
2. Copy the **entire JSON content** (minify if needed, but backend handles newlines)
3. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Project → **Settings** → **Environment Variables**
4. Add new variable:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Paste the entire JSON content
   - **Environments:** Select **Production** (and optionally Preview/Development)
5. Click **Save**

### Step 3: Verify FIREBASE_PROJECT_ID

Ensure `FIREBASE_PROJECT_ID` is set to `snipshift-75b04`:

```bash
vercel env ls production | grep FIREBASE_PROJECT_ID
```

If it's not set or has a different value, update it:

```bash
vercel env add FIREBASE_PROJECT_ID production
# Enter: snipshift-75b04
```

### Step 4: Redeploy

Environment variables require a redeploy to take effect:

1. Go to Vercel Dashboard → **Deployments**
2. Click **Redeploy** on the latest deployment, OR
3. Push an empty commit: `git commit --allow-empty -m "fix: add FIREBASE_SERVICE_ACCOUNT" && git push`

### Step 5: Verify Fix

After redeploy, test the debug endpoint:

```bash
curl https://hospogo.com/api/debug
```

Expected result:
```json
{
  "env": {
    "FIREBASE_SERVICE_ACCOUNT": {
      "exists": true,
      "validJson": true
    }
  },
  "services": {
    "firebase": {
      "initialized": true
    }
  }
}
```

Then test authentication:
1. Sign in via Google on https://hospogo.com
2. Check browser console for `/api/me` call
3. Should return `200 OK` with user data (not `401 Unauthorized`)

## Additional Verification

### Check Vercel Logs

After redeploy, monitor logs for Firebase initialization:

```bash
vercel logs hospogo.com --limit=50
```

Look for:
- ✅ `[FIREBASE] Admin initialized successfully via FIREBASE_SERVICE_ACCOUNT`
- ❌ `[FIREBASE] ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is missing`
- ❌ `[AUTH] Firebase auth service is not initialized`

### JWT Token Inspection (Optional)

If issues persist, inspect the token claims:

1. Open browser DevTools → Network tab
2. Find `/api/me` request → Headers → Authorization
3. Decode the JWT token at [jwt.io](https://jwt.io)
4. Verify:
   - `iss`: Should be `https://securetoken.google.com/snipshift-75b04`
   - `aud`: Should be `snipshift-75b04`
   - `project_id`: Should be `snipshift-75b04`

## Rebranding Status

### Completed ✅
- Frontend Firebase config uses `snipshift-75b04` project
- `VITE_FIREBASE_AUTH_DOMAIN` set to `hospogo.com`
- `vercel.json` proxy correctly routes `/__/auth/` to Firebase
- `FIREBASE_PROJECT_ID` set in production

### Pending ❌
- `FIREBASE_SERVICE_ACCOUNT` not configured (causing 401 errors)
- Backend cannot verify tokens without service account

## Next Steps

1. **IMMEDIATE:** Add `FIREBASE_SERVICE_ACCOUNT` to Vercel production environment
2. **VERIFY:** Redeploy and test `/api/me` endpoint
3. **MONITOR:** Check Vercel logs for Firebase initialization success
4. **FINALIZE:** Confirm rebranding is complete once auth works

## References

- Firebase Admin SDK Setup: `docs/FIREBASE_VERCEL_GUIDE.md`
- Backend Firebase Config: `api/_src/config/firebase.ts`
- Auth Middleware: `api/_src/middleware/auth.ts`
- Debug Endpoint: `api/_src/index.ts` (line 137)

---

**Report Generated:** 2026-01-14  
**Diagnostic Method:** Vercel CLI + Debug Endpoint Analysis  
**Confidence Level:** High (Root cause confirmed via production debug endpoint)
