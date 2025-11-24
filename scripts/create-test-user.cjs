/**
 * Script to create a test user in Firebase
 * 
 * Usage: node scripts/create-test-user.js
 * 
 * Requires Firebase Admin SDK to be configured with proper credentials
 */

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to initialize with service account
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
    } else {
      // Fallback to application default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    console.log('\n💡 To use this script, you need to:');
    console.log('   1. Set up Firebase Admin SDK credentials');
    console.log('   2. Or use Firebase Console to manually create the user');
    console.log('   3. See scripts/seed-test-user.md for manual instructions');
    process.exit(1);
  }
}

const TEST_EMAIL = 'test@snipshift.com';
const TEST_PASSWORD = 'password123';

async function createTestUser() {
  try {
    // Check if user already exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(TEST_EMAIL);
      console.log(`ℹ️  User ${TEST_EMAIL} already exists`);
      
      // Update password if needed
      await admin.auth().updateUser(user.uid, {
        password: TEST_PASSWORD,
        emailVerified: true,
      });
      console.log(`✅ Updated password for ${TEST_EMAIL}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        user = await admin.auth().createUser({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          emailVerified: true,
          disabled: false,
        });
        console.log(`✅ Created test user: ${TEST_EMAIL}`);
      } else {
        throw error;
      }
    }
    
    console.log(`\n📋 Test User Credentials:`);
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`\n✅ Test user is ready for E2E tests!`);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.log('\n💡 Alternative: Create the user manually in Firebase Console:');
    console.log('   1. Go to https://console.firebase.google.com');
    console.log('   2. Navigate to Authentication > Users');
    console.log('   3. Add User with email: test@snipshift.com, password: password123');
    process.exit(1);
  }
}

createTestUser();

