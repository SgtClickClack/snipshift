#!/usr/bin/env node

/**
 * Database Migration Script
 * Creates the initial database schema for Snipshift
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  const client = postgres(connectionString!);
  const db = drizzle(client, { schema });

  try {
    // Create users table
    console.log('📝 Creating users table...');
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'client',
        google_id TEXT,
        provider TEXT NOT NULL DEFAULT 'email',
        name TEXT,
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create shifts table
    console.log('📝 Creating shifts table...');
    await client`
      CREATE TABLE IF NOT EXISTS shifts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        hub_id VARCHAR NOT NULL,
        title TEXT NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        requirements TEXT NOT NULL,
        pay DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    console.log('📝 Creating indexes...');
    await client`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_shifts_hub_id ON shifts(hub_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date)
    `;

    console.log('✅ Database migrations completed successfully!');
    
    // Test the connection
    const result = await client`SELECT COUNT(*) as count FROM users`;
    console.log(`📊 Users table ready (${result[0].count} existing users)`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

export { runMigrations };
