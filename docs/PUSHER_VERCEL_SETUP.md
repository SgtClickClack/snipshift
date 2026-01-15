# Pusher Environment Variables Setup for Vercel

This guide explains how to set up Pusher Channels environment variables for HospoGo on Vercel.

## Required Variables

### Backend (API) Variables
These are used by the API serverless functions:
- `PUSHER_APP_ID` - Your Pusher App ID
- `PUSHER_KEY` - Your Pusher Key (same as App Key)
- `PUSHER_SECRET` - Your Pusher Secret
- `PUSHER_CLUSTER` - Your Pusher cluster (e.g., `us2`, `eu`, `ap-southeast-2`)

### Frontend (React) Variables
These must be prefixed with `VITE_` to be accessible in the React app:
- `VITE_PUSHER_APP_KEY` - Your Pusher Key (same as `PUSHER_KEY`)
- `VITE_PUSHER_CLUSTER` - Your Pusher cluster (same as `PUSHER_CLUSTER`)

## Setup Methods

### Method 1: Automated Script (Recommended)

Use the PowerShell script to set up all variables at once:

```powershell
.\scripts\setup-pusher-vercel.ps1
```

The script will:
1. Check if you're logged in to Vercel
2. Prompt for your Pusher credentials
3. Set all variables for Production and Preview environments
4. Provide verification steps

**With parameters:**
```powershell
.\scripts\setup-pusher-vercel.ps1 `
    -PusherAppId "your_app_id" `
    -PusherKey "your_key" `
    -PusherSecret "your_secret" `
    -PusherCluster "us2"
```

### Method 2: Manual Vercel CLI

Set each variable manually using Vercel CLI:

#### Backend Variables
```powershell
# Set for Production
echo "your_app_id" | vercel env add PUSHER_APP_ID Production
echo "your_key" | vercel env add PUSHER_KEY Production
echo "your_secret" | vercel env add PUSHER_SECRET Production
echo "us2" | vercel env add PUSHER_CLUSTER Production

# Set for Preview (optional)
echo "your_app_id" | vercel env add PUSHER_APP_ID Preview
echo "your_key" | vercel env add PUSHER_KEY Preview
echo "your_secret" | vercel env add PUSHER_SECRET Preview
echo "us2" | vercel env add PUSHER_CLUSTER Preview
```

#### Frontend Variables
```powershell
# Set for Production
echo "your_key" | vercel env add VITE_PUSHER_APP_KEY Production
echo "us2" | vercel env add VITE_PUSHER_CLUSTER Production

# Set for Preview (optional)
echo "your_key" | vercel env add VITE_PUSHER_APP_KEY Preview
echo "us2" | vercel env add VITE_PUSHER_CLUSTER Preview
```

### Method 3: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `hospogo-web` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Click **Add New**
   - Enter the variable name
   - Enter the value
   - Select environments (Production, Preview, Development)
   - Click **Save**

## Getting Your Pusher Credentials

1. Go to [Pusher Dashboard](https://dashboard.pusher.com/)
2. Select your app (or create a new one)
3. Go to **App Keys** tab
4. Copy:
   - **App ID** → `PUSHER_APP_ID`
   - **Key** → `PUSHER_KEY` and `VITE_PUSHER_APP_KEY`
   - **Secret** → `PUSHER_SECRET`
   - **Cluster** → `PUSHER_CLUSTER` and `VITE_PUSHER_CLUSTER`

## Verification

After setting the variables:

1. **List all environment variables:**
   ```powershell
   vercel env ls
   ```

2. **Verify Pusher variables are present:**
   Look for:
   - `PUSHER_APP_ID`
   - `PUSHER_KEY`
   - `PUSHER_SECRET`
   - `PUSHER_CLUSTER`
   - `VITE_PUSHER_APP_KEY`
   - `VITE_PUSHER_CLUSTER`

3. **Redeploy your application:**
   ```powershell
   vercel --prod
   ```

4. **Test real-time features:**
   - Open the app in two browser windows
   - Send a message in one window
   - Verify it appears instantly in the other window
   - Check browser console (F12) for Pusher connection logs

## Troubleshooting

### Variables not appearing in the app
- Ensure frontend variables are prefixed with `VITE_`
- Redeploy after adding variables
- Check that variables are set for the correct environment (Production/Preview)

### "Pusher key not configured" warning
- Verify `VITE_PUSHER_APP_KEY` is set in Vercel
- Check that the variable is set for the Production environment
- Redeploy the application

### Connection errors in console
- Verify all Pusher credentials are correct
- Check that `PUSHER_CLUSTER` matches your Pusher app's cluster
- Ensure `/api/pusher/auth` endpoint is working (check API logs)

### Backend can't initialize Pusher
- Verify `PUSHER_APP_ID`, `PUSHER_KEY`, and `PUSHER_SECRET` are set
- Check API function logs in Vercel dashboard
- Ensure variables are set for the correct environment

## Security Notes

- Never commit Pusher credentials to git
- Use Vercel's encrypted environment variables (default)
- Rotate secrets if they're ever exposed
- Use different Pusher apps for development and production if needed
