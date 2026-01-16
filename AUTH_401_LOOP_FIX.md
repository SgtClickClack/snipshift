# 401 Unauthorized Loop Fix - Production Authentication Handshake

## Root Cause Analysis

The 401 loop on `/api/me` was caused by:
1. **Infinite Retry Loop**: AuthContext was retrying `/api/me` indefinitely when receiving 401s without a hard limit
2. **Missing Circuit Breaker**: No mechanism to stop retrying after repeated failures
3. **Insufficient Error Logging**: Limited visibility into why tokens were failing verification in production

## Fixes Applied

### 1. Circuit Breaker Pattern (AuthContext)
- **Added maximum retry limit**: Stops retrying after 5 consecutive 401s
- **Automatic logout**: After hitting the limit, user is logged out and redirected to login
- **Detailed error logging**: Logs token details, project IDs, and error responses for debugging

**File**: `src/contexts/AuthContext.tsx`
- Added `MAX_CONSECUTIVE_401S = 5` constant
- Circuit breaker triggers after 5 consecutive 401s
- Logs detailed error information before stopping retries

### 2. Improved Token Validation (apiRequest)
- **Empty token check**: Prevents sending empty/invalid tokens
- **Better error handling**: Doesn't add Authorization header if token fetch fails
- **Graceful degradation**: Returns 401 instead of sending invalid token

**File**: `src/lib/queryClient.ts`
- Added validation for empty tokens
- Improved error handling for token fetch failures

### 3. Enhanced Backend Logging (Auth Middleware)
- **Production debugging**: Logs token verification attempts for `/api/me` in production
- **Project ID verification**: Logs project IDs to identify mismatches
- **Token details**: Logs token prefix and length for debugging

**File**: `api/_src/middleware/auth.ts`
- Added detailed logging for `/api/me` requests in production
- Logs successful token verification with project ID

### 4. CORS Configuration
- **Explicit domain allowlist**: Added hospogo.com and www.hospogo.com to allowed origins
- **Credentials support**: Enabled credentials for authenticated requests
- **Warning logs**: Logs unauthorized origins for monitoring

**File**: `api/_src/index.ts`
- Configured CORS with explicit origin allowlist
- Added credentials support
- Added warning logs for unauthorized origins

## Production Verification Checklist

### 1. Firebase Project ID Verification
Verify that both frontend and backend are using the correct project ID:

**Frontend** (Vercel Environment Variables):
```bash
VITE_FIREBASE_PROJECT_ID=snipshift-75b04
```

**Backend** (Vercel Environment Variables):
```bash
FIREBASE_PROJECT_ID=snipshift-75b04
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@snipshift-75b04.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Verification Command**:
```bash
vercel env ls production | grep FIREBASE_PROJECT_ID
vercel env ls production | grep VITE_FIREBASE_PROJECT_ID
```

### 2. Firebase Console Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **snipshift-75b04**
3. Navigate to **Authentication > Settings > Authorized domains**
4. Verify `hospogo.com` and `www.hospogo.com` are listed
5. If missing, click "Add domain" and add both

### 3. Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **snipshift-75b04**
3. Navigate to **APIs & Services > Credentials**
4. Find your OAuth 2.0 Client ID
5. Verify **Authorized JavaScript origins** includes:
   - `https://hospogo.com`
   - `https://www.hospogo.com`
6. Verify **Authorized redirect URIs** includes:
   - `https://hospogo.com/__/auth/handler`
   - `https://www.hospogo.com/__/auth/handler`

### 4. Backend Service Account Verification
Verify the service account has the correct permissions:

```bash
# Check if service account exists and has correct project
gcloud iam service-accounts list --project=snipshift-75b04
```

The service account should have:
- **Firebase Admin SDK Administrator Service Agent** role
- Email format: `firebase-adminsdk-xxxxx@snipshift-75b04.iam.gserviceaccount.com`

### 5. Monitor Production Logs
After deployment, monitor logs for:

**Expected Success Logs**:
```
[AUTH] Verifying token for /api/me
[AUTH] Token verified successfully { uid: '...', email: '...', projectId: 'snipshift-75b04' }
```

**Error Patterns to Watch For**:
- `Unauthorized Project ID` - Project ID mismatch
- `Token verification failed` - Invalid token or service account issue
- `Circuit breaker triggered` - Too many consecutive 401s (indicates persistent auth issue)

### 6. Test Authentication Flow
1. **Sign in with Google** on production
2. **Check browser console** for any 401 errors
3. **Verify user session persists** after page refresh
4. **Check network tab** - `/api/me` should return 200, not 401

## Expected Behavior After Fix

1. **First 401**: Token refresh attempted automatically
2. **Subsequent 401s**: Retry with cooldown (2-10 seconds)
3. **After 5 consecutive 401s**: Circuit breaker triggers, user logged out
4. **Error logging**: Detailed logs help identify root cause

## Troubleshooting

### If 401s persist after fix:

1. **Check Project ID Mismatch**:
   - Frontend: `VITE_FIREBASE_PROJECT_ID` should be `snipshift-75b04`
   - Backend: `FIREBASE_PROJECT_ID` should be `snipshift-75b04`
   - Verify in Vercel dashboard

2. **Check Service Account**:
   - Verify `FIREBASE_CLIENT_EMAIL` matches service account email
   - Verify `FIREBASE_PRIVATE_KEY` has proper `\n` escaping (not actual newlines)

3. **Check Domain Authorization**:
   - Verify `hospogo.com` is in Firebase Authorized Domains
   - Verify OAuth redirect URIs include hospogo.com

4. **Check Token Format**:
   - Tokens should be JWT format (3 parts separated by dots)
   - Check logs for "Token verification failed" errors

## Files Modified

1. `src/contexts/AuthContext.tsx` - Added circuit breaker and improved error handling
2. `src/lib/queryClient.ts` - Improved token validation
3. `api/_src/middleware/auth.ts` - Enhanced logging for production debugging
4. `api/_src/index.ts` - Improved CORS configuration

## Next Steps

1. Deploy changes to production
2. Monitor logs for authentication errors
3. Verify users can sign in without 401 loops
4. If issues persist, check the detailed error logs for root cause
