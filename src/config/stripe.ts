/**
 * Stripe Configuration Placeholder
 * 
 * This file demonstrates how to use the Stripe publishable key from environment variables
 * Replace this with actual Stripe initialization when implementing payment features
 */

import { env, isStripeConfigured } from './env';

/**
 * Initialize Stripe with publishable key from environment
 * 
 * Usage:
 * ```typescript
 * import { loadStripe } from '@stripe/stripe-js';
 * import { getStripePublishableKey } from '@/config/stripe';
 * 
 * const stripe = await loadStripe(getStripePublishableKey());
 * ```
 */
export const getStripePublishableKey = (): string => {
  if (!isStripeConfigured()) {
    throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is not configured. Please set it in your environment variables.');
  }
  return env.stripe.publishableKey!;
};

