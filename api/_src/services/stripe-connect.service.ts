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
      country: 'US', // TODO: Make this configurable based on user location
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
 */
export async function createPaymentIntent(
  amount: number, // in cents
  currency: string,
  customerId: string,
  applicationFeeAmount: number, // Snipshift commission in cents
  transferData: {
    destination: string; // Barber's Stripe account ID
  },
  metadata: Record<string, string>
): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
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
    });

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
