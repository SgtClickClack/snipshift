/**
 * Apply Firebase UID Migration
 * 
 * Applies the firebase_uid migration to ensure the column exists
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

async function applyFirebaseUidMigration() {
  console.log('📦 Applying Firebase UID migration...\n');

  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed. Please check DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    // Resolve migration file path - handle both api/ and root directory execution
    const apiDir = process.cwd().endsWith('api') ? process.cwd() : path.resolve(process.cwd(), 'api');
    const migrationFile = path.resolve(apiDir, '_src/db/migrations/0034_add_firebase_uid_last_login.sql');
    
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    console.log(`📄 Migration file found: ${migrationFile}\n`);

    // Split SQL into statements properly (handle comments and multi-line)
    const statements: string[] = [];
    const lines = sql.split('\n');
    let currentStatement = '';
    
    for (const line of lines) {
      // Skip comment-only lines
      if (line.trim().startsWith('--')) {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // If line ends with semicolon, it's a complete statement
      if (line.trim().endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt.length > 0 && stmt !== ';') {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }

    console.log(`Executing ${statements.length} statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const firstWord = stmt.split(/\s+/)[0].toUpperCase();
      
      try {
        await pool.query(stmt);
        console.log(`   ✓ [${i + 1}/${statements.length}] ${firstWord} - executed successfully`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error?.code === '42P07' || error?.code === '42710' || error?.code === '42723' ||
            error?.message?.includes('already exists') || 
            error?.message?.includes('duplicate') ||
            error?.message?.includes('already has') ||
            error?.code === '42704') { // 42704 = undefined object (e.g., enum value already exists)
          console.log(`   ⚠️  [${i + 1}/${statements.length}] ${firstWord} - already exists (skipped)`);
        } else {
          console.error(`   ❌ [${i + 1}/${statements.length}] ${firstWord} - ERROR:`);
          console.error(`      ${error?.message || error}`);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration applied successfully!\n');
    
    // Verify column exists
    const verifyResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'firebase_uid';
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verified: firebase_uid column exists');
    } else {
      console.log('⚠️  Warning: firebase_uid column not found after migration');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error applying migration:', error?.message || error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

applyFirebaseUidMigration();
