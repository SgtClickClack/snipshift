/**
 * Force Venue Role Script
 * 
 * Hard-updates Julian's database record to force correct role and onboarding status.
 * This script directly updates the database to bypass any validation or business logic.
 * 
 * Updates:
 * - role = 'business'
 * - roles = ['venue', 'business', 'hub'] (includes all business-related roles for safety)
 * - isOnboarded = true
 * 
 * Usage:
 *   npx tsx scripts/force-venue-role.ts
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

// Julian's email
const TARGET_EMAIL = 'julian.g.roberts@gmail.com';

async function forceVenueRole() {
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

    console.log(`\n🔍 Looking for user with email: ${TARGET_EMAIL}`);
    
    // First, find the user
    const userResult = await client.query(
      'SELECT id, email, name, role, roles, is_onboarded FROM users WHERE email = $1',
      [TARGET_EMAIL]
    );

    if (userResult.rows.length === 0) {
      console.log(`⚠️  No user found with email: ${TARGET_EMAIL}`);
      console.log(`   Cannot update non-existent user.`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    const userId = user.id;
    const userName = user.name || TARGET_EMAIL;
    const currentRole = user.role;
    const currentRoles = user.roles || [];
    const currentIsOnboarded = user.is_onboarded;

    console.log(`✅ Found user: ${userName} (ID: ${userId})`);
    console.log(`   Current role: ${currentRole}`);
    console.log(`   Current roles: ${JSON.stringify(currentRoles)}`);
    console.log(`   Current isOnboarded: ${currentIsOnboarded}`);

    // Hard-update the record
    // CRITICAL: Set role to 'business' but include 'venue' and 'hub' in roles array for safety
    console.log(`\n🔧 Force updating user record...`);
    const updateResult = await client.query(
      `UPDATE users 
       SET 
         role = $1,
         roles = $2,
         is_onboarded = $3,
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, name, role, roles, is_onboarded`,
      ['business', ['venue', 'business', 'hub'], true, userId]
    );

    if (updateResult.rows.length === 0) {
      console.error(`❌ ERROR: Update returned no rows (user may have been deleted)`);
      process.exit(1);
    }

    const updatedUser = updateResult.rows[0];
    console.log(`\n✅ Force update complete!`);
    console.log(`   Updated user: ${updatedUser.name} (${updatedUser.email})`);
    console.log(`   New role: ${updatedUser.role}`);
    console.log(`   New roles: ${JSON.stringify(updatedUser.roles)}`);
    console.log(`   New isOnboarded: ${updatedUser.is_onboarded}`);
    console.log(`\n💡 The database record has been physically updated.`);
    console.log(`   Julian should now be able to access the venue dashboard.`);

  } catch (error: any) {
    console.error(`\n❌ ERROR: Failed to force update user`);
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

// Run the force update
forceVenueRole().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
