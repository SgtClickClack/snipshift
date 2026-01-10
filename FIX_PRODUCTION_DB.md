# 🔧 Fix Production Database - Quick Guide

## Step 1: Get Production DATABASE_URL from Vercel

1. Go to https://vercel.com/dashboard
2. Select your **HospoGo** project
3. Navigate to **Settings** → **Environment Variables**
4. Find `DATABASE_URL` or `POSTGRES_URL`
5. Click the **eye icon** to reveal the value
6. **Copy the entire connection string** (starts with `postgresql://` or `postgres://`)

## Step 2: Run the Sync Script

### Option A: Set Environment Variable (Recommended)

**Windows PowerShell:**
```powershell
$env:DATABASE_URL="YOUR_COPIED_VERCEL_DATABASE_URL"
cd api
npx tsx scripts/sync-production-db.ts
```

**Mac/Linux:**
```bash
export DATABASE_URL="YOUR_COPIED_VERCEL_DATABASE_URL"
cd api
npx tsx scripts/sync-production-db.ts
```

### Option B: Create .env.production File

Create a `.env.production` file in the **root directory** with:
```
DATABASE_URL=YOUR_COPIED_VERCEL_DATABASE_URL
```

Then run:
```bash
cd api
npx tsx scripts/sync-production-db.ts
```

## Step 3: Confirm and Wait

1. The script will show which database it's connecting to (masked for security)
2. **Drizzle-kit will ask for confirmation** - type `y` and press Enter
3. Wait for "✅ Push completed successfully"
4. **Refresh your dashboard at hospogo.com**

## What This Does

✅ Adds missing tables: `conversations`, `messages`, `shift_reviews`  
✅ Adds missing columns: `role`, `is_active`, `stripe_account_id`, `payment_status`, `attendance_status`  
✅ Creates missing enums and indexes  
❌ **Does NOT delete any existing data**

## Troubleshooting

If you get connection errors:
- Verify the DATABASE_URL is correct (copy-paste from Vercel)
- Check if your IP needs to be whitelisted in the database
- Ensure SSL is enabled (connection string should include `?sslmode=require`)
