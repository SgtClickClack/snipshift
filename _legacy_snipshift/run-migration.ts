/**
 * Migration Runner Script - Atomic Settlement & Productivity Ready
 * 
 * Run with: npx tsx _legacy_snipshift/run-migration.ts
 * Or with explicit URL: npx tsx _legacy_snipshift/run-migration.ts "postgresql://user:pass@host/db"
 * 
 * This bypasses the need for psql in Windows PATH by using the pg client directly.
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Clean and normalize database URL
function cleanDatabaseUrl(url: string): string {
  if (!url) return '';
  
  // Remove any leading/trailing whitespace and newlines
  let cleaned = url.trim().replace(/\\n/g, '').replace(/\r/g, '');
  
  // Remove any hidden characters (non-printable except standard URL chars)
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Ensure it's a valid PostgreSQL URL
  if (!cleaned.startsWith('postgresql://') && !cleaned.startsWith('postgres://')) {
    throw new Error(`Invalid DATABASE_URL format. Must start with postgresql:// or postgres://`);
  }
  
  return cleaned;
}

// Load environment variables - try multiple files in order of priority
function loadDatabaseUrl(): string | undefined {
  // 1. Check command line argument first
  if (process.argv[2] && process.argv[2].startsWith('postgresql://')) {
    return cleanDatabaseUrl(process.argv[2]);
  }

  // 2. Try api/.env (usually has production URL)
  const apiEnvPath = path.join(projectRoot, 'api', '.env');
  if (fs.existsSync(apiEnvPath)) {
    dotenv.config({ path: apiEnvPath });
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
      console.log('📁 Loaded DATABASE_URL from api/.env');
      return cleanDatabaseUrl(process.env.DATABASE_URL);
    }
  }

  // 3. Try .env.production
  const prodEnvPath = path.join(projectRoot, '.env.production');
  if (fs.existsSync(prodEnvPath)) {
    dotenv.config({ path: prodEnvPath, override: true });
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
      console.log('📁 Loaded DATABASE_URL from .env.production');
      return cleanDatabaseUrl(process.env.DATABASE_URL);
    }
  }

  // 4. Fallback to root .env
  dotenv.config({ path: path.join(projectRoot, '.env'), override: true });
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
    console.log('📁 Loaded DATABASE_URL from .env');
    return cleanDatabaseUrl(process.env.DATABASE_URL);
  }

  return undefined;
}

async function run() {
  const connectionString = loadDatabaseUrl();
  
  if (!connectionString) {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║           🚀 HospoGo Migration: Atomic Settlement Engine                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ❌ Production DATABASE_URL not found!                                      ║
║                                                                            ║
║  Your .env files only contain localhost URLs. To run migration:            ║
║                                                                            ║
║  Option 1: Pass Neon URL directly as an argument:                          ║
║    npx tsx _legacy_snipshift/run-migration.ts "postgresql://user:pass@neon.tech/db"
║                                                                            ║
║  Option 2: Get it from Vercel:                                             ║
║    1. Go to vercel.com → Your Project → Settings → Environment Variables   ║
║    2. Copy the DATABASE_URL value                                          ║
║                                                                            ║
║  Option 3: Update api/.env with production DATABASE_URL                    ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }
  
  // Mask the password in logs
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':***@');
  console.log(`🔗 Database: ${maskedUrl.substring(0, 80)}...`);
  
  // Parse URL to extract hostname for better error messages
  let hostname = 'unknown';
  try {
    const url = new URL(connectionString);
    hostname = url.hostname;
  } catch (e) {
    // If URL parsing fails, try regex extraction
    const match = connectionString.match(/@([^:/\s]+)/);
    if (match) hostname = match[1];
  }

  // Determine SSL requirements
  const isNeon = connectionString.includes('neon.tech') || connectionString.includes('neon');
  const isSupabase = connectionString.includes('supabase');
  const requiresSSL = isNeon || isSupabase || connectionString.includes('sslmode=require');
  
  const client = new Client({
    connectionString,
    ssl: requiresSSL ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000, // 10 second timeout
  });

  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${hostname}`);
    console.log(`   SSL: ${requiresSSL ? 'enabled' : 'disabled'}`);
    
    await client.connect();
    console.log('✅ Connected!\n');

    const migrationPath = path.join(projectRoot, 'api/_src/db/migrations/0036_atomic_settlement_and_productivity_ready.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Applying Migration 0036: Atomic Settlement & Productivity Ready...');
    console.log('   - Adding settlement_id to payouts table');
    console.log('   - Adding settlement_id to financial_ledger_entries');
    console.log('   - Adding VEVO verification fields to profiles');
    console.log('   - Adding productivity_ready flag to profiles');
    console.log('');
    
    await client.query(sql);
    
    console.log('✅ Migration 0036 applied successfully!\n');
    
    // Verify the migration by checking for new columns
    const verifyPayouts = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payouts' AND column_name IN ('settlement_id', 'settlement_type')
    `);
    
    const verifyProfiles = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name IN ('vevo_verified', 'productivity_ready')
    `);
    
    console.log('📋 Verification:');
    console.log(`   - Payouts columns added: ${verifyPayouts.rows.map(r => r.column_name).join(', ')}`);
    console.log(`   - Profiles columns added: ${verifyProfiles.rows.map(r => r.column_name).join(', ')}`);
    
  } catch (err: any) {
    console.error('\n❌ Migration failed!\n');
    console.error('Error:', err.message);
    
    // Provide helpful error messages for common issues
    if (err.code === 'ENOTFOUND') {
      console.error('\n🔍 ENOTFOUND Error - Cannot resolve hostname');
      console.error(`   Hostname: ${hostname}`);
      console.error('   Possible causes:');
      console.error('   1. Network connectivity issue');
      console.error('   2. DNS resolution failure');
      console.error('   3. Incorrect hostname in DATABASE_URL');
      console.error('   4. Firewall blocking connection');
      console.error('\n   💡 Try:');
      console.error('   - Verify DATABASE_URL is correct');
      console.error('   - Check internet connection');
      console.error('   - Test DNS: nslookup ' + hostname);
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.error('\n🔍 Connection Error');
      console.error(`   Hostname: ${hostname}`);
      console.error('   Possible causes:');
      console.error('   1. Database server is down');
      console.error('   2. Firewall blocking port 5432');
      console.error('   3. Incorrect hostname or port');
    } else if (err.code === '28P01') {
      console.error('\n🔍 Authentication Error');
      console.error('   Invalid username or password');
      console.error('   Check DATABASE_URL credentials');
    }
    
    if (err.detail) console.error('\n   Detail:', err.detail);
    if (err.hint) console.error('   Hint:', err.hint);
    if (err.code) console.error('   Code:', err.code);
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

run();
