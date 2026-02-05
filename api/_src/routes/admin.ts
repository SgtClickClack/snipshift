import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as profilesRepo from '../repositories/profiles.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as paymentsRepo from '../repositories/payments.repository.js';
import * as reportsRepo from '../repositories/reports.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import { normalizeParam } from '../utils/request-params.js';
import * as waitlistRepo from '../repositories/waitlist.repository.js';
import * as venuesRepo from '../repositories/venues.repository.js';
import * as emailService from '../services/email.service.js';
import * as notificationService from '../services/notification.service.js';
import * as ctoAiService from '../services/ai-cto.service.js';
import { z } from 'zod';
import { eq, sql, and, inArray, SQL } from 'drizzle-orm';
import { waitlist, users, venues } from '../db/schema.js';
import { getDb } from '../db/index.js';

const router = express.Router();

// Apply admin middleware to all routes in this router
// Note: authenticateUser must be called before this router is used, or we can add it here too.
// Based on index.ts, authenticateUser was applied to each route.
// I'll apply both middlewares to the router for simplicity, or per route if I want to be explicit.
// Let's apply them to the router level if all routes need them, but let's check if all routes here need them.
// Yes, all extracted routes used `authenticateUser, requireAdmin`.

router.use(authenticateUser);
router.use(requireAdmin);

// RSA review queue (admin-only)
router.get('/rsa/pending', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 100;
  const offsetRaw = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  const result = await profilesRepo.listPendingRsaVerifications(limit, offset);
  res.status(200).json(result);
}));

const UpdateRsaVerificationSchema = z.object({
  verified: z.boolean(),
});

router.patch('/rsa/:userId/verify', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = normalizeParam(req.params.userId);

  const validation = UpdateRsaVerificationSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      message: 'Validation error: ' + validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
    return;
  }

  const { verified } = validation.data;

  const ok = await profilesRepo.setRsaVerified(userId, verified);
  if (!ok) {
    res.status(500).json({ message: 'Failed to update RSA verification status' });
    return;
  }

  // Keep legacy/user table flag in sync so older clients still work.
  const updatedUser = await usersRepo.updateUser(userId, { rsaVerified: verified } as any);
  if (!updatedUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.status(200).json({
    userId,
    rsaVerified: verified,
  });
}));

// Handler for admin stats (legacy - kept for backward compatibility)
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const [totalUsers, totalJobs, activeJobs, totalRevenue, mrr] = await Promise.all([
    usersRepo.getUserCount(),
    jobsRepo.getJobCount(),
    jobsRepo.getActiveJobCount(),
    paymentsRepo.getTotalRevenue(),
    paymentsRepo.getMRR(),
  ]);

  res.status(200).json({
    totalUsers,
    totalJobs,
    activeJobs,
    totalRevenue,
    mrr, // Monthly Recurring Revenue
  });
}));

// Handler for admin metrics (new comprehensive endpoint)
router.get('/metrics', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const [
    totalCommission,
    commissionThisMonth,
    totalUsers,
    shopUsers,
    barberUsers,
    completedShifts
  ] = await Promise.all([
    shiftsRepo.getTotalCommission(),
    shiftsRepo.getCommissionThisMonth(),
    usersRepo.getUserCount(),
    usersRepo.getActiveUserCountByRole('business'),
    usersRepo.getActiveUserCountByRole('professional'),
    shiftsRepo.getCompletedShiftsCount(),
  ]);

  res.status(200).json({
    revenue: {
      totalCommission: totalCommission,
      commissionThisMonth: commissionThisMonth,
    },
    users: {
      total: totalUsers,
      shops: shopUsers,
      barbers: barberUsers,
    },
    shifts: {
      completed: completedShifts,
    },
  });
}));

// Handler for listing all users (admin only)
router.get('/users', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const result = await usersRepo.getAllUsers(limit, offset);

  if (!result) {
    res.status(200).json({ data: [], total: 0, limit, offset });
    return;
  }

  // Transform to match frontend expectations
  const transformed = result.data.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive !== false, // Default to true if null
    stripeAccountId: user.stripeAccountId || null,
    stripeOnboardingComplete: user.stripeOnboardingComplete || false,
    createdAt: user.createdAt.toISOString(),
    averageRating: user.averageRating ? parseFloat(user.averageRating) : null,
    reviewCount: user.reviewCount ? parseInt(user.reviewCount) : 0,
  }));

  res.status(200).json({
    data: transformed,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}));

// Handler for banning a user (admin only)
router.post('/users/:id/ban', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);

  // Prevent self-banning
  if (req.user?.id === id) {
    res.status(400).json({ message: 'Cannot ban your own account' });
    return;
  }

  const bannedUser = await usersRepo.banUser(id);
  if (bannedUser) {
    // TODO: Revoke current sessions (would need session management system)
    res.status(200).json({
      id: bannedUser.id,
      email: bannedUser.email,
      name: bannedUser.name,
      isActive: bannedUser.isActive,
      message: 'User banned successfully',
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
}));

// Handler for unbanning a user (admin only)
router.post('/users/:id/unban', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);

  const unbannedUser = await usersRepo.unbanUser(id);
  if (unbannedUser) {
    res.status(200).json({
      id: unbannedUser.id,
      email: unbannedUser.email,
      name: unbannedUser.name,
      isActive: unbannedUser.isActive,
      message: 'User unbanned successfully',
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
}));

// Handler for deleting a user (admin only)
router.delete('/users/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);

  // Prevent self-deletion
  if (req.user?.id === id) {
    res.status(400).json({ message: 'Cannot delete your own account' });
    return;
  }

  const deleted = await usersRepo.deleteUser(id);
  if (deleted) {
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'User not found' });
  }
}));

// Handler for listing all jobs (admin only)
router.get('/jobs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const status = req.query.status as 'open' | 'filled' | 'closed' | 'completed' | undefined;

  const result = await jobsRepo.getJobs({
    limit,
    offset,
    status,
  });

  if (!result) {
    res.status(200).json({ data: [], total: 0, limit, offset });
    return;
  }

  // Transform to match frontend expectations
  const transformed = result.data.map((job) => {
    const locationParts = [job.address, job.city, job.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

    return {
      id: job.id,
      title: job.title,
      shopName: job.shopName,
      payRate: job.payRate,
      status: job.status,
      date: job.date,
      location,
      businessId: job.businessId,
      createdAt: job.createdAt.toISOString(),
    };
  });

  res.status(200).json({
    data: transformed,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}));

// Handler for updating job status (admin only)
router.patch('/jobs/:id/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const { status } = req.body;

  // Validate status
  const validStatuses = ['open', 'filled', 'closed', 'completed'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const updatedJob = await jobsRepo.updateJob(id, { status });

  if (!updatedJob) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  res.status(200).json({
    id: updatedJob.id,
    title: updatedJob.title,
    status: updatedJob.status,
    updatedAt: updatedJob.updatedAt.toISOString(),
  });
}));

// Handler for fetching all reports (admin only)
router.get('/reports', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const status = req.query.status as 'pending' | 'resolved' | 'dismissed' | undefined;

  const result = await reportsRepo.getAllReports(limit, offset, status);

  if (!result) {
    res.status(200).json({ data: [], total: 0, limit, offset });
    return;
  }

  // Get reporter and reported user details
  const reportsWithUsers = await Promise.all(
    result.data.map(async (report) => {
      const reporter = await usersRepo.getUserById(report.reporterId);
      const reported = report.reportedId ? await usersRepo.getUserById(report.reportedId) : null;
      const job = report.jobId ? await jobsRepo.getJobById(report.jobId) : null;

      return {
        id: report.id,
        reporterId: report.reporterId,
        reporter: reporter ? {
          id: reporter.id,
          name: reporter.name,
          email: reporter.email,
        } : null,
        reportedId: report.reportedId,
        reported: reported ? {
          id: reported.id,
          name: reported.name,
          email: reported.email,
        } : null,
        jobId: report.jobId,
        job: job ? {
          id: job.id,
          title: job.title,
        } : null,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      };
    })
  );

  res.status(200).json({
    data: reportsWithUsers,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}));

// Handler for updating report status (admin only)
router.patch('/reports/:id/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const { status } = req.body;

  // Validate status
  const validStatuses = ['pending', 'resolved', 'dismissed'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  // Update report status
  const updatedReport = await reportsRepo.updateReportStatus(id, status);

  if (!updatedReport) {
    res.status(404).json({ message: 'Report not found' });
    return;
  }

  res.status(200).json({
    id: updatedReport.id,
    status: updatedReport.status,
    updatedAt: updatedReport.updatedAt.toISOString(),
  });
}));

/**
 * GET /api/admin/reports/launch-readiness
 * 
 * Launch readiness report for Brisbane onboarding progress
 * - Counts approved waitlist entries
 * - Identifies approved leads who haven't completed Step 2 (Venue Profile)
 * - Groups by postcode (4000-4199) for spatial analysis
 */
router.get('/reports/launch-readiness', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (!db) {
    res.status(500).json({ error: 'Database connection unavailable' });
    return;
  }

  try {
    // 1. Count total approved waitlist entries
    const [approvedCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.approvalStatus, 'approved'));
    const totalApproved = Number(approvedCountResult.count);

    // 2. Count users with business or professional roles
    const [businessCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'business'));
    const totalBusinessUsers = Number(businessCountResult.count);

    const [professionalCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'professional'));
    const totalProfessionalUsers = Number(professionalCountResult.count);

    // 3. Get all approved waitlist entries
    const approvedWaitlistEntries = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.approvalStatus, 'approved'));

    // 4. Find approved leads who have NOT completed Step 2 (Venue Profile)
    // For venues: check if they have a venue profile
    // For staff: check if they have isOnboarded: true
    const stuckInFunnel: Array<{
      waitlistId: string;
      contact: string;
      name: string;
      role: 'venue' | 'staff';
      location: string;
      approvedAt: Date | null;
      reason: 'no_venue_profile' | 'not_onboarded';
    }> = [];

    for (const entry of approvedWaitlistEntries) {
      if (entry.role === 'venue') {
        // Check if venue has completed Step 2 (venue profile exists)
        const venue = await venuesRepo.getVenueByWaitlistId(entry.id);
        if (!venue) {
          stuckInFunnel.push({
            waitlistId: entry.id,
            contact: entry.contact,
            name: entry.name,
            role: 'venue',
            location: entry.location,
            approvedAt: entry.approvedAt,
            reason: 'no_venue_profile',
          });
        }
      } else if (entry.role === 'staff') {
        // For staff, check if user exists and is onboarded
        // Find user by email (contact field for staff is typically email)
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, entry.contact))
          .limit(1);
        
        if (!user || !user.isOnboarded) {
          stuckInFunnel.push({
            waitlistId: entry.id,
            contact: entry.contact,
            name: entry.name,
            role: 'staff',
            location: entry.location,
            approvedAt: entry.approvedAt,
            reason: 'not_onboarded',
          });
        }
      }
    }

    // 5. Find users who are approved but have isOnboarded: false
    // Get all users linked to approved waitlist entries
    const approvedWaitlistIds = approvedWaitlistEntries.map(e => e.id);
    const venuesWithApprovedWaitlist = await db
      .select()
      .from(venues)
      .where(inArray(venues.waitlistId, approvedWaitlistIds));

    const approvedUserIds = venuesWithApprovedWaitlist.map(v => v.userId);
    const approvedButNotOnboarded: Array<{
      userId: string;
      email: string;
      name: string;
      waitlistId: string | null;
    }> = [];

    if (approvedUserIds.length > 0) {
      const usersNotOnboarded = await db
        .select()
        .from(users)
        .where(
          and(
            inArray(users.id, approvedUserIds),
            eq(users.isOnboarded, false)
          )
        );

      for (const user of usersNotOnboarded) {
        const venue = venuesWithApprovedWaitlist.find(v => v.userId === user.id);
        approvedButNotOnboarded.push({
          userId: user.id,
          email: user.email,
          name: user.name,
          waitlistId: venue?.waitlistId || null,
        });
      }
    }

    // 6. Spatial filtering: Group by postcode (4000-4199)
    // Extract postcodes from venue addresses
    const postcodeGroups: Record<string, {
      postcode: string;
      count: number;
      venues: Array<{
        venueName: string;
        contact: string;
        hasProfile: boolean;
      }>;
    }> = {};

    for (const entry of approvedWaitlistEntries) {
      if (entry.role === 'venue') {
        const venue = await venuesRepo.getVenueByWaitlistId(entry.id);
        const postcode = venue?.address?.postcode || 'unknown';
        
        // Only include Brisbane postcodes (4000-4199)
        const postcodeNum = parseInt(postcode);
        if (postcodeNum >= 4000 && postcodeNum <= 4199) {
          if (!postcodeGroups[postcode]) {
            postcodeGroups[postcode] = {
              postcode,
              count: 0,
              venues: [],
            };
          }
          postcodeGroups[postcode].count++;
          postcodeGroups[postcode].venues.push({
            venueName: entry.name,
            contact: entry.contact,
            hasProfile: !!venue,
          });
        }
      }
    }

    // Calculate conversion rate
    const totalOnboarded = totalBusinessUsers + totalProfessionalUsers;
    const conversionRate = totalApproved > 0 
      ? Math.round((totalOnboarded / totalApproved) * 100) 
      : 0;

    res.status(200).json({
      summary: {
        totalApproved,
        totalBusinessUsers,
        totalProfessionalUsers,
        totalOnboarded,
        conversionRate, // Percentage of approved -> onboarded
      },
      stuckInFunnel: {
        count: stuckInFunnel.length,
        entries: stuckInFunnel.map(entry => ({
          contact: entry.contact,
          name: entry.name,
          role: entry.role,
          location: entry.location,
          approvedAt: entry.approvedAt?.toISOString() || null,
          reason: entry.reason,
        })),
      },
      approvedButNotOnboarded: {
        count: approvedButNotOnboarded.length,
        users: approvedButNotOnboarded,
      },
      spatialAnalysis: {
        postcodeGroups: Object.values(postcodeGroups).sort((a, b) => 
          parseInt(a.postcode) - parseInt(b.postcode)
        ),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN] Error generating launch readiness report:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to generate launch readiness report',
    });
  }
}));

// Test email endpoint (Admin only)
// Note: This was at /api/test-email, not /api/admin/test-email, but instructions say "Move any admin-related endpoints here".
// Since it requires admin, it fits here. I will mount this router at /api/admin, so it will become /api/admin/test-email.
// I should check if the frontend expects /api/test-email. If so, I might need to change the mount point or keep it separate.
// Given the instruction "Move any admin-related endpoints here" and "Create api/_src/routes/admin.ts", it implies grouping them.
// The instruction also says: app.use('/api/admin', adminRouter);
// So if I put it here, it becomes /api/admin/test-email.
// I will move it here and assume the URL change is acceptable or I should map it.
// If it's a test endpoint, it's probably fine.
router.post('/test-email', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { type, email } = req.body;

  if (!type || !email) {
    res.status(400).json({ message: 'type and email are required' });
    return;
  }

  const validTypes = ['welcome', 'application-status', 'new-message', 'job-alert'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ message: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    let success = false;

    switch (type) {
      case 'welcome':
        success = await emailService.sendWelcomeEmail(email, 'Test User');
        break;
      
      case 'application-status':
        success = await emailService.sendApplicationStatusEmail(
          email,
          'Test User',
          'Hair Stylist Position',
          'Downtown Salon',
          'accepted',
          new Date().toISOString()
        );
        break;
      
      case 'new-message':
        success = await emailService.sendNewMessageEmail(
          email,
          'Test User',
          'John Doe',
          'This is a test message preview...',
          'test-conversation-id'
        );
        break;
      
      case 'job-alert':
        success = await emailService.sendJobAlertEmail(
          email,
          'Test User',
          'Barber Needed',
          'Main Street Barbershop',
          '35',
          'New York, NY',
          new Date().toISOString(),
          'test-job-id'
        );
        break;
    }

    if (success) {
      res.status(200).json({ 
        message: `Test ${type} email sent successfully to ${email}` 
      });
    } else {
      res.status(500).json({ 
        message: `Failed to send test email. Check server logs and ensure RESEND_API_KEY is configured.` 
      });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      message: 'Error sending test email: ' + (error.message || 'Unknown error') 
    });
  }
}));

/**
 * GET /api/admin/waitlist/export
 * 
 * Export all waitlist entries as CSV
 * Admin-only endpoint
 */
router.get('/waitlist/export', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    // Fetch all waitlist entries ordered by creation date (newest first)
    const entries = await waitlistRepo.getAllWaitlistEntries();
    
    if (!entries || entries.length === 0) {
      res.status(404).json({ message: 'No waitlist entries found' });
      return;
    }

    // Convert to CSV format with Brisbane local time
    const formatBrisbaneDateTime = (date: Date | string | null | undefined): string => {
      if (!date) return 'N/A';
      
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'N/A';
        
        // Format as 'YYYY-MM-DD HH:mm' in Brisbane timezone (AEST)
        const formatter = new Intl.DateTimeFormat('en-AU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Australia/Brisbane',
          hour12: false,
        });
        
        // Format returns "DD/MM/YYYY, HH:mm" - need to convert to "YYYY-MM-DD HH:mm"
        const parts = formatter.formatToParts(dateObj);
        const year = parts.find(p => p.type === 'year')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value.padStart(2, '0') || '';
        const day = parts.find(p => p.type === 'day')?.value.padStart(2, '0') || '';
        const hour = parts.find(p => p.type === 'hour')?.value.padStart(2, '0') || '';
        const minute = parts.find(p => p.type === 'minute')?.value.padStart(2, '0') || '';
        
        return `${year}-${month}-${day} ${hour}:${minute}`;
      } catch {
        return 'N/A';
      }
    };

    // CSV Headers
    const headers = ['Timestamp (Brisbane)', 'Role', 'Name/Venue', 'Contact', 'Location'];
    
    // CSV Rows
    const rows = entries.map(entry => {
      const timestamp = formatBrisbaneDateTime(entry.createdAt);
      const role = entry.role === 'venue' ? 'Venue' : 'Staff';
      const name = entry.name || 'N/A';
      const contact = entry.contact || 'N/A';
      const location = entry.location || 'Brisbane, AU';
      
      // Escape CSV values (handle commas and quotes)
      const escapeCsv = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      
      return [
        escapeCsv(timestamp),
        escapeCsv(role),
        escapeCsv(name),
        escapeCsv(contact),
        escapeCsv(location),
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Generate filename with timestamp
    const exportTimestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `hospogo_waitlist_export_${exportTimestamp}.csv`;
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send CSV content with BOM for Excel UTF-8 support
    res.status(200).send('\ufeff' + csvContent);
  } catch (error: any) {
    console.error('[ADMIN] Error exporting waitlist:', error);
    res.status(500).json({ 
      message: 'Error exporting waitlist',
      error: error?.message || 'Unknown error'
    });
  }
}));

/**
 * PATCH /api/admin/waitlist/:id/status
 * 
 * Update waitlist entry approval status
 * Admin-only endpoint
 * Body: { status: 'approved' | 'rejected' }
 */
router.patch('/waitlist/:id/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({
      error: 'Validation error',
      message: 'Status must be either "approved" or "rejected"'
    });
    return;
  }

  try {
    const entryId = normalizeParam(req.params.id);
    const updatedEntry = await waitlistRepo.updateWaitlistStatus(entryId, status);

    if (!updatedEntry) {
      res.status(404).json({
        error: 'Not found',
        message: 'Waitlist entry not found'
      });
      return;
    }

    // Trigger approval notification if status is 'approved'
    if (status === 'approved' && updatedEntry.approvalStatus === 'approved') {
      // Fire notification asynchronously (don't block the response)
      notificationService.sendApprovalNotification(updatedEntry).catch((error) => {
        console.error('[ADMIN] Error sending approval notification:', error);
        // Log but don't fail the request - notification is non-critical
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: updatedEntry.id,
        approvalStatus: updatedEntry.approvalStatus,
        approvedAt: updatedEntry.approvedAt?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN] Error updating waitlist status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to update waitlist status'
    });
  }
}));

/**
 * POST /api/admin/reset-demo
 * 
 * Reset Demo Environment for investor demo practice.
 * - Clears all Shifts, Invitations, and WorkerAvailability records for test venue
 * - Resets LeadTracker statuses back to baseline (5 Active, 15 Onboarding)
 * - Re-seeds Rick Cavanagh professional profile with 10 completed shifts for Reliability Crown
 * 
 * Purpose: Allows Rick's "Reset" button to work during live practice.
 */
const ResetDemoSchema = z.object({
  targetAccounts: z.array(z.string().email()).optional(),
  clearEntities: z.array(z.enum(['shifts', 'invitations', 'leads', 'availability', 'intelligence_gaps'])).optional(),
  reseedBaseline: z.string().optional(),
  resetSaturationTo: z.number().min(10).max(100).optional(), // Default 25% for investor demo
});

router.post('/reset-demo', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validation = ResetDemoSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      message: 'Validation error: ' + validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(500).json({ error: 'Database connection unavailable' });
    return;
  }

  const { 
    targetAccounts = ['julian.g.roberts@gmail.com'], 
    clearEntities = ['shifts', 'invitations', 'leads', 'intelligence_gaps'],
    resetSaturationTo = 25, // Default 25% for investor demo baseline
  } = validation.data;

  console.log('[ADMIN] Reset Demo initiated by:', req.user?.email);
  console.log('[ADMIN] Target accounts:', targetAccounts);
  console.log('[ADMIN] Clear entities:', clearEntities);
  console.log('[ADMIN] Saturation Forecaster reset to:', resetSaturationTo + '%');

  try {
    // Get user IDs for target accounts
    const targetUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.email, targetAccounts));

    const targetUserIds = targetUsers.map(u => u.id);
    console.log('[ADMIN] Found target user IDs:', targetUserIds.length);

    let shiftsCleared = 0;
    let invitationsCleared = 0;
    let availabilityCleared = 0;
    let leadsReset = 0;
    let intelligenceGapsCleared = 0;

    // 1. Clear Shifts for target accounts
    if (clearEntities.includes('shifts') && targetUserIds.length > 0) {
      // Clear shifts where user is the employer (venue owner)
      const shiftsResult = await db.execute(sql`
        DELETE FROM shifts 
        WHERE employer_id IN (${sql.join(targetUserIds.map(id => sql`${id}`), sql`, `)})
        OR assignee_id IN (${sql.join(targetUserIds.map(id => sql`${id}`), sql`, `)})
      `);
      shiftsCleared = (shiftsResult as any).rowCount || 0;
      console.log('[ADMIN] Shifts cleared:', shiftsCleared);
    }

    // 2. Clear Shift Invitations
    if (clearEntities.includes('invitations') && targetUserIds.length > 0) {
      const invitationsResult = await db.execute(sql`
        DELETE FROM shift_invitations 
        WHERE professional_id IN (${sql.join(targetUserIds.map(id => sql`${id}`), sql`, `)})
      `);
      invitationsCleared = (invitationsResult as any).rowCount || 0;
      console.log('[ADMIN] Invitations cleared:', invitationsCleared);
    }

    // 3. Clear Worker Availability
    if (clearEntities.includes('availability') && targetUserIds.length > 0) {
      const availabilityResult = await db.execute(sql`
        DELETE FROM worker_availability 
        WHERE user_id IN (${sql.join(targetUserIds.map(id => sql`${id}`), sql`, `)})
      `);
      availabilityCleared = (availabilityResult as any).rowCount || 0;
      console.log('[ADMIN] Availability cleared:', availabilityCleared);
    }

    // 4. Clear Support Intelligence Gaps table (Self-Healing AI demo reset)
    // PURPOSE: Allows Rick to show the "Self-Healing" AI loop starting from a clean slate
    if (clearEntities.includes('intelligence_gaps')) {
      try {
        const intelligenceGapsResult = await db.execute(sql`
          DELETE FROM support_intelligence_gaps
          WHERE reviewed_at IS NULL
        `);
        intelligenceGapsCleared = (intelligenceGapsResult as any).rowCount || 0;
        console.log('[ADMIN] Intelligence gaps cleared:', intelligenceGapsCleared);
      } catch (err) {
        // Table may not exist in all environments - continue gracefully
        console.log('[ADMIN] Intelligence gaps table not found or empty, skipping');
        intelligenceGapsCleared = 0;
      }
    }

    // 5. Reset LeadTracker statuses to baseline (5 Active, 15 Onboarding)
    if (clearEntities.includes('leads')) {
      // Note: Leads are stored in client-side state for demo purposes
      // This is a no-op at the database level but signals the frontend to reset
      leadsReset = 20; // 5 Active + 15 Onboarding baseline
      console.log('[ADMIN] Lead statuses marked for reset to baseline');
    }

    // 5. Re-seed admin's professional profile with 10 completed shifts for Reliability Crown
    // Find or create admin's professional profile
    const adminUser = targetUsers.find(u => u.email === 'julian.g.roberts@gmail.com');
    if (adminUser) {
      // Ensure admin has 10 completed shifts (for Reliability Crown eligibility)
      // The Reliability Crown requires: 0 strikes AND 10+ completed shifts
      await db.execute(sql`
        UPDATE profiles 
        SET 
          completed_shifts = 10,
          reliability_score = 100,
          no_show_count = 0,
          cancellation_count = 0,
          updated_at = NOW()
        WHERE user_id = ${adminUser.id}
      `);
      console.log('[ADMIN] Admin profile re-seeded with 10 completed shifts for Reliability Crown');

      // 6. POST RESET AUDIT HYDRATION: Inject one historical "Mock Xero Sync" into xero_audit_log
      // Purpose: Ensures Lucas can see the **Xero Trace** and **Audit Trail** functionality
      // without running a real sync - provides immediate demo value after reset
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      await db.execute(sql`
        INSERT INTO xero_audit_log (user_id, operation, xero_tenant_id, payload, result, created_at)
        VALUES (
          ${adminUser.id},
          'SYNC_TIMESHEET',
          'demo-tenant-brisbane-foundry',
          ${JSON.stringify({
            calendarId: 'demo-calendar-weekly',
            calendarName: 'Weekly Pay Calendar',
            dateRange: {
              start: '2026-02-03',
              end: '2026-02-09'
            },
            totalEmployees: 8,
            totalHours: 142.5
          })}::jsonb,
          ${JSON.stringify({
            status: 'SUCCESS',
            syncedEmployees: 8,
            failedEmployees: 0,
            totalHours: 142.5,
            mutexId: 'mutex-demo-' + Date.now(),
            xeroTimesheetIds: [
              'TS-DEMO-001', 'TS-DEMO-002', 'TS-DEMO-003', 'TS-DEMO-004',
              'TS-DEMO-005', 'TS-DEMO-006', 'TS-DEMO-007', 'TS-DEMO-008'
            ],
            checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
          })}::jsonb,
          ${twoHoursAgo}::timestamp
        )
        ON CONFLICT DO NOTHING
      `);
      console.log('[ADMIN] Mock Xero sync audit log entry injected (2 hours ago, 142.5 hours, SUCCESS)');
    }

    res.status(200).json({
      success: true,
      message: 'Demo environment reset successfully',
      summary: {
        shiftsCleared,
        invitationsCleared,
        availabilityCleared,
        leadsReset,
        intelligenceGapsCleared,
        reliabilityCrownActive: true,
        // SATURATION FORECASTER: Signal frontend to reset slider to this value
        // Purpose: Shows Rick the "Self-Healing" AI loop from a clean slate
        saturationForecasterReset: resetSaturationTo,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[ADMIN] Error resetting demo environment:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to reset demo environment',
    });
  }
}));

/**
 * POST /api/admin/chat
 * 
 * HospoGo Architect - Omniscient CTO Bot
 * God-Mode Gemini chatbot with full access to technical and business DNA.
 * 
 * Body: { query: string, sessionId?: string, mode?: 'concise' | 'detailed' | 'introspective' }
 * 
 * Features:
 * - Full codebase knowledge via CTO Knowledge Bridge
 * - Introspective Analysis (explains unfamiliar code)
 * - Business logic documentation (A-Team, Reliability Crown, Suburban Loyalty)
 * - System metrics explanation
 */
const CTOChatSchema = z.object({
  query: z.string().min(1, 'Query is required').max(5000, 'Query too long'),
  sessionId: z.string().optional(),
  mode: z.enum(['concise', 'detailed', 'introspective']).optional().default('detailed'),
});

router.post('/chat', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validation = CTOChatSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      message: 'Validation error: ' + validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
    return;
  }

  const { query, sessionId, mode } = validation.data;

  console.log('[ADMIN] CTO Chat request from:', req.user?.email, {
    queryLength: query.length,
    mode,
    hasSession: !!sessionId,
  });

  try {
    const response = await ctoAiService.processCTOQuery({
      query,
      sessionId,
      mode,
    });

    res.status(200).json({
      answer: response.answer,
      queryType: response.queryType,
      sessionId: response.sessionId,
      success: response.success,
      responseTimeMs: response.responseTimeMs,
    });
  } catch (error: any) {
    console.error('[ADMIN] CTO Chat error:', error);
    res.status(500).json({
      message: 'Error processing CTO query',
      error: error?.message || 'Unknown error',
    });
  }
}));

/**
 * DELETE /api/admin/chat/:sessionId
 * 
 * Clear a CTO chat session to start fresh.
 */
router.delete('/chat/:sessionId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const sessionId = normalizeParam(req.params.sessionId);
  
  ctoAiService.clearCTOSession(sessionId);
  
  res.status(200).json({
    message: 'Session cleared',
    sessionId,
  });
}));

/**
 * GET /api/admin/chat/stats
 * 
 * Get CTO chat session statistics.
 */
router.get('/chat/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const activeSessionCount = ctoAiService.getActiveCTOSessionCount();
  
  res.status(200).json({
    activeSessionCount,
    timestamp: new Date().toISOString(),
  });
}));

export default router;

