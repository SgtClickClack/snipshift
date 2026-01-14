/**
 * Test Database Seeding Script
 * 
 * Seeds the test database with all required test data for E2E tests:
 * - Business Plan ($149/month)
 * - TEST_VENUE_OWNER user with business role
 * - TEST_PROFESSIONAL user with professional role
 * - At least 3 active (open) shifts for marketplace testing
 * 
 * Usage:
 *   npx tsx scripts/seed-test-db.ts [--force]
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
const TEST_VENUE_OWNER_NAME = 'Hospogo E2E Venue Owner';

const TEST_PROFESSIONAL_EMAIL = 'professional-e2e@hospogo.com';
const TEST_PROFESSIONAL_ID = '00000000-0000-4000-a000-000000000002';
const TEST_PROFESSIONAL_NAME = 'E2E Test Professional';

import { getTestDatabaseUrl, getTestDatabaseConfig, maskConnectionString } from './test-db-config';

// Default test database URL if not provided
const DEFAULT_TEST_DB_URL = getTestDatabaseUrl();

const forceFlag = process.argv.includes('--force');

async function seedTestDatabase(): Promise<void> {
  // Use getTestDatabaseUrl() to ensure we use the same database as the audit script
  const dbUrl = getTestDatabaseUrl();
  const maskedUrl = maskConnectionString(dbUrl);
  
  console.log('🌱 Starting Test Database Seeding...\n');
  console.log(`📊 Database: ${maskedUrl}`);
  console.log(`🔄 Force mode: ${forceFlag ? 'ON' : 'OFF'}\n`);

  const dbConfig = getTestDatabaseConfig();
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Seed Business Plan ($149.00/month)
    console.log('1️⃣  Seeding Business Plan ($149.00/month)...');
    const planCheck = await client.query(
      `SELECT id FROM subscription_plans WHERE name = 'Business Plan' AND price = '149.00'`
    );

    if (planCheck.rows.length > 0 && !forceFlag) {
      console.log('   ℹ️  Business Plan already exists, skipping...');
    } else {
      if (forceFlag && planCheck.rows.length > 0) {
        await client.query(
          `UPDATE subscription_plans 
           SET tier = 'business', 
               description = 'For growing venues that want to eliminate booking fees and access premium features.',
               features = $1,
               booking_fee_waived = NOW(),
               is_active = NOW(),
               updated_at = NOW()
           WHERE name = 'Business Plan' AND price = '149.00'`,
          [JSON.stringify([
            'Everything in Starter',
            'No Booking Fees',
            'Priority Listing',
            'Advanced Analytics',
            'Priority Support',
            '14-Day Free Trial',
          ])]
        );
        console.log('   ✅ Updated Business Plan');
      } else {
        await client.query(
          `INSERT INTO subscription_plans (
            name, description, price, interval, tier, 
            booking_fee_waived, is_active, features, created_at, updated_at
          ) VALUES (
            'Business Plan',
            'For growing venues that want to eliminate booking fees and access premium features.',
            '149.00',
            'month',
            'business',
            NOW(),
            NOW(),
            $1,
            NOW(),
            NOW()
          ) ON CONFLICT DO NOTHING`,
          [JSON.stringify([
            'Everything in Starter',
            'No Booking Fees',
            'Priority Listing',
            'Advanced Analytics',
            'Priority Support',
            '14-Day Free Trial',
          ])]
        );
        console.log('   ✅ Created Business Plan ($149.00/month)');
      }
    }

    // 2. Seed TEST_VENUE_OWNER
    console.log('\n2️⃣  Seeding TEST_VENUE_OWNER...');
    const venueOwnerCheck = await client.query(
      `SELECT id, role, roles FROM users WHERE email = $1 OR id = $2`,
      [TEST_VENUE_OWNER_EMAIL, TEST_VENUE_OWNER_ID]
    );

    if (venueOwnerCheck.rows.length > 0) {
      const user = venueOwnerCheck.rows[0];
      const needsUpdate = user.role !== 'business' || 
                         (Array.isArray(user.roles) && !user.roles.includes('business')) ||
                         (typeof user.roles === 'string' && !user.roles.includes('business'));

      if (needsUpdate || forceFlag) {
        await client.query(
          `UPDATE users 
           SET role = 'business',
               roles = ARRAY['business']::text[],
               name = $1,
               is_onboarded = true,
               updated_at = NOW()
           WHERE id = $2`,
          [TEST_VENUE_OWNER_NAME, user.id]
        );
        console.log(`   ✅ Updated TEST_VENUE_OWNER (ID: ${user.id})`);
      } else {
        console.log(`   ℹ️  TEST_VENUE_OWNER already exists with correct role (ID: ${user.id})`);
      }
    } else {
      await client.query(
        `INSERT INTO users (
          id, email, name, role, roles, is_onboarded, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'business', ARRAY['business']::text[], true, NOW(), NOW()
        )`,
        [TEST_VENUE_OWNER_ID, TEST_VENUE_OWNER_EMAIL, TEST_VENUE_OWNER_NAME]
      );
      console.log(`   ✅ Created TEST_VENUE_OWNER (ID: ${TEST_VENUE_OWNER_ID})`);
    }

    // 3. Seed TEST_PROFESSIONAL
    console.log('\n3️⃣  Seeding TEST_PROFESSIONAL...');
    const professionalCheck = await client.query(
      `SELECT id, role, roles FROM users WHERE email = $1 OR id = $2`,
      [TEST_PROFESSIONAL_EMAIL, TEST_PROFESSIONAL_ID]
    );

    if (professionalCheck.rows.length > 0) {
      const user = professionalCheck.rows[0];
      const needsUpdate = user.role !== 'professional' || 
                         (Array.isArray(user.roles) && !user.roles.includes('professional')) ||
                         (typeof user.roles === 'string' && !user.roles.includes('professional'));

      if (needsUpdate || forceFlag) {
        await client.query(
          `UPDATE users 
           SET role = 'professional',
               roles = ARRAY['professional']::text[],
               name = $1,
               is_onboarded = true,
               updated_at = NOW()
           WHERE id = $2`,
          [TEST_PROFESSIONAL_NAME, user.id]
        );
        console.log(`   ✅ Updated TEST_PROFESSIONAL (ID: ${user.id})`);
      } else {
        console.log(`   ℹ️  TEST_PROFESSIONAL already exists with correct role (ID: ${user.id})`);
      }
    } else {
      await client.query(
        `INSERT INTO users (
          id, email, name, role, roles, is_onboarded, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'professional', ARRAY['professional']::text[], true, NOW(), NOW()
        )`,
        [TEST_PROFESSIONAL_ID, TEST_PROFESSIONAL_EMAIL, TEST_PROFESSIONAL_NAME]
      );
      console.log(`   ✅ Created TEST_PROFESSIONAL (ID: ${TEST_PROFESSIONAL_ID})`);
    }

    // 4. Seed at least 3 active (open) shifts
    console.log('\n4️⃣  Seeding active shifts (status = "open")...');
    const shiftsCheck = await client.query(
      `SELECT COUNT(*) as count FROM shifts WHERE status = 'open'`
    );
    const existingShiftsCount = parseInt(shiftsCheck.rows[0]?.count || '0', 10);
    const minShiftsRequired = 3;
    const shiftsToCreate = Math.max(0, minShiftsRequired - existingShiftsCount);

    if (shiftsToCreate > 0 || forceFlag) {
      // Get venue owner ID
      const venueOwnerResult = await client.query(
        `SELECT id FROM users WHERE id = $1`,
        [TEST_VENUE_OWNER_ID]
      );
      
      if (venueOwnerResult.rows.length === 0) {
        throw new Error('TEST_VENUE_OWNER not found. Cannot create shifts.');
      }

      const venueOwnerId = venueOwnerResult.rows[0].id;

      // Calculate dates for shifts (next week)
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      nextWeek.setHours(0, 0, 0, 0);

      // Create shifts with valid UUIDs
      // Use these exact UUIDs for the 3 required shifts
      const shiftUuids = [
        '00000000-0000-4000-a000-000000000011', // Shift 1
        '00000000-0000-4000-a000-000000000012', // Shift 2
        '00000000-0000-4000-a000-000000000013', // Shift 3
      ];
      const shiftsToInsert = [];
      // Always create exactly 3 shifts with the specified UUIDs
      const numShiftsToCreate = Math.max(shiftsToCreate, 3);
      for (let i = 0; i < numShiftsToCreate; i++) {
        const shiftDate = new Date(nextWeek);
        shiftDate.setDate(nextWeek.getDate() + i);
        
        const startTime = new Date(shiftDate);
        startTime.setHours(9 + i, 0, 0, 0);
        
        const endTime = new Date(shiftDate);
        endTime.setHours(17 + i, 0, 0, 0);

        shiftsToInsert.push({
          id: shiftUuids[i] || `00000000-0000-4000-a000-0000000000${String(14 + i).padStart(2, '0')}`,
          title: `Hospogo Test Shift ${i + 1}`,
          description: `Active shift ${i + 1} for marketplace testing`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hourlyRate: (45 + i * 5).toString(),
          status: 'open',
          location: `${100 + i} Hospogo Test Street`,
          employerId: venueOwnerId,
        });
      }

      // Delete existing shifts if force mode
      if (forceFlag) {
        await client.query(
          `DELETE FROM shifts WHERE employer_id = $1 AND status = 'open'`,
          [venueOwnerId]
        );
        console.log('   🗑️  Deleted existing open shifts (force mode)');
      }

      // Insert shifts
      for (const shift of shiftsToInsert) {
        await client.query(
          `INSERT INTO shifts (
            id, employer_id, title, description, start_time, end_time,
            hourly_rate, status, location, cancellation_window_hours,
            is_emergency_fill, rsa_required, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, 24, false, false, NOW(), NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            hourly_rate = EXCLUDED.hourly_rate,
            status = EXCLUDED.status,
            location = EXCLUDED.location,
            updated_at = NOW()`,
          [
            shift.id,
            shift.employerId,
            shift.title,
            shift.description,
            shift.startTime,
            shift.endTime,
            shift.hourlyRate,
            shift.status,
            shift.location,
          ]
        );
      }

      console.log(`   ✅ Created/Updated ${shiftsToInsert.length} active shifts`);
    } else {
      console.log(`   ℹ️  Already have ${existingShiftsCount} active shifts (required: ${minShiftsRequired})`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Seeding Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Seeded:');
    console.log('   ✅ Business Plan ($149.00/month)');
    console.log('   ✅ TEST_VENUE_OWNER (business role)');
    console.log('   ✅ TEST_PROFESSIONAL (professional role)');
    console.log('   ✅ Active shifts (status = "open")');
    console.log('\n💡 Note: CompleteSetupBanner dismissal is stored in localStorage, not database.');
    console.log('   Ensure test user does NOT have "hospogo_setup_banner_dismissed" key set.\n');

  } catch (error: any) {
    console.error('\n❌ Error during seeding:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Database connection refused. Ensure test database is running.');
      console.error('   For test DB: docker-compose -f api/docker-compose.test.yml up -d');
    } else if (error.code === '42P01') {
      console.error('   Table does not exist. Run migrations first:');
      console.error('   cd api && npx drizzle-kit push');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the seeding
seedTestDatabase();
