/**
 * Stripe Frontend Configuration
 * 
 * Initializes Stripe.js for client-side operations
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { logger } from '@/lib/logger';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      logger.error('Stripe', 'VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will be disabled.');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(publishableKey);
    }
  }
  
  return stripePromise;
};

export default getStripe;

