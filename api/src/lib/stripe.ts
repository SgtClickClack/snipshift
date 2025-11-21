/**
 * Stripe Configuration
 * 
 * Initializes Stripe SDK with secret key from environment variables
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null;

export default stripe;

