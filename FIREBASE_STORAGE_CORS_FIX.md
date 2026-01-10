# Firebase Storage CORS Configuration Fix

## Issue
Profile picture uploads are failing with CORS errors:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'https://hospogo.com' has been blocked by CORS policy
```

## Root Cause
Firebase Storage requires CORS to be explicitly configured for your domain. The preflight OPTIONS request is failing because CORS headers are not properly set.

## Solution

### Option 1: Configure CORS via Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **snipshift-75b04**
3. Navigate to **Storage** > **Rules** tab
4. Click on **CORS configuration** (or go to Storage settings)
5. Add the following CORS configuration:

```json
[
  {
    "origin": ["https://hospogo.com", "https://www.hospogo.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"]
  }
]
```

### Option 2: Configure CORS via gsutil (Command Line)

If you have `gsutil` installed and configured:

```bash
# Create a CORS configuration file
cat > cors.json << EOF
[
  {
    "origin": ["https://hospogo.com", "https://www.hospogo.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"]
  }
]
EOF

# Apply CORS configuration
gsutil cors set cors.json gs://snipshift-75b04.firebasestorage.app
```

### Option 3: Add Localhost for Development

If you also need to test locally, add localhost origins:

```json
[
  {
    "origin": [
      "https://hospogo.com",
      "https://www.hospogo.com",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"]
  }
]
```

## Verification

After configuring CORS:

1. Wait 1-2 minutes for changes to propagate
2. Try uploading a profile picture again
3. Check browser console - CORS errors should be gone
4. If errors persist, check:
   - Domain matches exactly (including www vs non-www)
   - HTTPS is used for production
   - Firebase Storage rules allow the operation

## Current Storage Rules Status

✅ Storage rules are correctly configured in `storage.rules`:
- Users can upload to `users/{userId}/avatar.{ext}`
- File size limit: 5MB
- File type validation: jpg, jpeg, png, gif, webp
- Authentication required

The issue is **CORS configuration**, not storage rules.

## Related Files

- `storage.rules` - Firebase Storage security rules (correctly configured)
- `src/components/profile/profile-edit-form.tsx` - Profile upload component (now includes CORS error detection)
- `src/components/profile/profile-form.tsx` - Profile upload component (now includes CORS error detection)

## Error Handling

The code now includes:
- ✅ CORS error detection and user-friendly messages
- ✅ Timeout handling (30 seconds)
- ✅ Verbose error logging for debugging
- ✅ Specific error codes displayed to users

