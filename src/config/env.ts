/**
 * Environment Configuration
 * 
 * Centralized access to VITE_* environment variables from import.meta.env
 * Prevents hard-coding secrets and provides type safety
 */

interface EnvConfig {
  stripe: {
    publishableKey: string | undefined;
  };
  google: {
    mapsApiKey: string | undefined;
    clientId: string | undefined;
  };
  firebase: {
    apiKey: string | undefined;
    appId: string | undefined;
    projectId: string | undefined;
  };
}

/**
 * Environment configuration object
 * Reads VITE_* variables from import.meta.env (Vite's way of exposing env vars)
 */
export const env: EnvConfig = {
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  },
  google: {
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  },
};

/**
 * Validates that required environment variables are present
 * Call this during app initialization to fail fast if critical vars are missing
 */
export const validateEnv = (): void => {
  const missing: string[] = [];

  // Add validation for critical variables as needed
  // Example:
  // if (!env.stripe.publishableKey) {
  //   missing.push('VITE_STRIPE_PUBLISHABLE_KEY');
  // }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Helper to check if a service is configured
 */
export const isStripeConfigured = (): boolean => {
  return !!env.stripe.publishableKey;
};

export const isGoogleMapsConfigured = (): boolean => {
  return !!env.google.mapsApiKey;
};

export const isFirebaseConfigured = (): boolean => {
  return !!env.firebase.apiKey && !!env.firebase.appId && !!env.firebase.projectId;
};

export const isGoogleOAuthConfigured = (): boolean => {
  return !!env.google.clientId;
};

