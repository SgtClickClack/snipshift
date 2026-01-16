/**
 * Run Production Migrations (0025, 0026, 0027)
 * 
 * Applies the critical production migrations directly to the database
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

const migrations = [
  '0025_update_payments_currency_to_aud.sql',
  '0026_add_shift_applications.sql',
  '0027_add_payouts_table.sql',
  '0027_performance_optimization_indexes.sql',
];

async function runMigrations() {
  console.log('🚀 Running Production Migrations\n');
  
  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed. Please check DATABASE_URL environment variable.');
    process.exit(1);
  }

  for (const migrationFile of migrations) {
    const migrationPath = path.resolve(process.cwd(), `_src/db/migrations/${migrationFile}`);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      continue;
    }

    console.log(`📦 Applying: ${migrationFile}\n`);
    
    try {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      // Split by semicolon, but preserve DO $$ blocks
      const statements: string[] = [];
      let current = '';
      let inDoBlock = false;
      
      const lines = sql.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('--')) {
          continue;
        }
        
        current += line + '\n';
        
        if (line.includes('DO $$')) {
          inDoBlock = true;
        }
        if (line.includes('END $$')) {
          inDoBlock = false;
        }
        
        if (line.trim().endsWith(';') && (!inDoBlock || line.includes('END $$'))) {
          const stmt = current.trim();
          if (stmt.length > 0) {
            statements.push(stmt);
          }
          current = '';
        }
      }
      
      if (current.trim().length > 0) {
        statements.push(current.trim());
      }
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;
        
        const firstWord = stmt.split(/\s+/)[0].toUpperCase();
        
        try {
          await pool.query(stmt);
          console.log(`   ✓ [${i + 1}/${statements.length}] ${firstWord} - executed`);
        } catch (error: any) {
          if (error?.code === '42P07' || error?.code === '42710' || error?.code === '42723' ||
              error?.message?.includes('already exists') || 
              error?.message?.includes('duplicate')) {
            console.log(`   ⚠️  [${i + 1}/${statements.length}] ${firstWord} - already exists (skipped)`);
          } else {
            console.error(`   ❌ [${i + 1}/${statements.length}] ${firstWord} - ERROR:`);
            console.error(`      ${error?.message || error}`);
            throw error;
          }
        }
      }
      
      console.log(`\n✅ ${migrationFile} completed successfully!\n`);
    } catch (error: any) {
      console.error(`❌ Error applying ${migrationFile}:`, error?.message || error);
      if (error?.code) {
        console.error(`   Error code: ${error.code}`);
      }
      throw error;
    }
  }
  
  console.log('🎉 All production migrations completed!\n');
  
  // Verify tables
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('shift_applications', 'payouts', 'payments')
      ORDER BY table_name;
    `);
    
    console.log('📊 Verification - Tables found:');
    result.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });
  } catch (error) {
    console.log('   ⚠️  Could not verify tables');
  }
  
  await pool.end();
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
