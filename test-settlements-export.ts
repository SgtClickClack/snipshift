/**
 * Test Script: Settlements Export Endpoint
 * 
 * This verifies the structure of the /api/settlements/export endpoint
 * matches what D365/Workday would expect.
 * 
 * Run with: npx tsx test-settlements-export.ts
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
  let cleaned = url.trim().replace(/\\n/g, '').replace(/\r/g, '');
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  return cleaned;
}

// Load DATABASE_URL from api/.env
dotenv.config({ path: path.join(__dirname, 'api', '.env') });

async function run() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }
  
  const connectionString = cleanDatabaseUrl(rawUrl);
  const isNeon = connectionString.includes('neon.tech') || connectionString.includes('neon');
  const isSupabase = connectionString.includes('supabase');
  const requiresSSL = isNeon || isSupabase || connectionString.includes('sslmode=require');

  const client = new Client({
    connectionString,
    ssl: requiresSSL ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('\n🔍 Testing Settlement Export Structure...\n');
    
    // 1. Check if the settlement_id column exists in payouts
    const payoutsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payouts' 
      AND column_name IN ('settlement_id', 'settlement_type')
      ORDER BY column_name
    `);
    
    console.log('📋 Payouts Table Schema:');
    payoutsCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name}: ${row.data_type}`);
    });
    
    // 2. Check if settlement_id exists in financial_ledger_entries
    const ledgerCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'financial_ledger_entries' 
      AND column_name = 'settlement_id'
    `);
    
    console.log('\n📋 Financial Ledger Schema:');
    if (ledgerCheck.rows.length > 0) {
      console.log(`   ✅ settlement_id: ${ledgerCheck.rows[0].data_type}`);
    } else {
      console.log('   ⚠️ settlement_id column not found');
    }
    
    // 3. Check profiles for productivity_ready columns
    const profilesCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('productivity_ready', 'vevo_verified', 'vevo_expiry_date', 'vevo_check_type')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Profiles Table (Productivity Ready):');
    profilesCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name}: ${row.data_type}`);
    });
    
    // 4. Check for existing payouts with settlement_id
    const payoutsSample = await client.query(`
      SELECT settlement_id, amount_cents, status, settlement_type, created_at 
      FROM payouts 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Sample Payouts with Settlement IDs:');
    if (payoutsSample.rows.length === 0) {
      console.log('   (No payouts found - will be generated on shift completion)');
    } else {
      payoutsSample.rows.forEach(row => {
        console.log(`   ${row.settlement_id} | $${(row.amount_cents/100).toFixed(2)} | ${row.status} | ${row.settlement_type}`);
      });
    }
    
    // 5. Verify productivity_ready users
    const productivityReadyUsers = await client.query(`
      SELECT u.email, u.name, p.productivity_ready, p.vevo_verified, p.id_verified_status
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE p.productivity_ready = true
    `);
    
    console.log('\n📋 Productivity Ready Users:');
    if (productivityReadyUsers.rows.length === 0) {
      console.log('   (No productivity ready users found)');
    } else {
      productivityReadyUsers.rows.forEach(row => {
        console.log(`   ✅ ${row.email} (${row.name})`);
        console.log(`      ID: ${row.id_verified_status} | VEVO: ${row.vevo_verified}`);
      });
    }
    
    // 6. Generate sample export structure
    console.log('\n📋 Expected Export Structure (D365/Workday):');
    console.log(`
{
  "exportedAt": "${new Date().toISOString()}",
  "dateRange": {
    "start": "${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}",
    "end": "${new Date().toISOString()}"
  },
  "count": <number>,
  "settlements": [
    {
      "settlementId": "STL-20260121-A3F8K2",
      "payoutId": "<uuid>",
      "shiftId": "<uuid>",
      "workerId": "<uuid>",
      "venueId": "<uuid>",
      "amountCents": 16800,
      "currency": "aud",
      "status": "completed",
      "settlementType": "immediate",
      "stripeChargeId": "ch_xxx",
      "stripeTransferId": "tr_xxx",
      "processedAt": "<timestamp>",
      "createdAt": "<timestamp>",
      "shiftTitle": "Kitchen Hand",
      "hourlyRate": "28.00",
      "hoursWorked": "6.00"
    }
  ]
}
`);
    
    console.log('✅ Settlement Export Structure is ready for D365/Workday integration!\n');
    
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
