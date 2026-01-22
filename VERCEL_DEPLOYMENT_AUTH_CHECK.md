# Vercel Deployment Auth Environment Check

## Critical: Manual Verification Required

E2E tests pass, but manual onboarding fails with 401 'Invalid token'. This indicates the Vercel backend environment variables do not match the frontend Firebase project (`snipshift-75b04`).

## Action Items for Julian

### 1. Check Vercel Environment Variables

Navigate to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Verify the following variables are set correctly for **Production** environment:

#### Required Variables:

1. **`FIREBASE_PROJECT_ID`**
   - **Required Value:** `snipshift-75b04` (exact match, no quotes)
   - **Verification:** 
     ```bash
     vercel env ls production | grep FIREBASE_PROJECT_ID
     ```
   - Should show: `FIREBASE_PROJECT_ID  Encrypted    Production`

2. **`FIREBASE_SERVICE_ACCOUNT_KEY`** (if using JSON method)
   - **Required:** Must be the EXACT JSON from Google Cloud Console
   - **Source:** [Firebase Console](https://console.firebase.google.com/project/snipshift-75b04/settings/serviceaccounts/adminsdk)
   - **Project:** Select `snipshift-75b04`
   - **Format:** Minified JSON string (all on one line, no actual newlines)
   - **Validation:** Must contain `"project_id": "snipshift-75b04"`

   **OR** (if using individual variables):

3. **`FIREBASE_CLIENT_EMAIL`**
   - **Format:** `firebase-adminsdk-xxxxx@snipshift-75b04.iam.gserviceaccount.com`
   - Must match the service account email from the correct project

4. **`FIREBASE_PRIVATE_KEY`**
   - **Format:** Single-line string with literal `\n` characters (backslash-n, NOT actual newlines)
   - **Example:**
     ```
     "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
     ```

5. **`VITE_FIREBASE_PROJECT_ID`** (Frontend)
   - **Required Value:** `snipshift-75b04` (exact match)
   - Must match `FIREBASE_PROJECT_ID` in backend

### 2. Verify Service Account Source

**Critical:** The `FIREBASE_SERVICE_ACCOUNT_KEY` must be downloaded from the **correct Firebase project**.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **`snipshift-75b04`**
3. Navigate to: **Project Settings → Service Accounts**
4. Click **"Generate New Private Key"**
5. Download the JSON file
6. Copy the **entire JSON content** (minified, single line)
7. Paste into Vercel environment variable `FIREBASE_SERVICE_ACCOUNT_KEY`

**DO NOT** use a service account from a different project (e.g., `snipshift-web`, `hospogo-prod`, etc.)

### 3. Verification Steps

After updating environment variables:

1. **Redeploy** the Vercel project to apply changes:
   ```bash
   vercel --prod
   ```

2. **Check logs** for initialization:
   - Look for: `[AUTH DEBUG] Backend Project ID: snipshift-75b04`
   - Look for: `[FIREBASE] Admin initialized successfully`
   - Should NOT see: `Unauthorized Project ID` errors

3. **Test manual onboarding:**
   - Try signing up a new user
   - Check for 401 errors
   - Verify token verification succeeds

### 4. Common Issues

#### Issue: "Invalid token" 401 errors
- **Cause:** Backend project ID doesn't match frontend project ID
- **Fix:** Ensure both `FIREBASE_PROJECT_ID` and `VITE_FIREBASE_PROJECT_ID` are `snipshift-75b04`

#### Issue: "Firebase Admin not initialized"
- **Cause:** Missing or incorrect `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Fix:** Re-download service account JSON from correct project and update Vercel env var

#### Issue: "Project ID mismatch"
- **Cause:** Service account JSON contains wrong `project_id`
- **Fix:** Download service account from `snipshift-75b04` project, not another project

### 5. Debug Logging

The code now includes enhanced debug logging:

- `[AUTH DEBUG] Backend Project ID:` - Shows the project ID being used
- `[FIREBASE] Admin initialized successfully` - Confirms initialization
- Check Vercel function logs for these messages after deployment

### 6. Quick Verification Command

Run this to verify all required variables are set:

```bash
vercel env ls production | grep -E "FIREBASE_PROJECT_ID|FIREBASE_SERVICE_ACCOUNT|FIREBASE_CLIENT_EMAIL|VITE_FIREBASE_PROJECT_ID"
```

All should show as "Encrypted" for Production environment.

---

## Summary

**Critical Actions:**
1. ✅ Verify `FIREBASE_PROJECT_ID = snipshift-75b04` in Vercel
2. ✅ Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is from `snipshift-75b04` project
3. ✅ Verify `VITE_FIREBASE_PROJECT_ID = snipshift-75b04` in Vercel
4. ✅ Redeploy after making changes
5. ✅ Check logs for `[AUTH DEBUG] Backend Project ID: snipshift-75b04`

**Expected Result:**
- Manual onboarding should work without 401 errors
- Token verification should succeed
- Backend and frontend should use matching project IDs
