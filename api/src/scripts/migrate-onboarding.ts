/**
 * Migration Script: Add isOnboarded column to users table
 * 
 * Adds the is_onboarded boolean column to the users table with default value false.
 * Safe to run multiple times (checks if column exists first).
 * 
 * Usage: npm run migrate:onboarding
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function migrateOnboarding() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Starting migration: Add is_onboarded column to users table...');

    // Check if column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_onboarded';
    `;

    const checkResult = await pool.query(checkColumnQuery);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column is_onboarded already exists. Migration not needed.');
      await pool.end();
      process.exit(0);
    }

    // Add the column
    const addColumnQuery = `
      ALTER TABLE users 
      ADD COLUMN is_onboarded BOOLEAN NOT NULL DEFAULT false;
    `;

    await pool.query(addColumnQuery);
    console.log('✅ Successfully added is_onboarded column to users table.');

    // Verify the column was added
    const verifyResult = await pool.query(checkColumnQuery);
    if (verifyResult.rows.length > 0) {
      console.log('✅ Migration verified: Column exists and is ready to use.');
    } else {
      console.error('❌ Migration verification failed: Column not found after creation.');
      process.exit(1);
    }

    await pool.end();
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

migrateOnboarding();
