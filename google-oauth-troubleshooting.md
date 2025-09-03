# Google OAuth Troubleshooting Guide

## Current Status: "Error 401: invalid_client" 

**Based on your screenshot**, you're getting the exact error we expected. This means either:
1. Google OAuth changes are still propagating (2-15 minutes)
2. The domain isn't correctly configured in Google Cloud Console
3. Wrong Client ID being used

### Your Current Setup
- **Replit Domain**: `https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev`
- **Google Client ID**: ✅ Configured in Replit Secrets  
- **Error**: "The OAuth client was not found" - **This is the key issue**

### CRITICAL - Double-Check These Steps

#### Step 1: Verify the Correct Google Cloud Project
1. Go to: https://console.cloud.google.com/
2. **Check the project name in the top-left dropdown**
3. Make sure you're in the same project where you created the Client ID

#### Step 2: Find the Exact Client ID
1. Go to: https://console.cloud.google.com/apis/credentials  
2. Look for **OAuth 2.0 Client IDs** section
3. **Copy the Client ID** (it should end with `.apps.googleusercontent.com`)
4. **Verify this EXACTLY matches** what you entered in Replit Secrets

#### Step 3: Edit the OAuth Client Configuration
1. **Click on your OAuth 2.0 Client ID name** (not the pencil icon)
2. Click **"EDIT"** button at the top
3. Scroll to **"Authorized JavaScript origins"**
4. **Add this EXACT domain** (copy-paste to avoid typos):
   ```
   https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
   ```
5. **Click "SAVE"** at the bottom

#### Step 4: Verify Your Client ID in Replit
The Client ID you entered should look like:
```
1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

### Most Common Causes of This Error
1. **Wrong Client ID**: The ID in Replit doesn't match Google Cloud Console
2. **Wrong Google Project**: You're editing a different project's OAuth client  
3. **Typo in domain**: Even one character difference will cause this error
4. **Not saved**: Forgot to click "Save" in Google Cloud Console

### Expected Timeline
- **0-2 minutes**: Changes made in Google Cloud Console
- **2-15 minutes**: Google propagation time (this is where you are now)
- **After 15 minutes**: OAuth should work

### How to Test
1. Wait 15 minutes from when you saved the changes in Google Cloud Console
2. Clear your browser cache or try incognito mode
3. Go to the Snipshift login page
4. Click "Sign in with Google"
5. Should now show Google account selection instead of error

### If Still Blocked After 15 Minutes
1. Double-check the domain in Google Cloud Console matches exactly
2. Try removing and re-adding the domain
3. Ensure you're using the correct Google project
4. Check that the Client ID in Replit matches the one from Google Cloud Console

### Alternative: Test with localhost
If you want to test immediately, you can temporarily add `http://localhost:5000` to authorized origins for local testing, but remember to remove it later for security.