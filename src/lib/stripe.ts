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
    const livePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE || publishableKey;
    const isProduction = import.meta.env.PROD;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const shouldUseLiveKey = hostname === 'hospogo.com';
    const resolvedKey = shouldUseLiveKey ? livePublishableKey : publishableKey;
    
    if (!resolvedKey) {
      logger.error('Stripe', 'VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will be disabled.');
      stripePromise = Promise.resolve(null);
    } else if (shouldUseLiveKey && resolvedKey.startsWith('pk_test')) {
      logger.error('Stripe', 'Live hostname detected with a test publishable key. Stripe is disabled.');
      stripePromise = Promise.resolve(null);
    } else if (isProduction && resolvedKey.startsWith('pk_test')) {
      logger.error('Stripe', 'Production build detected with a test publishable key. Stripe is disabled.');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(resolvedKey);
    }
  }
  
  return stripePromise;
};

export default getStripe;

