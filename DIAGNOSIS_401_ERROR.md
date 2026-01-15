# 401 Unauthorized Error Diagnosis

## Current Status

✅ **Firebase Admin is initialized correctly**
- Debug endpoint shows: `firebase.test: "ready"`
- `verifyIdToken` function is available
- No initialization errors

✅ **Environment variables are set**
- `FIREBASE_PROJECT_ID`: ✅
- `FIREBASE_CLIENT_EMAIL`: ✅  
- `FIREBASE_PRIVATE_KEY`: ✅

## Problem

Users are still getting `401 (Unauthorized)` errors on `/api/me` endpoint after signing in with Google.

## Possible Causes

### 1. Private Key Format Issue
The private key might have incorrect newline escaping in Vercel. The backend expects `\n` (literal backslash + n) but Vercel might be storing it differently.

**Check:** Look at Vercel logs for Firebase initialization errors:
```bash
vercel logs hospogo.com --limit=100 | Select-String -Pattern "FIREBASE|Init"
```

### 2. Project ID Mismatch
Frontend uses `VITE_FIREBASE_PROJECT_ID` and backend uses `FIREBASE_PROJECT_ID`. Both should be `snipshift-75b04`.

**Verify:**
- Frontend: Check browser console for Firebase project ID
- Backend: Check debug endpoint shows correct project ID

### 3. Token Verification Error
The `verifyIdToken` call might be failing with a specific error that's not being logged properly.

**Check Vercel logs for:**
```
[AUTH ERROR] Token verification failed
```

### 4. Token Not Being Sent
The frontend might not be sending the token correctly in the Authorization header.

**Check browser DevTools:**
- Network tab → `/api/me` request → Headers
- Look for `Authorization: Bearer <token>`

## Next Steps

1. **Check Vercel Logs:**
   ```bash
   vercel logs hospogo.com --limit=100
   ```
   Look for:
   - `[FIREBASE] Admin initialized successfully via individual env vars`
   - `[AUTH ERROR] Token verification failed`
   - Any Firebase initialization errors

2. **Check Browser Console:**
   - Look for the actual error message from `/api/me`
   - Check if token is being sent in request headers

3. **Verify Private Key Format:**
   The private key in Vercel should have `\n` as literal characters (backslash + n), not actual newlines.

4. **Test Token Verification:**
   Try manually verifying a token to see the exact error.

## Immediate Action

Please check the Vercel logs and share:
1. Any `[FIREBASE]` log messages
2. Any `[AUTH ERROR]` log messages  
3. The exact error code/message from token verification

This will help identify the root cause.
