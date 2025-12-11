# Go-Live Checklist

This checklist ensures a smooth transition from "Test Mode" to "Production" for SnipShift. Complete all items before launching to production.

## 🔒 Security

### Passwords & Secrets
- [ ] Change all default passwords and secrets from development values
- [ ] Verify no hardcoded credentials exist in codebase
- [ ] Rotate all API keys and secrets
- [ ] Update database passwords
- [ ] Change Firebase service account keys
- [ ] Update Resend API key

### CORS Configuration
- [ ] Verify CORS origins are restricted to production domain only
- [ ] Remove `localhost` and development URLs from allowed origins
- [ ] Test CORS with production domain

### Environment Variables
- [ ] Verify `NODE_ENV=production` is set
- [ ] Ensure no test/development environment variables are in production
- [ ] Confirm all required environment variables are set
- [ ] Verify `.env` files are not committed to version control

### Authentication
- [ ] Remove test authentication bypass code
- [ ] Verify Firebase Authentication is configured for production
- [ ] Test authentication flow end-to-end
- [ ] Ensure session management is secure

## 💳 Stripe Configuration

### API Keys
- [ ] Swap `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`
- [ ] Swap `STRIPE_PUBLISHABLE_KEY` from `pk_test_...` to `pk_live_...`
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` in frontend environment variables
- [ ] Verify Stripe keys are for the correct account

### Webhook Configuration
- [ ] Update Stripe Webhook Endpoint URL in Stripe Dashboard to production URL
  - Production URL: `https://your-api-domain.com/api/webhooks/stripe`
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Test webhook delivery in Stripe Dashboard
- [ ] Verify webhook signature verification is working

### Stripe Connect
- [ ] Verify Stripe Connect is enabled for production
- [ ] Test Stripe Connect onboarding flow
- [ ] Verify payout settings are configured correctly
- [ ] Test payment processing end-to-end

## 🗄️ Database

### PostgreSQL Setup
- [ ] Ensure production database has `pgcrypto` extension enabled
  ```sql
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  ```
- [ ] Verify database connection string is correct
- [ ] Test database connectivity from production environment
- [ ] Ensure database backups are configured

### Migrations
- [ ] Run `npm run migrate` on production database
- [ ] Verify all migrations applied successfully
- [ ] Check for any migration errors
- [ ] Verify database schema matches expected structure

### Data
- [ ] Remove any test data from production database
- [ ] Verify seed data (if any) is appropriate for production
- [ ] Check for any placeholder or dummy data

## 📋 Legal & Compliance

### Terms of Service & Privacy Policy
- [ ] Add "Terms of Service" link to footer/navigation
- [ ] Add "Privacy Policy" link to footer/navigation
- [ ] Verify links point to actual legal documents
- [ ] **Required for Stripe Connect verification** - Stripe requires these links for marketplace platforms

### Stripe Connect Verification
- [ ] Complete Stripe Connect account verification
- [ ] Submit required business information
- [ ] Verify identity documents (if required)
- [ ] Complete tax information
- [ ] Ensure Terms of Service and Privacy Policy are accessible

### GDPR/Privacy Compliance
- [ ] Verify user data handling complies with privacy regulations
- [ ] Ensure user consent mechanisms are in place
- [ ] Verify data retention policies are implemented

## 🧹 Code Cleanup

### Console Logs
- [ ] Remove all `console.log` statements containing sensitive data
- [ ] Remove debug logging statements
- [ ] Keep only essential error logging
- [ ] Verify no API keys, tokens, or passwords are logged

### Test Code Removal
- [ ] Remove test authentication bypass (`test_user=true` query param handling)
- [ ] Remove test bypass buttons or routes
- [ ] Remove `/demo` route (if exists)
- [ ] Remove any development-only features
- [ ] Clean up test utilities and mock data

### Code Quality
- [ ] Run linter and fix all warnings
- [ ] Remove unused imports and code
- [ ] Verify no TODO comments for critical features
- [ ] Check for any hardcoded URLs or endpoints

## 🚀 Deployment

### Build & Deploy
- [ ] Build production frontend: `npm run build`
- [ ] Verify build completes without errors
- [ ] Test production build locally: `npm run preview`
- [ ] Deploy to production environment
- [ ] Verify deployment was successful

### Environment Configuration
- [ ] Set all production environment variables
- [ ] Verify frontend environment variables are set
- [ ] Verify backend environment variables are set
- [ ] Test API connectivity from frontend

### DNS & SSL
- [ ] Configure production domain DNS
- [ ] Verify SSL certificate is installed and valid
- [ ] Test HTTPS redirects work correctly
- [ ] Verify all assets load over HTTPS

## ✅ Testing

### Functional Testing
- [ ] Test user registration flow
- [ ] Test user login flow
- [ ] Test shift creation (employer)
- [ ] Test shift application (professional)
- [ ] Test payment processing
- [ ] Test messaging functionality
- [ ] Test notification system

### Integration Testing
- [ ] Test Stripe payment flow end-to-end
- [ ] Test Stripe Connect onboarding
- [ ] Test email delivery (Resend)
- [ ] Test Firebase Authentication
- [ ] Test Firebase Storage uploads

### Performance Testing
- [ ] Verify page load times are acceptable
- [ ] Test API response times
- [ ] Check database query performance
- [ ] Verify image optimization is working

## 📊 Monitoring & Logging

### Error Tracking
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure error alerts
- [ ] Test error reporting

### Analytics
- [ ] Verify analytics tracking is configured
- [ ] Test event tracking
- [ ] Verify conversion tracking

### Logging
- [ ] Configure production logging
- [ ] Set up log aggregation
- [ ] Verify logs don't contain sensitive data

## 🔄 Post-Launch

### Immediate Monitoring
- [ ] Monitor error logs for first 24 hours
- [ ] Check Stripe dashboard for payment issues
- [ ] Monitor database performance
- [ ] Check server resource usage

### User Support
- [ ] Set up support email/chat
- [ ] Prepare FAQ/documentation
- [ ] Test support channels

### Backup & Recovery
- [ ] Verify database backups are running
- [ ] Test backup restoration process
- [ ] Document recovery procedures

## 📝 Documentation

- [ ] Update README.md with production URLs
- [ ] Document production deployment process
- [ ] Create runbook for common issues
- [ ] Document rollback procedures

---

## Quick Verification Commands

```bash
# Check environment
echo $NODE_ENV  # Should be "production"

# Verify database connection
cd api && npm run db:check

# Run migrations
cd api && npm run migrate

# Build frontend
npm run build

# Check for console.log with sensitive data
grep -r "console.log.*password\|console.log.*secret\|console.log.*key\|console.log.*token" --include="*.ts" --include="*.tsx" src/ api/
```

---

**Last Updated:** [Current Date]
**Status:** ⚠️ Pre-Production - Complete all items before launch
