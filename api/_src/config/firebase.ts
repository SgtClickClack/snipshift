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
    // SECURITY: Strict project ID enforcement - only allow 'snipshift-75b04'
    const REQUIRED_PROJECT_ID = 'snipshift-75b04';
    let targetProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || undefined;
    
    // Enforce project ID validation
    if (targetProjectId && targetProjectId !== REQUIRED_PROJECT_ID) {
      throw new Error(`Unauthorized Project ID: Expected '${REQUIRED_PROJECT_ID}', got '${targetProjectId}'`);
    }
    
    let app: admin.app.App | undefined;

    try {
      app = firebaseAdmin.app(appName);
      console.log(`[FIREBASE] Reuse existing app: ${appName}`);
    } catch (e) {
      console.log(`[FIREBASE] Initializing new app: ${appName}`);
    }

    if (!app) {
      // 1. PRIORITY: Try individual environment variables first (more reliable than JSON string)
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
          const projectId = process.env.FIREBASE_PROJECT_ID.trim();
          
          // SECURITY: Explicitly enforce project ID matches 'snipshift-75b04'
          if (projectId !== REQUIRED_PROJECT_ID) {
            throw new Error(`Unauthorized Project ID: Expected '${REQUIRED_PROJECT_ID}', got '${projectId}'`);
          }
          
          // Ensure client email matches the required project
          const clientEmail = process.env.FIREBASE_CLIENT_EMAIL.trim();
          if (!clientEmail.includes(REQUIRED_PROJECT_ID)) {
            console.warn(`[FIREBASE] Client email '${clientEmail.substring(0, 30)}...' may not match project '${REQUIRED_PROJECT_ID}'`);
          }
          
          app = firebaseAdmin.initializeApp({
              credential: firebaseAdmin.credential.cert({
              projectId: REQUIRED_PROJECT_ID, // Explicitly use required project ID
              clientEmail: clientEmail,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
              }),
              projectId: REQUIRED_PROJECT_ID, // Explicitly enforce project ID
          }, appName);
          console.log('[FIREBASE] Admin initialized successfully via individual env vars', {
            projectId: REQUIRED_PROJECT_ID,
            clientEmail: clientEmail.substring(0, 20) + '...',
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length,
            enforcedProjectId: REQUIRED_PROJECT_ID,
          });
          console.log('[AUTH DEBUG] Backend Project ID:', REQUIRED_PROJECT_ID);
        } catch (e: any) {
            console.error('[FIREBASE] Init Failed (individual vars):', e?.message || e);
            console.error('[FIREBASE] Stack:', e?.stack);
            console.error('[AUTH DEBUG] Backend Project ID (failed):', process.env.FIREBASE_PROJECT_ID);
            initError = e;
        }
      } 
      // 2. FALLBACK: Try parsing FIREBASE_SERVICE_ACCOUNT JSON string
      else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
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

          // SECURITY: Validate project ID from service account
          if (serviceAccount?.project_id && serviceAccount.project_id !== REQUIRED_PROJECT_ID) {
            throw new Error(`Unauthorized Project ID: Service account project_id '${serviceAccount.project_id}' does not match required '${REQUIRED_PROJECT_ID}'`);
          }

          // If FIREBASE_PROJECT_ID is explicitly set, ensure it wins.
          if (targetProjectId && serviceAccount?.project_id && serviceAccount.project_id !== targetProjectId) {
            console.log(`[FIREBASE] Overriding service account project_id to match FIREBASE_PROJECT_ID: ${targetProjectId}`);
            serviceAccount.project_id = targetProjectId;
          }
          
          // SECURITY: Final validation before initialization
          const finalProjectId = targetProjectId || serviceAccount?.project_id;
          if (finalProjectId && finalProjectId !== REQUIRED_PROJECT_ID) {
            throw new Error(`Unauthorized Project ID: Final project_id '${finalProjectId}' does not match required '${REQUIRED_PROJECT_ID}'`);
          }
          
          // SECURITY: Explicitly enforce project ID to match 'snipshift-75b04'
          const enforcedProjectId = REQUIRED_PROJECT_ID;
          app = firebaseAdmin.initializeApp(
            {
              credential: firebaseAdmin.credential.cert(serviceAccount),
              projectId: enforcedProjectId, // Explicitly enforce required project ID
            },
            appName
          );
          console.log('[FIREBASE] Admin initialized successfully via FIREBASE_SERVICE_ACCOUNT', {
            projectId: enforcedProjectId,
            serviceAccountProjectId: serviceAccount?.project_id,
            envProjectId: process.env.FIREBASE_PROJECT_ID,
            enforcedProjectId: enforcedProjectId,
          });
          console.log('[AUTH DEBUG] Backend Project ID:', enforcedProjectId);
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
      // 3. Fallback to application default credentials
      else {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_PROJECT_ID) {
          console.error('[FIREBASE] ERROR: Missing required environment variables');
          console.error('[FIREBASE] - FIREBASE_SERVICE_ACCOUNT (JSON string) OR');
          console.error('[FIREBASE] - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        }
        try {
          // SECURITY: Explicitly enforce project ID even for application default credentials
          const enforcedProjectId = targetProjectId && targetProjectId === REQUIRED_PROJECT_ID 
            ? REQUIRED_PROJECT_ID 
            : REQUIRED_PROJECT_ID;
          
          app = firebaseAdmin.initializeApp(
            {
              credential: firebaseAdmin.credential.applicationDefault(),
              projectId: enforcedProjectId, // Explicitly enforce required project ID
            },
            appName
          );
          console.log('[FIREBASE] Admin initialized successfully (application default)', {
            enforcedProjectId: enforcedProjectId,
          });
          console.log('[AUTH DEBUG] Backend Project ID:', enforcedProjectId);
        } catch (e: any) {
          console.error('[FIREBASE] Init Failed (application default):', e?.message || e);
          console.error('[FIREBASE] Stack:', e?.stack);
          console.error('[AUTH DEBUG] Backend Project ID (failed):', process.env.FIREBASE_PROJECT_ID);
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
      // SECURITY: Final validation - verify the initialized app's project ID
      const initializedProjectId = app.options.projectId;
      if (initializedProjectId && initializedProjectId !== REQUIRED_PROJECT_ID) {
        throw new Error(`Unauthorized Project ID: Initialized app project_id '${initializedProjectId}' does not match required '${REQUIRED_PROJECT_ID}'`);
      }
      
      authInstance = firebaseAdmin.auth(app);
      const finalProjectId = app.options.projectId || REQUIRED_PROJECT_ID;
      console.log('[FIREBASE] Auth instance created with validated project ID:', finalProjectId, {
        requiredProjectId: REQUIRED_PROJECT_ID,
        matches: finalProjectId === REQUIRED_PROJECT_ID,
      });
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
