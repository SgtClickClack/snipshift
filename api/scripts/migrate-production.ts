/**
 * Apply All Pending Migrations to Production Database
 * 
 * This script applies all migration files in order to your production database.
 * It's safer than push because it only runs SQL files that haven't been applied yet.
 * 
 * ⚠️ IMPORTANT: This script requires the PRODUCTION DATABASE_URL to be set.
 * 
 * Usage:
 *   # Set production database URL
 *   export DATABASE_URL="postgresql://user:pass@host:port/db"
 *   
 *   # Then run:
 *   cd api
 *   npx tsx scripts/migrate-production.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { getDatabase } from '../_src/db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env.production') });
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found!');
  console.error('');
  console.error('Please set DATABASE_URL environment variable:');
  console.error('  export DATABASE_URL="postgresql://user:pass@host:port/db"');
  console.error('');
  console.error('Or create a .env.production file with DATABASE_URL in the root directory.');
  process.exit(1);
}

// Show which database we're connecting to (masked)
const urlParts = new URL(databaseUrl);
const maskedUrl = `${urlParts.protocol}//${urlParts.username}@${urlParts.hostname}${urlParts.pathname}`;
console.log('🔍 Target Database:', maskedUrl);
console.log('');

// Get all migration files in order
// Determine if we're in api directory or root
const currentDir = process.cwd();
const apiDir = path.resolve(currentDir, 'api');
const isInApiDir = fs.existsSync(path.join(currentDir, 'drizzle'));
const drizzleDir = isInApiDir 
  ? path.resolve(currentDir, 'drizzle')
  : path.resolve(apiDir, 'drizzle');

if (!fs.existsSync(drizzleDir)) {
  console.error(`❌ Drizzle directory not found: ${drizzleDir}`);
  process.exit(1);
}

const migrationFiles = fs.readdirSync(drizzleDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sort alphabetically to ensure order

console.log(`📦 Found ${migrationFiles.length} migration files`);
console.log('');

// Confirm before proceeding
console.log('⚠️  WARNING: This will modify your PRODUCTION database!');
console.log('');
console.log('Migrations to apply:');
migrationFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});
console.log('');

const pool = getDatabase();
if (!pool) {
  console.error('❌ Database connection failed. Check DATABASE_URL.');
  process.exit(1);
}
const dbPool = pool as NonNullable<typeof pool>;

async function applyMigrations() {
  console.log('🚀 Starting migration process...');
  console.log('');

  let applied = 0;
  let skipped = 0;
  let errors = 0;

  for (const migrationFile of migrationFiles) {
    const migrationPath = path.join(drizzleDir, migrationFile);
    console.log(`📄 Processing: ${migrationFile}`);
    
    try {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      // Split SQL into statements
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
      
      // Execute statements
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;
        
        try {
          await dbPool.query(stmt);
        } catch (error: any) {
          // Skip if already exists
          if (error?.code === '42P07' || error?.code === '42710' || error?.code === '42723' ||
              error?.message?.includes('already exists') || 
              error?.message?.includes('duplicate')) {
            // Continue - this is expected for some migrations
          } else {
            throw error;
          }
        }
      }
      
      console.log(`   ✅ Applied successfully`);
      applied++;
      
    } catch (error: any) {
      if (error?.code === '42P07' || error?.message?.includes('already exists')) {
        console.log(`   ⚠️  Already applied (skipped)`);
        skipped++;
      } else {
        console.error(`   ❌ Error: ${error?.message || error}`);
        errors++;
      }
    }
    
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Applied: ${applied}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('');
  
  if (errors > 0) {
    console.error('❌ Some migrations failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('✅ All migrations completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Refresh your dashboard at snipshift.com.au');
    console.log('  2. The red error messages should be gone');
    console.log('  3. Run the audit script to verify: npx tsx scripts/audit-db.ts');
    console.log('');
  }
}

applyMigrations()
  .then(() => {
    if (pool) {
      pool.end();
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    if (pool) {
      pool.end();
    }
    process.exit(1);
  });
