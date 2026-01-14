# Test Readiness Guide

## Overview

The Test Readiness system ensures your local development environment is structurally identical to the **HospoGo 2026** production logic before running E2E tests.

## Quick Start

Run the comprehensive test readiness check:

```bash
npm run test:readiness
```

This single command will:
1. ✅ Check database connection
2. ✅ Sync database schema (drizzle-kit push)
3. ✅ Audit test data (Business Plan, test users, shifts)
4. ✅ Seed missing data (if needed)
5. ✅ Update visual snapshots

## Individual Commands

### Database Migration
```bash
npm run db:migrate:test
```
Syncs the test database schema using drizzle-kit push.

### Database Audit
```bash
npm run db:audit:test
```
Checks for required test data:
- Business Plan ($149.00/month)
- TEST_VENUE_OWNER (business role)
- TEST_PROFESSIONAL (professional role)
- At least 3 active (open) shifts

### Database Seeding
```bash
npm run db:seed:test
```
Seeds the test database with required data. Use `--force` to overwrite existing data:

```bash
npm run db:seed:test -- --force
```

## Test Readiness Options

### Standard Check
```bash
npm run test:readiness
```

### Force Re-seed
```bash
npm run test:readiness:force
```
Forces re-seeding even if audit passes.

### Skip Snapshot Update
```bash
npx ts-node scripts/test-readiness.ts --skip-snapshots
```
Skips the visual snapshot update step.

## What Gets Checked

### 1. Database Connection
- Verifies test database is running on `localhost:5433`
- Checks connection credentials

### 2. Schema Migration
- Runs `drizzle-kit push` to sync schema
- Ensures all tables and enums are up-to-date

### 3. Business Plan
- Checks for "Business" plan with price `149.00`
- Verifies plan is active
- Ensures tier is set to "business"

### 4. Test Users
- **TEST_VENUE_OWNER**: `venue-owner-e2e@hospogo.com` with business role
- **TEST_PROFESSIONAL**: `professional-e2e@hospogo.com` with professional role
- Verifies users are onboarded

### 5. Active Shifts
- Checks for at least 3 shifts with status `'open'`
- Required for marketplace testing

### 6. Visual Snapshots
- Updates Playwright visual snapshots
- Ensures screenshots match current UI state

## Expected Output

### ✅ PASS Example
```
📊 TEST READINESS REPORT
======================================================================
✅ Database Connection: Test database is accessible
✅ Schema Migration: Database schema synced successfully
✅ Database Audit: All required test data is present
✅ Database Seeding: Test data seeded successfully
✅ Snapshot Update: Visual snapshots updated successfully

======================================================================
Total Checks: 5
✅ Passed: 5
❌ Failed: 0
⚠️  Warnings: 0
⏭️  Skipped: 0
======================================================================

✅ Overall Status: PASS

🎉 Your test environment is ready for E2E tests!
   Run: npm run test:e2e
```

### ❌ FAIL Example
```
📊 TEST READINESS REPORT
======================================================================
✅ Database Connection: Test database is accessible
✅ Schema Migration: Database schema synced successfully
❌ Database Audit: Missing or incorrect: Business Plan, TEST_VENUE_OWNER
✅ Database Seeding: Test data seeded successfully
✅ Database Audit: All required test data is present

======================================================================
Total Checks: 5
✅ Passed: 4
❌ Failed: 1
⚠️  Warnings: 0
⏭️  Skipped: 0
======================================================================

❌ Overall Status: FAIL

⚠️  Your test environment needs attention.
   Review the failed checks above and fix them.
```

## Troubleshooting

### Database Connection Failed
```bash
# Start test database
docker-compose -f api/docker-compose.test.yml up -d

# Wait for database to be ready (usually 5-10 seconds)
# Then run readiness check again
npm run test:readiness
```

### Schema Migration Failed
```bash
# Ensure you're in the api directory and dependencies are installed
cd api
npm install

# Try migration again
cd ..
npm run db:migrate:test
```

### Audit Fails After Seeding
```bash
# Force re-seed with --force flag
npm run db:seed:test -- --force

# Or use the force readiness check
npm run test:readiness:force
```

## Integration with CI/CD

The test readiness check can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Test Readiness Check
  run: |
    docker-compose -f api/docker-compose.test.yml up -d
    sleep 10  # Wait for DB to be ready
    npm run test:readiness
```

## Notes

- **CompleteSetupBanner**: Dismissal is stored in localStorage (not database). Ensure test users don't have `hospogo_setup_banner_dismissed` key set.
- **Stable UUIDs**: Test users use stable IDs (`e2e-venue-owner-001`, `e2e-professional-001`) for deterministic testing.
- **Hospogo Naming**: All seeded venue names include "Hospogo" prefix for consistency.

## Related Files

- `scripts/test-readiness.ts` - Main readiness check script
- `scripts/audit-test-db.ts` - Database audit script
- `scripts/seed-test-db.ts` - Database seeding script
- `scripts/migrate-test-db.ts` - Schema migration script
- `tests/e2e/seed_data.ts` - Test data constants
