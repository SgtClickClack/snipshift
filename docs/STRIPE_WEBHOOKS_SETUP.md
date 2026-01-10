# Stripe Webhooks Setup Guide

This guide explains how to set up and test Stripe webhooks for payment reliability in the HospoGo application.

## Overview

Stripe webhooks ensure the database stays in sync with Stripe, even if:
- The user closes their browser during a transaction
- A transaction fails offline
- Edge cases occur (failed payments, refunds, account de-authorizations)

## Webhook Endpoint

**Endpoint:** `POST /api/webhooks/stripe`

**Important:** This route uses `express.raw({ type: 'application/json' })` middleware (not the standard JSON parser) to allow Stripe signature verification.

## Handled Events

### 1. `payment_intent.succeeded`
- **Purpose:** Fail-safe to ensure payment status is set to 'PAID' even if manual capture flow missed it
- **Logic:** 
  - Finds shift by `metadata.shiftId` (preferred) or `paymentIntentId` (fallback)
  - Updates `paymentStatus` to 'PAID'
  - Stores `stripeChargeId` if available

### 2. `payment_intent.payment_failed`
- **Purpose:** Handle failed payment authorizations
- **Logic:**
  - Finds shift by `metadata.shiftId` or `paymentIntentId`
  - Sets `paymentStatus` to 'PAYMENT_FAILED'
  - Sends urgent email/notification to Shop Owner
- **Notification:** "Payment Failed for Shift #123" with instructions to update payment method

### 3. `account.updated`
- **Purpose:** Keep Connect account onboarding status in sync
- **Logic:**
  - Checks `payouts_enabled` and `charges_enabled` flags
  - Updates `stripeOnboardingComplete` boolean in users table
  - If account loses verification, automatically locks barber from accepting new shifts

### 4. `charge.refunded`
- **Purpose:** Handle refunds for completed payments
- **Logic:**
  - Finds shift by `paymentIntentId`
  - Sets `paymentStatus` to 'REFUNDED'

## Development Setup

### Prerequisites
1. Stripe CLI installed: https://stripe.com/docs/stripe-cli
2. Stripe account with test mode enabled
3. Webhook secret from Stripe Dashboard or CLI

### Local Development

1. **Install Stripe CLI** (if not already installed):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows (using Scoop)
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   
   # Linux
   # Download from: https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Start your local API server**:
   ```bash
   cd api
   npm start
   # Server should be running on http://localhost:3000
   ```

4. **Forward Stripe events to local endpoint**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   This command will:
   - Display a webhook signing secret (e.g., `whsec_...`)
   - Forward all Stripe events to your local endpoint
   - Show real-time event logs

5. **Set the webhook secret in your `.env` file**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

6. **Trigger test events** (in a new terminal):
   ```bash
   # Test payment_intent.succeeded
   stripe trigger payment_intent.succeeded
   
   # Test payment_intent.payment_failed
   stripe trigger payment_intent.payment_failed
   
   # Test account.updated
   stripe trigger account.updated
   
   # Test charge.refunded
   stripe trigger charge.refunded
   ```

### Production Setup

1. **Create webhook endpoint in Stripe Dashboard**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Enter your production URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated`
     - `charge.refunded`

2. **Get webhook signing secret**:
   - After creating the endpoint, click on it
   - Copy the "Signing secret" (starts with `whsec_`)
   - Add to production environment variables: `STRIPE_WEBHOOK_SECRET`

3. **Verify webhook is working**:
   - Stripe will send a test event when you create the endpoint
   - Check your server logs to confirm it's received and processed

## Security

- **Signature Verification:** All webhook requests are verified using the `stripe-signature` header
- **Raw Body Parser:** Required for signature verification (cannot use standard JSON parser)
- **Webhook Secret:** Must be set in environment variables, never commit to git

## Testing

### Manual Testing

1. **Test Payment Success**:
   - Create a shift and accept it (creates PaymentIntent)
   - Manually capture the payment in Stripe Dashboard
   - Verify webhook updates shift status to 'PAID'

2. **Test Payment Failure**:
   - Use Stripe test card: `4000 0000 0000 0002` (declined card)
   - Attempt to create/confirm a PaymentIntent
   - Verify webhook sets status to 'PAYMENT_FAILED' and sends notification

3. **Test Account Update**:
   - Update a Connect account in Stripe Dashboard
   - Verify webhook updates `stripeOnboardingComplete` status

4. **Test Refund**:
   - Refund a completed payment in Stripe Dashboard
   - Verify webhook sets status to 'REFUNDED'

### Automated Testing

Use Stripe CLI to trigger events:
```bash
# List all available events
stripe trigger --help

# Trigger specific event with custom data
stripe trigger payment_intent.succeeded \
  --override payment_intent:metadata[shiftId]=your-shift-id
```

## Troubleshooting

### Webhook not receiving events
- Check that `stripe listen` is running
- Verify the endpoint URL is correct
- Check server logs for errors

### Signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify the endpoint uses `express.raw()` middleware
- Check that the webhook secret matches the one from Stripe CLI/Dashboard

### Events not processing
- Check server logs for error messages
- Verify database connection
- Ensure shift records exist with matching `paymentIntentId` or `metadata.shiftId`

## Monitoring

Monitor webhook events in:
- **Stripe Dashboard:** https://dashboard.stripe.com/webhooks
- **Server Logs:** Check for webhook processing messages
- **Database:** Verify payment status updates in shifts table

## Related Files

- `api/_src/routes/webhooks.ts` - Webhook handler implementation
- `api/_src/lib/notifications-service.ts` - Notification functions
- `api/_src/services/stripe-connect.service.ts` - Stripe service functions
- `api/_src/db/schema/shifts.ts` - Payment status enum definition
