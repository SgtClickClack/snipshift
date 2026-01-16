# Live Mock Webhook Validation Guide

## Overview
This guide helps you test the end-to-end webhook integration by associating a test user with a real Stripe account ID and verifying database updates.

## Test Account Created
**Account ID:** `acct_1Sq2CPBTM8A3w1Ys`  
**Type:** Express  
**Country:** AU  
**Email:** test-venue@hospogo.test

## Step-by-Step Test Process

### Step 1: Associate Test User with Account

Run this SQL query in your database:

```sql
UPDATE users 
SET stripe_account_id = 'acct_1Sq2CPBTM8A3w1Ys'
WHERE id = (SELECT id FROM users WHERE stripe_account_id IS NULL LIMIT 1);
```

Or to use a specific email:

```sql
UPDATE users 
SET stripe_account_id = 'acct_1Sq2CPBTM8A3w1Ys'
WHERE email = 'your-test-email@example.com';
```

### Step 2: Trigger Webhook Event

Update the account to trigger an `account.updated` webhook:

```bash
stripe accounts update acct_1Sq2CPBTM8A3w1Ys --business-profile-name "Test Venue Update"
```

Or use the Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/test/connect/accounts/acct_1Sq2CPBTM8A3w1Ys
2. Make any change (e.g., update business name)
3. This will trigger the `account.updated` webhook

### Step 3: Verify Webhook Reception

Check your API server logs for:

```
[WEBHOOK] Account updated event received for account: acct_1Sq2CPBTM8A3w1Ys
   Details submitted: false
   Charges enabled: false
   Payouts enabled: false
[WEBHOOK] Found user <user_id> (<email>) for account acct_1Sq2CPBTM8A3w1Ys
[WEBHOOK] Onboarding complete: false
```

**Note:** In test mode, accounts won't be fully onboarded (`charges_enabled=false`, `payouts_enabled=false`), so `stripe_onboarding_complete` will remain `false`. This is expected behavior.

### Step 4: Verify Database Update

Run this SQL query:

```sql
SELECT 
    email, 
    stripe_account_id, 
    stripe_onboarding_complete, 
    updated_at
FROM users 
WHERE stripe_account_id = 'acct_1Sq2CPBTM8A3w1Ys';
```

**Expected Result:**
- `stripe_account_id` = `acct_1Sq2CPBTM8A3w1Ys`
- `stripe_onboarding_complete` = `false` (account not fully onboarded in test mode)
- `updated_at` should reflect recent webhook processing time

### Step 5: Test Full Onboarding (Optional)

To test with a fully onboarded account:

1. Use your venue dashboard to "Connect with Stripe"
2. Complete the actual Stripe Connect onboarding flow
3. This will create a new account and trigger real webhook events
4. The account will have `charges_enabled=true` and `payouts_enabled=true` after completion
5. The webhook will set `stripe_onboarding_complete=true`

## Webhook Handler Logic

The `account.updated` handler checks:

```typescript
const isComplete = account.details_submitted === true && 
                  account.charges_enabled === true && 
                  account.payouts_enabled === true;
```

Only when all three conditions are `true` will `stripe_onboarding_complete` be set to `true`.

## Troubleshooting

### Webhook Not Received
- ✅ Check webhook tunnel is running: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
- ✅ Verify API server is running on port 5000
- ✅ Check `STRIPE_WEBHOOK_SECRET` in `api/.env` matches tunnel output

### Database Not Updated
- ✅ Check API logs for user lookup results
- ✅ Verify user exists with matching `stripe_account_id`
- ✅ Check database connection is working
- ✅ Review webhook handler logs for errors

### Account Not Fully Onboarded
- ✅ This is normal in test mode - accounts require manual onboarding
- ✅ Use the actual Stripe Connect flow to test full onboarding
- ✅ Or use Stripe Dashboard to manually enable capabilities (test mode only)

## Related Files

- Webhook Handler: `api/_src/routes/webhooks.ts`
- Test Script: `scripts/test-live-webhook-with-real-account.ps1`
- Verification Queries: `scripts/verify-stripe-webhook.sql`
