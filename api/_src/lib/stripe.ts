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

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    })
  : null;

export default stripe;

