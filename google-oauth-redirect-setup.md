# Google OAuth Redirect URIs Setup for Snipshift

## Why Authorized Redirect URIs Are Required

Google OAuth requires you to specify exactly which URLs Google can redirect users back to after authentication. This is a security measure to prevent malicious sites from hijacking the OAuth flow.

## Current Development Setup Needed

### Your Current Replit Domain
Based on your current development environment, you need to configure these URIs in Google Cloud Console:

**Development Domain**: `https://[your-repl-id].replit.dev` (check your browser URL)

### Required Redirect URIs Configuration

In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client:

#### 1. Authorized JavaScript Origins
Add your Replit development domain:
```
https://[your-repl-id].replit.dev
```

#### 2. Authorized Redirect URIs
For Firebase Auth with redirect flow, add:
```
https://[your-repl-id].replit.dev/__/auth/handler
```

**Note**: Firebase handles the redirect internally, but Google still requires this to be configured.

## Production Deployment Setup

When you deploy Snipshift to production:

### For Replit Deployments:
```
# JavaScript Origins
https://snipshift.[username].replit.app

# Redirect URIs  
https://snipshift.[username].replit.app/__/auth/handler
```

### For Your Production Domain (snipshift.com.au):
```
# JavaScript Origins
https://snipshift.com.au

# Redirect URIs
https://snipshift.com.au/__/auth/handler
```

## Step-by-Step Setup Process

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID

3. **Edit OAuth Client**
   - Click **Edit** on your OAuth client
   - Add the URLs above to both sections

4. **Save and Wait**
   - Click **Save**
   - Wait 5-10 minutes for changes to propagate

## Testing the Setup

After configuration:
1. Visit `/login` on Snipshift
2. Click "Sign in with Google"
3. You should see Google's account selection
4. After authentication, you'll be redirected back to Snipshift

## Troubleshooting

**Error: redirect_uri_mismatch**
- Double-check the redirect URI exactly matches what you configured
- Ensure there are no typos in the domain

**Error: invalid_client**  
- Verify the JavaScript origins are correctly set
- Make sure you're using the correct client ID in your environment variables

## Current Firebase Configuration

Your Firebase config in `client/src/lib/firebase.ts` is correctly set up for:
- Popup authentication (primary method)
- Redirect authentication (fallback for blocked popups)

The redirect URI configuration ensures both methods work properly.