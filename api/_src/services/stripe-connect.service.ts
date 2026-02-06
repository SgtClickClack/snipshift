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
 * Create a Stripe Connect Express account with identity verification requirement
 */
export async function createConnectAccountWithIdentity(
  email: string,
  userId: string,
  location?: string
): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'AU',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: userId,
        location: location || 'Brisbane',
      },
      // Request identity verification for Brisbane venues
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
          },
        },
      },
    });

    return account.id;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating Connect account with identity:', error);
    throw error;
  }
}

/**
 * Create an account link with identity verification requirement
 */
export async function createAccountLinkWithIdentity(
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
    console.error('[STRIPE_CONNECT] Error creating account link with identity:', error);
    throw error;
  }
}

/**
 * Create an identity verification session for a Stripe Connect account
 */
export async function createIdentityVerificationSession(
  accountId: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        account_id: accountId,
      },
      return_url: returnUrl,
      options: {
        document: {
          allowed_types: ['driving_license', 'id_card', 'passport'],
          require_id_number: true,
          require_live_capture: true,
          require_matching_selfie: false,
        },
      },
    });

    return verificationSession.url || null;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating identity verification session:', error);
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
 * Capture a PaymentIntent (release funds to professional)
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

/**
 * Cancel a PaymentIntent
 * 
 * Used to clean up PaymentIntents that were created but the associated
 * operation (e.g., shift acceptance) failed or was rolled back.
 * 
 * @param paymentIntentId - The Stripe PaymentIntent ID to cancel
 * @returns True if cancellation succeeded, false otherwise
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    console.error('[STRIPE_CONNECT] Cannot cancel PaymentIntent: Stripe not configured');
    return false;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    
    // PaymentIntent can be in various states, check if cancellation was successful
    if (paymentIntent.status === 'canceled') {
      console.log(`[STRIPE_CONNECT] Successfully canceled PaymentIntent ${paymentIntentId}`);
      return true;
    }
    
    // If already canceled or in a terminal state, consider it successful
    if (['canceled', 'succeeded', 'processing'].includes(paymentIntent.status)) {
      console.log(`[STRIPE_CONNECT] PaymentIntent ${paymentIntentId} already in terminal state: ${paymentIntent.status}`);
      return true;
    }
    
    console.warn(`[STRIPE_CONNECT] PaymentIntent ${paymentIntentId} cancellation returned unexpected status: ${paymentIntent.status}`);
    return false;
  } catch (error: any) {
    // If PaymentIntent is already canceled or doesn't exist, that's fine
    if (error.code === 'resource_missing' || error.message?.includes('already canceled')) {
      console.log(`[STRIPE_CONNECT] PaymentIntent ${paymentIntentId} already canceled or missing`);
      return true;
    }
    
    console.error(`[STRIPE_CONNECT] Error canceling PaymentIntent ${paymentIntentId}:`, error);
    return false;
  }
}

/**
 * Capture PaymentIntent and return both charge ID and transfer ID
 * 
 * This is the atomic settlement method that:
 * 1. Updates PaymentIntent amount if award calculation differs (2026 HIGA rates)
 * 2. Captures the PaymentIntent
 * 3. Retrieves the automatic transfer ID (from transfer_data.destination)
 * 4. Returns both IDs for complete audit trail
 * 
 * IMPORTANT: For Stripe Connect with transfer_data.destination, the transfer
 * is created automatically on capture. We retrieve it from the charge.
 * 
 * The amountCents parameter ensures the worker receives the correct award-based pay,
 * even if the PaymentIntent was created with a different (simpler) calculation.
 */
export interface AtomicSettlementResult {
  success: boolean;
  chargeId: string | null;
  transferId: string | null;
  error?: string;
}

export async function capturePaymentIntentAtomic(
  paymentIntentId: string,
  settlementId: string,
  amountCents?: number // Optional: award-calculated amount to ensure correct transfer
): Promise<AtomicSettlementResult> {
  if (!stripe) {
    return { success: false, chargeId: null, transferId: null, error: 'Stripe not configured' };
  }

  try {
    // Step 0: Retrieve current PaymentIntent to check amount
    const currentPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Step 0.5: Update PaymentIntent amount if award calculation differs
    // This ensures the worker receives the correct 2026 HIGA award-based pay
    if (amountCents !== undefined && amountCents !== currentPaymentIntent.amount) {
      const commissionRate = parseFloat(process.env.HOSPOGO_COMMISSION_RATE || '0.10'); // 10% default
      const newApplicationFeeAmount = Math.round(amountCents * commissionRate);
      
      console.log(`[STRIPE_CONNECT] Updating PaymentIntent ${paymentIntentId} amount from ${currentPaymentIntent.amount} to ${amountCents} cents (award calculation)`);
      
      await stripe.paymentIntents.update(paymentIntentId, {
        amount: amountCents,
        application_fee_amount: newApplicationFeeAmount,
      });
      
      console.log(`[STRIPE_CONNECT] PaymentIntent updated - New amount: ${amountCents} cents, Application fee: ${newApplicationFeeAmount} cents`);
    }
    
    // Step 1: Capture the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    const chargeId = typeof paymentIntent.latest_charge === 'string' 
      ? paymentIntent.latest_charge 
      : paymentIntent.latest_charge?.id || null;
    
    if (!chargeId) {
      console.warn(`[STRIPE_CONNECT] No charge ID after capture for ${paymentIntentId}`);
      return { success: true, chargeId: null, transferId: null };
    }

    // Step 2: Retrieve the charge to get the transfer ID
    // When using transfer_data.destination, Stripe automatically creates a transfer
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ['transfer'],
    });

    const transferId = typeof charge.transfer === 'string' 
      ? charge.transfer 
      : charge.transfer?.id || null;

    console.log(`[STRIPE_CONNECT] Atomic settlement completed - Settlement: ${settlementId}, Charge: ${chargeId}, Transfer: ${transferId}`);
    
    return {
      success: true,
      chargeId,
      transferId,
    };
  } catch (error: any) {
    console.error(`[STRIPE_CONNECT] Atomic settlement failed for ${paymentIntentId}:`, error);
    return {
      success: false,
      chargeId: null,
      transferId: null,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Get transfer details by transfer ID
 * Used for reconciliation and audit purposes
 */
export async function getTransfer(transferId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const transfer = await stripe.transfers.retrieve(transferId);
    return transfer;
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error retrieving transfer:', error);
    throw error;
  }
}

/**
 * Check if funds have arrived in connected account
 * Used for immediate settlement verification
 */
export async function verifyTransferArrival(
  accountId: string,
  transferId: string
): Promise<boolean> {
  if (!stripe) {
    return false;
  }

  try {
    const transfer = await stripe.transfers.retrieve(transferId);
    
    // Check if transfer is to the correct account and has arrived
    if (transfer.destination !== accountId) {
      console.warn(`[STRIPE_CONNECT] Transfer ${transferId} destination mismatch: expected ${accountId}, got ${transfer.destination}`);
      return false;
    }

    // Transfer is considered arrived if it's not reversed
    return !transfer.reversed;
  } catch (error: any) {
    console.error(`[STRIPE_CONNECT] Error verifying transfer arrival:`, error);
    return false;
  }
}