/**
 * Backfill Job Role Script
 * 
 * Backfills the role column for existing jobs in the database.
 * Sets all existing jobs to 'barber' as the default.
 * 
 * Usage:
 *   ts-node api/_src/scripts/backfill-job-role.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { getDatabase } from '../db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

async function backfillJobRole() {
  console.log('🔄 Backfilling job role column...\n');

  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed. Please check DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    // First, check if the role column exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'jobs' 
      AND column_name = 'role';
    `;
    
    const columnCheck = await pool.query(checkColumnQuery);
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠️  Role column does not exist yet.');
      console.log('   Please run the schema migration first to add the role column.');
      console.log('   You can use: npm run db:push or apply the migration manually.\n');
      process.exit(1);
    }

    // Check how many jobs need to be updated
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE role IS NULL;
    `;
    
    const countResult = await pool.query(countQuery);
    const nullCount = parseInt(countResult.rows[0].count, 10);
    
    if (nullCount === 0) {
      console.log('✅ All jobs already have a role assigned. No backfill needed.\n');
      process.exit(0);
    }

    console.log(`📊 Found ${nullCount} jobs without a role. Backfilling with 'barber'...\n`);

    // Update all jobs with NULL role to 'barber'
    const updateQuery = `
      UPDATE jobs 
      SET role = 'barber'::job_role, updated_at = NOW()
      WHERE role IS NULL;
    `;
    
    const updateResult = await pool.query(updateQuery);
    console.log(`✅ Successfully updated ${updateResult.rowCount} jobs with role 'barber'.\n`);

    // Verify the update
    const verifyQuery = `
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE role IS NULL;
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    const remainingNulls = parseInt(verifyResult.rows[0].count, 10);
    
    if (remainingNulls === 0) {
      console.log('✅ Verification passed: All jobs now have a role assigned.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingNulls} jobs still have NULL role.\n`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error backfilling job role:', error?.message || error);
    if (error?.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error?.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    console.error('   Stack:', error?.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

backfillJobRole();

