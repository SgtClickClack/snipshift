# Production Deployment Sequence

**Date:** 2026-01-16  
**Status:** Ready for Execution

---

## 🚀 Deployment Sequence

### Step 1: Push All Hardened Code to Production

```bash
# Verify all changes are committed
git status

# Review changes
git diff

# Commit if needed (all hardening changes should already be committed)
git add .
git commit -m "feat(auth): Add error reporting, COOP redirect fallback, and registration hardening"

# Push to production branch
git push origin main
# or
git push origin production
```

**Verification:**
- ✅ All files committed
- ✅ No uncommitted changes
- ✅ Push successful

---

### Step 2: Run Database Migrations

**Target Migrations:**
- `0025_update_payments_currency_to_aud.sql`
- `0026_add_shift_applications.sql`
- `0027_add_payouts_table.sql`
- `0027_performance_optimization_indexes.sql`

**Migration Commands:**

```bash
# Navigate to API directory
cd api

# Run migrations (if using drizzle-kit)
npm run db:migrate

# OR if using custom migration script
npm run db:push

# OR if using direct SQL execution
psql $DATABASE_URL -f _src/db/migrations/0025_update_payments_currency_to_aud.sql
psql $DATABASE_URL -f _src/db/migrations/0026_add_shift_applications.sql
psql $DATABASE_URL -f _src/db/migrations/0027_add_payouts_table.sql
psql $DATABASE_URL -f _src/db/migrations/0027_performance_optimization_indexes.sql
```

**Verification:**
```bash
# Check migration status
npm run db:status

# Verify tables exist
psql $DATABASE_URL -c "\dt" | grep -E "(payments|shift_applications|payouts)"
```

**Expected Results:**
- ✅ Migration 0025: `payments` table has `currency` column set to 'AUD'
- ✅ Migration 0026: `shift_applications` table exists
- ✅ Migration 0027: `payouts` table exists
- ✅ Migration 0027: Performance indexes created

---

### Step 3: 7-Step Smoke Test Checklist

#### Test 1: API Health Check
```bash
# Test API health endpoint
curl https://hospogo.com/api/health

# Expected: HTTP 200 with {"status":"ok"}
```

**Verification:**
- [ ] HTTP 200 response
- [ ] JSON response with `{"status":"ok"}`
- [ ] Response time < 500ms

---

#### Test 2: Google Authentication (Registration)
```bash
# Manual test in browser:
# 1. Navigate to https://hospogo.com/signup
# 2. Click "Sign up with Google"
# 3. Complete Google OAuth flow
# 4. Verify redirect to onboarding
```

**Verification:**
- [ ] Sign-up page loads
- [ ] Google sign-in button visible
- [ ] OAuth popup/redirect works
- [ ] User successfully registered
- [ ] Redirected to `/onboarding`
- [ ] No 500 errors in browser console
- [ ] No errors in API logs

---

#### Test 3: COOP Headers Verification
```bash
# Check COOP headers
curl -I https://hospogo.com

# Expected headers:
# Cross-Origin-Opener-Policy: same-origin-allow-popups
```

**Verification:**
- [ ] `Cross-Origin-Opener-Policy: same-origin-allow-popups` present
- [ ] Headers present on all routes
- [ ] Auth handler path has COOP header

---

#### Test 4: Error Reporting Service
```bash
# Trigger a test error (if possible) or check logs
# Check error reporting service logs
```

**Verification:**
- [ ] Error reporting service initialized
- [ ] Registration errors logged with correlation IDs
- [ ] Error context includes user email, path, method
- [ ] No unhandled exceptions in logs

---

#### Test 5: Redirect Fallback (COOP Block Simulation)
```bash
# Manual test:
# 1. Open browser DevTools
# 2. Block popups in browser settings
# 3. Attempt Google sign-in
# 4. Verify redirect flow activates
```

**Verification:**
- [ ] Popup blocked message appears (if applicable)
- [ ] Redirect flow activates automatically
- [ ] User redirected to Google OAuth page
- [ ] User redirected back to app after auth
- [ ] Authentication completes successfully

---

#### Test 6: Database Connectivity
```bash
# Test database connection via API
curl https://hospogo.com/api/me \
  -H "Authorization: Bearer <test-token>"

# OR test health endpoint which checks DB
curl https://hospogo.com/api/health
```

**Verification:**
- [ ] Database connection successful
- [ ] API can read from database
- [ ] API can write to database (via registration test)
- [ ] No connection timeout errors

---

#### Test 7: Environment Variable Sync
```bash
# Verify environment variables in Vercel
vercel env ls production | grep FIREBASE_PROJECT_ID
vercel env ls production | grep VITE_FIREBASE_PROJECT_ID

# Both should show: snipshift-75b04
```

**Verification:**
- [ ] `FIREBASE_PROJECT_ID` = `snipshift-75b04`
- [ ] `VITE_FIREBASE_PROJECT_ID` = `snipshift-75b04`
- [ ] Both variables present in production
- [ ] No mismatches between frontend/backend

---

## 📋 Complete Checklist

### Pre-Deployment
- [ ] All code changes committed
- [ ] All tests passing locally
- [ ] Environment variables verified
- [ ] Database backup created

### Deployment
- [ ] Code pushed to production
- [ ] Migrations 0025, 0026, 0027 executed
- [ ] Migration verification complete

### Post-Deployment Smoke Tests
- [ ] Test 1: API Health Check ✅
- [ ] Test 2: Google Authentication ✅
- [ ] Test 3: COOP Headers ✅
- [ ] Test 4: Error Reporting ✅
- [ ] Test 5: Redirect Fallback ✅
- [ ] Test 6: Database Connectivity ✅
- [ ] Test 7: Environment Variables ✅

---

## 🎯 Success Criteria

All smoke tests must pass before considering deployment successful:

1. ✅ API responds to health checks
2. ✅ Google registration completes without 500 errors
3. ✅ COOP headers configured correctly
4. ✅ Error reporting captures registration errors
5. ✅ Redirect fallback works when popup blocked
6. ✅ Database operations succeed
7. ✅ Environment variables synchronized

---

## 🚨 Rollback Plan

If any smoke test fails:

1. **Immediate:** Check Vercel deployment logs
2. **Database:** Verify migrations didn't break existing data
3. **Environment:** Verify all env vars are set correctly
4. **Rollback:** Revert to previous deployment if critical

```bash
# Rollback command (if needed)
vercel rollback
```

---

## 📝 Post-Deployment Monitoring

Monitor for 24 hours:
- [ ] Error rates in error reporting service
- [ ] API response times
- [ ] Database query performance
- [ ] Authentication success rates
- [ ] User registration completion rates

---

**Deployment Sequence Created:** 2026-01-16  
**Ready for Execution:** ✅ Yes
