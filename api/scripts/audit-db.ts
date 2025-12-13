/**
 * Database Audit Script
 * 
 * Scans the production database and reports which tables and columns are missing.
 * This helps identify schema drift between the codebase and the live database.
 * 
 * Usage:
 *   docker exec -it snipshift-api npx tsx scripts/audit-db.ts
 * 
 * Or locally:
 *   cd api
 *   npx tsx scripts/audit-db.ts
 */

import { getDb } from '../_src/db/index.js';
import { sql } from 'drizzle-orm';

interface AuditResult {
  table: string;
  exists: boolean;
  missingColumns?: string[];
}

async function checkTable(db: any, tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists;
    `);
    return result.rows[0]?.exists === true;
  } catch (error: any) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function checkColumn(db: any, tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      ) as exists;
    `);
    return result.rows[0]?.exists === true;
  } catch (error: any) {
    console.error(`Error checking column ${tableName}.${columnName}:`, error.message);
    return false;
  }
}

async function audit() {
  console.log('🔍 STARTING DATABASE AUDIT...');
  console.log('================================');
  console.log('');

  const db = getDb();
  if (!db) {
    console.error('❌ Failed to connect to database. Check DATABASE_URL environment variable.');
    process.exit(1);
  }

  const results: AuditResult[] = [];
  let totalIssues = 0;

  // 1. Check Core Tables
  console.log('📋 CORE TABLES:');
  console.log('--------------------------------');
  
  const coreTables = ['users', 'shifts', 'applications', 'jobs'];
  for (const table of coreTables) {
    const exists = await checkTable(db, table);
    results.push({ table, exists });
    console.log(`${exists ? '✅' : '❌'} Table: ${table}`);
    if (!exists) totalIssues++;
  }
  console.log('');

  // 2. Check NEW Tables (Likely Missing)
  console.log('🆕 NEW TABLES (Chat, Reviews, etc.):');
  console.log('--------------------------------');
  
  const newTables = [
    'conversations',  // Chat
    'messages',       // Chat
    'shift_reviews',  // Reviews
    'notifications',  // Notifications
    'posts',          // Social posts
    'post_likes',     // Social likes
    'comments',       // Social comments
    'training_modules', // Training
    'training_purchases', // Training purchases
  ];
  
  for (const table of newTables) {
    const exists = await checkTable(db, table);
    results.push({ table, exists });
    console.log(`${exists ? '✅' : '❌'} Table: ${table}`);
    if (!exists) totalIssues++;
  }
  console.log('');

  // 3. Check NEW Columns in Existing Tables
  console.log('🔧 NEW COLUMNS IN EXISTING TABLES:');
  console.log('--------------------------------');
  
  // Check users table columns
  const usersColumns = [
    { name: 'role', description: 'User role (professional/business/admin)' },
    { name: 'roles', description: 'User roles array' },
    { name: 'is_active', description: 'User active status' },
    { name: 'stripe_account_id', description: 'Stripe Connect account ID' },
    { name: 'stripe_onboarding_complete', description: 'Stripe onboarding status' },
    { name: 'stripe_customer_id', description: 'Stripe customer ID' },
  ];
  
  const usersTableExists = results.find(r => r.table === 'users')?.exists;
  if (usersTableExists) {
    const missingUsersColumns: string[] = [];
    for (const col of usersColumns) {
      const exists = await checkColumn(db, 'users', col.name);
      console.log(`${exists ? '✅' : '❌'} Column: users.${col.name} (${col.description})`);
      if (!exists) {
        missingUsersColumns.push(col.name);
        totalIssues++;
      }
    }
    if (missingUsersColumns.length > 0) {
      const usersResult = results.find(r => r.table === 'users');
      if (usersResult) {
        usersResult.missingColumns = missingUsersColumns;
      }
    }
  } else {
    console.log('⚠️  Skipping users columns check (table does not exist)');
  }
  console.log('');

  // Check shifts table columns
  const shiftsColumns = [
    { name: 'payment_status', description: 'Payment status (UNPAID/PAID/etc.)' },
    { name: 'attendance_status', description: 'Attendance status (pending/completed/no_show)' },
    { name: 'payment_intent_id', description: 'Stripe payment intent ID' },
    { name: 'stripe_charge_id', description: 'Stripe charge ID' },
    { name: 'application_fee_amount', description: 'Snipshift commission in cents' },
    { name: 'transfer_amount', description: 'Amount sent to barber in cents' },
    { name: 'auto_accept', description: 'Auto-accept applications' },
    { name: 'assignee_id', description: 'Assigned professional ID' },
  ];
  
  const shiftsTableExists = results.find(r => r.table === 'shifts')?.exists;
  if (shiftsTableExists) {
    const missingShiftsColumns: string[] = [];
    for (const col of shiftsColumns) {
      const exists = await checkColumn(db, 'shifts', col.name);
      console.log(`${exists ? '✅' : '❌'} Column: shifts.${col.name} (${col.description})`);
      if (!exists) {
        missingShiftsColumns.push(col.name);
        totalIssues++;
      }
    }
    if (missingShiftsColumns.length > 0) {
      const shiftsResult = results.find(r => r.table === 'shifts');
      if (shiftsResult) {
        shiftsResult.missingColumns = missingShiftsColumns;
      }
    }
  } else {
    console.log('⚠️  Skipping shifts columns check (table does not exist)');
  }
  console.log('');

  // Check applications table columns
  const applicationsColumns = [
    { name: 'shift_id', description: 'Reference to shift (new shift-based applications)' },
  ];
  
  const applicationsTableExists = results.find(r => r.table === 'applications')?.exists;
  if (applicationsTableExists) {
    for (const col of applicationsColumns) {
      const exists = await checkColumn(db, 'applications', col.name);
      console.log(`${exists ? '✅' : '❌'} Column: applications.${col.name} (${col.description})`);
      if (!exists) totalIssues++;
    }
  } else {
    console.log('⚠️  Skipping applications columns check (table does not exist)');
  }
  console.log('');

  // Summary
  console.log('================================');
  console.log('📊 AUDIT SUMMARY:');
  console.log('================================');
  console.log('');
  
  const missingTables = results.filter(r => !r.exists);
  if (missingTables.length > 0) {
    console.log('❌ Missing Tables:');
    missingTables.forEach(r => {
      console.log(`   - ${r.table}`);
    });
    console.log('');
  }
  
  const tablesWithMissingColumns = results.filter(r => r.missingColumns && r.missingColumns.length > 0);
  if (tablesWithMissingColumns.length > 0) {
    console.log('❌ Tables with Missing Columns:');
    tablesWithMissingColumns.forEach(r => {
      console.log(`   - ${r.table}:`);
      r.missingColumns!.forEach(col => {
        console.log(`     • ${col}`);
      });
    });
    console.log('');
  }
  
  if (totalIssues === 0) {
    console.log('✅ All tables and columns are present!');
    console.log('✅ Database schema is in sync with codebase.');
  } else {
    console.log(`❌ Found ${totalIssues} issue(s) that need to be fixed.`);
    console.log('');
    console.log('🔧 TO FIX:');
    console.log('   1. Run: docker exec -it snipshift-api npm run db:migrate');
    console.log('   2. Or: docker exec -it snipshift-api npx drizzle-kit push');
    console.log('   3. Then run this audit again to verify');
  }
  console.log('');
  console.log('================================');
  console.log('Audit complete.');
  console.log('================================');
  
  process.exit(totalIssues > 0 ? 1 : 0);
}

audit().catch((err) => {
  console.error('');
  console.error('❌ Audit failed:', err);
  console.error('');
  if (err?.message) {
    console.error('Error details:', err.message);
  }
  if (err?.stack) {
    console.error('Stack trace:', err.stack);
  }
  process.exit(1);
});
