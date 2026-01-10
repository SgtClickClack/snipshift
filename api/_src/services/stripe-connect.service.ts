/**
 * Stripe Connect Service
 * 
 * Handles Stripe Connect onboarding and account management
 */

import { stripe } from '../lib/stripe.js';
import * as usersRepo from '../repositories/users.repository.js';

if (!stripe) {
  console.warn('[STRIPE_CONNECT] Stripe is not configured');
}

/**
 * Create a Stripe Connect Express account onboarding link
 */
export async function createConnectOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating onboarding link:', error);
    throw error;
  }
}

/**
 * Create a Stripe Connect Express account
 */
export async function createConnectAccount(email: string, userId: string): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'AU', // Defaulting to AU based on user location context
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: userId,
      },
    });

    return account.id;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating Connect account:', error);
    throw error;
  }
}

/**
 * Get Connect account details
 */
export async function getConnectAccount(accountId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error retrieving Connect account:', error);
    throw error;
  }
}

/**
 * Check if account has completed onboarding and can accept payments
 */
export async function isAccountReady(accountId: string): Promise<boolean> {
  if (!stripe) {
    return false;
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account.charges_enabled === true && account.details_submitted === true;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error checking account status:', error);
    return false;
  }
}

/**
 * Create a Stripe Customer for shops
 */
export async function createStripeCustomer(email: string, name: string, userId: string): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: userId,
      },
    });

    return customer.id;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating customer:', error);
    throw error;
  }
}

/**
 * Create a PaymentIntent with manual capture for shift payment
 * 
 * IMPORTANT: Uses idempotency key based on shiftId to prevent double-charging.
 */
export async function createPaymentIntent(
  amount: number, // in cents
  currency: string,
  customerId: string,
  applicationFeeAmount: number, // HospoGo commission in cents
  transferData: {
    destination: string; // Barber's Stripe account ID
  },
  metadata: Record<string, string>
): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Create idempotency key from shiftId to prevent double-charging
  const idempotencyKey = metadata.shiftId 
    ? `shift_intent_${metadata.shiftId}_${customerId}` 
    : `intent_${customerId}_${Date.now()}`;

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amount,
        currency: currency,
        customer: customerId,
        capture_method: 'manual', // Hold funds until shift completion
        application_fee_amount: applicationFeeAmount,
        transfer_data: transferData,
        metadata: metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        idempotencyKey: idempotencyKey,
      }
    );

    return paymentIntent.id;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating PaymentIntent:', error);
    throw error;
  }
}

/**
 * Capture a PaymentIntent (release funds to barber)
 */
export async function capturePaymentIntent(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    return paymentIntent.status === 'succeeded';
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error capturing PaymentIntent:', error);
    throw error;
  }
}

/**
 * Get PaymentIntent details
 */
export async function getPaymentIntent(paymentIntentId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error retrieving PaymentIntent:', error);
    throw error;
  }
}

/**
 * Get balance for a connected account
 */
export async function getAccountBalance(accountId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
    return balance;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error retrieving account balance:', error);
    throw error;
  }
}

/**
 * Create a login link for Stripe Express Dashboard
 */
export async function createExpressDashboardLoginLink(accountId: string, returnUrl?: string): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating login link:', error);
    throw error;
  }
}

/**
 * Create a SetupIntent for collecting payment methods
 */
export async function createSetupIntent(customerId: string): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return setupIntent.client_secret;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating SetupIntent:', error);
    throw error;
  }
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(customerId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error listing payment methods:', error);
    throw error;
  }
}

/**
 * Create a PaymentIntent with manual capture and confirm it with a payment method
 * 
 * IMPORTANT: Uses idempotency key based on shiftId to prevent double-charging
 * if user clicks "Pay" twice or if there's a network retry.
 */
export async function createAndConfirmPaymentIntent(
  amount: number, // in cents
  currency: string,
  customerId: string,
  paymentMethodId: string,
  applicationFeeAmount: number, // HospoGo commission in cents
  transferData: {
    destination: string; // Barber's Stripe account ID
  },
  metadata: Record<string, string>
): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Create idempotency key from shiftId to prevent double-charging
  // If no shiftId in metadata, fall back to a timestamp-based key (less safe but still prevents immediate retries)
  const idempotencyKey = metadata.shiftId 
    ? `shift_payment_${metadata.shiftId}_${customerId}` 
    : `payment_${customerId}_${Date.now()}`;

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amount,
        currency: currency,
        customer: customerId,
        payment_method: paymentMethodId,
        capture_method: 'manual', // Hold funds until shift completion
        off_session: true, // Customer is not present
        confirm: true, // Confirm immediately
        application_fee_amount: applicationFeeAmount,
        transfer_data: transferData,
        metadata: metadata,
      },
      {
        idempotencyKey: idempotencyKey,
      }
    );

    return paymentIntent.id;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating and confirming PaymentIntent:', error);
    throw error;
  }
}

/**
 * Capture a PaymentIntent and return the charge ID
 */
export async function capturePaymentIntentWithChargeId(paymentIntentId: string): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    const chargeId = typeof paymentIntent.latest_charge === 'string' 
      ? paymentIntent.latest_charge 
      : paymentIntent.latest_charge?.id || null;
    return chargeId;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error capturing PaymentIntent:', error);
    throw error;
  }
}
