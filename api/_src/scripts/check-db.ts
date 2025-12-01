/**
 * Database Schema Verification Script
 * 
 * Verifies that all expected tables exist in the database by querying
 * the information_schema. Specifically checks for recently added tables:
 * - shifts
 * - posts
 * - training_modules
 * 
 * Usage:
 *   ts-node _src/scripts/check-db.ts
 *   or
 *   npx tsx _src/scripts/check-db.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { getDatabase } from '../db/connection.js';

// Load environment variables
dotenv.config();
// Also try loading from parent directory if not found
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

// Write initial marker to verify script is running
const outputFile = path.resolve(process.cwd(), 'db-check-output.txt');
console.log('=== Database Check Script Starting ===');
console.log('Working directory:', process.cwd());
console.log('Output file:', outputFile);
try {
  fs.writeFileSync(outputFile, `Script started at ${new Date().toISOString()}\nWorking dir: ${process.cwd()}\n`);
  console.log('Initial marker written successfully');
} catch (e: any) {
  console.error('Failed to write initial marker:', e?.message);
  console.error('Error details:', e);
}

/**
 * Expected tables that should exist in the database
 */
const EXPECTED_TABLES = [
  'users',
  'jobs',
  'applications',
  'notifications',
  'shifts',
  'posts',
  'post_likes',
  'training_modules',
  'training_purchases',
  'reviews',
  'subscription_plans',
  'subscriptions',
  'payments',
  'conversations',
  'messages',
  'reports',
];

/**
 * Critical tables that were recently added and need verification
 */
const CRITICAL_TABLES = ['shifts', 'posts', 'training_modules'];

async function checkDatabase() {
  const output: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    output.push(msg);
  };
  
  let pool: any = null;
  
  try {
    log('🔍 Starting database schema verification...\n');

    pool = getDatabase();
    if (!pool) {
      const errorMsg = '❌ Database connection failed. Please check DATABASE_URL environment variable.';
      console.error(errorMsg);
      output.push(errorMsg);
      fs.writeFileSync(outputFile, output.join('\n'));
      process.exit(1);
    }
    // Query all tables in the public schema
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const existingTables = result.rows.map((row: any) => row.table_name);
    
    log('📊 Database Tables Found:');
    log('─'.repeat(50));
    if (existingTables.length === 0) {
      log('   ⚠️  No tables found in the database!');
    } else {
      existingTables.forEach((table: string) => {
        log(`   ✓ ${table}`);
      });
    }
    log('─'.repeat(50));
    log(`   Total: ${existingTables.length} tables\n`);

    // Check for expected tables
    log('🔎 Checking Expected Tables:');
    log('─'.repeat(50));
    const missingTables: string[] = [];
    const foundTables: string[] = [];

    EXPECTED_TABLES.forEach((table: string) => {
      if (existingTables.includes(table)) {
        foundTables.push(table);
        const isCritical = CRITICAL_TABLES.includes(table);
        log(`   ${isCritical ? '🔴' : '✓'} ${table} ${isCritical ? '(CRITICAL - recently added)' : ''}`);
      } else {
        missingTables.push(table);
        const isCritical = CRITICAL_TABLES.includes(table);
        log(`   ${isCritical ? '❌' : '⚠️ '} ${table} ${isCritical ? '(CRITICAL - MISSING!)' : '(missing)'}`);
      }
    });
    log('─'.repeat(50));

    // Summary
    log('\n📋 Verification Summary:');
    log('─'.repeat(50));
    log(`   Found: ${foundTables.length}/${EXPECTED_TABLES.length} expected tables`);
    log(`   Missing: ${missingTables.length} tables`);
    
    // Check critical tables specifically
    const missingCritical = CRITICAL_TABLES.filter((table: string) => !existingTables.includes(table));
    if (missingCritical.length > 0) {
      log(`\n   ❌ CRITICAL: ${missingCritical.length} critical table(s) missing:`);
      missingCritical.forEach((table: string) => {
        log(`      - ${table}`);
      });
    } else {
      log(`\n   ✅ All critical tables (shifts, posts, training_modules) are present!`);
    }

    // Additional tables found (not in expected list)
    const unexpectedTables = existingTables.filter((table: string) => !EXPECTED_TABLES.includes(table));
    if (unexpectedTables.length > 0) {
      log(`\n   ℹ️  Additional tables found (${unexpectedTables.length}):`);
      unexpectedTables.forEach((table: string) => {
        log(`      - ${table}`);
      });
    }

    log('─'.repeat(50));

    // Exit with appropriate code
    if (missingCritical.length > 0) {
      log('\n❌ Verification FAILED: Critical tables are missing!');
      log('\n💡 Next Steps:');
      log('   1. Check drizzle.config.ts - ensure schema path is correct');
      log('   2. Verify schema files exist in api/_src/db/schema/');
      log('   3. Run: npm run db:generate (to generate migrations)');
      log('   4. Run: npm run db:push (to push schema changes)');
      log('   5. Or manually apply migrations from api/drizzle/ directory\n');
      fs.writeFileSync(outputFile, output.join('\n'));
      process.exit(1);
    } else if (missingTables.length > 0) {
      log('\n⚠️  Verification WARNING: Some expected tables are missing (non-critical)');
      fs.writeFileSync(outputFile, output.join('\n'));
      process.exit(0);
    } else {
      log('\n✅ Verification PASSED: All expected tables are present!\n');
      fs.writeFileSync(outputFile, output.join('\n'));
      process.exit(0);
    }
  } catch (error: any) {
    const errorMsg = `❌ Error querying database: ${error?.message || error}\n   Stack: ${error?.stack}`;
    console.error(errorMsg);
    output.push(errorMsg);
    fs.writeFileSync('db-check-output.txt', output.join('\n'));
    process.exit(1);
  } finally {
    // Close the connection pool
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        // Ignore errors when closing
      }
    }
  }
}

// Run the verification with proper error handling
checkDatabase().catch((error) => {
  const errorMsg = `❌ Unhandled error: ${error?.message || error}\n   Stack: ${error?.stack}`;
  console.error(errorMsg);
  try {
    fs.writeFileSync('db-check-output.txt', errorMsg);
  } catch (e) {
    // Ignore if file can't be written
  }
  process.exit(1);
});

