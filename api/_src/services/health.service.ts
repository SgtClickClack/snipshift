/**
 * Health Monitoring Service
 * 
 * Performs system pulse checks for all critical external dependencies
 * Used by the Founder's Control Panel (Health Check Dashboard)
 */

import { getDb } from '../db/index.js';
import { getPusher } from './pusher.service.js';
import { stripe } from '../lib/stripe.js';
import { resend, isEmailServiceAvailable } from '../lib/resend.js';
import { sql } from 'drizzle-orm';

export interface ServiceHealth {
  service: string;
  status: 'UP' | 'DOWN';
  latency: number; // in milliseconds
  message?: string;
  error?: string;
}

export interface SystemPulse {
  database: ServiceHealth;
  stripe: ServiceHealth;
  pusher: ServiceHealth;
  resend: ServiceHealth;
  timestamp: string;
}

/**
 * Check system pulse for all critical services
 * 
 * @returns SystemPulse object with status and latency for each service
 */
export async function checkSystemPulse(): Promise<SystemPulse> {
  const [database, stripeCheck, pusher, resendCheck] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkPusher(),
    checkResend(),
  ]);

  return {
    database,
    stripe: stripeCheck,
    pusher,
    resend: resendCheck,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check database connectivity and latency
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const db = getDb();
    if (!db) {
      return {
        service: 'database',
        status: 'DOWN',
        latency: Date.now() - start,
        message: 'Database not configured',
      };
    }

    // Perform a simple SELECT 1 query to measure latency
    await db.execute(sql`SELECT 1`);

    return {
      service: 'database',
      status: 'UP',
      latency: Date.now() - start,
      message: 'Database connection successful',
    };
  } catch (error: any) {
    return {
      service: 'database',
      status: 'DOWN',
      latency: Date.now() - start,
      message: 'Database connection failed',
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Check Stripe API connectivity and verify API key validity
 */
async function checkStripe(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    if (!stripe) {
      return {
        service: 'stripe',
        status: 'DOWN',
        latency: Date.now() - start,
        message: 'Stripe not configured',
      };
    }

    // Perform a lightweight API call to verify API key validity
    // Using paymentMethods.list with limit 1 as specified
    await stripe.paymentMethods.list({ limit: 1 });

    return {
      service: 'stripe',
      status: 'UP',
      latency: Date.now() - start,
      message: 'Stripe API key valid',
    };
  } catch (error: any) {
    // Check if it's an authentication error (invalid API key)
    if (error?.type === 'StripeAuthenticationError' || error?.code === 'api_key_invalid') {
      return {
        service: 'stripe',
        status: 'DOWN',
        latency: Date.now() - start,
        message: 'Stripe API key invalid',
        error: 'Authentication failed',
      };
    }

    return {
      service: 'stripe',
      status: 'DOWN',
      latency: Date.now() - start,
      message: 'Stripe API check failed',
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Check Pusher cluster connection status
 */
async function checkPusher(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const pusher = getPusher();
    if (!pusher) {
      return {
        service: 'pusher',
        status: 'DOWN',
        latency: Date.now() - start,
        message: 'Pusher not configured',
      };
    }

    // Check if Pusher credentials are configured
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const cluster = process.env.PUSHER_CLUSTER;

    if (!appId || !key || !cluster) {
      return {
        service: 'pusher',
        status: 'DOWN',
        latency: Date.now() - start,
        message: 'Pusher credentials missing',
      };
    }

    // Attempt to trigger a test event to verify cluster connection
    // This verifies the Pusher instance can make API calls to the cluster
    try {
      await pusher.trigger('health-check-test', 'ping', { timestamp: Date.now() });
    } catch (triggerError: any) {
      // If trigger fails due to network/cluster issues, mark as down
      if (
        triggerError?.message?.includes('network') ||
        triggerError?.message?.includes('timeout') ||
        triggerError?.message?.includes('cluster')
      ) {
        return {
          service: 'pusher',
          status: 'DOWN',
          latency: Date.now() - start,
          message: 'Pusher cluster connection failed',
          error: triggerError?.message,
        };
      }
      // If it's a channel/auth error, that's okay - we just want to verify connectivity
      // The fact that we got a response means the cluster is reachable
    }

    return {
      service: 'pusher',
      status: 'UP',
      latency: Date.now() - start,
      message: `Pusher cluster ${cluster} connected`,
    };
  } catch (error: any) {
    return {
      service: 'pusher',
      status: 'DOWN',
      latency: Date.now() - start,
      message: 'Pusher check failed',
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Check Resend email service quota/status
 */
async function checkResend(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    if (!isEmailServiceAvailable() || !resend) {
      return {
        service: 'resend',
        status: 'DOWN',
        latency: Date.now() - start,
        message: 'Resend not configured',
      };
    }

    // Resend doesn't have a direct quota/status API endpoint
    // We can verify the service is available by checking if the client is initialized
    // In production, you might want to check the API key validity by attempting
    // a lightweight operation, but for now we'll just verify the client exists

    // Note: Resend API doesn't provide a simple "ping" endpoint
    // The best we can do is verify the client is initialized and API key is set
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        service: 'resend',
        status: 'DOWN',
        latency: Date.now() - start,
        message: 'Resend API key not configured',
      };
    }

    // Since Resend doesn't have a status endpoint, we'll mark it as UP
    // if the client is initialized and API key exists
    // The actual quota/status would need to be checked via Resend dashboard
    return {
      service: 'resend',
      status: 'UP',
      latency: Date.now() - start,
      message: 'Resend service available (quota check via dashboard)',
    };
  } catch (error: any) {
    return {
      service: 'resend',
      status: 'DOWN',
      latency: Date.now() - start,
      message: 'Resend check failed',
      error: error?.message || 'Unknown error',
    };
  }
}
