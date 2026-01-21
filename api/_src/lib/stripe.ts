/**
 * Stripe Configuration
 * 
 * Initializes Stripe SDK with secret key from environment variables
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from api/.env (CWD when running `npm start` in api/)
dotenv.config();
// Also try loading from parent dir (root .env) for scripts/tests that run from api/
if (!process.env.STRIPE_SECRET_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
if (isProduction && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')) {
  console.error('[STRIPE] Production environment detected with a test secret key.');
  throw new Error('STRIPE_SECRET_KEY must be a live key in production.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

export default stripe;

