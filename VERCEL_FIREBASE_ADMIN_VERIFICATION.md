# Vercel Firebase Admin Configuration Verification Guide

## Overview
This guide helps you verify that Firebase Admin is properly configured in your Vercel deployment to resolve 401 Unauthorized errors on `/api/me`.

## Step 1: Check Vercel Environment Variables

### Navigate to Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **HospoGo** project
3. Go to **Settings** → **Environment Variables**

### Required Environment Variables

You need **ONE** of the following configurations:

#### Option A: FIREBASE_SERVICE_ACCOUNT (Recommended)
- **Variable Name:** `FIREBASE_SERVICE_ACCOUNT`
- **Value:** Full service account JSON as a single-line string
- **Format:** Minified JSON (no actual newlines, use `\n` for line breaks in private key)
- **Example:**
  ```json
  {"type":"service_account","project_id":"snipshift-75b04","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
  ```

#### Option B: Individual Environment Variables
- **FIREBASE_PROJECT_ID:** `snipshift-75b04` (must match exactly)
- **FIREBASE_CLIENT_EMAIL:** Service account email (e.g., `firebase-adminsdk-xxxxx@snipshift-75b04.iam.gserviceaccount.com`)
- **FIREBASE_PRIVATE_KEY:** Private key with literal `\n` characters (not actual newlines)

### Critical Checks

1. **Project ID Validation:**
   - ✅ Must be exactly: `snipshift-75b04`
   - ❌ NOT: `snipshift-web` or any other value
   - The backend enforces this strictly for security

2. **Private Key Format:**
   - ✅ Correct: `"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n"`
   - ❌ Wrong: Actual line breaks in the Vercel UI
   - The `\n` must be literal backslash-n, not actual newlines

3. **Service Account Source:**
   - Download from [Firebase Console](https://console.firebase.google.com/project/snipshift-75b04/settings/serviceaccounts/adminsdk)
   - Select project: **snipshift-75b04**
   - Click "Generate new private key"
   - Use the downloaded JSON file

## Step 2: Verify Environment Variables Are Set

### Check Production Environment
- Ensure variables are set for **Production** environment
- Also check **Preview** if you want it to work in preview deployments

### Verify Variable Names
- Check for typos: `FIREBASE_SERVICE_ACCOUNT` (not `FIREBASE_SERVICE_ACCOUNT_KEY`)
- Case-sensitive: Must be uppercase

## Step 3: Test After Deployment

### Check Backend Logs
After deploying, check Vercel function logs for:

**Success indicators:**
```
[FIREBASE] Admin initialized successfully via FIREBASE_SERVICE_ACCOUNT
[FIREBASE] Auth instance created with validated project ID: snipshift-75b04
```

**Failure indicators:**
```
[FIREBASE] Init Failed (FIREBASE_SERVICE_ACCOUNT): ...
[FIREBASE] ERROR: Missing required environment variables
[AUTH] Firebase auth service is not initialized
```

### Test Token Verification
1. Sign in with Google on the frontend
2. Check browser console for 401 errors on `/api/me`
3. Check Vercel logs for:
   ```
   [AUTH DEBUG] Firebase Admin initialized successfully
   [AUTH] Token verified successfully
   ```

## Step 4: Common Issues and Fixes

### Issue: "Firebase Admin not initialized"
**Fix:**
- Verify `FIREBASE_SERVICE_ACCOUNT` is set in Vercel
- Check that the JSON is valid (minified, single line)
- Ensure private key uses `\n` not actual newlines

### Issue: "Unauthorized Project ID"
**Fix:**
- Verify `FIREBASE_PROJECT_ID = snipshift-75b04` exactly
- Check service account JSON has `"project_id": "snipshift-75b04"`
- Remove any conflicting project ID variables

### Issue: "Token verification failed"
**Fix:**
- Check that Firebase Admin initialized successfully
- Verify the token's `aud` claim matches `snipshift-75b04`
- Check Vercel logs for specific error codes

### Issue: "Decoding Firebase ID token failed"
**Fix:**
- Usually indicates project ID mismatch
- Verify frontend `VITE_FIREBASE_PROJECT_ID` matches backend `FIREBASE_PROJECT_ID`
- Both should be `snipshift-75b04`

## Step 5: Quick Verification Command

After setting environment variables, you can test the configuration by checking Vercel logs:

```bash
# View recent logs
vercel logs hospogo.com --limit=50

# Filter for Firebase initialization
vercel logs hospogo.com --limit=100 | grep -i "firebase\|auth"
```

Look for:
- ✅ `[FIREBASE] Admin initialized successfully`
- ✅ `[AUTH] Token verified successfully`
- ❌ `[FIREBASE] Init Failed`
- ❌ `[AUTH ERROR] Token verification failed`

## Next Steps

1. **Set/Update Environment Variables** in Vercel Dashboard
2. **Redeploy** the application (or wait for automatic deployment)
3. **Monitor Logs** for initialization success
4. **Test Authentication** by signing in with Google
5. **Check Browser Console** for 401 errors

## Support

If issues persist after verification:
1. Check Vercel logs for specific error messages
2. Verify service account JSON is valid
3. Ensure project ID matches exactly: `snipshift-75b04`
4. Check that private key format uses `\n` (not actual newlines)
