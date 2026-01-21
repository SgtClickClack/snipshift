/**
 * Branding Test Script for Password Reset Email
 * 
 * One-time test script to verify Firebase password reset email branding.
 * Tests the email flow with a hardcoded email address and custom continue URL.
 * 
 * Usage:
 *   npx tsx src/scripts/test-branding-email.ts
 * 
 * Note: This script uses the production Firebase configuration from environment variables.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail, type ActionCodeSettings } from 'firebase/auth';

const log = (message: string) => {
  process.stdout.write(`${message}\n`);
};

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  log('📝 Loaded .env configuration');
} else {
  console.warn('⚠️  .env file not found. Make sure Firebase environment variables are set.');
}

// Helper to get env var with fallback
const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value || value === 'undefined' || value === 'null') {
    if (fallback) return fallback;
    throw new Error(`Environment variable ${key} is missing or invalid`);
  }
  return String(value).replace(/[\s"']/g, '');
};

// Initialize Firebase directly (bypassing firebase.ts to avoid import.meta.env issues)
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'snipshift-75b04.firebaseapp.com'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID'),
};

// Validate project ID
const REQUIRED_PROJECT_ID = 'snipshift-75b04';
if (firebaseConfig.projectId !== REQUIRED_PROJECT_ID) {
  throw new Error(`Unauthorized Project ID: Expected '${REQUIRED_PROJECT_ID}', got '${firebaseConfig.projectId}'`);
}

// Initialize Firebase app and auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Test password reset email branding
 * 
 * Sends a password reset email to a hardcoded test email address
 * with a custom continue URL pointing to https://hospogo.com/login
 */
async function testPasswordResetBranding() {
  const testEmail = 'julian.g.roberts@gmail.com';
  const continueUrl = 'https://hospogo.com/login';

  log('='.repeat(60));
  log('Firebase Password Reset Email Branding Test');
  log('='.repeat(60));
  log(`Target Email: ${testEmail}`);
  log(`Continue URL: ${continueUrl}`);
  log(`Firebase Project: ${auth.app.options.projectId}`);
  log(`Auth Domain: ${auth.app.options.authDomain}`);
  log('-'.repeat(60));

  const actionCodeSettings: ActionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: false, // Open link in browser, not in-app
  };

  try {
    log('Sending password reset email...');
    await sendPasswordResetEmail(auth, testEmail, actionCodeSettings);
    
    log('✅ SUCCESS: Password reset email request sent to Firebase');
    log('   Firebase accepted the request successfully.');
    log(`   Please check the inbox for: ${testEmail}`);
    log(`   The reset link should redirect to: ${continueUrl}`);
    log('='.repeat(60));
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Unknown error';

    console.error('❌ ERROR: Password reset email request failed');
    console.error('   Error Code:', code);
    console.error('   Error Message:', message);
    
    // Specific handling for user-not-found error
    if (code === 'auth/user-not-found') {
      console.error('');
      console.error('⚠️  USER NOT FOUND:');
      console.error('   The test account does not exist in Firebase Auth yet.');
      console.error('   Please create the account first, then run this test again.');
      console.error('   Email:', testEmail);
    }
    
    console.error('='.repeat(60));
    throw error;
  }
}

// Execute the test
(async () => {
  try {
    await testPasswordResetBranding();
    log('Test completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
})();
