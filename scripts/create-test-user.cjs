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
const { Client } = require('pg');

const fs = require('fs');

// Load environment variables - check multiple locations
const rootEnvPath = path.resolve(__dirname, '../.env');
const apiEnvPath = path.resolve(__dirname, '../api/.env');
const cwdEnvPath = path.resolve(process.cwd(), '.env');

console.log('Loading .env files...');

// Try root .env first
if (fs.existsSync(rootEnvPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(rootEnvPath));
    console.log('Keys found in root .env:', Object.keys(envConfig));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.log('Root .env file not found at', rootEnvPath);
}

// Try api/.env if DATABASE_URL still not found
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    if (fs.existsSync(apiEnvPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(apiEnvPath));
        console.log('Keys found in api/.env:', Object.keys(envConfig));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    } else {
        console.log('api/.env file not found at', apiEnvPath);
    }
}

// Also try loading from CWD if not found
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.log('Trying to load .env from CWD:', cwdEnvPath);
    dotenv.config({ path: cwdEnvPath });
}

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

const TEST_EMAIL = 'test@hospogo.com';
const TEST_PASSWORD = 'password123';

async function createTestUser() {
  let client;
  try {
    // 1. Firebase User Creation
    let user;
    try {
      user = await admin.auth().getUserByEmail(TEST_EMAIL);
      console.log(`ℹ️  Firebase User ${TEST_EMAIL} already exists`);
      
      // Update password if needed
      await admin.auth().updateUser(user.uid, {
        password: TEST_PASSWORD,
        emailVerified: true,
      });
      console.log(`✅ Updated Firebase password for ${TEST_EMAIL}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        try {
            user = await admin.auth().createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            emailVerified: true,
            disabled: false,
            });
            console.log(`✅ Created Firebase user: ${TEST_EMAIL}`);
        } catch(createError) {
             console.error('⚠️ Could not create Firebase user:', createError.message);
             console.log('Continuing to Postgres check...');
        }
      } else {
        console.error('⚠️ Error accessing Firebase Auth:', error.message);
        console.log('Continuing to Postgres check (assuming Firebase user might exist or will be handled manually)...');
      }
    }

    // 2. Postgres User Creation
    console.log('Connecting to database...');
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL and POSTGRES_URL are missing from environment variables.');
    }
    console.log('Database URL found (length: ' + dbUrl.length + ')');
    
    client = new Client({
      connectionString: dbUrl,
      // connectionString usually handles everything, but sometimes ssl is needed
      ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    await client.connect();

    // Check if user exists in DB
    const res = await client.query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL]);
    
    if (res.rows.length > 0) {
      console.log(`ℹ️  Database User ${TEST_EMAIL} already exists (ID: ${res.rows[0].id})`);
      // Ensure isOnboarded is true
      await client.query('UPDATE users SET is_onboarded = true WHERE email = $1', [TEST_EMAIL]);
      console.log('✅ Ensure is_onboarded = true');
    } else {
      // Insert user
      // Note: We are generating a new UUID for the user in Postgres. 
      // If the app links via email, this is fine. 
      // If it links via Firebase UID -> Postgres ID, we'd need to match them, 
      // but Postgres schema says ID is UUID, and Firebase UID is string (usually 28 chars).
      // Based on schema, it seems email is the link or they are independent.
      // We will proceed with standard insert.
      
      const insertRes = await client.query(`
        INSERT INTO users (
          email, 
          name, 
          role, 
          is_onboarded, 
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `, [TEST_EMAIL, 'Test User', 'professional', true]);
      
      console.log(`✅ Created Database user: ${TEST_EMAIL} (ID: ${insertRes.rows[0].id})`);
    }
    
    console.log(`\n📋 Test User Credentials:`);
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log(`   Firebase UID: ${user.uid}`);
    console.log(`\n✅ Test user is ready for E2E tests!`);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    if (error.code === 'ECONNREFUSED') {
        console.error('Check your DATABASE_URL and ensure the database is running.');
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

createTestUser();

