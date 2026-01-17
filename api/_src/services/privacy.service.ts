/**
 * Privacy Service
 * 
 * Handles data export functionality for Australian Privacy Principle (APP) requests.
 * Provides comprehensive user data export across all tables.
 */

import { eq, or } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users, profiles, shifts, shiftApplications, applications, payments, payouts, failedEmails } from '../db/schema.js';

/**
 * User Data Export Structure
 * Complies with Australian Privacy Principles for data portability requests
 */
export interface UserDataExport {
  exportDate: string;
  userId: string;
  user: {
    account: typeof users.$inferSelect | null;
    profile: typeof profiles.$inferSelect | null;
  };
  shifts: {
    asEmployer: Array<typeof shifts.$inferSelect>;
    asAssignee: Array<typeof shifts.$inferSelect>;
  };
  applications: {
    shiftApplications: Array<typeof shiftApplications.$inferSelect>;
    legacyApplications: Array<typeof applications.$inferSelect>;
  };
  payments: {
    payments: Array<typeof payments.$inferSelect>;
    payouts: Array<typeof payouts.$inferSelect>;
  };
  communications: {
    failedEmails: Array<typeof failedEmails.$inferSelect>;
  };
  metadata: {
    totalShifts: number;
    totalApplications: number;
    totalPayments: number;
    totalPayouts: number;
    totalFailedEmails: number;
  };
}

/**
 * Generate comprehensive user data export
 * 
 * Fetches all data associated with a user across all tables:
 * - User account information
 * - Profile data
 * - Shifts (as employer and as assignee)
 * - Applications (shift applications and legacy job applications)
 * - Payment history
 * - Payout records
 * - Failed email records (communications that failed to deliver)
 * 
 * @param userId - The user ID to export data for
 * @returns Structured JSON object ready for export, or null if user not found
 */
export async function generateUserDataTypeExport(
  userId: string
): Promise<UserDataExport | null> {
  const db = getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Fetch user account
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  // Fetch profile data
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  // Fetch shifts where user is employer
  const shiftsAsEmployer = await db
    .select()
    .from(shifts)
    .where(eq(shifts.employerId, userId));

  // Fetch shifts where user is assignee
  const shiftsAsAssignee = await db
    .select()
    .from(shifts)
    .where(eq(shifts.assigneeId, userId));

  // Fetch shift applications
  const shiftApplicationsData = await db
    .select()
    .from(shiftApplications)
    .where(eq(shiftApplications.workerId, userId));

  // Fetch legacy job applications
  const legacyApplications = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId));

  // Fetch payment history
  const paymentsData = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId));

  // Fetch payout records
  const payoutsData = await db
    .select()
    .from(payouts)
    .where(eq(payouts.workerId, userId));

  // Fetch failed email records (matched by user's email address)
  const failedEmailsData = await db
    .select()
    .from(failedEmails)
    .where(eq(failedEmails.to, user.email));

  // Build export structure
  const exportData: UserDataExport = {
    exportDate: new Date().toISOString(),
    userId,
    user: {
      account: user,
      profile: profile || null,
    },
    shifts: {
      asEmployer: shiftsAsEmployer,
      asAssignee: shiftsAsAssignee,
    },
    applications: {
      shiftApplications: shiftApplicationsData,
      legacyApplications,
    },
    payments: {
      payments: paymentsData,
      payouts: payoutsData,
    },
    communications: {
      failedEmails: failedEmailsData,
    },
    metadata: {
      totalShifts: shiftsAsEmployer.length + shiftsAsAssignee.length,
      totalApplications: shiftApplicationsData.length + legacyApplications.length,
      totalPayments: paymentsData.length,
      totalPayouts: payoutsData.length,
      totalFailedEmails: failedEmailsData.length,
    },
  };

  return exportData;
}

/**
 * Generate user data export as JSON string
 * 
 * Convenience function that returns the export as a formatted JSON string
 * suitable for file download or email attachment.
 * 
 * @param userId - The user ID to export data for
 * @returns JSON string of user data, or null if user not found
 */
export async function generateUserDataExportAsJSON(
  userId: string
): Promise<string | null> {
  const exportData = await generateUserDataTypeExport(userId);
  if (!exportData) {
    return null;
  }

  return JSON.stringify(exportData, null, 2);
}
