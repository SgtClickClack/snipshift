# Environment Setup Guide

This document provides **exact** requirements for setting up environment variables, particularly for Firebase Admin SDK authentication.

## Critical: Firebase Admin SDK Configuration

The backend API requires Firebase Admin SDK credentials to verify authentication tokens and access Firebase services. These credentials are **different** from the frontend Firebase configuration variables.

### Required Environment Variables

You must set **one of the following** configuration methods:

#### Option 1: Individual Environment Variables (Recommended)

Set these three environment variables:

1. **`FIREBASE_PROJECT_ID`**
   - **Format**: Plain string, no quotes needed
   - **Example**: `snipshift-75b04`
   - **Validation**: Must match the project ID in your Firebase Console

2. **`FIREBASE_CLIENT_EMAIL`**
   - **Format**: Email address string
   - **Example**: `firebase-adminsdk-xyz@snipshift-75b04.iam.gserviceaccount.com`
   - **Validation**: Must be a valid email address

3. **`FIREBASE_PRIVATE_KEY`** ⚠️ **CRITICAL FORMAT**
   - **Format**: Single-line string with **literal `\n` characters** (backslash-n, NOT actual newlines)
   - **Example**:
     ```
     "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
     ```
   - **DO NOT** use actual line breaks
   - **DO NOT** use double backslashes (`\\n`)
   - **MUST** use literal backslash-n (`\n`) characters
   - The entire key should be on a single line when viewed in your environment variable editor

#### Option 2: Service Account JSON String (Alternative)

Set this single environment variable:

1. **`FIREBASE_SERVICE_ACCOUNT`**
   - **Format**: Minified JSON string (all on one line, no actual newlines)
   - **Example**:
     ```
     {"type":"service_account","project_id":"snipshift-75b04","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
     ```
   - The private key within the JSON should have literal `\n` characters, not actual newlines

### How to Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Settings** → **Project settings**
4. Navigate to **Service accounts** tab
5. Ensure "Node.js" is selected
6. Click **Generate new private key**
7. A JSON file will be downloaded

### Formatting FIREBASE_PRIVATE_KEY for Vercel

When adding `FIREBASE_PRIVATE_KEY` to Vercel (or any environment variable system):

1. **Open the downloaded JSON file** in a text editor
2. **Find the `private_key` field** (it will have actual newlines)
3. **Convert it to a single line** with literal `\n` characters:
   - Replace actual newlines with `\n` (backslash-n)
   - Keep the entire key as one continuous string
   - Include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers

**Example transformation:**

**Original (in JSON file):**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

**Correct format for environment variable:**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

### Verification

The system includes an automated **Auth Guard** test that runs before every build. This test:

- Verifies `FIREBASE_PROJECT_ID` is set and not null
- Verifies `FIREBASE_PRIVATE_KEY` is set and not null
- Verifies `FIREBASE_CLIENT_EMAIL` is set and not null
- Attempts to initialize Firebase Admin SDK with the provided credentials
- **Fails the build** if any check fails

If the build fails with an auth check error, review:
1. All three environment variables are set in your deployment platform
2. `FIREBASE_PRIVATE_KEY` uses literal `\n` characters (not actual newlines)
3. The credentials match your Firebase project

### Common Mistakes

❌ **Wrong**: Using actual newlines in the private key
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

❌ **Wrong**: Using double backslashes
```
-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\\n-----END PRIVATE KEY-----\\n
```

✅ **Correct**: Using literal backslash-n
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

### Testing Locally

To test your configuration locally:

```bash
# From the root directory
npm run test:auth-check
```

This will run the same checks that run during the build process.

### Platform-Specific Notes

#### Vercel
- Environment variables are set in **Settings** → **Environment Variables**
- Apply to **Production**, **Preview**, and/or **Development** as needed
- After adding/updating variables, redeploy to apply changes

#### Local Development
- Create a `.env` file in the project root
- Add the three variables following the format above
- The `.env` file is gitignored and should not be committed

### Related Documentation

- [Firebase Vercel Guide](./FIREBASE_VERCEL_GUIDE.md) - Additional Firebase setup details
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Full deployment requirements
