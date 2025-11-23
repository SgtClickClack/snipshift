import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();
// Also try loading from parent dir (for local dev when running from api dir)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

let authInstance: admin.auth.Auth | null = null;
let initError: Error | null = null;

try {
  // Handle default export interop issue
  const firebaseAdmin = (admin as any).default || admin;
  
  if (!firebaseAdmin.apps.length) {
    // 1. Try parsing FIREBASE_SERVICE_ACCOUNT JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        // Handle potential newline escaping issues (common Vercel gotcha)
        const cleanedJson = process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n');
        const serviceAccount = JSON.parse(cleanedJson);
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });
        console.log('[FIREBASE] Admin initialized successfully via FIREBASE_SERVICE_ACCOUNT');
      } catch (e: any) {
        console.error('[FIREBASE] Init Failed (FIREBASE_SERVICE_ACCOUNT):', e?.message || e);
        console.error('[FIREBASE] Stack:', e?.stack);
        initError = e;
        // Fallback to standard init attempt if JSON parse fails
        try {
            firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.applicationDefault(),
            });
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
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        console.log('[FIREBASE] Admin initialized successfully via individual env vars');
      } catch (e: any) {
          console.error('[FIREBASE] Init Failed (individual vars):', e?.message || e);
          console.error('[FIREBASE] Stack:', e?.stack);
          initError = e;
      }
    }
    // 3. Fallback to application default credentials
    else {
      try {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.applicationDefault(),
        });
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
  if (firebaseAdmin.apps.length > 0) {
    authInstance = firebaseAdmin.auth();
    console.log('[FIREBASE] Auth instance created');
  } else {
    console.warn('[FIREBASE] No Firebase app initialized - auth will fail');
  }
} catch (error: any) {
  console.error('[FIREBASE] Critical Init Error:', error?.message || error);
  console.error('[FIREBASE] Stack:', error?.stack);
  initError = error;
  // Do not throw, allow server to start without Firebase (auth will fail gracefully)
}

export const auth = authInstance;
export const getFirebaseInitError = () => initError;
