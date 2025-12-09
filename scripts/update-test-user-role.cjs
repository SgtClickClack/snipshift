/**
 * Script to update test user role to 'professional'
 * 
 * Usage: node scripts/update-test-user-role.cjs
 * 
 * This script updates the test user's role in the database to 'professional'
 * to allow navigation to /professional-dashboard for E2E tests.
 */

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

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@snipshift.com';
const TARGET_ROLE = 'professional';

async function updateTestUserRole() {
  let client;
  try {
    console.log(`\n🔧 Updating test user role to '${TARGET_ROLE}'...`);
    console.log(`   Email: ${TEST_EMAIL}`);
    
    // Connect to database
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
    console.log('✅ Connected to database');

    // Check if user exists and get current role
    const checkRes = await client.query(
      'SELECT id, email, role, roles FROM users WHERE email = $1', 
      [TEST_EMAIL]
    );
    
    if (checkRes.rows.length === 0) {
      console.log(`⚠️  User ${TEST_EMAIL} not found in database.`);
      console.log('   Run scripts/create-test-user.cjs first to create the user.');
      process.exit(1);
    }

    const user = checkRes.rows[0];
    console.log(`\n📋 Current user info:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   Roles Array: ${JSON.stringify(user.roles)}`);

    // Check if role already matches
    if (user.role === TARGET_ROLE) {
      console.log(`\n✅ User already has role '${TARGET_ROLE}'. No update needed.`);
      
      // Still ensure roles array includes professional
      if (!user.roles || !user.roles.includes(TARGET_ROLE)) {
        const updatedRoles = user.roles ? [...user.roles, TARGET_ROLE] : [TARGET_ROLE];
        await client.query(
          'UPDATE users SET roles = $1, updated_at = NOW() WHERE email = $2',
          [updatedRoles, TEST_EMAIL]
        );
        console.log(`✅ Updated roles array to include '${TARGET_ROLE}'`);
      }
      
      await client.end();
      return;
    }

    // Update role and ensure roles array includes professional
    console.log(`\n🔄 Updating role from '${user.role}' to '${TARGET_ROLE}'...`);
    
    const updatedRoles = user.roles || [];
    if (!updatedRoles.includes(TARGET_ROLE)) {
      updatedRoles.push(TARGET_ROLE);
    }

    const updateRes = await client.query(
      `UPDATE users 
       SET role = $1, 
           roles = $2, 
           updated_at = NOW() 
       WHERE email = $3
       RETURNING id, email, role, roles`,
      [TARGET_ROLE, updatedRoles, TEST_EMAIL]
    );

    if (updateRes.rows.length === 0) {
      throw new Error('Failed to update user role');
    }

    const updatedUser = updateRes.rows[0];
    console.log(`\n✅ Successfully updated user role!`);
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   New Role: ${updatedUser.role}`);
    console.log(`   Roles Array: ${JSON.stringify(updatedUser.roles)}`);
    console.log(`\n✅ Test user is now ready for professional dashboard E2E tests!`);
    
  } catch (error) {
    console.error('❌ Error updating test user role:', error.message);
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

updateTestUserRole();

