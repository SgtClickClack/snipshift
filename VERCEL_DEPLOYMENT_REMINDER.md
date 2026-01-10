# 🚀 Vercel Deployment Reminder

## ⚠️ CRITICAL: Environment Variables Setup

Before your deployment works correctly, you **MUST** verify these environment variables in your Vercel Dashboard:

### Required Environment Variables

1. **Database Connection**
   - `DATABASE_URL` or `POSTGRES_URL`
   - Your PostgreSQL connection string
   - Example: `postgresql://user:password@host:5432/database?sslmode=require`

2. **Firebase Admin SDK** (Choose ONE method)

   **Method 1: Single JSON String (Recommended)**
   - Variable: `FIREBASE_SERVICE_ACCOUNT`
   - Value: The **entire** JSON content from your Firebase service account key file
   - **IMPORTANT:** Paste it as a **single-line string** (no line breaks)
   - The backend will automatically handle `\n` characters in the private key

   **Method 2: Individual Variables**
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID
   - `FIREBASE_CLIENT_EMAIL` - Service account email
   - `FIREBASE_PRIVATE_KEY` - The private key from the service account JSON
     - **⚠️ CRITICAL:** When pasting `FIREBASE_PRIVATE_KEY` in Vercel:
       - The key contains `\n` characters that represent newlines
       - Vercel may strip these when copy-pasting
       - **Solution:** Wrap the entire key value in **double quotes** in Vercel
       - Or ensure the `\n` characters are preserved (they should look like literal `\n` in the string)

### How to Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **snipshift** project
3. Navigate to **Settings** → **Environment Variables**
4. For each variable:
   - Click **"Add New"**
   - Enter the variable name
   - Paste the value
   - Select environments: **Production**, **Preview**, **Development** (as needed)
   - Click **"Save"**

### 🔥 Firebase Private Key Newline Handling

**The Problem:**
Firebase private keys contain newline characters (`\n`) that are essential for the key to work. When copy-pasting into Vercel, these can be lost.

**Solutions:**

**Option 1: Use FIREBASE_SERVICE_ACCOUNT (Easier)**
- Copy the entire JSON file content
- Paste it as a single string in Vercel
- The backend code automatically handles newline conversion

**Option 2: Preserve \n in FIREBASE_PRIVATE_KEY**
- When pasting the private key value, ensure it includes literal `\n` characters
- In Vercel, you can wrap it in quotes: `"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"`
- Or use a tool to escape the newlines properly

**Option 3: Use Vercel CLI**
```bash
vercel env add FIREBASE_PRIVATE_KEY production
# Then paste the key (newlines will be preserved)
```

### After Adding Variables

**IMPORTANT:** After adding or updating environment variables:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

Environment variables are only applied to **new deployments**, not existing ones!

## ✅ Verification Steps

After deployment completes:

1. **Test the debug endpoint:**
   ```bash
   curl https://hospogo.com/api/debug
   ```
   Or if using Vercel preview URL:
   ```bash
   curl https://your-app.vercel.app/api/debug
   ```

2. **Check the response:**
   - Should return JSON (not HTML error page)
   - Look for `"services": { "database": { "status": "pool_initialized" } }`
   - Look for `"services": { "firebase": { "initialized": true } }`

3. **Check Vercel Logs:**
   - Go to **Deployments** → Latest deployment → **Functions** tab
   - Look for any errors starting with `🔥 CRITICAL`, `[FIREBASE]`, or `[DB]`
   - These will tell you exactly what's missing or misconfigured

## 🐛 Troubleshooting

### If you see `FUNCTION_INVOCATION_FAILED`:

1. **Check Vercel Function Logs:**
   - Look for initialization errors
   - Check if Firebase or Database failed to initialize

2. **Verify Environment Variables:**
   - Use `/api/debug` endpoint to see what's configured
   - Compare with your local `.env` file

3. **Common Issues:**
   - **Firebase JSON invalid:** Ensure `FIREBASE_SERVICE_ACCOUNT` is valid JSON
   - **Private key newlines:** Ensure `\n` characters are preserved
   - **Database connection:** Verify `DATABASE_URL` is accessible from Vercel
   - **Missing variables:** Double-check all required vars are set

### If `/api/debug` shows services as not initialized:

- Check the Vercel function logs for specific error messages
- Verify the environment variable names match exactly (case-sensitive)
- Ensure you redeployed after adding variables

## 📝 Quick Checklist

- [ ] `DATABASE_URL` or `POSTGRES_URL` is set
- [ ] `FIREBASE_SERVICE_ACCOUNT` (or individual Firebase vars) is set
- [ ] Firebase private key newlines are preserved (if using individual vars)
- [ ] All variables are set for Production environment
- [ ] Project has been redeployed after adding variables
- [ ] `/api/debug` endpoint returns expected JSON
- [ ] No errors in Vercel function logs

