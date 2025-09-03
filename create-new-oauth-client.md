# Create New OAuth Client - Step by Step

## Current Issue
The existing OAuth client (399353553154-...) is not working despite correct configuration. Let's create a fresh one.

## Steps to Create New OAuth Client

### 1. Go to Google Cloud Console
https://console.cloud.google.com/apis/credentials

### 2. Create New OAuth Client
1. Click **"+ CREATE CREDENTIALS"**
2. Select **"OAuth 2.0 Client ID"**
3. If prompted, configure OAuth consent screen first

### 3. Configure OAuth Client
1. **Application type**: Web application
2. **Name**: Snipshift (or any name you prefer)
3. **Authorized JavaScript origins**: Click "Add URI" and add:
   ```
   https://b9c30b6a-0bb9-491f-8312-4ea2996a1e40-00-1z5x1ywkgc76h.picard.replit.dev
   ```
4. **Authorized redirect URIs**: Leave empty (not needed for our setup)
5. Click **"CREATE"**

### 4. Copy New Client ID
- Copy the new Client ID (will be different from 399353553154-...)
- It should end with `.apps.googleusercontent.com`

### 5. Update Replit
- Provide the new Client ID to update the VITE_GOOGLE_CLIENT_ID secret

### 6. Test
- The new OAuth client should work immediately (no propagation delay for new clients)

## Why Create New Instead of Fix?
- Faster than debugging existing configuration
- Eliminates any hidden configuration issues
- Fresh start ensures everything is set up correctly
- No waiting for propagation delays

Ready to create the new OAuth client?