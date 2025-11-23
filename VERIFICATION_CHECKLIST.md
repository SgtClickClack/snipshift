# Server 500 Error Fix - Verification Checklist

## ✅ Configuration Verification

### 1. Runtime Configuration ✓
- **File:** `vercel.json`
- **Status:** ✅ Verified
- **Runtime:** `nodejs20.x` (explicitly set)
- **Max Duration:** 30 seconds
- **No Edge Runtime:** Confirmed no `edge` config found in codebase

### 2. Error Boundaries ✓
- **Routes Protected:**
  - ✅ `/api/me` - Wrapped in try/catch
  - ✅ `/api/register` - Wrapped in try/catch  
  - ✅ `/api/login` - Wrapped in try/catch
- **Module-Level Protection:** ✅ `api/index.ts` has error handler wrapper

### 3. Error Handling Improvements ✓
- ✅ Database connection errors logged with stack traces
- ✅ Firebase initialization errors logged with stack traces
- ✅ Authentication middleware has comprehensive error handling
- ✅ All errors return JSON responses instead of crashing

## 🧪 Local Testing Instructions

### Step 1: Start the API Server
```bash
cd api
npm start
```

The server should start on `http://localhost:5000`

### Step 2: Test Debug Endpoint
```bash
curl http://localhost:5000/api/debug
```

**Expected Response:**
```json
{
  "status": "debug",
  "env": {
    "NODE_ENV": "development",
    "DATABASE_URL": true,
    "POSTGRES_URL": false,
    "FIREBASE_SERVICE_ACCOUNT": {
      "exists": true,
      "validJson": true
    }
  },
  "services": {
    "database": {
      "status": "pool_initialized",
      "test": "connected"
    },
    "firebase": {
      "initialized": true
    }
  },
  "timestamp": "2025-01-XX..."
}
```

### Step 3: Test Error Boundaries

#### Test 1: Database Connection Failure
1. Temporarily rename `DATABASE_URL` in `.env`:
   ```bash
   # Comment out or rename
   # DATABASE_URL=postgresql://...
   DATABASE_URL_BACKUP=postgresql://...
   ```

2. Restart server and test:
   ```bash
   curl http://localhost:5000/api/debug
   ```

3. **Expected:** Server should NOT crash, should return JSON with error details

4. **Revert:** Restore `DATABASE_URL` after testing

#### Test 2: Firebase Initialization Failure
1. Temporarily rename Firebase env vars:
   ```bash
   # Comment out
   # FIREBASE_SERVICE_ACCOUNT=...
   FIREBASE_SERVICE_ACCOUNT_BACKUP=...
   ```

2. Restart server and test:
   ```bash
   curl http://localhost:5000/api/debug
   ```

3. **Expected:** Server should NOT crash, should return JSON indicating Firebase not initialized

4. **Revert:** Restore Firebase env vars after testing

### Step 4: Test Protected Routes

#### Test `/api/me` (requires auth)
```bash
# Without token - should return 401
curl http://localhost:5000/api/me

# With invalid token - should return 401 with error message
curl -H "Authorization: Bearer invalid-token" http://localhost:5000/api/me
```

**Expected:** Both should return JSON error responses, not crash

#### Test `/api/register`
```bash
# Valid request
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Invalid request (missing fields)
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid"}'
```

**Expected:** Both should return JSON responses (success or validation error), not crash

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All local tests pass
- [ ] Error boundaries tested and working
- [ ] No linter errors
- [ ] Code committed to git

### Vercel Environment Variables

**Required Variables:**
- [ ] `DATABASE_URL` or `POSTGRES_URL` - PostgreSQL connection string
- [ ] `FIREBASE_SERVICE_ACCOUNT` - Complete JSON string of Firebase service account
  - OR individual variables:
    - [ ] `FIREBASE_PROJECT_ID`
    - [ ] `FIREBASE_CLIENT_EMAIL`
    - [ ] `FIREBASE_PRIVATE_KEY`

**Optional Variables:**
- [ ] `NODE_ENV` - Set to `production` for production deployments
- [ ] `STRIPE_SECRET_KEY` - For payment processing
- [ ] `RESEND_API_KEY` - For email sending
- [ ] `ADMIN_EMAILS` - Comma-separated list of admin emails

### Vercel Dashboard Steps

1. **Navigate to Project Settings:**
   - Go to Vercel Dashboard
   - Select your project
   - Click "Settings" → "Environment Variables"

2. **Add Environment Variables:**
   - For each variable, click "Add New"
   - Enter the variable name
   - Paste the value (for `FIREBASE_SERVICE_ACCOUNT`, paste the entire JSON as a single-line string)
   - Select environments: Production, Preview, Development (as needed)
   - Click "Save"

3. **Important Notes:**
   - `FIREBASE_SERVICE_ACCOUNT` should be the complete JSON object as a single string
   - If using individual Firebase vars, `FIREBASE_PRIVATE_KEY` may need `\n` characters preserved
   - After adding variables, **redeploy** the project for changes to take effect

### Post-Deployment Verification

1. **Test Debug Endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/debug
   ```

2. **Check Logs:**
   - Go to Vercel Dashboard → Your Project → "Deployments"
   - Click on latest deployment → "Functions" tab
   - Check for any initialization errors in logs

3. **Test Protected Routes:**
   - Test `/api/me` with valid Firebase token
   - Test `/api/register` with valid data
   - Verify errors return JSON, not 500 crashes

## 🔍 Troubleshooting

### If you still see FUNCTION_INVOCATION_FAILED:

1. **Check Vercel Logs:**
   - Look for error messages starting with `🔥 CRITICAL` or `[FIREBASE]` or `[DB]`
   - These will indicate which service failed to initialize

2. **Verify Environment Variables:**
   - Use `/api/debug` endpoint to check what's configured
   - Compare with your local `.env` file

3. **Check Runtime:**
   - Ensure `vercel.json` has `"runtime": "nodejs20.x"`
   - Verify no conflicting Edge runtime configs

4. **Common Issues:**
   - **Firebase JSON parsing:** Ensure `FIREBASE_SERVICE_ACCOUNT` is valid JSON
   - **Database connection:** Verify `DATABASE_URL` is correct and accessible from Vercel
   - **Missing variables:** Check all required variables are set in Vercel dashboard

## 📝 Summary of Changes

1. ✅ Runtime explicitly set to Node.js 20.x in `vercel.json`
2. ✅ Error boundaries added to all critical routes
3. ✅ Enhanced error logging with stack traces
4. ✅ Module-level error handler to catch initialization failures
5. ✅ Improved environment variable validation
6. ✅ Enhanced `/api/debug` endpoint for diagnostics
7. ✅ Better error messages for debugging

All changes are backward compatible and improve error handling without breaking existing functionality.

