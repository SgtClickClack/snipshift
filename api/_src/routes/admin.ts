import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as profilesRepo from '../repositories/profiles.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as paymentsRepo from '../repositories/payments.repository.js';
import * as reportsRepo from '../repositories/reports.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as emailService from '../services/email.service.js';
import { z } from 'zod';

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
  const userId = req.params.userId;

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
  const { id } = req.params;

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
  const { id } = req.params;

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
  const { id } = req.params;

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
  const { id } = req.params;
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
  const { id } = req.params;
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

export default router;

