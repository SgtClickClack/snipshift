/**
 * Sync Production Database Schema
 * 
 * This script syncs your production database schema with the codebase.
 * It uses drizzle-kit push to apply any missing tables, columns, or enums.
 * 
 * ⚠️ IMPORTANT: This script requires the PRODUCTION DATABASE_URL to be set.
 * 
 * Usage:
 *   # Set production database URL
 *   export DATABASE_URL="postgresql://user:pass@host:port/db"
 *   
 *   # Or use .env.production file
 *   # Then run:
 *   cd api
 *   npx tsx scripts/sync-production-db.ts
 * 
 * For Vercel deployments:
 *   1. Get DATABASE_URL from Vercel dashboard (Settings → Environment Variables)
 *   2. Run: DATABASE_URL="<your-prod-url>" npx tsx scripts/sync-production-db.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

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

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('❌ Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
  process.exit(1);
}

// Show which database we're connecting to (masked)
const urlParts = new URL(databaseUrl);
const maskedUrl = `${urlParts.protocol}//${urlParts.username}@${urlParts.hostname}${urlParts.pathname}`;
console.log('🔍 Target Database:', maskedUrl);
console.log('');

// Confirm before proceeding
console.log('⚠️  WARNING: This will modify your PRODUCTION database!');
console.log('');
console.log('This script will:');
console.log('  ✓ Add missing tables');
console.log('  ✓ Add missing columns');
console.log('  ✓ Add missing enums');
console.log('  ✓ Create missing indexes');
console.log('');
console.log('It will NOT:');
console.log('  ✗ Delete existing data');
console.log('  ✗ Drop tables or columns');
console.log('');

// Run drizzle-kit push
console.log('🚀 Syncing schema to production database...');
console.log('');

try {
  // Determine if we're in api directory or root
  const currentDir = process.cwd();
  const apiDir = path.resolve(currentDir, 'api');
  const isInApiDir = fs.existsSync(path.join(currentDir, 'drizzle.config.ts'));
  
  const workingDir = isInApiDir ? currentDir : apiDir;
  const originalCwd = process.cwd();
  
  // Change to api directory for drizzle-kit
  process.chdir(workingDir);
  
  console.log(`📁 Working directory: ${workingDir}`);
  console.log('');
  
  // Run drizzle-kit push (it will ask for confirmation)
  execSync('npx drizzle-kit push', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      POSTGRES_URL: databaseUrl,
    },
    cwd: workingDir,
  });
  
  // Restore original directory
  process.chdir(originalCwd);
  
  console.log('');
  console.log('✅ Schema sync completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Refresh your dashboard at snipshift.com.au');
  console.log('  2. The red error messages should be gone');
  console.log('  3. Run the audit script to verify: npx tsx scripts/audit-db.ts');
  console.log('');
  
} catch (error: any) {
  console.error('');
  console.error('❌ Schema sync failed!');
  console.error('');
  if (error?.message) {
    console.error('Error:', error.message);
  }
  console.error('');
  console.error('Troubleshooting:');
  console.error('  - Verify DATABASE_URL is correct');
  console.error('  - Check database connection (firewall, SSL, etc.)');
  console.error('  - Ensure you have write permissions on the database');
  console.error('');
  process.exit(1);
}
