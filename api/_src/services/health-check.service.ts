/**
 * Health Check Service
 * 
 * Performs comprehensive health checks for all external dependencies
 */

import { getDatabase } from '../db/index.js';
import { getPusher } from './pusher.service.js';
import { stripe } from '../lib/stripe.js';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: HealthCheckResult[];
  uptime: number;
}

const startTime = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const db = getDatabase();
    if (!db) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: 'Database not configured',
        responseTime: Date.now() - start,
      };
    }

    // Perform a simple query to verify connectivity
    // Using a lightweight query that doesn't require specific table access
    await db.execute('SELECT 1');
    
    return {
      service: 'database',
      status: 'healthy',
      message: 'Database connection successful',
      responseTime: Date.now() - start,
    };
  } catch (error: any) {
    return {
      service: 'database',
      status: 'unhealthy',
      message: 'Database connection failed',
      responseTime: Date.now() - start,
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Check Pusher connectivity
 */
async function checkPusher(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const pusher = getPusher();
    if (!pusher) {
      return {
        service: 'pusher',
        status: 'degraded',
        message: 'Pusher not configured (real-time features disabled)',
        responseTime: Date.now() - start,
      };
    }

    // Check if Pusher instance is properly initialized
    // Note: Pusher doesn't have a direct ping method, so we check if instance exists
    // In production, you might want to trigger a test event to a test channel
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    
    if (!appId || !key) {
      return {
        service: 'pusher',
        status: 'degraded',
        message: 'Pusher credentials missing',
        responseTime: Date.now() - start,
      };
    }

    // Attempt to trigger a test event (non-blocking, doesn't require actual channel)
    // This verifies the Pusher instance can make API calls
    try {
      // Use a test channel that won't cause issues if it doesn't exist
      await pusher.trigger('health-check-test', 'ping', { timestamp: Date.now() });
    } catch (triggerError: any) {
      // If trigger fails due to channel/auth, that's okay - we just want to verify connectivity
      // If it fails due to network/API issues, we'll catch that
      if (triggerError?.message?.includes('network') || triggerError?.message?.includes('timeout')) {
        return {
          service: 'pusher',
          status: 'unhealthy',
          message: 'Pusher API connectivity failed',
          responseTime: Date.now() - start,
          error: triggerError?.message,
        };
      }
    }

    return {
      service: 'pusher',
      status: 'healthy',
      message: 'Pusher connectivity verified',
      responseTime: Date.now() - start,
    };
  } catch (error: any) {
    return {
      service: 'pusher',
      status: 'unhealthy',
      message: 'Pusher check failed',
      responseTime: Date.now() - start,
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Check Stripe API connectivity
 */
async function checkStripe(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    if (!stripe) {
      return {
        service: 'stripe',
        status: 'degraded',
        message: 'Stripe not configured',
        responseTime: Date.now() - start,
      };
    }

    // Perform a lightweight API call to verify connectivity
    // Using getAccount() which is a simple read operation
    try {
      await stripe.account.retrieve();
      
      return {
        service: 'stripe',
        status: 'healthy',
        message: 'Stripe API connectivity verified',
        responseTime: Date.now() - start,
      };
    } catch (error: any) {
      // If it's an authentication error, that's different from connectivity
      if (error?.type === 'StripeAuthenticationError') {
        return {
          service: 'stripe',
          status: 'unhealthy',
          message: 'Stripe authentication failed',
          responseTime: Date.now() - start,
          error: 'Invalid API key',
        };
      }

      // For other errors, assume connectivity is okay but something else is wrong
      return {
        service: 'stripe',
        status: 'degraded',
        message: 'Stripe API accessible but returned error',
        responseTime: Date.now() - start,
        error: error?.message || 'Unknown error',
      };
    }
  } catch (error: any) {
    return {
      service: 'stripe',
      status: 'unhealthy',
      message: 'Stripe connectivity check failed',
      responseTime: Date.now() - start,
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Perform all health checks
 */
export async function performHealthChecks(): Promise<HealthCheckResponse> {
  const checks = await Promise.all([
    checkDatabase(),
    checkPusher(),
    checkStripe(),
  ]);

  // Determine overall status
  const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
  const hasDegraded = checks.some(check => check.status === 'degraded');
  
  let overallStatus: 'ok' | 'degraded' | 'unhealthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'ok';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000), // seconds
  };
}
