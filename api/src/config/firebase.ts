import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

let authInstance: admin.auth.Auth | null = null;

try {
  if (!admin.apps.length) {
    // 1. Try parsing FIREBASE_SERVICE_ACCOUNT JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase initialized with FIREBASE_SERVICE_ACCOUNT');
      } catch (e) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
        // Fallback to standard init attempt if JSON parse fails
        try {
            admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            });
            console.log('✅ Firebase initialized with applicationDefault (fallback)');
        } catch (fallbackErr) {
             console.error('❌ Firebase applicationDefault fallback failed:', fallbackErr);
        }
      }
    } 
    // 2. Try individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        admin.initializeApp({
            credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        console.log('✅ Firebase initialized with individual env vars');
      } catch (e) {
          console.error('❌ Firebase individual env vars initialization failed:', e);
      }
    }
    // 3. Fallback to application default credentials
    else {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        console.log('✅ Firebase initialized with applicationDefault');
      } catch (e) {
        console.warn('⚠️ Firebase applicationDefault initialization failed. Auth features will be disabled.');
        console.warn('Detailed error:', e);
      }
    }
  } else {
      // Already initialized
      console.log('ℹ️ Firebase already initialized');
  }

  // Only try to get auth if an app was initialized
  if (admin.apps.length > 0) {
    authInstance = admin.auth();
  }
} catch (error) {
  console.error('❌ Firebase initialization critical error:', error);
  // Do not throw, allow server to start without Firebase (auth will fail gracefully)
}

export const auth = authInstance;
