/**
 * Apply Migration Script
 * 
 * Applies the SQL migration file directly to the database
 */

import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { getDatabase } from '../db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

async function applyMigration() {
  // Get migration file from command line argument or use default
  const migrationFileName = process.argv[2] || '0002_add_posts_and_training_tables.sql';
  console.log(`📦 Applying migration: ${migrationFileName}\n`);

  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed. Please check DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    const migrationFile = path.resolve(process.cwd(), `drizzle/${migrationFileName}`);
    
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    console.log(`📄 Migration file found: ${migrationFile}`);
    console.log(`📏 SQL length: ${sql.length} characters\n`);

    console.log('Executing migration SQL...\n');
    
    // Execute statements in order - pg library requires one statement per query
    // Split by semicolon but preserve DO $$ blocks
    const statements: string[] = [];
    let current = '';
    let inDoBlock = false;
    
    const lines = sql.split('\n');
    for (const line of lines) {
      // Skip comment-only lines
      if (line.trim().startsWith('--')) {
        continue;
      }
      
      current += line + '\n';
      
      // Track DO $$ blocks
      if (line.includes('DO $$')) {
        inDoBlock = true;
      }
      if (line.includes('END $$')) {
        inDoBlock = false;
      }
      
      // Split on semicolon only if not in DO block, or if it's END $$
      if (line.trim().endsWith(';') && (!inDoBlock || line.includes('END $$'))) {
        const stmt = current.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        current = '';
      }
    }
    
    // Add any remaining statement
    if (current.trim().length > 0) {
      statements.push(current.trim());
    }
    
    console.log(`   Executing ${statements.length} statements in order...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      const firstWord = stmt.split(/\s+/)[0].toUpperCase();
      
      try {
        await pool.query(stmt);
        console.log(`   ✓ [${i + 1}/${statements.length}] ${firstWord} - executed successfully`);
      } catch (error: any) {
        if (error?.code === '42P07' || error?.code === '42710' || error?.code === '42723' ||
            error?.message?.includes('already exists') || 
            error?.message?.includes('duplicate')) {
          console.log(`   ⚠️  [${i + 1}/${statements.length}] ${firstWord} - already exists (skipped)`);
        } else {
          console.error(`   ❌ [${i + 1}/${statements.length}] ${firstWord} - ERROR:`);
          console.error(`      ${error?.message || error}`);
          if (error?.code) {
            console.error(`      Code: ${error.code}`);
          }
          throw error;
        }
      }
    }
    
    console.log('\n✅ All migration statements executed successfully!\n');
    
    // Verify tables were created
    const tableNames = migrationFileName.includes('shifts') 
      ? ['shifts']
      : ['posts', 'post_likes', 'training_modules', 'training_purchases'];
    
    const verifyResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1::text[])
      ORDER BY table_name;
    `, [tableNames]);
    
    console.log('📊 Verification - Tables found:');
    if (verifyResult.rows.length === 0) {
      console.log('   ⚠️  No tables found (may need to check manually)');
    } else {
      verifyResult.rows.forEach((row: any) => {
        console.log(`   ✓ ${row.table_name}`);
      });
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error applying migration:', error?.message || error);
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

applyMigration();

