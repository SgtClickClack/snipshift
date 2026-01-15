# Firebase Service Account Setup - Quick Guide

## Prerequisites

✅ `FIREBASE_PROJECT_ID` is already set in Vercel production  
❌ `FIREBASE_SERVICE_ACCOUNT` needs to be added

## Step 1: Generate Service Account Key (if not done)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **snipshift-75b04**
3. Click ⚙️ **Settings** → **Project settings**
4. Navigate to **Service accounts** tab
5. Ensure "Node.js" is selected
6. Click **Generate new private key**
7. Confirm and download the JSON file

## Step 2: Add to Vercel (Choose One Method)

### Method A: Using Helper Script (Recommended)

**PowerShell (Windows):**
```powershell
.\scripts\add-firebase-service-account.ps1 -ServiceAccountPath "path\to\your-service-account.json" -Environment "production"
```

**Bash (Linux/Mac):**
```bash
chmod +x scripts/add-firebase-service-account.sh
./scripts/add-firebase-service-account.sh path/to/your-service-account.json production
```

### Method B: Using Vercel CLI Directly

1. Open the service account JSON file in a text editor
2. Copy the **ENTIRE contents** (all lines)
3. Run:
   ```bash
   vercel env add FIREBASE_SERVICE_ACCOUNT production
   ```
4. When prompted, paste the entire JSON content
5. Press Enter to confirm

### Method C: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. **Key:** `FIREBASE_SERVICE_ACCOUNT`
5. **Value:** Paste the entire JSON content from the service account file
6. Select **Production** environment
7. Click **Save**

## Step 3: Verify Environment Variables

```bash
vercel env ls production | Select-String -Pattern "FIREBASE"
```

Expected output:
```
FIREBASE_PROJECT_ID          Encrypted    Production
FIREBASE_SERVICE_ACCOUNT     Encrypted    Production
```

## Step 4: Trigger Redeploy

Environment variables require a redeploy to take effect:

```bash
vercel --prod
```

Or push an empty commit:
```bash
git commit --allow-empty -m "fix: add FIREBASE_SERVICE_ACCOUNT"
git push
```

## Step 5: Verify Fix

### Check Debug Endpoint

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

### Check Vercel Logs

```bash
vercel logs hospogo.com --limit=30
```

Look for:
- ✅ `[FIREBASE] Admin initialized successfully via FIREBASE_SERVICE_ACCOUNT`
- ❌ Should NOT see: `[FIREBASE] ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is missing`

### Test Authentication

1. Open https://hospogo.com in an incognito window
2. Sign in with Google
3. Check browser DevTools → Network tab
4. Find `/api/me` request
5. Should return `200 OK` (not `401 Unauthorized`)

## Troubleshooting

### Issue: "Invalid JSON" error

**Solution:** Ensure you copied the ENTIRE JSON file, including:
- Opening `{`
- All fields (type, project_id, private_key_id, private_key, client_email, etc.)
- Closing `}`

### Issue: Still getting 401 errors after redeploy

**Check:**
1. Environment variable is set for **Production** (not just Preview/Development)
2. Redeploy completed successfully
3. Wait 1-2 minutes for serverless functions to restart
4. Check logs for Firebase initialization errors

### Issue: Vercel CLI prompts for value but paste doesn't work

**Solution:** Use the helper script or Vercel Dashboard instead.

## Expected Result

✅ `/api/me` returns `200 OK` with user data  
✅ Force Sync button succeeds  
✅ FSM Onboarding screen appears  
✅ No more 401 Unauthorized errors

---

**Next:** Once verified, the rebranding is complete and authentication is fully functional.
