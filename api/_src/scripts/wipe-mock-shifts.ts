/**
 * Wipe Mock/Test Shifts Script
 * 
 * Deletes all shifts and jobs with test/mock data (e.g., "E2E Test Shift", "test", "mock")
 * from the database. This is used to clean up test data from the Find Shifts feed.
 * 
 * Usage:
 *   cd api
 *   ts-node _src/scripts/wipe-mock-shifts.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { getDatabase } from '../db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

async function wipeMockShifts() {
  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed.');
    process.exit(1);
  }

  console.log('🧹 Starting mock/test data cleanup for Find Shifts...\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // First, delete related applications for test shifts/jobs (before deleting the shifts/jobs)
    console.log('   - Cleaning up related applications...');
    const appsResult = await client.query(`
      DELETE FROM applications 
      WHERE shift_id IN (
        SELECT id FROM shifts WHERE 
          LOWER(title) LIKE '%e2e test%' 
          OR LOWER(title) LIKE '%test shift%'
          OR LOWER(title) LIKE '%mock%'
          OR LOWER(title) LIKE '%test job%'
      )
      OR job_id IN (
        SELECT id FROM jobs WHERE 
          LOWER(title) LIKE '%e2e test%' 
          OR LOWER(title) LIKE '%test shift%'
          OR LOWER(title) LIKE '%mock%'
          OR LOWER(title) LIKE '%test job%'
      )
    `);
    console.log(`      ✓ Deleted ${appsResult.rowCount} application(s)`);

    // Delete shifts with test/mock titles (case-insensitive)
    console.log('   - Deleting test/mock shifts...');
    const shiftsResult = await client.query(`
      DELETE FROM shifts 
      WHERE LOWER(title) LIKE '%e2e test%' 
         OR LOWER(title) LIKE '%test shift%'
         OR LOWER(title) LIKE '%mock%'
         OR LOWER(title) LIKE '%test job%'
    `);
    console.log(`      ✓ Deleted ${shiftsResult.rowCount} shift(s)`);

    // Delete jobs with test/mock titles (case-insensitive)
    console.log('   - Deleting test/mock jobs...');
    const jobsResult = await client.query(`
      DELETE FROM jobs 
      WHERE LOWER(title) LIKE '%e2e test%' 
         OR LOWER(title) LIKE '%test shift%'
         OR LOWER(title) LIKE '%mock%'
         OR LOWER(title) LIKE '%test job%'
    `);
    console.log(`      ✓ Deleted ${jobsResult.rowCount} job(s)`);

    await client.query('COMMIT');
    console.log('\n✅ Mock/test data cleanup complete!');
    console.log(`   Total deleted: ${shiftsResult.rowCount} shifts, ${jobsResult.rowCount} jobs, ${appsResult.rowCount} applications`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

wipeMockShifts();

