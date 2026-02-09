import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { CreateApplicationSchema } from '../validation/schemas.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as notificationService from '../services/notification.service.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as emailService from '../services/email.service.js';
import { applications, shifts } from '../db/schema.js';
import { normalizeParam } from '../utils/request-params.js';

const router = Router();

// Get applications (as applicant or employer)
router.get('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!req.user || !userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const role = req.user.role; // 'professional', 'business', 'hub', etc.
  const { status } = req.query;
  
  let applications;

  if (role === 'professional') {
    // Fetch applications made BY this user
    applications = await applicationsRepo.getApplicationsForUser(userId, {
      status: status as 'pending' | 'accepted' | 'rejected' | undefined
    });
  } else if (role === 'business' || role === 'hub' || role === 'venue') {
    // Fetch applications received FOR this business's jobs
    // CRITICAL: Allow 'venue', 'hub', and 'business' to access business routes
    applications = await applicationsRepo.getApplicationsForBusiness(userId, {
      status: status as 'pending' | 'accepted' | 'rejected' | undefined
    });
  } else {
    // Default to empty or user's applications? Let's default to user's applications for other roles
    applications = await applicationsRepo.getApplicationsForUser(userId, {
      status: status as 'pending' | 'accepted' | 'rejected' | undefined
    });
  }

  if (!applications) {
    res.status(200).json([]);
    return;
  }

  res.status(200).json(applications);
}));

// Create an application (for Shift or Job)
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  // Validate request body
  const validationResult = CreateApplicationSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const { shiftId, jobId, message, applicantId } = validationResult.data;
  
  // If applicantId is provided and differs from authenticated user, strictly ensure they match (unless admin?)
  // For now, prefer authenticated user ID.
  const finalUserId = userId || applicantId;

  if (!finalUserId && (!validationResult.data.email || !validationResult.data.name)) {
    res.status(401).json({ message: 'Unauthorized: Please login or provide name and email' });
    return;
  }

  // Get user details if authenticated
  let userEmail = validationResult.data.email;
  let userName = validationResult.data.name;
  let applicantHasRsaCertificate = false;
  let applicantRsaExpiry: string | null = null;
  
  if (finalUserId) {
    const user = await usersRepo.getUserById(finalUserId);
    if (user) {
      userEmail = user.email;
      userName = user.name;
      applicantHasRsaCertificate = !!(user as any).rsaCertificateUrl;
      applicantRsaExpiry = (user as any).rsaExpiry ?? null;
    }
  }

  if (!userEmail || !userName) {
    res.status(400).json({ message: 'Name and email are required' });
    return;
  }

  // HospoGo compliance gate: cannot apply without an uploaded RSA certificate.
  // Enforced server-side to prevent bypassing UI checks.
  if (finalUserId) {
    const expiryDate = applicantRsaExpiry ? new Date(applicantRsaExpiry) : null;
    const isExpiryValid = expiryDate ? !isNaN(expiryDate.getTime()) : true;
    const isExpired = expiryDate && isExpiryValid
      ? expiryDate.getTime() < new Date().setHours(0, 0, 0, 0)
      : false;

    if (!applicantHasRsaCertificate || isExpired) {
      res.status(403).json({
        message: 'RSA certificate required to apply for shifts.',
        code: 'RSA_REQUIRED',
      });
      return;
    }
  }

  // Verify existence of target (Shift or Job)
  let targetTitle = '';
  let ownerId = '';
  let targetType: 'shift' | 'job' = 'shift'; // default

  if (shiftId) {
    const shift = await shiftsRepo.getShiftById(shiftId);
    if (!shift) {
      res.status(404).json({ message: 'Shift not found' });
      return;
    }
    targetTitle = shift.title;
    ownerId = shift.employerId;
    targetType = 'shift';
  } else if (jobId) {
    const job = await jobsRepo.getJobById(jobId);
    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }
    targetTitle = job.title;
    ownerId = job.businessId;
    targetType = 'job';
  }

  // Check for duplicates
  const targetId = shiftId || jobId!;
  const hasApplied = await applicationsRepo.hasUserApplied(targetId, targetType, finalUserId, userEmail);
  
  if (hasApplied) {
    res.status(409).json({ message: 'You have already applied to this position' });
    return;
  }

  // Create application
  const newApplication = await applicationsRepo.createApplication({
    jobId: jobId || undefined,
    shiftId: shiftId || undefined,
    userId: finalUserId || undefined,
    name: userName,
    email: userEmail,
    coverLetter: message,
  });

  if (!newApplication) {
    res.status(500).json({ message: 'Failed to submit application' });
    return;
  }

  // Notify owner
  if (ownerId) {
    await notificationService.notifyApplicationReceived(
      ownerId,
      userName,
      targetTitle,
      targetId
    );
    
    // Send email notification to job owner
    const owner = await usersRepo.getUserById(ownerId);
    if (owner && owner.email) {
      const applicationLink = `https://hospogo.com/manage-jobs?jobId=${targetId}`;
      await emailService.notifyApplicationReceived(
        owner.email,
        userName,
        targetTitle,
        applicationLink
      );
    }
  }

  res.status(201).json({
    message: 'Application Sent!',
    id: newApplication.id,
    status: 'applied'
  });
}));

// Decide on an application (approve or decline)
router.post('/:id/decide', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const applicationId = normalizeParam(req.params.id);
  const userId = req.user?.id;
  const { decision } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!decision || !['APPROVED', 'DECLINED'].includes(decision)) {
    res.status(400).json({ message: 'Invalid decision. Must be APPROVED or DECLINED' });
    return;
  }

  // Get the application
  const application = await applicationsRepo.getApplicationById(applicationId);
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Verify ownership - check if the application is for a job/shift owned by this user
  let ownerId: string | null = null;
  let shiftId: string | null = null;
  let jobId: string | null = null;

  if (application.shiftId) {
    const shift = await shiftsRepo.getShiftById(application.shiftId);
    if (!shift) {
      res.status(404).json({ message: 'Shift not found' });
      return;
    }
    ownerId = shift.employerId;
    shiftId = application.shiftId;
  } else if (application.jobId) {
    const job = await jobsRepo.getJobById(application.jobId);
    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }
    ownerId = job.businessId;
    jobId = application.jobId;
  }

  if (!ownerId || ownerId !== userId) {
    res.status(403).json({ message: 'Forbidden: You do not own this job/shift' });
    return;
  }

  // Get applicant user info
  const applicant = application.userId ? await usersRepo.getUserById(application.userId) : null;
  const applicantName = applicant?.name || application.name || 'Applicant';

  if (decision === 'APPROVED') {
    // Use transaction to ensure atomicity
    const { getDb } = await import('../db/index.js');
    const db = getDb();
    if (!db) {
      res.status(500).json({ message: 'Database not available' });
      return;
    }

    try {
      await db.transaction(async (tx) => {
        // 1. Update application status to accepted
        await tx
          .update(applications)
          .set({
            status: 'accepted',
            respondedAt: sql`NOW()`,
          })
          .where(eq(applications.id, applicationId));

        // 2. If it's a shift, update the shift with row-level locking to prevent race conditions
        if (shiftId && application.userId) {
          // Lock the shift row first to prevent concurrent accepts using FOR UPDATE
          const result = await (tx as any).execute(
            sql`SELECT * FROM shifts WHERE id = ${shiftId} FOR UPDATE`
          );
          
          // Handle different result formats (rows array or result object)
          const lockedShift = Array.isArray(result) ? result[0] : result?.rows?.[0] || result?.[0];

          if (!lockedShift) {
            throw new Error('Shift not found');
          }

          // Check if shift is already assigned
          if (lockedShift.assignee_id) {
            throw new Error('Shift has already been filled by another applicant');
          }

          // Now safely update the shift
          await tx
            .update(shifts)
            .set({
              assigneeId: application.userId,
              status: 'confirmed',
            })
            .where(eq(shifts.id, shiftId));

          // 3. Auto-decline other pending applications for this shift
          const pendingApps = await tx
            .select()
            .from(applications)
            .where(and(
              eq(applications.shiftId, shiftId),
              eq(applications.status, 'pending'),
              sql`${applications.id} != ${applicationId}`
            ));

          if (pendingApps.length > 0) {
            await tx
              .update(applications)
              .set({
                status: 'rejected',
                respondedAt: sql`NOW()`,
              })
              .where(and(
                eq(applications.shiftId, shiftId),
                eq(applications.status, 'pending'),
                sql`${applications.id} != ${applicationId}`
              ));
          }
        } else if (jobId) {
          // For jobs, we might want to update job status or just mark as filled
          // For now, we'll just update the application status
          // You can add job status update logic here if needed
        }
      });

      // Fetch updated application
      const updatedApplication = await applicationsRepo.getApplicationById(applicationId);

      // Action-as-signature: Log contract when venue approves shift application
      if (shiftId && application.userId) {
        const shift = await shiftsRepo.getShiftById(shiftId);
        if (shift) {
          const { createShiftAcceptanceContract } = await import('../services/contract.service.js');
          await createShiftAcceptanceContract(shiftId, shift.employerId, application.userId, 'venue');
        }
      }

      // Notify the professional
      if (application.userId) {
        try {
          await notificationService.notifyApplicationApproved(
            application.userId,
            shiftId ? (await shiftsRepo.getShiftById(shiftId)) : null,
            jobId ? (await jobsRepo.getJobById(jobId)) : null
          );
        } catch (error) {
          console.error('[POST /api/applications/:id/decide] Error sending approval notification:', error);
        }
      }

      res.status(200).json({
        message: 'Application approved successfully',
        application: updatedApplication,
      });
    } catch (error: any) {
      console.error('[POST /api/applications/:id/decide] Error approving application:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
      });
      throw error;
    }
  } else {
    // DECLINED
    const updatedApplication = await applicationsRepo.updateApplicationStatus(applicationId, 'rejected');

    if (!updatedApplication) {
      res.status(500).json({ message: 'Failed to update application' });
      return;
    }

    // Notify the professional
    if (application.userId) {
      try {
        await notificationService.notifyApplicationDeclined(
          application.userId,
          shiftId ? (await shiftsRepo.getShiftById(shiftId)) : null,
          jobId ? (await jobsRepo.getJobById(jobId)) : null
        );
      } catch (error) {
        console.error('[POST /api/applications/:id/decide] Error sending decline notification:', error);
      }
    }

    res.status(200).json({
      message: 'Application declined',
      application: updatedApplication,
    });
  }
}));

export default router;

