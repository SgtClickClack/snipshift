import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars (only once, at module load)
dotenv.config();
// Also try loading from parent dir (for local dev when running from api dir)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
// forcing rebuild

// LAZY INITIALIZATION: Don't initialize Firebase at module load time
// This prevents crashes if Firebase can't initialize (e.g., missing env vars)
let authInstance: admin.auth.Auth | null = null;
let initError: Error | null = null;
let isInitialized = false;

/**
 * Lazy initialization function for Firebase Admin
 * Only initializes when first accessed, not at module load time
 * This prevents FUNCTION_INVOCATION_FAILED errors from top-level initialization crashes
 */
function initializeFirebase(): admin.auth.Auth | null {
  // Return cached instance if already initialized
  if (isInitialized) {
    return authInstance;
  }

  try {
    // Handle default export interop issue
    const firebaseAdmin = (admin as any).default || admin;
    
    // Use a named app instance to avoid stale default app issues in Vercel warm containers
    const appName = process.env.FIREBASE_ADMIN_APP_NAME || 'hospogo-worker-v2';
    // IMPORTANT: Do not hardcode a Firebase project id. Use env/service account so
    // the app can be cleanly separated from any legacy projects.
    let targetProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || undefined;
    let app: admin.app.App | undefined;

    try {
      app = firebaseAdmin.app(appName);
      console.log(`[FIREBASE] Reuse existing app: ${appName}`);
    } catch (e) {
      console.log(`[FIREBASE] Initializing new app: ${appName}`);
    }

    if (!app) {
      // 1. Try parsing FIREBASE_SERVICE_ACCOUNT JSON string
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          // Handle potential newline escaping issues (common Vercel gotcha)
          const cleanedJson = process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n');
          const serviceAccount = JSON.parse(cleanedJson);
          
          if (!serviceAccount) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT parsed to null/undefined');
          }

          console.log('--- DEBUG FIREBASE INIT ---');
          console.log('Env Var Project ID:', process.env.FIREBASE_PROJECT_ID);
          console.log('Service Account Project ID:', serviceAccount?.project_id);
          console.log('Target Project ID:', targetProjectId || '(derived from service account)');
          console.log('---------------------------');

          if (!targetProjectId && serviceAccount?.project_id) {
            targetProjectId = String(serviceAccount.project_id);
          }

          // If FIREBASE_PROJECT_ID is explicitly set, ensure it wins.
          if (targetProjectId && serviceAccount?.project_id && serviceAccount.project_id !== targetProjectId) {
            console.log(`[FIREBASE] Overriding service account project_id to match FIREBASE_PROJECT_ID: ${targetProjectId}`);
            serviceAccount.project_id = targetProjectId;
          }
          
          app = firebaseAdmin.initializeApp(
            {
              credential: firebaseAdmin.credential.cert(serviceAccount),
              ...(targetProjectId ? { projectId: targetProjectId } : {}),
            },
            appName
          );
          console.log('[FIREBASE] Admin initialized successfully via FIREBASE_SERVICE_ACCOUNT');
        } catch (e: any) {
          console.error('[FIREBASE] Init Failed (FIREBASE_SERVICE_ACCOUNT):', e?.message || e);
          console.error('[FIREBASE] Stack:', e?.stack);
          if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.error('[FIREBASE] ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is missing');
          }
          initError = e;
          // Fallback to standard init attempt if JSON parse fails
          try {
              app = firebaseAdmin.initializeApp({
              credential: firebaseAdmin.credential.applicationDefault(),
              ...(targetProjectId ? { projectId: targetProjectId } : {}),
              }, appName);
              console.log('[FIREBASE] Admin initialized successfully (fallback)');
              initError = null;
          } catch (fallbackErr: any) {
               console.error('[FIREBASE] Init Failed (fallback):', fallbackErr?.message || fallbackErr);
               console.error('[FIREBASE] Stack:', fallbackErr?.stack);
               initError = fallbackErr;
          }
        }
      } 
      // 2. Try individual environment variables
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
          app = firebaseAdmin.initializeApp({
              credential: firebaseAdmin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              }),
              projectId: process.env.FIREBASE_PROJECT_ID,
          }, appName);
          console.log('[FIREBASE] Admin initialized successfully via individual env vars');
        } catch (e: any) {
            console.error('[FIREBASE] Init Failed (individual vars):', e?.message || e);
            console.error('[FIREBASE] Stack:', e?.stack);
            initError = e;
        }
      }
      // 3. Fallback to application default credentials
      else {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_PROJECT_ID) {
          console.error('[FIREBASE] ERROR: Missing required environment variables');
          console.error('[FIREBASE] - FIREBASE_SERVICE_ACCOUNT (JSON string) OR');
          console.error('[FIREBASE] - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        }
        try {
          app = firebaseAdmin.initializeApp(
            {
              credential: firebaseAdmin.credential.applicationDefault(),
              ...(targetProjectId ? { projectId: targetProjectId } : {}),
            },
            appName
          );
          console.log('[FIREBASE] Admin initialized successfully (application default)');
        } catch (e: any) {
          console.error('[FIREBASE] Init Failed (application default):', e?.message || e);
          console.error('[FIREBASE] Stack:', e?.stack);
          console.warn('[FIREBASE] Auth features will be disabled. Check environment variables:');
          console.warn('[FIREBASE] - FIREBASE_SERVICE_ACCOUNT (JSON string)');
          console.warn('[FIREBASE] - OR FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
          initError = e;
        }
      }
    } else {
        // Already initialized
        console.log('[FIREBASE] Already initialized');
    }

    // Only try to get auth if an app was initialized
    if (app) {
      authInstance = firebaseAdmin.auth(app);
      console.log('[FIREBASE] Auth instance created');
    } else {
      console.warn('[FIREBASE] No Firebase app initialized - auth will fail');
    }

    isInitialized = true;
    return authInstance;
  } catch (error: any) {
    console.error('[FIREBASE] Critical Init Error:', error?.message || error);
    console.error('[FIREBASE] Stack:', error?.stack);
    initError = error;
    isInitialized = true;
    // Do not throw, allow server to start without Firebase (auth will fail gracefully)
    return null;
  }
}

/**
 * Get Firebase Auth instance (lazy initialization)
 * Call this function instead of accessing auth directly
 */
export function getAuth(): admin.auth.Auth | null {
  return initializeFirebase();
}

/**
 * Legacy export for backward compatibility
 * Now uses lazy initialization
 */
export const auth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    const authInstance = initializeFirebase();
    if (!authInstance) {
      throw new Error('Firebase Admin not initialized. Check environment variables.');
    }
    return (authInstance as any)[prop];
  }
});

export const getFirebaseInitError = () => initError;
