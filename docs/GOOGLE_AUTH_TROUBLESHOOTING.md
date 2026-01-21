# Google Auth Troubleshooting Guide

## Infinite Loading Screen Fix

If you're experiencing an infinite loading screen when clicking "Sign up with Google" on `hospogo.com`, this guide will help you diagnose and fix the issue.

### Root Cause

The infinite loading is typically caused by **Cross-Origin-Opener-Policy (COOP)** blocking communication between the Google Auth popup and the main window. This happens when:

1. The popup opens but can't communicate back to the main window
2. The browser's security policies block the handshake
3. Domain mismatches between Firebase config and actual domain

### Phase 1: Infrastructure Configuration

#### 1. Verify Firebase Auth Domain

The `authDomain` must be set to `hospogo.com` in your Firebase configuration:

**File:** `src/lib/firebase.ts`

```typescript
authDomain: sanitizeEnv(
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  'VITE_FIREBASE_AUTH_DOMAIN',
  'hospogo.com'  // Default fallback
),
```

**Environment Variable:**
```bash
VITE_FIREBASE_AUTH_DOMAIN=hospogo.com
```

#### 2. Firebase Console - Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `snipshift-75b04`
3. Navigate to **Authentication > Settings > Authorized domains**
4. Ensure these domains are listed:
   - `hospogo.com`
   - `www.hospogo.com`
   - `localhost` (for development)
   - Remove any legacy `snipshift` domains

#### 3. Google Cloud Console - OAuth Client Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `snipshift-75b04`
3. Navigate to **APIs & Services > Credentials**
4. Find your **Web Client** OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, add:
   - `https://hospogo.com`
   - `https://www.hospogo.com`
   - `http://localhost:3000` (for development)
6. Under **Authorized redirect URIs**, add:
   - `https://hospogo.com/__/auth/handler`
   - `https://www.hospogo.com/__/auth/handler`
   - `http://localhost:3000/__/auth/handler` (for development)

#### 4. OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services > OAuth consent screen**
2. Ensure the consent screen is in **Production** mode (not Testing)
3. If in Testing mode, only users explicitly added to "Test Users" can sign in

### Phase 2: Using Telemetry to Debug

We've added a telemetry function to help diagnose where the auth flow is stalling.

**In your browser console (F12), type:**
```javascript
window.DEBUG_ONBOARDING()
```

**What to look for:**

- **If `id` is `null`:** The Firebase handshake is failing
  - Check `authDomain` matches your actual domain
  - Verify Firebase Console authorized domains
  - Check Google Cloud Console redirect URIs

- **If `id` is present but still loading:** The redirect logic isn't picking up the successful login
  - Check `isAuthReady` and `isAuthenticated` flags
  - Verify `user` object is populated
  - Check browser console for errors

**Example output:**
```javascript
{
  id: "abc123...",           // Firebase UID (null if auth failed)
  email: "user@example.com",
  isAuthReady: true,
  isAuthenticated: true,
  user: { ... },              // App user object (null if not loaded)
  currentPath: "/onboarding",
  authDomain: "hospogo.com",
  currentDomain: "hospogo.com",
  timestamp: "2026-01-15T..."
}
```

### Phase 3: Common Issues & Solutions

#### Issue: Third-Party Cookies Blocked

**Symptoms:** Popup opens but immediately closes or hangs

**Solution:**
- Enable third-party cookies for `accounts.google.com`
- Test in a different browser (Chrome, Firefox, Safari)
- Try incognito/private mode (some browsers allow cookies in private mode)

#### Issue: Popup Timeout (30 seconds)

**Symptoms:** Popup stays open for 30+ seconds, then shows "Switching to redirect"

**Solution:**
- The app automatically falls back to redirect flow
- Wait for the redirect to complete
- If redirect doesn't start, check browser console for errors

#### Issue: Unauthorized Domain Error

**Symptoms:** Error message: "This domain is not authorized for Google Auth"

**Solution:**
1. Verify domain in Firebase Console > Authentication > Settings > Authorized domains
2. Verify domain in Google Cloud Console > Credentials > Authorized JavaScript origins
3. Ensure `VITE_FIREBASE_AUTH_DOMAIN` environment variable matches your domain

#### Issue: Browser Cache

**Symptoms:** Old "HospoGo" session data causing conflicts

**Solution:**
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Clear cache for `hospogo.com` specifically
- Clear all cookies for `hospogo.com` and `accounts.google.com`

### Phase 4: Automatic Fallback

The app now includes automatic fallback mechanisms:

1. **Popup Timeout Detection:** If popup doesn't complete within 30 seconds, automatically switches to redirect flow
2. **COOP-Aware Handling:** Detects when COOP blocks popup communication and falls back gracefully
3. **Better Error Messages:** Clear, actionable error messages for common configuration issues

### Verification Checklist

- [ ] `VITE_FIREBASE_AUTH_DOMAIN` is set to `hospogo.com`
- [ ] Firebase Console authorized domains include `hospogo.com` and `www.hospogo.com`
- [ ] Google Cloud Console authorized JavaScript origins include `https://hospogo.com`
- [ ] Google Cloud Console authorized redirect URIs include `https://hospogo.com/__/auth/handler`
- [ ] OAuth consent screen is in Production mode
- [ ] Third-party cookies are enabled
- [ ] Browser cache cleared
- [ ] `window.DEBUG_ONBOARDING()` shows valid `id` after sign-in attempt

### Still Having Issues?

1. Run `window.DEBUG_ONBOARDING()` and share the output
2. Check browser console for specific error codes:
   - `auth/popup-timeout` - Popup timed out, redirect should have started
   - `auth/popup-blocked` - Browser blocked the popup
   - `auth/unauthorized-domain` - Domain not configured correctly
   - `auth/popup-closed-by-user` - User closed popup (expected)
3. Check network tab for failed requests to `/api/register` or `/api/me`
4. Verify Firebase project ID matches in all configurations
