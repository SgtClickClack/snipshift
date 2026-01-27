/**
 * Demo Cleanup Script
 * 
 * Deletes the demo user record from the 'users' table to allow
 * for a fresh, end-to-end signup during the demo.
 * 
 * Usage:
 *   npx tsx scripts/demo-cleanup.ts [--email=EMAIL]
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

// Demo user email
const DEFAULT_DEMO_EMAIL = 'julian.g.roberts@gmail.com';

// Parse command line arguments
const args = process.argv.slice(2);
let demoEmail = DEFAULT_DEMO_EMAIL;
for (const arg of args) {
  if (arg.startsWith('--email=')) {
    demoEmail = arg.split('=')[1];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: npx tsx scripts/demo-cleanup.ts [--email=EMAIL]

Options:
  --email=EMAIL    Email address of the demo user to delete (default: ${DEFAULT_DEMO_EMAIL})
  --help, -h       Show this help message

Environment:
  DATABASE_URL     PostgreSQL connection string (required)

Purpose:
  This script deletes the specified user record from the 'users' table
  to allow for a fresh, end-to-end signup during the demo.
    `);
    process.exit(0);
  }
}

async function cleanupDemoUser() {
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

    console.log(`\n🔍 Looking for user with email: ${demoEmail}`);
    
    // First, find the user ID
    const userResult = await client.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [demoEmail]
    );

    if (userResult.rows.length === 0) {
      console.log(`⚠️  No user found with email: ${demoEmail}`);
      console.log(`   Nothing to clean up.`);
      return;
    }

    const userId = userResult.rows[0].id;
    const userName = userResult.rows[0].name || demoEmail;
    const userRole = userResult.rows[0].role;

    console.log(`✅ Found user: ${userName} (ID: ${userId}, Role: ${userRole})`);

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

    console.log(`\n✅ Demo cleanup complete!`);
    console.log(`   - Deleted 1 user record`);
    console.log(`\n💡 Note: You may also want to delete the Firebase auth user separately if needed.`);
    console.log(`   The user can now perform a fresh signup during the demo.`);

  } catch (error: any) {
    console.error(`\n❌ ERROR: Failed to cleanup demo user`);
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

// Run the cleanup
cleanupDemoUser().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
