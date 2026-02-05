/**
 * Demo Data Seeding Script - Executive Profiles & Flagship Venue
 * 
 * Seeds the database with:
 * - Rick Cavanagh (CEO) admin profile
 * - Brisbane Foundry flagship venue association
 * 
 * Usage:
 *   ts-node _src/scripts/seed-demo-data.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { getDatabase } from '../db/connection.js';

// Load environment variables
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

// Executive profile data
const RICK_CEO_PROFILE = {
  email: 'rick@hospogo.com',
  name: 'Rick Cavanagh (CEO)',
  role: 'admin',
  currentRole: 'admin',
  firebaseUid: 'rick-ceo-demo-uid', // Placeholder - will be overwritten on first Firebase auth
  avatarUrl: null,
  isOnboarded: true,
  onboardingCompletedAt: new Date().toISOString(),
};

// Brisbane Foundry flagship venue
const BRISBANE_FOUNDRY_VENUE = {
  name: 'Brisbane Foundry',
  slug: 'brisbane-foundry',
  address: '123 Hospitality Lane, Brisbane CBD, QLD 4000',
  description: 'The flagship HospoGo pilot venue - Brisbane\'s premier hospitality innovation hub.',
  phone: '+61 7 1234 5678',
  isActive: true,
  xeroConnected: true,
  xeroTenantName: 'Brisbane Foundry Pty Ltd',
};

async function seedDemoData() {
  const pool = getDatabase();
  if (!pool) {
    console.error('❌ Database connection failed.');
    process.exit(1);
  }

  console.log('🚀 Starting demo data seeding...');
  console.log('');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Upsert Rick CEO profile
    console.log('👤 Seeding Rick Cavanagh (CEO) profile...');
    const existingRick = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [RICK_CEO_PROFILE.email]
    );

    let rickUserId: string;
    
    if (existingRick.rows.length > 0) {
      // Update existing
      rickUserId = existingRick.rows[0].id;
      await client.query(
        `UPDATE users SET 
          name = $1, 
          role = $2, 
          "currentRole" = $3,
          "isOnboarded" = $4,
          "onboardingCompletedAt" = $5,
          "updatedAt" = NOW()
        WHERE email = $6`,
        [
          RICK_CEO_PROFILE.name,
          RICK_CEO_PROFILE.role,
          RICK_CEO_PROFILE.currentRole,
          RICK_CEO_PROFILE.isOnboarded,
          RICK_CEO_PROFILE.onboardingCompletedAt,
          RICK_CEO_PROFILE.email,
        ]
      );
      console.log('   ✅ Updated existing Rick profile');
    } else {
      // Insert new
      const insertResult = await client.query(
        `INSERT INTO users (email, name, role, "currentRole", "firebaseUid", "isOnboarded", "onboardingCompletedAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id`,
        [
          RICK_CEO_PROFILE.email,
          RICK_CEO_PROFILE.name,
          RICK_CEO_PROFILE.role,
          RICK_CEO_PROFILE.currentRole,
          RICK_CEO_PROFILE.firebaseUid,
          RICK_CEO_PROFILE.isOnboarded,
          RICK_CEO_PROFILE.onboardingCompletedAt,
        ]
      );
      rickUserId = insertResult.rows[0].id;
      console.log('   ✅ Created new Rick profile');
    }

    // 2. Upsert Brisbane Foundry venue
    console.log('🏢 Seeding Brisbane Foundry flagship venue...');
    const existingVenue = await client.query(
      'SELECT id FROM venues WHERE slug = $1',
      [BRISBANE_FOUNDRY_VENUE.slug]
    );

    let venueId: string;
    
    if (existingVenue.rows.length > 0) {
      venueId = existingVenue.rows[0].id;
      await client.query(
        `UPDATE venues SET 
          name = $1,
          address = $2,
          description = $3,
          phone = $4,
          "isActive" = $5,
          "xeroConnected" = $6,
          "xeroTenantName" = $7,
          "updatedAt" = NOW()
        WHERE slug = $8`,
        [
          BRISBANE_FOUNDRY_VENUE.name,
          BRISBANE_FOUNDRY_VENUE.address,
          BRISBANE_FOUNDRY_VENUE.description,
          BRISBANE_FOUNDRY_VENUE.phone,
          BRISBANE_FOUNDRY_VENUE.isActive,
          BRISBANE_FOUNDRY_VENUE.xeroConnected,
          BRISBANE_FOUNDRY_VENUE.xeroTenantName,
          BRISBANE_FOUNDRY_VENUE.slug,
        ]
      );
      console.log('   ✅ Updated existing Brisbane Foundry venue');
    } else {
      const insertVenueResult = await client.query(
        `INSERT INTO venues (name, slug, address, description, phone, "isActive", "xeroConnected", "xeroTenantName", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          BRISBANE_FOUNDRY_VENUE.name,
          BRISBANE_FOUNDRY_VENUE.slug,
          BRISBANE_FOUNDRY_VENUE.address,
          BRISBANE_FOUNDRY_VENUE.description,
          BRISBANE_FOUNDRY_VENUE.phone,
          BRISBANE_FOUNDRY_VENUE.isActive,
          BRISBANE_FOUNDRY_VENUE.xeroConnected,
          BRISBANE_FOUNDRY_VENUE.xeroTenantName,
        ]
      );
      venueId = insertVenueResult.rows[0].id;
      console.log('   ✅ Created new Brisbane Foundry venue');
    }

    // 3. Associate Rick with Brisbane Foundry
    console.log('🔗 Associating Rick with Brisbane Foundry...');
    await client.query(
      `UPDATE users SET "venueId" = $1 WHERE id = $2`,
      [venueId, rickUserId]
    );
    console.log('   ✅ Rick Cavanagh is now owner of Brisbane Foundry');

    await client.query('COMMIT');
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ DEMO DATA SEEDING COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('  👤 CEO Profile:');
    console.log(`     Email: ${RICK_CEO_PROFILE.email}`);
    console.log(`     Name:  ${RICK_CEO_PROFILE.name}`);
    console.log(`     Role:  ${RICK_CEO_PROFILE.role}`);
    console.log('');
    console.log('  🏢 Flagship Venue:');
    console.log(`     Name:    ${BRISBANE_FOUNDRY_VENUE.name}`);
    console.log(`     Address: ${BRISBANE_FOUNDRY_VENUE.address}`);
    console.log(`     Xero:    Connected (${BRISBANE_FOUNDRY_VENUE.xeroTenantName})`);
    console.log('');
    console.log('  🎯 Ready for investor demo!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Demo data seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoData();
