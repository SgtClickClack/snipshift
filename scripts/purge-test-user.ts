/**
 * Purge Test User Script
 * 
 * Deletes all records for Julian's test user from the database:
 * - Deletes from 'venues' table where userId matches the user
 * - Deletes from 'users' table where email matches Julian's test email
 * 
 * Note: "professionals" are just users with role='professional', so deleting
 * the user record will handle that automatically.
 * 
 * Usage:
 *   npx tsx scripts/purge-test-user.ts [--email=EMAIL]
 * 
 * Environment:
 *   DATABASE_URL should point to the target database
 */

import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Priority: .env.test > api/.env > .env
const testEnvPath = path.resolve(__dirname, '../.env.test');
const apiEnvPath = path.resolve(__dirname, '../api/.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

// Load .env.test first (highest priority for test scripts)
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath });
}
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// Julian's test email (from seed-data.ts)
const DEFAULT_TEST_EMAIL = 'julian@barbers.com';

// Parse command line arguments
const args = process.argv.slice(2);
let testEmail = DEFAULT_TEST_EMAIL;
for (const arg of args) {
  if (arg.startsWith('--email=')) {
    testEmail = arg.split('=')[1];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: npx tsx scripts/purge-test-user.ts [--email=EMAIL]

Options:
  --email=EMAIL    Email address of the test user to purge (default: ${DEFAULT_TEST_EMAIL})
  --help, -h       Show this help message

Environment:
  DATABASE_URL     PostgreSQL connection string (required)
    `);
    process.exit(0);
  }
}

async function purgeTestUser() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL or POSTGRES_URL environment variable is required');
    console.error('   Please set DATABASE_URL in your .env file or environment');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log(`🔌 Connecting to database...`);
    await client.connect();
    console.log(`✅ Connected to database`);

    console.log(`\n🔍 Looking for user with email: ${testEmail}`);
    
    // First, find the user ID
    const userResult = await client.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [testEmail]
    );

    if (userResult.rows.length === 0) {
      console.log(`⚠️  No user found with email: ${testEmail}`);
      console.log(`   Nothing to purge.`);
      return;
    }

    const userId = userResult.rows[0].id;
    const userName = userResult.rows[0].name || testEmail;
    const userRole = userResult.rows[0].role;

    console.log(`✅ Found user: ${userName} (ID: ${userId}, Role: ${userRole})`);

    // Delete venues associated with this user
    console.log(`\n🗑️  Deleting venues for user ${userId}...`);
    const venuesResult = await client.query(
      'DELETE FROM venues WHERE user_id = $1 RETURNING id, venue_name',
      [userId]
    );
    const deletedVenuesCount = venuesResult.rows.length;
    if (deletedVenuesCount > 0) {
      console.log(`   ✅ Deleted ${deletedVenuesCount} venue(s):`);
      venuesResult.rows.forEach((venue) => {
        console.log(`      - ${venue.venue_name} (${venue.id})`);
      });
    } else {
      console.log(`   ℹ️  No venues found for this user`);
    }

    // Delete the user record (this will cascade delete related records via foreign keys)
    console.log(`\n🗑️  Deleting user record...`);
    const deleteUserResult = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, name',
      [userId]
    );
    
    if (deleteUserResult.rows.length > 0) {
      console.log(`   ✅ Deleted user: ${deleteUserResult.rows[0].name} (${deleteUserResult.rows[0].email})`);
    } else {
      console.log(`   ⚠️  User deletion returned no rows (may have been deleted already)`);
    }

    console.log(`\n✅ Purge complete!`);
    console.log(`   - Deleted ${deletedVenuesCount} venue(s)`);
    console.log(`   - Deleted 1 user record`);
    console.log(`\n💡 Note: You may also want to delete the Firebase auth user separately if needed.`);

  } catch (error: any) {
    console.error(`\n❌ ERROR: Failed to purge test user`);
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error(`\nStack trace:`);
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log(`\n🔌 Database connection closed`);
  }
}

// Run the purge
purgeTestUser().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
