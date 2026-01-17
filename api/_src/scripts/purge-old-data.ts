/**
 * Data Retention Purge Script
 * 
 * Implements hard delete for records with deletedAt older than 7 years
 * to satisfy Australian data minimization standards and privacy regulations.
 * 
 * This script performs permanent deletion (hard delete) of soft-deleted records
 * that have exceeded the 7-year retention period.
 * 
 * Usage:
 *   npm run tsx api/_src/scripts/purge-old-data.ts [--dry-run]
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   DRY_RUN - Set to 'true' to preview deletions without executing (optional)
 */

import { lt, and, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { shifts, shiftApplications, payments } from '../db/schema.js';

const DRY_RUN = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');

/**
 * Calculate the cutoff date (7 years ago)
 */
function getCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 7);
  return cutoff;
}

/**
 * Purge old shifts
 * Hard deletes shifts with deletedAt older than 7 years
 */
async function purgeOldShifts(cutoffDate: Date): Promise<number> {
  const db = getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  if (DRY_RUN) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(shifts)
      .where(and(isNotNull(shifts.deletedAt), lt(shifts.deletedAt, cutoffDate)));

    const count = Number(countResult?.count || 0);
    console.log(`[DRY RUN] Would delete ${count} shifts with deletedAt < ${cutoffDate.toISOString()}`);
    return count;
  }

  const deleted = await db
    .delete(shifts)
    .where(and(isNotNull(shifts.deletedAt), lt(shifts.deletedAt, cutoffDate)));

  const count = deleted.rowCount || 0;
  console.log(`[PURGE] Deleted ${count} shifts with deletedAt < ${cutoffDate.toISOString()}`);
  return count;
}

/**
 * Purge old shift applications
 * Hard deletes shift applications with deletedAt older than 7 years
 */
async function purgeOldShiftApplications(cutoffDate: Date): Promise<number> {
  const db = getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  if (DRY_RUN) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(shiftApplications)
      .where(and(isNotNull(shiftApplications.deletedAt), lt(shiftApplications.deletedAt, cutoffDate)));

    const count = Number(countResult?.count || 0);
    console.log(`[DRY RUN] Would delete ${count} shift applications with deletedAt < ${cutoffDate.toISOString()}`);
    return count;
  }

  const deleted = await db
    .delete(shiftApplications)
    .where(and(isNotNull(shiftApplications.deletedAt), lt(shiftApplications.deletedAt, cutoffDate)));

  const count = deleted.rowCount || 0;
  console.log(`[PURGE] Deleted ${count} shift applications with deletedAt < ${cutoffDate.toISOString()}`);
  return count;
}

/**
 * Purge old payments
 * Hard deletes payments with deletedAt older than 7 years
 */
async function purgeOldPayments(cutoffDate: Date): Promise<number> {
  const db = getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  if (DRY_RUN) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(and(isNotNull(payments.deletedAt), lt(payments.deletedAt, cutoffDate)));

    const count = Number(countResult?.count || 0);
    console.log(`[DRY RUN] Would delete ${count} payments with deletedAt < ${cutoffDate.toISOString()}`);
    return count;
  }

  const deleted = await db
    .delete(payments)
    .where(and(isNotNull(payments.deletedAt), lt(payments.deletedAt, cutoffDate)));

  const count = deleted.rowCount || 0;
  console.log(`[PURGE] Deleted ${count} payments with deletedAt < ${cutoffDate.toISOString()}`);
  return count;
}

/**
 * Main purge function
 * Executes hard delete for all tables with deletedAt older than 7 years
 */
async function purgeOldData(): Promise<void> {
  console.log('='.repeat(80));
  console.log('Data Retention Purge Script');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (permanent deletion)'}`);
  console.log('');

  const cutoffDate = getCutoffDate();
  console.log(`Cutoff Date: ${cutoffDate.toISOString()} (7 years ago)`);
  console.log('');

  try {
    const shiftsCount = await purgeOldShifts(cutoffDate);
    const applicationsCount = await purgeOldShiftApplications(cutoffDate);
    const paymentsCount = await purgeOldPayments(cutoffDate);

    const totalCount = shiftsCount + applicationsCount + paymentsCount;

    console.log('');
    console.log('='.repeat(80));
    console.log('Purge Summary');
    console.log('='.repeat(80));
    console.log(`Shifts: ${shiftsCount}`);
    console.log(`Shift Applications: ${applicationsCount}`);
    console.log(`Payments: ${paymentsCount}`);
    console.log(`Total: ${totalCount}`);
    console.log('='.repeat(80));

    if (DRY_RUN) {
      console.log('');
      console.log('⚠️  This was a DRY RUN. No data was actually deleted.');
      console.log('   Run without --dry-run to perform actual deletion.');
    } else {
      console.log('');
      console.log('✅ Purge completed successfully.');
    }
  } catch (error) {
    console.error('');
    console.error('❌ Error during purge:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  purgeOldData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { purgeOldData, getCutoffDate };
