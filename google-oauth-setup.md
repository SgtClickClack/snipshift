# Google OAuth Setup for Snipshift

## Current Issue
You're getting "Error 401: invalid_client" because your Google Cloud Console OAuth client needs to be configured with your Replit domain.

## Your Replit Domain
Your current development domain: `https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev`

## Fix the OAuth Configuration

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create one if you haven't)

### Step 2: Configure OAuth Client
1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID (or create one if needed)
3. Click **Edit** on your OAuth client

### Step 3: Add Authorized Origins
In the "Authorized JavaScript origins" section, add:
```
https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
```

### Step 4: No Redirect URIs Needed
For our implementation using @react-oauth/google, you don't need to add redirect URIs. The library handles this internally.

### Step 5: Save Changes
Click **Save** in the Google Cloud Console.

## After Making Changes
- It may take a few minutes for Google's changes to propagate
- Refresh your Replit app and try the Google sign-in again
- The "Sign in with Google" button should work without errors

## For Production Deployment
When you deploy to production, you'll need to add your production domain to the authorized origins as well:
- If using Replit deployment: `https://your-app-name.yourname.replit.app`
- If using custom domain: `https://yourdomain.com`

## Verification
Once configured correctly:
1. Click "Sign in with Google" on the login page
2. You should see the Google account selection screen
3. After selecting an account, you'll be redirected back to Snipshift
4. A user profile will be created automatically with your Google account data