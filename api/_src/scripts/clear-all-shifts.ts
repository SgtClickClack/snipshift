/**
 * Clear All Shifts Script
 * 
 * Deletes ALL shifts, jobs, and related data (applications, invitations, offers, reviews)
 * from the database. Preserves user accounts.
 * 
 * Usage:
 *   cd api
 *   npx tsx _src/scripts/clear-all-shifts.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { getDatabase } from '../db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

async function clearAllShifts() {
  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed.');
    process.exit(1);
  }

  console.log('🧹 Clearing ALL shifts and related data...\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Delete in order to respect foreign key constraints
    // First: child tables that reference shifts
    
    console.log('   - Clearing shift_reviews...');
    const reviewsResult = await client.query('DELETE FROM shift_reviews');
    console.log(`      ✓ Deleted ${reviewsResult.rowCount} review(s)`);

    console.log('   - Clearing shift_invitations...');
    const invitationsResult = await client.query('DELETE FROM shift_invitations');
    console.log(`      ✓ Deleted ${invitationsResult.rowCount} invitation(s)`);

    console.log('   - Clearing shift_offers...');
    const offersResult = await client.query('DELETE FROM shift_offers');
    console.log(`      ✓ Deleted ${offersResult.rowCount} offer(s)`);

    console.log('   - Clearing applications...');
    const appsResult = await client.query('DELETE FROM applications');
    console.log(`      ✓ Deleted ${appsResult.rowCount} application(s)`);

    // Now delete main tables
    console.log('   - Clearing shifts...');
    const shiftsResult = await client.query('DELETE FROM shifts');
    console.log(`      ✓ Deleted ${shiftsResult.rowCount} shift(s)`);

    console.log('   - Clearing jobs...');
    const jobsResult = await client.query('DELETE FROM jobs');
    console.log(`      ✓ Deleted ${jobsResult.rowCount} job(s)`);

    await client.query('COMMIT');
    
    console.log('\n✅ All shifts and related data cleared!');
    console.log(`   Summary:`);
    console.log(`   - ${shiftsResult.rowCount} shifts deleted`);
    console.log(`   - ${jobsResult.rowCount} jobs deleted`);
    console.log(`   - ${appsResult.rowCount} applications deleted`);
    console.log(`   - ${offersResult.rowCount} shift offers deleted`);
    console.log(`   - ${invitationsResult.rowCount} shift invitations deleted`);
    console.log(`   - ${reviewsResult.rowCount} reviews deleted`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Clear failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllShifts();
