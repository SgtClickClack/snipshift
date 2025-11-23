/**
 * Resend Email Service Configuration
 * 
 * Initializes Resend client for transactional emails
 * Gracefully handles missing API key (logs warning, doesn't crash)
 */

import { Resend } from 'resend';

let resendClient: Resend | null = null;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (RESEND_API_KEY) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log('✅ Resend email service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Resend:', error);
  }
} else {
  console.warn('⚠️  RESEND_API_KEY not found. Email functionality will be disabled.');
  console.warn('   Set RESEND_API_KEY in your environment variables to enable emails.');
}

export const resend = resendClient;

/**
 * Check if email service is available
 */
export function isEmailServiceAvailable(): boolean {
  return resendClient !== null;
}

