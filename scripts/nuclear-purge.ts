/**
 * Nuclear Purge Script
 * 
 * ⚠️  DANGER: This script completely wipes the HospoGo database!
 * 
 * This script is schema-aware and dynamically discovers table names from the database.
 * It TRUNCATEs the following table types with CASCADE:
 * - users (or user, accounts, account)
 * - venues (or venue, hospitality_venues, business_profiles, businesses, business)
 * - shifts (or shift, jobs, job)
 * - applications (or application, shift_applications, job_applications)
 * - professionals (or professional, worker_profiles, workers, worker, staff_profiles, staff)
 * 
 * The script queries information_schema.tables to find the actual table names,
 * so it works even if table names differ from expected values.
 * 
 * Usage:
 *   npx tsx scripts/nuclear-purge.ts --confirm
 * 
 * Environment:
 *   DATABASE_URL should point to the target database
 * 
 * Safety:
 *   This script requires --confirm flag to prevent accidental execution
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

// Parse command line arguments
const args = process.argv.slice(2);
let confirmed = false;
for (const arg of args) {
  if (arg === '--confirm') {
    confirmed = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: npx tsx scripts/nuclear-purge.ts [--confirm]

⚠️  WARNING: This script will DELETE ALL DATA from the database!

Options:
  --confirm    Required flag to confirm you want to purge the database
  --help, -h   Show this help message

Environment:
  DATABASE_URL PostgreSQL connection string (required)

Example:
  npx tsx scripts/nuclear-purge.ts --confirm
    `);
    process.exit(0);
  }
}

/**
 * Validate table name contains only safe characters (alphanumeric and underscore)
 * This prevents SQL injection when using table names in queries
 */
function isValidTableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Discover table names from the database schema
 * Looks for tables matching common patterns for users, venues, shifts, applications, and professionals
 */
async function discoverTables(client: Client): Promise<{
  users: string | null;
  venues: string | null;
  shifts: string | null;
  applications: string | null;
  professionals: string | null;
  allTables: string[];
}> {
  // Query information_schema to find all user tables (excluding system tables)
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  // Filter to only valid table names (safety check)
  const allTables = result.rows
    .map((row: any) => row.table_name)
    .filter((name: string) => isValidTableName(name));
  
  // Define search patterns for each table type
  const patterns = {
    users: ['users', 'user', 'accounts', 'account'],
    venues: ['venues', 'venue', 'hospitality_venues', 'business_profiles', 'businesses', 'business'],
    shifts: ['shifts', 'shift', 'jobs', 'job'],
    applications: ['applications', 'application', 'shift_applications', 'job_applications'],
    professionals: ['professionals', 'professional', 'worker_profiles', 'workers', 'worker', 'staff_profiles', 'staff'],
  };

  // Find matching tables for each category
  const findTable = (patterns: string[]): string | null => {
    for (const pattern of patterns) {
      const found = allTables.find((table: string) => 
        table.toLowerCase() === pattern.toLowerCase()
      );
      if (found) return found;
    }
    return null;
  };

  return {
    users: findTable(patterns.users),
    venues: findTable(patterns.venues),
    shifts: findTable(patterns.shifts),
    applications: findTable(patterns.applications),
    professionals: findTable(patterns.professionals),
    allTables,
  };
}

async function nuclearPurge() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL or POSTGRES_URL environment variable is required');
    console.error('   Please set DATABASE_URL in your .env file or environment');
    process.exit(1);
  }

  // Safety check: require --confirm flag
  if (!confirmed) {
    console.error('\n⚠️  SAFETY CHECK FAILED: This script requires --confirm flag');
    console.error('   This prevents accidental database deletion.');
    console.error('\n   To proceed, run: npx tsx scripts/nuclear-purge.ts --confirm\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log(`🔌 Connecting to database...`);
    await client.connect();
    console.log(`✅ Connected to database`);

    // Discover actual table names from schema
    console.log(`\n🔍 Discovering database schema...`);
    const tables = await discoverTables(client);
    
    console.log(`   Found ${tables.allTables.length} tables in database`);
    console.log(`\n📋 Discovered tables:`);
    console.log(`   Users: ${tables.users || '❌ NOT FOUND'}`);
    console.log(`   Venues: ${tables.venues || '❌ NOT FOUND'}`);
    console.log(`   Shifts: ${tables.shifts || '❌ NOT FOUND'}`);
    console.log(`   Applications: ${tables.applications || '❌ NOT FOUND'}`);
    const professionalsMsg = tables.professionals || '❌ NOT FOUND (professionals are users with role="professional")';
    console.log(`   Professionals: ${professionalsMsg}`);

    // Validate that critical tables exist
    if (!tables.users) {
      console.error('\n❌ ERROR: Could not find users table in database!');
      console.error('   This script requires at least a users table to function.');
      console.error(`   Available tables: ${tables.allTables.join(', ')}`);
      process.exit(1);
    }

    // Display warning with discovered table names
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  NUCLEAR PURGE WARNING ⚠️');
    console.log('='.repeat(70));
    console.log('\n🚨 This script will PERMANENTLY DELETE ALL DATA from:');
    if (tables.users) console.log(`   - ${tables.users}`);
    if (tables.venues) console.log(`   - ${tables.venues}`);
    if (tables.shifts) console.log(`   - ${tables.shifts}`);
    if (tables.applications) console.log(`   - ${tables.applications}`);
    if (tables.professionals) console.log(`   - ${tables.professionals}`);
    console.log('   - All related data via CASCADE');
    console.log('\n💥 This action CANNOT be undone!');
    console.log('='.repeat(70) + '\n');

    // Give user 3 seconds to cancel (Ctrl+C)
    console.log('⏳ Starting purge in 3 seconds... (Press Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start transaction for atomic operation
    await client.query('BEGIN');

    // Get counts before purge for reporting
    console.log(`\n📊 Getting record counts before purge...`);
    const counts: { table: string; count: number }[] = [];
    
    if (tables.users) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tables.users}`);
        counts.push({ table: tables.users, count: parseInt(result.rows[0].count) });
        console.log(`   ${tables.users}: ${result.rows[0].count}`);
      } catch (e: any) {
        console.log(`   ${tables.users}: Error - ${e.message}`);
      }
    }
    
    if (tables.venues) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tables.venues}`);
        counts.push({ table: tables.venues, count: parseInt(result.rows[0].count) });
        console.log(`   ${tables.venues}: ${result.rows[0].count}`);
      } catch (e: any) {
        console.log(`   ${tables.venues}: Error - ${e.message}`);
      }
    }
    
    if (tables.shifts) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tables.shifts}`);
        counts.push({ table: tables.shifts, count: parseInt(result.rows[0].count) });
        console.log(`   ${tables.shifts}: ${result.rows[0].count}`);
      } catch (e: any) {
        console.log(`   ${tables.shifts}: Error - ${e.message}`);
      }
    }
    
    if (tables.applications) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tables.applications}`);
        counts.push({ table: tables.applications, count: parseInt(result.rows[0].count) });
        console.log(`   ${tables.applications}: ${result.rows[0].count}`);
      } catch (e: any) {
        console.log(`   ${tables.applications}: Error - ${e.message}`);
      }
    }
    
    if (tables.professionals) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tables.professionals}`);
        counts.push({ table: tables.professionals, count: parseInt(result.rows[0].count) });
        console.log(`   ${tables.professionals}: ${result.rows[0].count}`);
      } catch (e: any) {
        console.log(`   ${tables.professionals}: Error - ${e.message}`);
      }
    }

    // TRUNCATE tables in order (CASCADE will handle foreign keys)
    // Order: dependent tables first, then users (which cascades to everything)
    console.log(`\n🗑️  Starting nuclear purge...`);

    // 1. TRUNCATE shifts (cascades to shift_offers, shift_invitations, shift_reviews, etc.)
    if (tables.shifts) {
      console.log(`   Truncating ${tables.shifts}...`);
      await client.query(`TRUNCATE TABLE ${tables.shifts} CASCADE`);
      console.log(`   ✅ Cleared ${tables.shifts} table`);
    }

    // 2. TRUNCATE applications (shift applications)
    if (tables.applications) {
      console.log(`   Truncating ${tables.applications}...`);
      await client.query(`TRUNCATE TABLE ${tables.applications} CASCADE`);
      console.log(`   ✅ Cleared ${tables.applications} table`);
    }

    // 3. TRUNCATE professionals (if separate table exists)
    if (tables.professionals) {
      console.log(`   Truncating ${tables.professionals}...`);
      await client.query(`TRUNCATE TABLE ${tables.professionals} CASCADE`);
      console.log(`   ✅ Cleared ${tables.professionals} table`);
    }

    // 4. TRUNCATE venues
    if (tables.venues) {
      console.log(`   Truncating ${tables.venues}...`);
      await client.query(`TRUNCATE TABLE ${tables.venues} CASCADE`);
      console.log(`   ✅ Cleared ${tables.venues} table`);
    }

    // 5. TRUNCATE users (this will cascade to all remaining dependent tables)
    if (tables.users) {
      console.log(`   Truncating ${tables.users}...`);
      await client.query(`TRUNCATE TABLE ${tables.users} CASCADE`);
      console.log(`   ✅ Cleared ${tables.users} table`);
    }

    // Commit transaction
    await client.query('COMMIT');

    // Verify purge
    console.log(`\n🔍 Verifying purge...`);
    const verifyCounts: { table: string; count: number }[] = [];
    
    for (const countInfo of counts) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${countInfo.table}`);
        const verifyCount = parseInt(result.rows[0].count);
        verifyCounts.push({ table: countInfo.table, count: verifyCount });
      } catch (e: any) {
        console.log(`   ⚠️  Could not verify ${countInfo.table}: ${e.message}`);
      }
    }

    console.log(`\n✅ Nuclear purge complete!`);
    console.log(`\n📊 Final record counts:`);
    for (const verifyInfo of verifyCounts) {
      const beforeInfo = counts.find(c => c.table === verifyInfo.table);
      const beforeCount = beforeInfo ? beforeInfo.count : 0;
      console.log(`   ${verifyInfo.table}: ${verifyInfo.count} (was ${beforeCount})`);
    }

    const allEmpty = verifyCounts.every(v => v.count === 0);
    if (allEmpty && verifyCounts.length > 0) {
      console.log(`\n🎯 Database is 100% empty. Julian's next login will be a guaranteed first-time signup experience.`);
    } else if (verifyCounts.some(v => v.count > 0)) {
      console.log(`\n⚠️  Warning: Some tables still have records. This may indicate foreign key constraints that need manual cleanup.`);
    }

    console.log(`\n💡 Note: Firebase auth users are NOT deleted by this script.`);
    console.log(`   You may need to manually delete Firebase users if you want a complete reset.`);

  } catch (error: any) {
    // Rollback on error
    await client.query('ROLLBACK').catch(() => {
      // Ignore rollback errors
    });

    console.error(`\n❌ ERROR: Failed to execute nuclear purge`);
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
nuclearPurge().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
