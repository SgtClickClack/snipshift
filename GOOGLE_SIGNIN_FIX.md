# 🔧 Google Sign-In 500 Error Fix Guide

## Problem

When signing up with Google, you're seeing:
- `POST https://hospogo.com/api/register 500 (Internal Server Error)`
- The signup process gets stuck on a loading screen

## Root Cause

The production database schema is **out of sync** with the codebase. The backend is trying to insert user data into columns that don't exist yet (like `reliabilityScore`, `lateArrivalEtaMinutes`, etc.).

## Solution: Sync Database Schema

### Step 1: Get Production Database URL

1. Go to your hosting provider (Vercel/Render/etc.)
2. Navigate to **Settings** → **Environment Variables**
3. Find `DATABASE_URL` or `POSTGRES_URL`
4. Copy the entire connection string

### Step 2: Run Database Sync

**Windows PowerShell:**
```powershell
# Set the database URL
$env:DATABASE_URL="YOUR_COPIED_DATABASE_URL"

# Navigate to API directory
cd api

# Run the sync script
npm run db:push
```

**Mac/Linux:**
```bash
# Set the database URL
export DATABASE_URL="YOUR_COPIED_DATABASE_URL"

# Navigate to API directory
cd api

# Run the sync script
npm run db:push
```

**Alternative: Use the sync script**
```bash
cd api
npx tsx scripts/sync-production-db.ts
```

### Step 3: Confirm Changes

When prompted by `drizzle-kit`, type `y` and press Enter to confirm the schema changes.

### Step 4: Verify Fix

1. Refresh your browser at `https://hospogo.com/signup`
2. Try Google Sign-In again
3. The 500 error should be resolved

## What This Does

✅ Adds missing columns: `reliabilityScore`, `lateArrivalEtaMinutes`, `lateArrivalEtaSetAt`, `lateArrivalSignalSent`  
✅ Creates missing tables: `user_calendar_tokens`, `priority_boost_tokens`  
✅ Updates existing tables with new columns  
❌ **Does NOT delete any existing data**

## Improved Error Messages

The frontend now shows better error messages:
- If it's a database schema issue, you'll see: *"Database schema is out of sync. Please contact support..."*
- Full error details are logged to the browser console for debugging

## Browser Popup Block Issues

If you see "Bridge popup was blocked" warnings:

1. **Allow Popups:** Click the popup blocker icon in your browser's address bar and select "Always allow pop-ups from hospogo.com"
2. **Incognito Mode:** Try signing in using an Incognito/Private window to rule out browser extensions
3. **Clear Cache:** Clear your browser cache and cookies for hospogo.com

## Troubleshooting

### Connection Errors
- Verify the `DATABASE_URL` is correct (copy-paste from your hosting provider)
- Check if your IP needs to be whitelisted in the database
- Ensure SSL is enabled (connection string should include `?sslmode=require`)

### Still Getting 500 Errors
1. Check the browser console for the full error message
2. Check your backend server logs for the exact database error
3. Verify all migrations have been applied: `npm run db:migrate` (if using migrations)

## Next Steps After Fix

Once the database is synced:
1. ✅ Google Sign-In should work without 500 errors
2. ✅ Email/password registration should also work
3. ✅ All new user fields will be properly saved
