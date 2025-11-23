import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();
// Also try loading from parent dir (for local dev when running from api dir)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

let authInstance: admin.auth.Auth | null = null;

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
        console.log('Firebase Admin Initialized successfully');
      } catch (e: any) {
        console.error('Firebase Admin Init Failed:', e);
        // Fallback to standard init attempt if JSON parse fails
        try {
            firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.applicationDefault(),
            });
            console.log('Firebase Admin Initialized successfully (fallback)');
        } catch (fallbackErr: any) {
             console.error('Firebase Admin Init Failed (fallback):', fallbackErr);
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
        console.log('Firebase Admin Initialized successfully');
      } catch (e: any) {
          console.error('Firebase Admin Init Failed:', e);
      }
    }
    // 3. Fallback to application default credentials
    else {
      try {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.applicationDefault(),
        });
        console.log('Firebase Admin Initialized successfully');
      } catch (e: any) {
        console.error('Firebase Admin Init Failed:', e);
        console.warn('Auth features will be disabled.');
      }
    }
  } else {
      // Already initialized
      console.log('ℹ️ Firebase already initialized');
  }

  // Only try to get auth if an app was initialized
  if (firebaseAdmin.apps.length > 0) {
    authInstance = firebaseAdmin.auth();
  }
} catch (error: any) {
  console.error('Firebase Admin Init Failed:', error);
  // Do not throw, allow server to start without Firebase (auth will fail gracefully)
}

export const auth = authInstance;
