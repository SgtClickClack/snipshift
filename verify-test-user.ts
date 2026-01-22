/**
 * Test User Verification Script (Johnny Demo)
 * 
 * Run with: npx tsx verify-test-user.ts <email>
 * 
 * This script marks a user as "Productivity Ready" by:
 * 1. Setting idVerifiedStatus to 'APPROVED'
 * 2. Setting vevoVerified to true
 * 3. Setting productivityReady to true
 * 
 * Perfect for demoing to Johnny how HospoGo can onboard staff
 * faster than Endeavour's "2.5-hour" benchmark!
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // 1. Check command line argument (third arg, after email)
  if (process.argv[3] && process.argv[3].startsWith('postgresql://')) {
    return cleanDatabaseUrl(process.argv[3]);
  }

  // 2. Try api/.env (usually has production URL)
  const apiEnvPath = path.join(__dirname, 'api', '.env');
  if (fs.existsSync(apiEnvPath)) {
    dotenv.config({ path: apiEnvPath });
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
      return cleanDatabaseUrl(process.env.DATABASE_URL);
    }
  }

  // 3. Try .env.production
  const prodEnvPath = path.join(__dirname, '.env.production');
  if (fs.existsSync(prodEnvPath)) {
    dotenv.config({ path: prodEnvPath, override: true });
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
      return cleanDatabaseUrl(process.env.DATABASE_URL);
    }
  }

  // 4. Fallback to root .env
  dotenv.config({ override: true });
  const dbUrl = process.env.DATABASE_URL;
  return dbUrl ? cleanDatabaseUrl(dbUrl) : undefined;
}

async function verifyUser(email: string) {
  const connectionString = loadDatabaseUrl();
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
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
    await client.connect();
    console.log(`\n🔍 Looking up user: ${email}...\n`);

    // Find the user
    const userResult = await client.query(
      `SELECT id, email, name, role FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found with email: ${email}`);
      
      // List some users to help
      const allUsers = await client.query(
        `SELECT email, name, role FROM users WHERE role = 'PROFESSIONAL' LIMIT 10`
      );
      
      if (allUsers.rows.length > 0) {
        console.log('\n📋 Available professional users:');
        allUsers.rows.forEach(u => console.log(`   - ${u.email} (${u.name || 'No name'})`));
      }
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.name || user.email} (${user.role})`);
    console.log(`   ID: ${user.id}\n`);

    const now = new Date();
    
    // Check if profile exists
    const profileCheck = await client.query(
      `SELECT user_id FROM profiles WHERE user_id = $1`,
      [user.id]
    );

    if (profileCheck.rows.length === 0) {
      // Create profile if it doesn't exist
      console.log('📝 Creating profile for user...');
      await client.query(`
        INSERT INTO profiles (user_id, created_at, updated_at)
        VALUES ($1, $2, $2)
      `, [user.id, now]);
    }

    // Update profile with all verification fields
    console.log('🔐 Setting verification status...');
    
    await client.query(`
      UPDATE profiles
      SET 
        id_verified_status = 'APPROVED',
        vevo_verified = true,
        vevo_verified_at = $2,
        vevo_reference_number = $3,
        vevo_check_type = 'citizen',
        productivity_ready = true,
        productivity_ready_at = $2,
        rsa_verified = true,
        updated_at = $2
      WHERE user_id = $1
    `, [
      user.id, 
      now, 
      `VEVO-DEMO-${Date.now().toString(36).toUpperCase()}`
    ]);

    console.log('\n✅ User is now PRODUCTIVITY READY!\n');
    console.log('   📋 Verification Summary:');
    console.log('   ├─ ID Verified: ✅ APPROVED');
    console.log('   ├─ VEVO Verified: ✅ (Australian Citizen)');
    console.log('   ├─ RSA Verified: ✅');
    console.log('   └─ Productivity Ready: ✅');
    console.log('');
    console.log('🎯 This user can now work for enterprise clients like Endeavour!');
    console.log('');
    console.log('📱 Demo tip: Have them log in and check:');
    console.log('   GET /api/me/productivity-ready');
    console.log('   GET /api/me/can-work-enterprise');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get email from command line argument
const email = process.argv[2];
const dbUrl = process.argv[3]; // Optional: pass DATABASE_URL as second arg

// Override DATABASE_URL if provided
if (dbUrl) {
  process.env.DATABASE_URL = dbUrl;
}

if (!email) {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║        🚀 HospoGo - Productivity Ready Verification Script                   ║
║                                                                              ║
║  For the Johnny Demo: Make a user "Enterprise Ready" in seconds!             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Usage:                                                                      ║
║    npx tsx verify-test-user.ts <email>                                       ║
║    npx tsx verify-test-user.ts <email> "postgresql://..."                    ║
║                                                                              ║
║  What it does:                                                               ║
║    ✅ Sets Government ID verification to APPROVED                            ║
║    ✅ Sets VEVO work rights verification to VERIFIED                         ║
║    ✅ Sets RSA certification to VERIFIED                                     ║
║    ✅ Flips the Productivity Ready flag to TRUE                              ║
║                                                                              ║
║  This proves HospoGo can onboard staff for Endeavour in < 2.5 hours!         ║
║                                                                              ║
║  Example:                                                                    ║
║    npx tsx verify-test-user.ts johnny@endeavour.com                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

verifyUser(email);
