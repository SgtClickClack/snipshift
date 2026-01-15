# Task 20: Final ID Alignment and Security

## Status: ✅ Project ID Fixed, Firebase Admin Initialization Issue Remaining

### 🔍 Diagnostic Results

**Token Analysis:**
- Token 'aud' claim: `snipshift-75b04` ✅
- Environment `FIREBASE_PROJECT_ID`: `snipshift-75b04` ✅ (FIXED - was `snipshift-web`)
- Project IDs now match! ✅

**Current Issue:**
- Token verification still failing: `Firebase Admin not initialized. Check environment variables.`
- This suggests Firebase Admin SDK is not initializing properly despite correct Project ID

### ✅ Completed Tasks

1. **Security Patch (CVE-2025-55182)**
   - ✅ React 19.2.3 is already the latest stable version
   - ✅ React-DOM 19.2.3 is already the latest stable version
   - ⚠️ Note: This is a Vite project (not Next.js), so CVE-2025-55182 may not apply as it's a React Server Components vulnerability
   - The security banner may be a false positive or may clear after deployment

2. **Private Key Formatting**
   - ✅ Verified: `api/_src/config/firebase.ts` line 54 already has correct formatting:
     ```typescript
     privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
     ```
   - This ensures newline characters are properly handled

3. **Project ID Alignment**
   - ✅ Created test script: `scripts/test-auth-truth.ps1`
   - ⚠️ **ACTION REQUIRED**: Check the 'aud' claim using the test script or manually

### 🔍 How to Check Project ID Alignment

**Option 1: Use the test script**
```powershell
.\scripts\test-auth-truth.ps1 -Token "your-firebase-token-here"
```

**Option 2: Manual API call**
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN_HERE"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://hospogo.com/api/auth-truth" -Method Post -Headers $headers
```

**What to look for:**
- `decoded_token_without_verify.aud` should show the Project ID from the token
- `env_project_id` should show the current FIREBASE_PROJECT_ID in Vercel
- If they don't match, update `FIREBASE_PROJECT_ID` in Vercel Dashboard

### 📋 Pre-Deployment Checklist

- [ ] Run `.\scripts\test-auth-truth.ps1` with your token to verify 'aud' claim
- [ ] If 'aud' shows `snipshift-75b04`, ensure `FIREBASE_PROJECT_ID` in Vercel matches exactly
- [ ] Verify `FIREBASE_PRIVATE_KEY` in Vercel has proper `\n` escaping
- [ ] Deploy to production: `vercel --prod`

### 🚀 Deployment

✅ **Deployed successfully!**
- Deployment URL: https://hospogo-kbuw8g1ke-dojo-pool-team.vercel.app
- Production domain: https://hospogo.com (if configured)
- Build completed successfully
- ✅ Fixed: Updated `FIREBASE_PROJECT_ID` from `snipshift-web` to `snipshift-75b04`

### ⚠️ Remaining Issue: Firebase Admin Initialization

**Problem:** Firebase Admin is not initializing, causing token verification to fail.

**Possible Causes:**
1. `FIREBASE_PRIVATE_KEY` in Vercel may not have proper `\n` escaping
2. `FIREBASE_CLIENT_EMAIL` might be incorrect
3. Private key format might be corrupted in Vercel

**Solution Steps:**
1. Verify `FIREBASE_PRIVATE_KEY` in Vercel has literal `\n` characters (not actual newlines)
2. Ensure `FIREBASE_CLIENT_EMAIL` matches: `firebase-adminsdk-fbsvc@snipshift-75b04.iam.gserviceaccount.com`
3. Consider using `FIREBASE_SERVICE_ACCOUNT` JSON string instead (more reliable)

### Expected Results After Deployment

1. ✅ Security alert (if applicable) should disappear
2. ✅ Backend successfully verifies tokens for 'snipshift-75b04'
3. ✅ Infinite loading screen resolves to Onboarding FSM
4. ✅ 401 loop is resolved

### 📝 Notes

- The `vercel.json` file already has a rewrite to `snipshift-75b04.firebaseapp.com`, confirming the expected Project ID
- Frontend uses `VITE_FIREBASE_PROJECT_ID` (should be `snipshift-75b04`)
- Backend uses `FIREBASE_PROJECT_ID` (should be `snipshift-75b04`)
- Both must match the token's 'aud' claim for authentication to work
