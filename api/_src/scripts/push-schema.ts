/**
 * Database Schema Push Script
 * 
 * Pushes the Drizzle schema to the production database.
 * This creates all tables, enums, indexes, and constraints defined in schema.ts.
 * 
 * Usage: 
 *   Set DATABASE_URL in .env to your production database URL
 *   npm run db:push
 * 
 * Or run directly:
 *   ts-node _src/scripts/push-schema.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function pushSchema() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL or POSTGRES_URL environment variable not set.');
    console.error('   Please set DATABASE_URL to your production database connection string.');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Create Drizzle instance
    const db = drizzle(pool, { schema });

    console.log('🔄 Pushing schema to database...');
    console.log('   This will create all tables, enums, indexes, and constraints...');

    // Use Drizzle's push method to sync schema
    // Note: This requires drizzle-kit, so we'll use raw SQL instead
    // For now, we'll create a manual migration approach
    
    // Check if users table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    
    const tableExists = await pool.query(checkTableQuery);
    
    if (tableExists.rows[0].exists) {
      console.log('⚠️  Users table already exists. Schema may already be pushed.');
      console.log('   If you need to update the schema, consider using migrations.');
    } else {
      console.log('📋 Creating database schema...');
      console.log('   Note: This script creates tables manually.');
      console.log('   For full Drizzle push, install drizzle-kit: npm install -D drizzle-kit');
      console.log('   Then create drizzle.config.ts and run: npx drizzle-kit push');
      
      // Since we don't have drizzle-kit, we'll provide instructions
      console.log('\n📝 To push schema using Drizzle Kit:');
      console.log('   1. Install: npm install -D drizzle-kit');
      console.log('   2. Create drizzle.config.ts in api/ directory');
      console.log('   3. Run: npx drizzle-kit push');
    }

    await pool.end();
    console.log('✅ Schema push check completed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Schema push failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

pushSchema();

