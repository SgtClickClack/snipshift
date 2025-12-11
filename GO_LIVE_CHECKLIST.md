# ✅ Go-Live Checklist

Quick reference checklist for production deployment.

## Pre-Deployment

- [ ] `.env.production` file created with all required variables
- [ ] `NODE_ENV=production` set
- [ ] Production database connection string configured
- [ ] Stripe **LIVE** keys configured (`sk_live_...` and `pk_live_...`)
- [ ] Firebase production credentials configured
- [ ] `VITE_API_URL` points to production API domain
- [ ] All sensitive values verified (no test/development keys)

## Deployment Steps

### Step 1: Environment Setup
- [ ] `.env.production` file created and verified
- [ ] All critical variables updated (see PRODUCTION_DEPLOYMENT.md)

### Step 2: Database Migration
- [ ] Production database accessible
- [ ] Migrations ready to run (or will run via entrypoint.sh)

### Step 3: Docker Launch
- [ ] Run: `docker-compose -f docker-compose.prod.yml build --no-cache`
- [ ] Run: `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Verify: `docker-compose -f docker-compose.prod.yml logs -f`
- [ ] Check for "Server running on port 5000" in logs

### Step 4: Verification
- [ ] **Admin Seed**: `docker exec -it snipshift-api npx tsx scripts/promote-to-admin.ts <your-email>`
- [ ] **Smoke Test 1**: Landing page loads (public access)
- [ ] **Smoke Test 2**: Login as admin works (DB read/write)
- [ ] **Smoke Test 3**: Stripe Connect status visible in admin dashboard
- [ ] **Smoke Test 4**: API health check returns 200: `curl http://localhost:5000/health`

## Post-Deployment

- [ ] Monitor logs for first 24 hours
- [ ] Test critical user flows (registration, payments)
- [ ] Verify Stripe webhooks are configured
- [ ] Set up monitoring/alerting
- [ ] Configure automated database backups
- [ ] Document access credentials securely

## Quick Commands

```bash
# Build and start
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Promote to admin
docker exec -it snipshift-api npx tsx scripts/promote-to-admin.ts <email>

# Check status
docker-compose -f docker-compose.prod.yml ps

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Critical Variables Checklist

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (production PostgreSQL)
- [ ] `STRIPE_SECRET_KEY=sk_live_...` (NOT sk_test_...)
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...` (NOT pk_test_...)
- [ ] `VITE_API_URL` (production domain)
- [ ] Firebase credentials (production project)
- [ ] `STRIPE_WEBHOOK_SECRET` (if using webhooks)

---

**📖 For detailed instructions, see PRODUCTION_DEPLOYMENT.md**
