# 🚀 Production Deployment Guide

This guide walks you through the complete production deployment process for HospoGo.

## Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- Production PostgreSQL database (external or containerized)
- Stripe account with live API keys
- Firebase project configured
- Domain name configured (optional but recommended)

## Step 1: Production Environment Setup

### Create `.env.production` File

**⚠️ IMPORTANT: This file contains sensitive credentials and is already in `.gitignore`. DO NOT commit it to Git.**

Create a `.env.production` file in the root directory with the following variables:

```env
# ============================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ============================================
NODE_ENV=production

# ============================================
# DATABASE CONFIGURATION
# ============================================
# Use your production PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
POSTGRES_URL=postgresql://user:password@host:port/database?sslmode=require

# If using containerized database (optional)
POSTGRES_USER=snipshift
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=snipshift

# ============================================
# FRONTEND BUILD VARIABLES
# ============================================
# Your public API URL (e.g., https://api.snipshift.com or load balancer IP)
VITE_API_URL=https://api.snipshift.com

# Firebase Configuration (Frontend)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Stripe Publishable Key (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# BACKEND ENVIRONMENT VARIABLES
# ============================================
# Firebase Admin SDK (Choose ONE method)

# Method 1: Single JSON String (Recommended)
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Method 2: Individual Variables
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"

# Stripe Configuration (Backend)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server Configuration
PORT=5000
FRONTEND_URL=https://snipshift.com

# ============================================
# OPTIONAL CONFIGURATION
# ============================================
# Admin emails (comma-separated)
ADMIN_EMAILS=admin@snipshift.com

# Logging
LOG_LEVEL=info
```

### Critical Variables to Update

1. **`NODE_ENV=production`** - Must be set to `production`
2. **`DATABASE_URL`** - Your live PostgreSQL connection string
3. **`STRIPE_SECRET_KEY`** - Use `sk_live_...` (NOT `sk_test_...`)
4. **`STRIPE_PUBLISHABLE_KEY`** - Use `pk_live_...` (NOT `pk_test_...`)
5. **`VITE_API_URL`** - Your public API domain (e.g., `https://api.snipshift.com`)

## Step 2: Database Migration

### Option A: Run Migrations via Docker Container (Recommended)

Migrations will run automatically when the container starts (via `entrypoint.sh`). However, you can also run them manually:

```bash
# After containers are running
docker exec -it snipshift-api npm run db:migrate
```

### Option B: Run Migrations Locally (Pointing to Production DB)

If you need to run migrations before starting containers:

```bash
# Set production environment variables
export $(cat .env.production | xargs)

# Run migrations
cd api
npm run db:migrate
```

**Note:** Ensure your local machine can connect to the production database.

## Step 3: Docker Launch

### Build Production Images

```bash
# Build without cache to ensure fresh build
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Start Services

```bash
# Start all services in detached mode
docker-compose -f docker-compose.prod.yml up -d
```

### Verify Services are Running

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs (follow mode)
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
```

### Expected Log Output

You should see:
- ✅ Database connection successful
- ✅ Migrations applied (or "No new migrations to apply")
- ✅ "Server running on port 5000" (for API)
- ✅ Health checks passing

## Step 4: Final Verification

### 1. Admin Seed

Promote your user account to admin:

```bash
# Replace <your-email> with your actual email address
# Script path is relative to container's working directory (/app)
docker exec -it snipshift-api npx tsx scripts/promote-to-admin.ts <your-email>
```

**Example:**
```bash
docker exec -it snipshift-api npx tsx scripts/promote-to-admin.ts admin@snipshift.com
```

### 2. Smoke Tests

#### Test 1: Landing Page (Public Access)
```bash
# Open in browser or use curl
curl http://localhost:3000

# Should return HTML (200 OK)
```

**Manual Check:**
- Navigate to `http://your-domain:3000` (or your configured domain)
- Verify landing page loads
- Check that Terms and Privacy links work
- Verify no authentication required

#### Test 2: API Health Check
```bash
curl http://localhost:5000/health

# Should return: {"status":"ok"}
```

#### Test 3: Login as Admin (DB Read/Write Check)
1. Navigate to login page
2. Login with your admin account
3. Verify you can access admin dashboard
4. Check that user data loads correctly

#### Test 4: Stripe Connect Status (Third-Party Integration)
1. Login as admin
2. Navigate to Admin Dashboard
3. Check Stripe Connect integration status
4. Verify Stripe API keys are configured correctly

### 3. Additional Verification

#### Check Container Health
```bash
docker-compose -f docker-compose.prod.yml ps
```

All services should show "healthy" status.

#### Check Database Connection
```bash
docker exec -it snipshift-api node -e "
const { getDatabase } = require('./_src/db/connection.js');
getDatabase().query('SELECT NOW()').then(r => {
  console.log('✅ Database connected:', r.rows[0]);
  process.exit(0);
}).catch(e => {
  console.error('❌ Database error:', e.message);
  process.exit(1);
});
"
```

#### Check Environment Variables
```bash
# Check API environment
docker exec -it snipshift-api env | grep -E "(NODE_ENV|DATABASE_URL|STRIPE|FIREBASE)"

# Verify production values are set
```

## Troubleshooting

### Issue: Containers won't start

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs
```

**Common causes:**
- Missing environment variables
- Database connection failed
- Port already in use

### Issue: Migrations failing

**Check migration logs:**
```bash
docker exec -it snipshift-api npm run db:migrate
```

**Common causes:**
- Database connection string incorrect
- Migration already applied
- Database permissions issue

### Issue: API not responding

**Check API logs:**
```bash
docker-compose -f docker-compose.prod.yml logs -f api
```

**Verify health endpoint:**
```bash
curl http://localhost:5000/health
```

### Issue: Frontend can't connect to API

**Check:**
1. `VITE_API_URL` is set correctly in `.env.production`
2. API container is running and healthy
3. Network connectivity between containers
4. CORS settings in API

## Maintenance Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Rebuild and Restart
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Update Code
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

## Security Checklist

- [ ] `.env.production` is in `.gitignore` (already configured)
- [ ] All production API keys use `live` keys (not `test`)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] Firewall rules configured to restrict database access
- [ ] Regular backups configured for production database
- [ ] Monitoring and alerting set up
- [ ] SSL/TLS certificates configured for domain
- [ ] Rate limiting enabled on API
- [ ] CORS configured correctly

## Post-Deployment

1. **Monitor Logs** - Watch for errors in the first 24 hours
2. **Test Critical Flows** - User registration, payments, Stripe Connect
3. **Set Up Monitoring** - Configure alerts for downtime or errors
4. **Backup Database** - Ensure automated backups are running
5. **Document Access** - Keep credentials secure and documented

## Support

If you encounter issues:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verify environment variables are set correctly
3. Check database connectivity
4. Review the troubleshooting section above

---

**🎉 Congratulations! Your HospoGo application is now live in production!**
