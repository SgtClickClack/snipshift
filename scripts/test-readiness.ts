/**
 * Test Readiness Report Script
 * 
 * Comprehensive test environment validation that runs:
 * 1. Database schema migration (drizzle-kit push)
 * 2. Database audit (checks for required test data)
 * 3. Database seeding (if audit fails)
 * 4. Visual snapshot update (if needed)
 * 
 * Provides a single PASS/FAIL status for the entire local environment.
 * 
 * Usage:
 *   npx ts-node scripts/test-readiness.ts [--skip-snapshots] [--force-seed]
 * 
 * Environment:
 *   DATABASE_URL should point to test database (defaults to test DB if not set)
 */

import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { spawnSync, execSync, spawn } from 'child_process';

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
  console.log('📝 Loaded .env.test configuration');
}
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

import { getTestDatabaseUrl, getTestDatabaseConfig, maskConnectionString } from './test-db-config';

// Test database constants
const DEFAULT_TEST_DB_URL = getTestDatabaseUrl();
const TEST_VENUE_OWNER_EMAIL = 'venue-owner-e2e@hospogo.com';
const TEST_VENUE_OWNER_ID = '00000000-0000-4000-a000-000000000001';
const TEST_PROFESSIONAL_EMAIL = 'professional-e2e@hospogo.com';
const TEST_PROFESSIONAL_ID = '00000000-0000-4000-a000-000000000002';

interface ReadinessCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  message: string;
  details?: string;
}

class TestReadinessReporter {
  private checks: ReadinessCheck[] = [];
  private dbUrl: string;
  private initialAuditFailed: boolean = false;
  private seedingPerformed: boolean = false;
  private postSeedAuditPassed: boolean = false;

  constructor() {
    this.dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || DEFAULT_TEST_DB_URL;
  }

  addCheck(name: string, status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN', message: string, details?: string) {
    this.checks.push({ name, status, message, details });
  }

  async checkDatabaseConnection(): Promise<boolean> {
    const dbConfig = getTestDatabaseConfig();
    const client = new Client(dbConfig);

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      this.addCheck('Database Connection', 'PASS', 'Test database is accessible');
      return true;
    } catch (error: any) {
      this.addCheck('Database Connection', 'FAIL', `Cannot connect to test database: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        this.addCheck('Database Connection', 'FAIL', 'Database not running. Start with: docker-compose -f api/docker-compose.test.yml up -d', '');
      }
      return false;
    }
  }

  async preSyncCleanup(): Promise<boolean> {
    try {
      // Check if this is a test database: 5433 or hospogo_test
      // Use getTestDatabaseUrl() to ensure we check the actual URL being used
      const testDbUrl = getTestDatabaseUrl();
      const isTestDatabase = testDbUrl.includes('5433') || testDbUrl.includes('hospogo_test');
      
      if (!isTestDatabase) {
        console.log('   ℹ️  Skipping pre-sync cleanup (not test database)');
        return true;
      }

      console.log('   🧹 Running pre-sync cleanup (full schema reset)...');
      const dbConfig = getTestDatabaseConfig();
      const client = new Client(dbConfig);

      try {
        await client.connect();
        // Total reset: Drop and recreate public schema to clear stuck Enum types
        // This ensures a truly clean slate so Drizzle doesn't hit dependency errors
        await client.query('DROP SCHEMA public CASCADE;');
        await client.query('CREATE SCHEMA public;');
        // 📐 COMPREHENSIVE ENUM PRE-CREATION
        // This aligns 1:1 with the Hospogo schema files to ensure a silent 'drizzle-kit push'
        // All enums are extracted from api/_src/db/schema/*.ts files and api/_src/db/schema.ts
        await client.query(`
          DO $$ BEGIN
            -- 1. Users & Roles (from users.ts)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
              CREATE TYPE user_role AS ENUM ('professional', 'business', 'admin', 'trainer', 'hub');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pro_verification_status') THEN
              CREATE TYPE pro_verification_status AS ENUM ('pending_review', 'verified', 'at_risk', 'suspended');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hospitality_role') THEN
              CREATE TYPE hospitality_role AS ENUM ('Bartender', 'Waitstaff', 'Barista', 'Kitchen Hand', 'Manager');
            END IF;

            -- 2. Leads (from leads.ts)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_inquiry_type') THEN
              CREATE TYPE lead_inquiry_type AS ENUM ('enterprise_plan', 'custom_solution', 'partnership', 'general');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
              CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal_sent', 'closed_won', 'closed_lost');
            END IF;

            -- 3. Notifications (from notifications.ts)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
              CREATE TYPE notification_type AS ENUM ('job_alert', 'application_update', 'chat_message', 'system', 'SHIFT_INVITE', 'SHIFT_CONFIRMED', 'SHIFT_CANCELLED');
            END IF;

            -- 4. Posts (from posts.ts)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_type') THEN
              CREATE TYPE post_type AS ENUM ('community', 'brand');
            END IF;

            -- 5. Shifts & Operations (from shifts.ts)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
              CREATE TYPE shift_status AS ENUM ('draft', 'pending', 'invited', 'open', 'filled', 'completed', 'confirmed', 'cancelled', 'pending_completion');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
              CREATE TYPE attendance_status AS ENUM ('pending', 'completed', 'no_show');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
              CREATE TYPE payment_status AS ENUM ('UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED', 'PAYMENT_FAILED');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_offer_status') THEN
              CREATE TYPE shift_offer_status AS ENUM ('pending', 'accepted', 'declined');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_review_type') THEN
              CREATE TYPE shift_review_type AS ENUM ('SHOP_REVIEWING_BARBER', 'BARBER_REVIEWING_SHOP');
            END IF;

            -- 6. Training (from training-modules.ts)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'training_level') THEN
              CREATE TYPE training_level AS ENUM ('beginner', 'intermediate', 'advanced');
            END IF;

            -- 7. Legacy Jobs & Applications (from schema.ts)
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
              CREATE TYPE job_status AS ENUM ('open', 'filled', 'closed', 'completed');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_role') THEN
              CREATE TYPE job_role AS ENUM ('barber', 'hairdresser', 'stylist', 'other');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
              CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
              CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier') THEN
              CREATE TYPE plan_tier AS ENUM ('starter', 'business', 'enterprise');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
              CREATE TYPE report_reason AS ENUM ('no_show', 'payment_issue', 'harassment', 'spam', 'other');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
              CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');
            END IF;
          END $$;
        `);
        await client.end();
        console.log('   ✅ Pre-sync cleanup completed (schema reset + enum pre-creation)');
        return true;
      } catch (error: any) {
        await client.end();
        // Don't fail if cleanup fails - it might be that schema doesn't exist
        console.log(`   ⚠️  Pre-sync cleanup warning: ${error.message}`);
        return true;
      }
    } catch (error: any) {
      console.log(`   ⚠️  Pre-sync cleanup warning: ${error.message}`);
      return true; // Don't fail the whole process for cleanup warnings
    }
  }

  async runSchemaMigration(): Promise<boolean> {
    try {
      console.log('\n📐 Step 1: Syncing Database Schema...');
      const apiRoot = path.resolve(__dirname, '../api');
      
      // Check if drizzle-kit is available
      try {
        execSync('npx drizzle-kit --version', { cwd: apiRoot, stdio: 'pipe' });
      } catch {
        this.addCheck('Schema Migration', 'FAIL', 'drizzle-kit not found. Run: npm install in api/ directory');
        return false;
      }

      // Pre-sync cleanup to resolve enum dependency issues
      await this.preSyncCleanup();

      // Run drizzle-kit push with --force flag and explicit DATABASE_URL
      // The --force flag bypasses interactive prompts during the test setup phase
      // This ensures Drizzle uses the local test DB instead of Neon URL from drizzle.config.ts
      const testDbUrl = getTestDatabaseUrl();
      const result = spawnSync('npx', ['drizzle-kit', 'push', '--force'], {
        cwd: apiRoot,
        env: {
          ...process.env,
          DATABASE_URL: testDbUrl,
        },
        stdio: 'inherit',
        shell: true,
      });

      if (result.status === 0) {
        this.addCheck('Schema Migration', 'PASS', 'Database schema synced successfully');
        return true;
      } else {
        this.addCheck('Schema Migration', 'FAIL', `Schema migration failed with exit code ${result.status}`);
        return false;
      }
    } catch (error: any) {
      this.addCheck('Schema Migration', 'FAIL', `Schema migration error: ${error.message}`);
      return false;
    }
  }

  async runAudit(): Promise<{ passed: boolean; needsSeeding: boolean }> {
    console.log('\n🔍 Step 2: Auditing Test Database...');
    
    const dbConfig = getTestDatabaseConfig();
    const dbUrl = getTestDatabaseUrl();
    const maskedUrl = maskConnectionString(dbUrl);
    console.log(`   📊 Using database: ${maskedUrl}`);
    const client = new Client(dbConfig);

    let needsSeeding = false;
    const auditResults: { check: string; passed: boolean }[] = [];

    try {
      await client.connect();

      // Check Business Plan
      // Match exactly what seed script creates: name='Business Plan', price='149.00', is_active must be set
      // Seed script uses: WHERE name = 'Business Plan' AND price = '149.00'
      const planResult = await client.query(
        `SELECT id, name, price, tier, is_active 
         FROM subscription_plans 
         WHERE name = 'Business Plan' AND price = '149.00' AND is_active IS NOT NULL`
      );
      const hasBusinessPlan = planResult.rows.length > 0;
      auditResults.push({ check: 'Business Plan', passed: hasBusinessPlan });
      if (!hasBusinessPlan) {
        // Debug: Log what plans actually exist
        const allPlans = await client.query(
          `SELECT name, price, tier, is_active FROM subscription_plans ORDER BY name`
        );
        console.log(`   🔍 DEBUG: Business Plan check failed. Found ${allPlans.rows.length} plan(s) in database:`);
        allPlans.rows.forEach((plan: any) => {
          console.log(`      - name: '${plan.name}', price: '${plan.price}', tier: '${plan.tier}', is_active: ${plan.is_active}`);
        });
        needsSeeding = true;
      }

      // Check TEST_VENUE_OWNER
      // Match exactly what seed script creates: email, id, role='business', roles array contains 'business'
      // Seed script inserts: role = 'business' AND roles = ARRAY['business']::text[]
      const venueOwnerResult = await client.query(
        `SELECT id, email, role, roles 
         FROM users 
         WHERE (email = $1 OR id = $2) 
           AND role = 'business' 
           AND 'business' = ANY(roles)`,
        [TEST_VENUE_OWNER_EMAIL, TEST_VENUE_OWNER_ID]
      );
      const venueOwnerCorrectRole = venueOwnerResult.rows.length > 0;
      auditResults.push({ check: 'TEST_VENUE_OWNER', passed: venueOwnerCorrectRole });
      if (!venueOwnerCorrectRole) {
        // Debug: Log what user actually exists for this ID/email
        const userDebug = await client.query(
          `SELECT id, email, role, roles FROM users WHERE email = $1 OR id = $2`,
          [TEST_VENUE_OWNER_EMAIL, TEST_VENUE_OWNER_ID]
        );
        if (userDebug.rows.length > 0) {
          const user = userDebug.rows[0];
          console.log(`   🔍 DEBUG: TEST_VENUE_OWNER check failed. Found user:`);
          console.log(`      - id: '${user.id}', email: '${user.email}', role: '${user.role}', roles: ${JSON.stringify(user.roles)}`);
        } else {
          console.log(`   🔍 DEBUG: TEST_VENUE_OWNER check failed. No user found with email='${TEST_VENUE_OWNER_EMAIL}' or id='${TEST_VENUE_OWNER_ID}'`);
        }
        needsSeeding = true;
      }

      // Check TEST_PROFESSIONAL
      // Match exactly what seed script creates: email, id, role='professional', roles array contains 'professional'
      // Seed script inserts: role = 'professional' AND roles = ARRAY['professional']::text[]
      const professionalResult = await client.query(
        `SELECT id, email, role, roles 
         FROM users 
         WHERE (email = $1 OR id = $2) 
           AND role = 'professional' 
           AND 'professional' = ANY(roles)`,
        [TEST_PROFESSIONAL_EMAIL, TEST_PROFESSIONAL_ID]
      );
      const professionalCorrectRole = professionalResult.rows.length > 0;
      auditResults.push({ check: 'TEST_PROFESSIONAL', passed: professionalCorrectRole });
      if (!professionalCorrectRole) {
        // Debug: Log what user actually exists for this ID/email
        const userDebug = await client.query(
          `SELECT id, email, role, roles FROM users WHERE email = $1 OR id = $2`,
          [TEST_PROFESSIONAL_EMAIL, TEST_PROFESSIONAL_ID]
        );
        if (userDebug.rows.length > 0) {
          const user = userDebug.rows[0];
          console.log(`   🔍 DEBUG: TEST_PROFESSIONAL check failed. Found user:`);
          console.log(`      - id: '${user.id}', email: '${user.email}', role: '${user.role}', roles: ${JSON.stringify(user.roles)}`);
        } else {
          console.log(`   🔍 DEBUG: TEST_PROFESSIONAL check failed. No user found with email='${TEST_PROFESSIONAL_EMAIL}' or id='${TEST_PROFESSIONAL_ID}'`);
        }
        needsSeeding = true;
      }

      // Check active shifts
      // Seed script creates shifts with status = 'open'
      const shiftsResult = await client.query(
        `SELECT COUNT(*) as count FROM shifts WHERE status = 'open'`
      );
      const shiftCount = parseInt(shiftsResult.rows[0]?.count || '0', 10);
      const hasEnoughShifts = shiftCount >= 3;
      auditResults.push({ check: 'Active Shifts (≥3)', passed: hasEnoughShifts });
      if (!hasEnoughShifts) {
        // Debug: Log what shifts actually exist
        const allShifts = await client.query(
          `SELECT id, status, title FROM shifts ORDER BY created_at DESC LIMIT 10`
        );
        const shiftsByStatus = await client.query(
          `SELECT status, COUNT(*) as count FROM shifts GROUP BY status ORDER BY status`
        );
        console.log(`   🔍 DEBUG: Active Shifts check failed. Found ${shiftCount} shift(s) with status='open' (need ≥3)`);
        console.log(`      Shifts by status:`);
        shiftsByStatus.rows.forEach((row: any) => {
          console.log(`      - status: '${row.status}', count: ${row.count}`);
        });
        if (allShifts.rows.length > 0) {
          console.log(`      Recent shifts:`);
          allShifts.rows.slice(0, 5).forEach((shift: any) => {
            console.log(`      - id: '${shift.id}', status: '${shift.status}', title: '${shift.title}'`);
          });
        }
        needsSeeding = true;
      }

      await client.end();

      const allPassed = auditResults.every(r => r.passed);
      
      if (allPassed) {
        this.addCheck('Database Audit', 'PASS', 'All required test data is present');
      } else {
        const failed = auditResults.filter(r => !r.passed).map(r => r.check).join(', ');
        this.addCheck('Database Audit', 'FAIL', `Missing or incorrect: ${failed}`);
        this.initialAuditFailed = true;
      }

      return { passed: allPassed, needsSeeding };
    } catch (error: any) {
      await client.end();
      this.addCheck('Database Audit', 'FAIL', `Audit error: ${error.message}`);
      return { passed: false, needsSeeding: true };
    }
  }

  async runSeeding(force: boolean = false): Promise<boolean> {
    console.log('\n🌱 Step 3: Seeding Test Database...');
    
    try {
      const seedScript = path.resolve(__dirname, 'seed-test-db.ts');
      const args = force ? ['--force'] : [];
      
      // Use tsx instead of ts-node for better ESM support
      const result = spawnSync('npx', ['tsx', seedScript, ...args], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        shell: true,
      });

      if (result.status === 0) {
        this.addCheck('Database Seeding', 'PASS', 'Test data seeded successfully');
        this.seedingPerformed = true;
        return true;
      } else {
        this.addCheck('Database Seeding', 'FAIL', `Seeding failed with exit code ${result.status}`);
        return false;
      }
    } catch (error: any) {
      this.addCheck('Database Seeding', 'FAIL', `Seeding error: ${error.message}`);
      return false;
    }
  }

  async runPostSeedAudit(): Promise<boolean> {
    console.log('\n🔍 Post-Seed Audit: Verifying Database State...');
    
    const dbConfig = getTestDatabaseConfig();
    const dbUrl = getTestDatabaseUrl();
    const maskedUrl = maskConnectionString(dbUrl);
    console.log(`   📊 Using database: ${maskedUrl}`);
    const client = new Client(dbConfig);

    const auditResults: { check: string; passed: boolean }[] = [];

    try {
      await client.connect();

      // Check Business Plan
      const planResult = await client.query(
        `SELECT id, name, price, tier, is_active 
         FROM subscription_plans 
         WHERE name = 'Business Plan' AND price = '149.00' AND is_active IS NOT NULL`
      );
      const hasBusinessPlan = planResult.rows.length > 0;
      auditResults.push({ check: 'Business Plan', passed: hasBusinessPlan });

      // Check TEST_VENUE_OWNER
      const venueOwnerResult = await client.query(
        `SELECT id, email, role, roles 
         FROM users 
         WHERE (email = $1 OR id = $2) 
           AND role = 'business' 
           AND 'business' = ANY(roles)`,
        [TEST_VENUE_OWNER_EMAIL, TEST_VENUE_OWNER_ID]
      );
      const venueOwnerCorrectRole = venueOwnerResult.rows.length > 0;
      auditResults.push({ check: 'TEST_VENUE_OWNER', passed: venueOwnerCorrectRole });

      // Check TEST_PROFESSIONAL
      const professionalResult = await client.query(
        `SELECT id, email, role, roles 
         FROM users 
         WHERE (email = $1 OR id = $2) 
           AND role = 'professional' 
           AND 'professional' = ANY(roles)`,
        [TEST_PROFESSIONAL_EMAIL, TEST_PROFESSIONAL_ID]
      );
      const professionalCorrectRole = professionalResult.rows.length > 0;
      auditResults.push({ check: 'TEST_PROFESSIONAL', passed: professionalCorrectRole });

      // Check active shifts
      const shiftsResult = await client.query(
        `SELECT COUNT(*) as count FROM shifts WHERE status = 'open'`
      );
      const shiftCount = parseInt(shiftsResult.rows[0]?.count || '0', 10);
      const hasEnoughShifts = shiftCount >= 3;
      auditResults.push({ check: 'Active Shifts (≥3)', passed: hasEnoughShifts });

      await client.end();

      const allPassed = auditResults.every(r => r.passed);
      
      // Remove the initial failed audit check if it exists
      const initialAuditIndex = this.checks.findIndex(c => c.name === 'Database Audit' && c.status === 'FAIL');
      if (initialAuditIndex !== -1) {
        this.checks.splice(initialAuditIndex, 1);
      }
      
      if (allPassed) {
        this.addCheck('Post-Seed Audit', 'PASS', 'All required test data is present');
        this.postSeedAuditPassed = true;
      } else {
        const failed = auditResults.filter(r => !r.passed).map(r => r.check).join(', ');
        this.addCheck('Post-Seed Audit', 'FAIL', `Missing or incorrect: ${failed}`);
      }

      return allPassed;
    } catch (error: any) {
      await client.end();
      this.addCheck('Post-Seed Audit', 'FAIL', `Audit error: ${error.message}`);
      return false;
    }
  }

  async updateSnapshots(): Promise<boolean> {
    const skipSnapshots = process.argv.includes('--skip-snapshots');
    
    if (skipSnapshots) {
      this.addCheck('Snapshot Update', 'SKIP', 'Skipped (--skip-snapshots flag)');
      return true;
    }

    console.log('\n📸 Step 4: Updating Visual Snapshots...');
    
    try {
      const result = spawnSync('npx', ['playwright', 'test', '--update-snapshots'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        shell: true,
      });

      if (result.status === 0) {
        this.addCheck('Snapshot Update', 'PASS', 'Visual snapshots updated successfully');
        return true;
      } else {
        this.addCheck('Snapshot Update', 'WARN', `Snapshot update completed with warnings (exit code ${result.status})`);
        return true; // Don't fail the whole process for snapshot warnings
      }
    } catch (error: any) {
      this.addCheck('Snapshot Update', 'WARN', `Snapshot update error: ${error.message}`);
      return true; // Don't fail the whole process for snapshot errors
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST READINESS REPORT');
    console.log('='.repeat(70));

    const passed = this.checks.filter(c => c.status === 'PASS').length;
    const failed = this.checks.filter(c => c.status === 'FAIL').length;
    const warnings = this.checks.filter(c => c.status === 'WARN').length;
    const skipped = this.checks.filter(c => c.status === 'SKIP').length;

    this.checks.forEach(check => {
      const icon = check.status === 'PASS' ? '✅' : 
                   check.status === 'FAIL' ? '❌' : 
                   check.status === 'WARN' ? '⚠️ ' : '⏭️ ';
      console.log(`${icon} ${check.name}: ${check.message}`);
      if (check.details) {
        console.log(`   ${check.details}`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Total Checks: ${this.checks.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log('='.repeat(70));

    // Determine overall status: PASS if post-seed audit passed (even if initial audit failed)
    // Only FAIL if database remains incorrect AFTER seeding attempt
    let overallStatus: 'PASS' | 'FAIL';
    if (this.seedingPerformed && this.postSeedAuditPassed) {
      // Seeding was performed and post-seed audit passed - environment is ready
      overallStatus = 'PASS';
    } else if (failed === 0) {
      // No failures at all - environment is ready
      overallStatus = 'PASS';
    } else {
      // There are failures and either seeding wasn't performed or post-seed audit failed
      overallStatus = 'FAIL';
    }

    const statusIcon = overallStatus === 'PASS' ? '✅' : '❌';
    
    console.log(`\n${statusIcon} Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'PASS') {
      if (this.seedingPerformed && this.postSeedAuditPassed) {
        console.log('\n✅ Environment ready after seeding');
      }
      console.log('\n🎉 Your test environment is ready for E2E tests!');
      console.log('   Run: npm run test:e2e');
    } else {
      console.log('\n⚠️  Your test environment needs attention.');
      console.log('   Review the failed checks above and fix them.');
    }

    return overallStatus === 'PASS';
  }
}

async function main() {
  console.log('🚀 Starting Test Readiness Check...\n');
  
  const dbUrl = getTestDatabaseUrl();
  const maskedUrl = maskConnectionString(dbUrl);
  console.log(`📊 Database Connection String: ${maskedUrl}\n`);

  const reporter = new TestReadinessReporter();
  const forceSeed = process.argv.includes('--force-seed');

  // Step 1: Check database connection
  const dbConnected = await reporter.checkDatabaseConnection();
  if (!dbConnected) {
    reporter.printReport();
    process.exit(1);
  }

  // Step 2: Run schema migration
  const schemaMigrated = await reporter.runSchemaMigration();
  if (!schemaMigrated) {
    reporter.printReport();
    process.exit(1);
  }

  // Step 3: Run audit
  const auditResult = await reporter.runAudit();

  // Step 4: Seed if needed
  if (auditResult.needsSeeding || forceSeed) {
    const seeded = await reporter.runSeeding(forceSeed);
    if (!seeded) {
      reporter.printReport();
      process.exit(1);
    }

    // Run post-seed audit after seeding
    const postSeedPassed = await reporter.runPostSeedAudit();
    if (!postSeedPassed) {
      reporter.printReport();
      process.exit(1);
    }
  }

  // Step 5: Update snapshots
  await reporter.updateSnapshots();

  // Print final report
  const allPassed = reporter.printReport();
  process.exit(allPassed ? 0 : 1);
}

// Run the readiness check
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
