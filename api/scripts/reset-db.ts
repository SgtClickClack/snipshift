/**
 * Database Reset Script
 * 
 * Drops all tables and re-applies the schema (equivalent to Prisma migrate reset)
 * 
 * Usage:
 *   tsx scripts/reset-db.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { getDatabase } from '../_src/db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

async function resetDatabase() {
  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed.');
    process.exit(1);
  }

  console.log('🔄 Starting database reset...');
  console.log('⚠️  This will DROP ALL TABLES and reapply the schema.\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get all table names
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map(row => row.tablename);

    if (tables.length === 0) {
      console.log('   ℹ️  No tables found. Database is already empty.');
    } else {
      console.log(`   📋 Found ${tables.length} table(s) to drop:`);
      
      // Drop all tables with CASCADE to handle foreign key constraints
      for (const table of tables) {
        console.log(`   - Dropping table: ${table}`);
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      }
    }

    // Drop all types/enums
    const typesResult = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `);

    const types = typesResult.rows.map(row => row.typname);
    if (types.length > 0) {
      console.log(`   📋 Dropping ${types.length} enum type(s):`);
      for (const type of types) {
        console.log(`   - Dropping enum: ${type}`);
        await client.query(`DROP TYPE IF EXISTS "${type}" CASCADE`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Database reset complete!');
    console.log('   Next step: Run "npm run db:push" to reapply the schema');
    console.log('   Then run: "npm run seed:data" to seed the data\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();

