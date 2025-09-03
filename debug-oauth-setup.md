# ✅ OAuth Setup - UPDATED

## Status: Client ID Updated
- **New Client ID**: 399353553154-211k03t5hm4vnrvrgrsnqqna6q90o0nb.apps.googleusercontent.com
- **Replit Domain**: https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
- **Status**: Client ID configured in Replit ✅

## Final Step Required
You now need to configure this Client ID in Google Cloud Console.

## Step-by-Step Debug Process

### Step 1: Verify Google Cloud Console Setup
1. Go to: https://console.cloud.google.com/apis/credentials
2. **Check the project dropdown** in the top-left corner
3. **Look for "OAuth 2.0 Client IDs" section**
4. **Count how many OAuth clients you have**

### Step 2: Find the Correct Client ID
1. Click on each OAuth 2.0 Client ID in the list
2. **Copy the Client ID** (the long string ending in `.apps.googleusercontent.com`)
3. **Check if any of them match** what you entered in Replit

### Step 3: Configure the OAuth Client
For the OAuth client you want to use:
1. Click on its name to open details
2. Click **"EDIT"** button
3. Under **"Authorized JavaScript origins"**, add:
   ```
   https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
   ```
4. **Click "SAVE"**

### Step 4: Update Replit with Correct Client ID
If you found a different Client ID in step 2, you need to update Replit.

## Common Issues
1. **Multiple Google accounts**: Make sure you're logged into the right Google account
2. **Multiple projects**: You might be looking at the wrong Google Cloud project
3. **Old Client ID**: You might be using a Client ID from a different project or deleted client

## Quick Test
After making changes:
1. Wait 2-3 minutes for Google propagation
2. Clear browser cache or use incognito mode
3. Try the Google sign-in again