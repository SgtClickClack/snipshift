/**
 * Database Audit Script
 * 
 * Scans production database and reports exactly which tables and columns are missing.
 * This helps identify database drift between code and production.
 * 
 * Usage:
 *   docker exec -it snipshift-api npx tsx scripts/audit-db.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { sql } from 'drizzle-orm';
import { getDb } from '../_src/db/index.js';

// Load environment variables
dotenv.config();
// Also try loading from parent directory if not found
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

async function audit() {
  console.log('🔍 STARTING DATABASE AUDIT...');
  console.log('--------------------------------');

  const db = getDb();
  if (!db) {
    console.error('❌ [CRITICAL] Database connection failed. Check DATABASE_URL.');
    process.exit(1);
  }

  // Helper to check table existence
  const checkTable = async (tableName: string) => {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        );
      `);
      const exists = (result.rows[0] as any).exists;
      console.log(`${exists ? '✅' : '❌'} Table: ${tableName}`);
      return exists;
    } catch (error: any) {
      console.error(`❌ Error checking table ${tableName}:`, error?.message || error);
      return false;
    }
  };

  // Helper to check column existence
  const checkColumn = async (tableName: string, columnName: string) => {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          AND column_name = ${columnName}
        );
      `);
      const exists = (result.rows[0] as any).exists;
      console.log(`${exists ? '✅' : '❌'} Column: ${tableName}.${columnName}`);
      return exists;
    } catch (error: any) {
      console.error(`❌ Error checking column ${tableName}.${columnName}:`, error?.message || error);
      return false;
    }
  };

  // 1. Check Core Tables
  console.log('\n📊 Core Tables:');
  await checkTable('users');
  await checkTable('shifts');
  await checkTable('applications');

  // 2. Check NEW Tables (Likely Missing)
  console.log('\n📊 New Tables (Chat & Reviews):');
  await checkTable('conversations'); // Chat
  await checkTable('messages');      // Chat
  await checkTable('shift_reviews'); // Reviews

  // 3. Check NEW Columns (Likely Missing)
  console.log('\n📊 New Columns in Users Table:');
  await checkColumn('users', 'role');
  await checkColumn('users', 'is_active');
  await checkColumn('users', 'stripe_account_id');

  console.log('\n📊 New Columns in Shifts Table:');
  await checkColumn('shifts', 'payment_status');
  await checkColumn('shifts', 'attendance_status');

  console.log('--------------------------------');
  console.log('✅ Audit complete.');
  process.exit(0);
}

audit().catch((err) => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
