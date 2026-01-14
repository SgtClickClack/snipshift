/**
 * Test Database Audit Script
 * 
 * Audits the test database to ensure all required test data exists:
 * - Business Plan ($149/month)
 * - TEST_VENUE_OWNER user with business role
 * - TEST_PROFESSIONAL user with professional role
 * - At least 3 active (open) shifts for marketplace testing
 * - CompleteSetupBanner dismissal note (stored in localStorage, not DB)
 * 
 * Usage:
 *   npx ts-node scripts/audit-test-db.ts
 * 
 * Environment:
 *   DATABASE_URL should point to test database (defaults to test DB if not set)
 */

import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Priority: .env.test > api/.env > .env
const testEnvPath = path.resolve(__dirname, '../.env.test');
const apiEnvPath = path.resolve(__dirname, '../api/.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

// Load .env.test first (highest priority for test scripts)
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath });
}
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// Test database constants from seed_data.ts
const TEST_VENUE_OWNER_EMAIL = 'venue-owner-e2e@hospogo.com';
const TEST_VENUE_OWNER_ID = '00000000-0000-4000-a000-000000000001';
const TEST_PROFESSIONAL_EMAIL = 'professional-e2e@hospogo.com';
const TEST_PROFESSIONAL_ID = '00000000-0000-4000-a000-000000000002';

import { getTestDatabaseUrl } from './test-db-config';

// Default test database URL if not provided
const DEFAULT_TEST_DB_URL = getTestDatabaseUrl();

interface AuditResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

async function auditTestDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || DEFAULT_TEST_DB_URL;
  
  console.log('🔍 Starting Test Database Audit...\n');
  console.log(`📊 Database: ${dbUrl.includes('localhost') ? 'Test DB (localhost:5433)' : 'Custom URL'}\n`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const results: AuditResult[] = [];

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Check for Business Plan with price $149.00
    console.log('1️⃣  Checking Business Plan ($149/month)...');
    const planResult = await client.query(
      `SELECT id, name, price, tier, is_active 
       FROM subscription_plans 
       WHERE name = 'Business' AND price = '149.00'`
    );

    if (planResult.rows.length > 0) {
      const plan = planResult.rows[0];
      const isActive = plan.is_active !== null;
      results.push({
        check: 'Business Plan ($149.00)',
        status: isActive ? 'PASS' : 'WARN',
        message: isActive 
          ? `✅ Business Plan found (ID: ${plan.id}, Tier: ${plan.tier})`
          : `⚠️  Business Plan found but not active (ID: ${plan.id})`,
        details: plan,
      });
      console.log(`   ${isActive ? '✅' : '⚠️ '} Business Plan: ${plan.name} - $${plan.price}/month (Tier: ${plan.tier})`);
    } else {
      results.push({
        check: 'Business Plan ($149.00)',
        status: 'FAIL',
        message: '❌ Business Plan with price $149.00 not found',
        details: null,
      });
      console.log('   ❌ Business Plan ($149.00) not found');
    }

    // 2. Check for TEST_VENUE_OWNER
    console.log('\n2️⃣  Checking TEST_VENUE_OWNER...');
    const venueOwnerResult = await client.query(
      `SELECT id, email, role, roles, is_onboarded, current_role 
       FROM users 
       WHERE email = $1 OR id = $2`,
      [TEST_VENUE_OWNER_EMAIL, TEST_VENUE_OWNER_ID]
    );

    if (venueOwnerResult.rows.length > 0) {
      const user = venueOwnerResult.rows[0];
      const hasBusinessRole = user.role === 'business' || 
                              (Array.isArray(user.roles) && user.roles.includes('business')) ||
                              (typeof user.roles === 'string' && user.roles.includes('business'));
      
      results.push({
        check: 'TEST_VENUE_OWNER',
        status: hasBusinessRole ? 'PASS' : 'FAIL',
        message: hasBusinessRole
          ? `✅ TEST_VENUE_OWNER found (ID: ${user.id}, Role: ${user.role})`
          : `❌ TEST_VENUE_OWNER found but role is not 'business' (Current: ${user.role})`,
        details: user,
      });
      console.log(`   ${hasBusinessRole ? '✅' : '❌'} TEST_VENUE_OWNER: ${user.email} (Role: ${user.role}, Onboarded: ${user.is_onboarded})`);
    } else {
      results.push({
        check: 'TEST_VENUE_OWNER',
        status: 'FAIL',
        message: `❌ TEST_VENUE_OWNER not found (Email: ${TEST_VENUE_OWNER_EMAIL}, ID: ${TEST_VENUE_OWNER_ID})`,
        details: null,
      });
      console.log(`   ❌ TEST_VENUE_OWNER not found`);
    }

    // 3. Check for TEST_PROFESSIONAL
    console.log('\n3️⃣  Checking TEST_PROFESSIONAL...');
    const professionalResult = await client.query(
      `SELECT id, email, role, roles, is_onboarded 
       FROM users 
       WHERE email = $1 OR id = $2`,
      [TEST_PROFESSIONAL_EMAIL, TEST_PROFESSIONAL_ID]
    );

    if (professionalResult.rows.length > 0) {
      const user = professionalResult.rows[0];
      const hasProfessionalRole = user.role === 'professional' || 
                                   (Array.isArray(user.roles) && user.roles.includes('professional')) ||
                                   (typeof user.roles === 'string' && user.roles.includes('professional'));
      
      results.push({
        check: 'TEST_PROFESSIONAL',
        status: hasProfessionalRole ? 'PASS' : 'FAIL',
        message: hasProfessionalRole
          ? `✅ TEST_PROFESSIONAL found (ID: ${user.id}, Role: ${user.role})`
          : `❌ TEST_PROFESSIONAL found but role is not 'professional' (Current: ${user.role})`,
        details: user,
      });
      console.log(`   ${hasProfessionalRole ? '✅' : '❌'} TEST_PROFESSIONAL: ${user.email} (Role: ${user.role}, Onboarded: ${user.is_onboarded})`);
    } else {
      results.push({
        check: 'TEST_PROFESSIONAL',
        status: 'FAIL',
        message: `❌ TEST_PROFESSIONAL not found (Email: ${TEST_PROFESSIONAL_EMAIL}, ID: ${TEST_PROFESSIONAL_ID})`,
        details: null,
      });
      console.log(`   ❌ TEST_PROFESSIONAL not found`);
    }

    // 4. Check for at least 3 active (open) shifts
    console.log('\n4️⃣  Checking for active shifts (status = "open")...');
    const shiftsResult = await client.query(
      `SELECT COUNT(*) as count, 
              array_agg(id) as shift_ids,
              array_agg(title) as titles
       FROM shifts 
       WHERE status = 'open'`
    );

    const shiftCount = parseInt(shiftsResult.rows[0]?.count || '0', 10);
    const minShiftsRequired = 3;

    if (shiftCount >= minShiftsRequired) {
      results.push({
        check: 'Active Shifts (open)',
        status: 'PASS',
        message: `✅ Found ${shiftCount} active shifts (required: ${minShiftsRequired})`,
        details: {
          count: shiftCount,
          shiftIds: shiftsResult.rows[0]?.shift_ids || [],
          titles: shiftsResult.rows[0]?.titles || [],
        },
      });
      console.log(`   ✅ Found ${shiftCount} active shifts`);
    } else {
      results.push({
        check: 'Active Shifts (open)',
        status: 'FAIL',
        message: `❌ Only ${shiftCount} active shifts found (required: ${minShiftsRequired})`,
        details: {
          count: shiftCount,
          shiftIds: shiftsResult.rows[0]?.shift_ids || [],
        },
      });
      console.log(`   ❌ Found only ${shiftCount} active shifts (need ${minShiftsRequired})`);
    }

    // 5. Note about CompleteSetupBanner dismissal
    console.log('\n5️⃣  CompleteSetupBanner Dismissal...');
    results.push({
      check: 'CompleteSetupBanner Dismissal',
      status: 'WARN',
      message: 'ℹ️  CompleteSetupBanner dismissal is stored in localStorage (not database)',
      details: {
        note: 'Dismissal key: "hospogo_setup_banner_dismissed"',
        location: 'localStorage (browser)',
        testNote: 'Ensure test user does NOT have this key set in localStorage for banner tests',
      },
    });
    console.log('   ℹ️  Stored in localStorage (not database)');
    console.log('   ℹ️  Key: "hospogo_setup_banner_dismissed"');
    console.log('   ℹ️  Ensure test user does NOT have this set for banner tests');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 AUDIT SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARN').length;

    results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️ ';
      console.log(`${icon} ${result.check}: ${result.message}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${results.length} checks`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n❌ Audit failed! Please run: npm run db:seed:test -- --force');
      process.exit(1);
    } else if (warnings > 0) {
      console.log('\n⚠️  Audit passed with warnings. Review warnings above.');
      process.exit(0);
    } else {
      console.log('\n✅ All checks passed! Test database is ready for E2E tests.');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('\n❌ Error during audit:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Database connection refused. Ensure test database is running.');
      console.error('   For test DB: docker-compose -f api/docker-compose.test.yml up -d');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the audit
auditTestDatabase();
