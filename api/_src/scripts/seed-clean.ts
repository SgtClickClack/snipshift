/**
 * Database Cleanup Script
 * 
 * Wipes all data from the database except for admin users.
 * This is used to reset the environment for UAT or production readiness.
 * 
 * Usage:
 *   ts-node _src/scripts/seed-clean.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { getDatabase } from '../db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

async function cleanDatabase() {
  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed.');
    process.exit(1);
  }

  console.log('🧹 Starting database cleanup...');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // List of tables to completely wipe
    const tablesToWipe = [
      'messages',
      'conversations',
      'applications',
      'reviews',
      'reports',
      'notifications',
      'post_likes',
      'posts',
      'shifts',
      'jobs',
      'payments',
      'training_purchases',
      'subscriptions',
      // 'training_modules', // Keeping training modules as they might be system content
    ];

    for (const table of tablesToWipe) {
      console.log(`   - Cleaning ${table}...`);
      await client.query(`DELETE FROM ${table}`);
    }

    // Clean users but keep admins
    console.log('   - Cleaning users (preserving admins)...');
    await client.query(`DELETE FROM users WHERE role != 'admin'`);

    await client.query('COMMIT');
    console.log('✅ Database cleanup complete!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase();

