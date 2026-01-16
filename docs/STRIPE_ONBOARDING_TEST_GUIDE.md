# Stripe Connect Onboarding Test Guide

This guide helps you verify the complete Stripe Connect onboarding flow from dashboard to database.

## Prerequisites

1. **Stripe Test Account**: Ensure you have a Stripe test account
2. **Environment Variables**: Set in `api/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   DATABASE_URL=postgresql://...
   FRONTEND_URL=http://localhost:5173
   ```
3. **Stripe CLI** (optional, for webhook testing):
   ```bash
   # Install Stripe CLI
   # Windows: winget install stripe.stripe-cli
   # Mac: brew install stripe/stripe-cli/stripe
   # Linux: See https://stripe.com/docs/stripe-cli
   ```

## Test Flow

### Step 1: Environment Check

Run the verification script:
```powershell
.\scripts\test-stripe-onboarding.ps1
```

This will check:
- ✅ Stripe secret key is set (test key)
- ✅ Webhook secret is configured
- ✅ Database connection
- ✅ API server is running
- ✅ Frontend server is running

### Step 2: Navigate to Venue Dashboard

1. Start your servers:
   ```bash
   # Terminal 1: API Server
   cd api
   npm start

   # Terminal 2: Frontend Server
   npm run dev
   ```

2. Navigate to: `http://localhost:5173/venue/dashboard`

3. **Expected**: You should see an orange "Incomplete" banner with:
   - Title: "Connect with Stripe" or "Stripe Setup Incomplete"
   - Button: "Connect with Stripe" or "Complete Setup"

### Step 3: Click "Connect with Stripe"

1. Click the "Connect with Stripe" button
2. **Expected**: Browser redirects to `connect.stripe.com/setup/s/...`
3. This is Stripe's hosted onboarding flow

### Step 4: Complete Stripe Onboarding (Test Mode)

In Stripe's test mode, you can use test data:

**For Express Accounts:**
- Use test phone: `+61 400 000 000`
- Use test email: `test@example.com`
- Use test business details (any valid format)
- Skip bank account (use test mode)

**Test Data Reference:**
- https://stripe.com/docs/testing
- https://stripe.com/docs/connect/testing

### Step 5: Webhook Testing

#### Option A: Stripe CLI (Recommended)

1. **Login to Stripe CLI:**
   ```bash
   stripe login
   ```

2. **Start webhook forwarding** (in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```
   
   This will:
   - Forward all webhook events to your local server
   - Display the webhook signing secret (use this for `STRIPE_WEBHOOK_SECRET`)

3. **Trigger test events:**
   ```bash
   # Trigger identity verification event
   stripe trigger identity.verification_session.verified
   
   # Trigger account update event
   stripe trigger account.updated
   ```

4. **Check API logs** for webhook reception:
   ```
   ✅ Identity verification completed for user ...
   ✅ Updated Connect account status for user ... - fully onboarded
   ```

#### Option B: Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `http://localhost:5000/api/webhooks/stripe`
4. Select events:
   - `identity.verification_session.verified`
   - `account.updated`
5. Click "Send test webhook"

### Step 6: Database Verification

Run the verification SQL queries:

```sql
-- Check all users with Stripe accounts
SELECT 
    id,
    email,
    stripe_account_id,
    stripe_onboarding_complete,
    updated_at
FROM users
WHERE stripe_account_id IS NOT NULL
ORDER BY updated_at DESC;

-- Or use the provided script
-- Run: scripts/verify-stripe-webhook.sql
```

**Expected Result:**
- `stripe_account_id` should be set (e.g., `acct_...`)
- `stripe_onboarding_complete` should be `true` after webhook
- `updated_at` should reflect recent webhook update

### Step 7: Verify Frontend Update

1. Return to: `http://localhost:5173/venue/dashboard`
2. **Expected**: Orange "Incomplete" banner should be **gone**
3. If banner is still visible:
   - Check browser console for errors
   - Verify webhook was received (check API logs)
   - Verify database was updated (run SQL query)
   - Refresh the page

## Troubleshooting

### Banner Still Shows After Verification

1. **Check API logs** for webhook reception
2. **Verify database** - run SQL query to check `stripe_onboarding_complete`
3. **Check frontend query** - banner queries `/api/stripe-connect/account/status`
4. **Clear browser cache** and refresh

### Webhook Not Received

1. **Check webhook secret** matches Stripe CLI output
2. **Verify API server** is running on port 5000
3. **Check firewall** - ensure port 5000 is accessible
4. **Verify endpoint** - test with: `curl http://localhost:5000/api/webhooks/stripe`

### Redirect Loop

1. **Check return URL** in account link creation
2. **Verify FRONTEND_URL** is set correctly in `.env`
3. **Check browser console** for redirect errors

### Database Not Updating

1. **Check webhook logs** - verify event was received
2. **Check database connection** - verify `DATABASE_URL` is correct
3. **Check user lookup** - verify `stripeAccountId` matches in database
4. **Check webhook handler** - look for errors in API logs

## Test Checklist

- [ ] Environment variables set (test keys)
- [ ] API server running on port 5000
- [ ] Frontend server running on port 5173
- [ ] Orange banner visible on venue dashboard
- [ ] "Connect with Stripe" button redirects to Stripe
- [ ] Webhook forwarding active (Stripe CLI)
- [ ] Webhook events received (check API logs)
- [ ] Database updated (`stripe_onboarding_complete = true`)
- [ ] Banner disappears after verification
- [ ] Status persists after page refresh

## Expected Webhook Events

When onboarding completes, you should receive:

1. **`identity.verification_session.verified`**
   - Logs: `✅ Identity verification completed for user ...`
   - Note: May not have account_id in metadata (this is normal)

2. **`account.updated`**
   - Logs: `✅ Updated Connect account status for user ... - fully onboarded`
   - **This is the event that updates the database**

The `account.updated` event is the primary event that sets `stripe_onboarding_complete = true` because it contains the full account status (`charges_enabled`, `payouts_enabled`, `details_submitted`).

## Additional Resources

- [Stripe Connect Testing Guide](https://stripe.com/docs/connect/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
