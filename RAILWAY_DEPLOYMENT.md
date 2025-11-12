# Railway Backend Deployment Guide

This guide walks you through deploying the SnipShift backend server to Railway.

## Prerequisites

- Railway account ([sign up here](https://railway.app))
- GitHub repository with your code
- Domain name (optional, Railway provides a default domain)

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will automatically detect it's a Node.js project

## Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create a PostgreSQL instance
4. Note the `DATABASE_URL` connection string (you'll need this)

## Step 2.5: Add Redis Service (Required for Production)

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will create a Redis instance
4. The `REDIS_URL` connection string will be automatically provided to linked services
5. **Important**: The API requires `REDIS_URL` in production - the application will fail to start if it's not set

## Step 3: Configure Environment Variables

1. In your Railway project, go to your service
2. Click on the **"Variables"** tab
3. Add the following environment variables:

### Required Variables

```env
NODE_ENV=production
DATABASE_URL=<from PostgreSQL service - Railway auto-injects this>
REDIS_URL=<from Redis service - Railway auto-injects this when services are linked>
SESSION_SECRET=<generate with: openssl rand -base64 32>
PORT=<Railway sets this automatically - don't override>
```

**Note**: `REDIS_URL` is **required** in production. If not set, the application will fail to start with a clear error message. Railway automatically provides this when the Redis service is linked to your API service.

### CORS Configuration

```env
CORS_ORIGIN=https://www.snipshift.com.au,https://app.snipshift.com.au,https://snipshift.com.au
```

### Optional Variables (Add as needed)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_GOOGLE_CLIENT_ID=your_vite_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_vite_google_client_secret
VITE_GOOGLE_REDIRECT_URI=https://www.snipshift.com.au/oauth/callback

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_CURRENCY=aud

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=live
PAYPAL_CURRENCY=AUD

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Step 4: Configure Build Settings

Railway should auto-detect your Node.js app, but verify these settings:

1. Go to your service → **"Settings"** tab
2. **Build Command**: `npm ci && npm run build:client`
3. **Start Command**: `npm run start:dev` (or `node server/index.js` for production)
4. **Root Directory**: Leave empty (or set to `snipshift/` if your repo root is different)

## Step 5: Link Services

### Link PostgreSQL Database

1. In your Railway project, click on your **PostgreSQL service**
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` value
4. Go to your **backend service** → **"Variables"** tab
5. Add `DATABASE_URL` variable (Railway may auto-inject this if services are linked)
6. If not auto-injected, manually add: `DATABASE_URL=${{PostgreSQL.DATABASE_URL}}`

### Link Redis Service

1. In your Railway project, click on your **Redis service**
2. Go to **"Variables"** tab
3. Copy the `REDIS_URL` value
4. Go to your **backend service** → **"Variables"** tab
5. Add `REDIS_URL` variable (Railway may auto-inject this if services are linked)
6. If not auto-injected, manually add: `REDIS_URL=${{Redis.REDIS_URL}}`

**Important**: The API service requires `REDIS_URL` to be set in production. Without it, the application will fail to start. Ensure the Redis service is properly linked to your API service.

## Step 6: Deploy

1. Railway will automatically deploy when you push to your connected branch
2. Or manually trigger a deployment from the **"Deployments"** tab
3. Monitor the deployment logs in real-time

## Step 7: Configure Custom Domain (Optional)

1. In your Railway service, go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"** to get a Railway-provided domain
3. Or click **"Custom Domain"** to add your own:
   - Add domain: `api.snipshift.com.au`
   - Railway will provide DNS records to configure
   - Update your DNS provider with the provided records

## Step 8: Set Up Health Checks

Railway automatically monitors your service health via the `/health` endpoint.

Verify it's working:
```bash
curl https://your-railway-domain.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Step 9: Configure Stripe Webhooks (If Using Stripe)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-railway-domain.railway.app/api/stripe/webhook`
3. Select events to listen to
4. Copy the webhook signing secret
5. Add to Railway environment variables: `STRIPE_WEBHOOK_SECRET`

## Step 10: Verify Deployment

1. Check deployment logs for any errors
2. Test API endpoints:
   ```bash
   curl https://your-railway-domain.railway.app/api/health
   ```
3. Verify database connection (check logs for database initialization messages)
4. Test authentication endpoints if configured

## Troubleshooting

### Service Won't Start

- Check deployment logs for errors
- Verify all required environment variables are set
- Ensure `SESSION_SECRET` is set and not using default value
- Check that `DATABASE_URL` is correctly linked

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure database credentials are correct
- Check network connectivity between services

### Redis Connection Issues

- **Error: "REDIS_URL environment variable is required in production"**
  - This means `REDIS_URL` is not set in your Railway environment variables
  - Solution: Link the Redis service to your API service, or manually add `REDIS_URL=${{Redis.REDIS_URL}}` to your API service variables
- **Error: "connect ECONNREFUSED 127.0.0.1:6379"**
  - This means the API is trying to connect to localhost instead of the Railway Redis service
  - Solution: Ensure `REDIS_URL` is set to the Railway-provided Redis connection string (not `redis://localhost:6379`)
  - Verify the Redis service is running and linked to your API service
- Verify `REDIS_URL` is set correctly in Railway environment variables
- Check Redis service is running
- Ensure Redis service is linked to your API service
- Check network connectivity between services

### CORS Errors

- Verify `CORS_ORIGIN` includes your frontend domain
- Check that frontend is making requests to correct backend URL
- Ensure CORS_ORIGIN format is correct (comma-separated, no spaces)

### Port Issues

- Railway sets `PORT` automatically - don't override it
- Ensure your server listens on `0.0.0.0` (not `localhost`)
- Check that the port from `process.env.PORT` is used

### Build Failures

- Check Node.js version compatibility (requires Node 18+)
- Verify all dependencies are in `package.json`
- Check build logs for specific error messages
- Ensure `build:client` script exists and works locally

## Monitoring

Railway provides built-in monitoring:

1. **Metrics**: View CPU, memory, and network usage
2. **Logs**: Real-time application logs
3. **Deployments**: Deployment history and rollback options
4. **Alerts**: Set up alerts for service downtime

## Scaling

Railway automatically scales your service, but you can:

1. Go to service **"Settings"** → **"Scaling"**
2. Adjust resource limits (CPU, RAM)
3. Enable auto-scaling based on traffic

## Cost Optimization

- Use Railway's free tier for development/testing
- Monitor resource usage in the dashboard
- Set up resource limits to prevent unexpected costs
- Use Railway's sleep feature for non-production environments

## Next Steps

After successful deployment:

1. Update frontend to point to Railway backend URL
2. Configure frontend environment variables
3. Set up CI/CD for automatic deployments
4. Configure monitoring and alerts
5. Set up database backups

## Support

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

