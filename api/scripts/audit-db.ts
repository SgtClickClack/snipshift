/**
 * Database Audit Script
 * 
 * Comprehensive audit of database schema to detect drift between code and production database.
 * Checks for missing tables, columns, and enums that are causing 500 errors.
 * 
 * Usage:
 *   docker exec -it snipshift-api npx tsx scripts/audit-db.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { getDatabase } from '../_src/db/connection.js';

// Load environment variables
dotenv.config();
// Also try loading from parent directory if not found
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

interface AuditResult {
  passed: boolean;
  checks: Array<{
    category: string;
    item: string;
    status: 'OK' | 'MISSING';
    details?: string;
  }>;
}

/**
 * Expected tables that should exist
 */
const EXPECTED_TABLES = [
  'users',
  'jobs',
  'applications',
  'notifications',
  'shifts',
  'shift_offers',
  'shift_reviews',
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
 * Critical columns in users table
 */
const USERS_COLUMNS = [
  'id',
  'email',
  'password_hash',
  'name',
  'role',              // CRITICAL - causes 500 on /register
  'roles',             // CRITICAL - added in migration 0011
  'is_active',         // CRITICAL - causes 500 on /register
  'is_onboarded',
  'stripe_account_id',
  'stripe_customer_id',
  'stripe_onboarding_complete',
  'created_at',
  'updated_at',
];

/**
 * Critical columns in shifts table
 */
const SHIFTS_COLUMNS = [
  'id',
  'employer_id',
  'assignee_id',
  'title',
  'description',
  'start_time',
  'end_time',
  'hourly_rate',
  'status',
  'attendance_status',  // CRITICAL - added in migration 0008
  'payment_status',     // CRITICAL - causes 500 on /shifts
  'payment_intent_id',
  'stripe_charge_id',
  'application_fee_amount',
  'transfer_amount',
  'location',
  'is_recurring',
  'auto_accept',
  'parent_shift_id',
  'created_at',
  'updated_at',
];

/**
 * Critical columns in conversations table
 */
const CONVERSATIONS_COLUMNS = [
  'id',
  'job_id',
  'participant1_id',
  'participant2_id',
  'last_message_at',
  'created_at',
  'updated_at',
];

/**
 * Expected enums
 */
const EXPECTED_ENUMS = [
  'user_role',
  'shift_status',
  'payment_status',      // CRITICAL - causes 500 on /shifts
  'attendance_status',   // CRITICAL - added in migration 0008
  'shift_offer_status',
  'shift_review_type',
  'application_status',
  'job_status',
  'notification_type',
  'report_reason',
  'report_status',
  'subscription_status',
  'post_type',
  'training_level',
];

async function auditDatabase(): Promise<AuditResult> {
  const result: AuditResult = {
    passed: true,
    checks: [],
  };

  const pool = getDatabase();
  if (!pool) {
    console.error('❌ [CRITICAL] Database connection failed. Check DATABASE_URL.');
    process.exit(1);
  }

  try {
    console.log('🔍 Starting Database Audit...\n');
    console.log('='.repeat(60));

    // 1. Check Tables
    console.log('\n📊 Checking Tables:');
    console.log('-'.repeat(60));
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const existingTables = tablesResult.rows.map((row: any) => row.table_name);

    for (const table of EXPECTED_TABLES) {
      const exists = existingTables.includes(table);
      const status = exists ? 'OK' : 'MISSING';
      if (!exists) result.passed = false;
      
      result.checks.push({
        category: 'Tables',
        item: table,
        status,
      });
      
      console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${table}`);
    }

    // 2. Check Users Table Columns
    console.log('\n👤 Checking Users Table Columns:');
    console.log('-'.repeat(60));
    const usersColumnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY column_name;
    `);
    const existingUsersColumns = usersColumnsResult.rows.map((row: any) => row.column_name);

    for (const column of USERS_COLUMNS) {
      const exists = existingUsersColumns.includes(column);
      const status = exists ? 'OK' : 'MISSING';
      if (!exists) result.passed = false;
      
      result.checks.push({
        category: 'Users Columns',
        item: column,
        status,
      });
      
      const critical = ['role', 'is_active', 'roles'].includes(column);
      console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${column}${critical ? ' ⚠️ CRITICAL' : ''}`);
    }

    // 3. Check Shifts Table Columns
    console.log('\n🔄 Checking Shifts Table Columns:');
    console.log('-'.repeat(60));
    const shiftsColumnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'shifts'
      ORDER BY column_name;
    `);
    const existingShiftsColumns = shiftsColumnsResult.rows.map((row: any) => row.column_name);

    for (const column of SHIFTS_COLUMNS) {
      const exists = existingShiftsColumns.includes(column);
      const status = exists ? 'OK' : 'MISSING';
      if (!exists) result.passed = false;
      
      result.checks.push({
        category: 'Shifts Columns',
        item: column,
        status,
      });
      
      const critical = ['payment_status', 'attendance_status'].includes(column);
      console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${column}${critical ? ' ⚠️ CRITICAL' : ''}`);
    }

    // 4. Check Conversations Table Columns
    console.log('\n💬 Checking Conversations Table Columns:');
    console.log('-'.repeat(60));
    const conversationsColumnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations'
      ORDER BY column_name;
    `);
    const existingConversationsColumns = conversationsColumnsResult.rows.map((row: any) => row.column_name);

    for (const column of CONVERSATIONS_COLUMNS) {
      const exists = existingConversationsColumns.includes(column);
      const status = exists ? 'OK' : 'MISSING';
      if (!exists) result.passed = false;
      
      result.checks.push({
        category: 'Conversations Columns',
        item: column,
        status,
      });
      
      console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${column}`);
    }

    // 5. Check Enums
    console.log('\n📋 Checking Enums:');
    console.log('-'.repeat(60));
    const enumsResult = await pool.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY typname;
    `);
    const existingEnums = enumsResult.rows.map((row: any) => row.typname);

    for (const enumName of EXPECTED_ENUMS) {
      const exists = existingEnums.includes(enumName);
      const status = exists ? 'OK' : 'MISSING';
      if (!exists) result.passed = false;
      
      result.checks.push({
        category: 'Enums',
        item: enumName,
        status,
      });
      
      const critical = ['payment_status', 'attendance_status', 'user_role'].includes(enumName);
      console.log(`  ${exists ? '[OK]' : '[MISSING]'} ${enumName}${critical ? ' ⚠️ CRITICAL' : ''}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Audit Summary:');
    console.log('-'.repeat(60));
    
    const totalChecks = result.checks.length;
    const passedChecks = result.checks.filter(c => c.status === 'OK').length;
    const failedChecks = result.checks.filter(c => c.status === 'MISSING').length;
    
    console.log(`  Total Checks: ${totalChecks}`);
    console.log(`  Passed: ${passedChecks}`);
    console.log(`  Failed: ${failedChecks}`);

    // Group failures by category
    const failuresByCategory: Record<string, string[]> = {};
    result.checks
      .filter(c => c.status === 'MISSING')
      .forEach(c => {
        if (!failuresByCategory[c.category]) {
          failuresByCategory[c.category] = [];
        }
        failuresByCategory[c.category].push(c.item);
      });

    if (Object.keys(failuresByCategory).length > 0) {
      console.log('\n❌ Missing Items by Category:');
      for (const [category, items] of Object.entries(failuresByCategory)) {
        console.log(`\n  ${category}:`);
        items.forEach(item => {
          console.log(`    - ${item}`);
        });
      }
    }

    if (result.passed) {
      console.log('\n✅ Audit PASSED: All checks successful!');
      console.log('   Your database is in sync with the code.\n');
    } else {
      console.log('\n❌ Audit FAILED: Database drift detected!');
      console.log('\n💡 Next Steps:');
      console.log('   1. Run: docker exec -it snipshift-api npm run db:migrate');
      console.log('   2. Restart API: docker-compose -f docker-compose.prod.yml restart api');
      console.log('   3. Re-run this audit to verify\n');
    }

    return result;
  } catch (error: any) {
    console.error('\n❌ [CRITICAL] Error during audit:', error?.message || error);
    console.error('   Stack:', error?.stack);
    result.passed = false;
    return result;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        // Ignore errors when closing
      }
    }
  }
}

// Run the audit
auditDatabase()
  .then((result) => {
    process.exit(result.passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Unhandled error:', error?.message || error);
    process.exit(1);
  });
