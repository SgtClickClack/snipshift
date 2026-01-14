# Google Auth URL Configuration for HospoGo

This guide documents the exact configuration needed to fix Google Authentication for the HospoGo application.

## Overview

Google Sign-In with Firebase requires proper configuration in **three places**:
1. Google Cloud Console (OAuth 2.0 Credentials)
2. Firebase Console (Authorized Domains)
3. Environment Variables (.env file)

---

## Step 1: Google Cloud Console Configuration

### Navigate to OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the **hospogo-75b04** project
3. Navigate to **APIs & Services** > **Credentials**
4. Find and click on the **OAuth 2.0 Client ID** used for web authentication

### Configure Authorized JavaScript Origins

Add the following origins (if not already present):

```
https://hospogo.com
https://www.hospogo.com
https://hospogo-75b04.web.app
https://hospogo-75b04.firebaseapp.com
```

> **Note:** If you're testing locally, you may also need:
> ```
> http://localhost:5173
> http://localhost:3000
> ```

### Configure Authorized Redirect URIs

Add the following redirect URIs (these are Firebase's auth handler endpoints):

```
https://hospogo.com/__/auth/handler
https://www.hospogo.com/__/auth/handler
https://hospogo-75b04.web.app/__/auth/handler
https://hospogo-75b04.firebaseapp.com/__/auth/handler
```

> **Note:** For local development, if using redirect flow:
> ```
> http://localhost:5173/__/auth/handler
> http://localhost:3000/__/auth/handler
> ```

### Save the Credentials

1. Click **Save** after adding the URIs
2. Copy the **Client ID** (format: `xxx.apps.googleusercontent.com`)
3. Copy the **Client Secret** (only if needed for backend)

---

## Step 2: Firebase Console Configuration

### Enable Google Sign-In Provider

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the **hospogo-75b04** project
3. Navigate to **Authentication** > **Sign-in method**
4. Click on **Google** provider
5. Ensure it's **Enabled**
6. Verify the **Web client ID** matches your OAuth client

### Configure Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings**
2. Find the **Authorized domains** section
3. Ensure these domains are listed:

| Domain | Purpose |
|--------|---------|
| `hospogo-75b04.web.app` | Firebase Hosting (primary) |
| `www.hospogo.com` | Custom domain |
| `hospogo.com` | Custom domain (non-www) |
| `hospogo-75b04.firebaseapp.com` | Firebase default |
| `localhost` | Local development |

> **Note:** Firebase typically auto-adds the `.web.app` and `.firebaseapp.com` domains.

---

## Step 3: Environment Variables

### Frontend (.env or Vercel Environment Variables)

Ensure your frontend environment has these Firebase variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=hospogo.com
VITE_FIREBASE_PROJECT_ID=hospogo-75b04
VITE_FIREBASE_STORAGE_BUCKET=hospogo-75b04.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Auth Domain Options

The `VITE_FIREBASE_AUTH_DOMAIN` controls what domain appears in the Google sign-in popup:

| Value | Effect |
|-------|--------|
| `hospogo.com` | Shows "hospogo.com" in popup (default - branded) |
| `www.hospogo.com` | Shows "www.hospogo.com" in popup (requires custom domain setup in Firebase) |
| `hospogo-75b04.firebaseapp.com` | Shows "hospogo-75b04" in popup (Firebase default) |

---

## Step 4: Verification

### Test in Incognito/Private Mode

1. Open an Incognito/Private browser window
2. Navigate to the application
3. Click "Sign in with Google"
4. Verify the sign-in popup opens correctly
5. Complete the sign-in flow

### Clear Browser Cache (if needed)

If you're still experiencing issues after configuration:

1. Clear browser cache and cookies for:
   - `hospogo-75b04.web.app`
   - `www.hospogo.com`
   - `accounts.google.com`
2. Or test in a fresh Incognito window

### Check Console for Errors

Common error codes and their meanings:

| Error | Cause | Solution |
|-------|-------|----------|
| `auth/popup-blocked` | Browser blocking popups | Allow popups or use redirect flow |
| `auth/unauthorized-domain` | Domain not in Firebase authorized list | Add domain to Firebase Console |
| `redirect_uri_mismatch` | Redirect URI not in Google Console | Add URI to OAuth credentials |
| `invalid_client` | Wrong Client ID | Verify VITE_FIREBASE_API_KEY |

---

## Troubleshooting

### "redirect_uri_mismatch" Error

This means the redirect URI used by Firebase doesn't match what's configured in Google Cloud Console.

**Solution:**
1. Check the exact URI shown in the error message
2. Add that exact URI to Google Cloud Console > Credentials > Authorized redirect URIs

### "Error 400: invalid_request" in Google Popup

This usually indicates the OAuth client is misconfigured.

**Solutions:**
1. Verify the OAuth Client ID in Firebase Console matches Google Cloud Console
2. Ensure the domain making the request is in Authorized JavaScript Origins
3. Check that all required scopes are enabled

### Sign-in Works But User Gets Logged Out

This is usually a persistence issue.

**Solution:** The app already sets `browserLocalPersistence` before sign-in. If issues persist:
1. Check for conflicts with browser extensions
2. Verify no code is calling `signOut()` unintentionally
3. Check for navigation that triggers auth state reset

---

## Configuration Summary

### Required Google Cloud Console Settings

| Setting | Value |
|---------|-------|
| **Authorized JavaScript Origins** | `https://hospogo.com` |
| | `https://www.hospogo.com` |
| | `https://hospogo-75b04.web.app` |
| | `https://hospogo-75b04.firebaseapp.com` |
| **Authorized Redirect URIs** | `https://hospogo.com/__/auth/handler` |
| | `https://www.hospogo.com/__/auth/handler` |
| | `https://hospogo-75b04.web.app/__/auth/handler` |
| | `https://hospogo-75b04.firebaseapp.com/__/auth/handler` |

### Required Firebase Console Settings

| Setting | Value |
|---------|-------|
| **Authorized Domains** | `hospogo-75b04.web.app` |
| | `www.hospogo.com` |
| | `hospogo.com` |
| | `hospogo-75b04.firebaseapp.com` |
| | `localhost` |

---

## Quick Checklist

- [ ] Google Cloud Console: OAuth Client ID has correct JavaScript Origins
- [ ] Google Cloud Console: OAuth Client ID has correct Redirect URIs
- [ ] Firebase Console: Google Sign-In provider is enabled
- [ ] Firebase Console: Authorized domains include all production domains
- [ ] Environment: VITE_FIREBASE_AUTH_DOMAIN is set correctly
- [ ] Tested: Sign-in works in Incognito/Private window

---

*Last updated: January 2026*
