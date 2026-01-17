# Production Environment Variables Setup

This guide explains how to set production environment variables for HospoGo using the Vercel CLI.

## Prerequisites

1. **Vercel CLI installed**: `npm install -g vercel`
2. **Logged in to Vercel**: `vercel login`
3. **Have your production credentials ready**

## Available Scripts

### 1. Interactive Setup (Recommended)

Prompts you for each value:

```powershell
.\scripts\setup-production-env.ps1 -Interactive
```

### 2. Set from Config File

Create a `.env.production` file with your values, then:

```powershell
.\scripts\set-production-env-from-config.ps1 -ConfigFile .env.production
```

### 3. Set Non-Placeholder Values Only

Sets only the values that don't have placeholders:

```powershell
.\scripts\setup-production-env.ps1
```

This will set:
- `NODE_ENV=production`
- `PORT=3001`
- `API_URL=https://api.hospogo.com.au`
- `FRONTEND_URL=https://app.hospogo.com.au`
- `FIREBASE_PROJECT_ID=hospogo-prod`
- `FIREBASE_STORAGE_BUCKET=hospogo-prod.appspot.com`

## Required Environment Variables

### Core API Config
- `NODE_ENV` - Set to `production`
- `PORT` - API port (default: 3001)
- `API_URL` - Production API URL
- `FRONTEND_URL` - Production frontend URL
- `JWT_SECRET` - Secure random string (min 32 chars)

### Database
- `DATABASE_URL` - PostgreSQL connection string

### Stripe (Live Keys)
- `STRIPE_SECRET_KEY` - `sk_live_...`
- `STRIPE_PUBLISHABLE_KEY` - `pk_live_...`
- `STRIPE_WEBHOOK_SECRET` - `whsec_...`

### Firebase
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Private key with `\n` characters
- `FIREBASE_STORAGE_BUCKET` - Storage bucket name
- `VAPID_PUBLIC_KEY` - Push notification key

### Google Maps
- `GOOGLE_MAPS_API_KEY` - Maps API key

### Cron & Health Monitoring
- `CRON_SECRET` - Secure token for cron authentication (required for `/api/cron/health-check` endpoint)
- `RESEND_API_KEY` - Resend API key for email service (required for health monitor alerts and failed email logging)
- `RESEND_FROM_EMAIL` - Email address for sending notifications (e.g., `HospoGo <noreply@hospogo.com>`)

## Manual Setup

If you prefer to set variables manually:

```powershell
vercel env add VARIABLE_NAME production
# Paste value when prompted
```

## Verify Variables

```powershell
vercel env ls production
```

## Important Notes

1. **Firebase Private Key**: Must include literal `\n` characters (not actual newlines)
2. **Stripe Keys**: Use **live** keys (`sk_live_`, `pk_live_`) for production
3. **Redeploy**: After setting variables, redeploy your application for changes to take effect
4. **Security**: Never commit `.env` files or expose secrets
