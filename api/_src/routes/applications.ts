import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { CreateApplicationSchema } from '../validation/schemas.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as notificationService from '../services/notification.service.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as emailService from '../services/email.service.js';

const router = Router();

// Get applications (as applicant or employer)
router.get('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = req.user.id;
  const role = req.user.role; // 'professional', 'business', 'hub', etc.
  const { status } = req.query;
  
  let applications;

  if (role === 'professional') {
    // Fetch applications made BY this user
    applications = await applicationsRepo.getApplicationsForUser(userId, {
      status: status as 'pending' | 'accepted' | 'rejected' | undefined
    });
  } else if (role === 'business' || role === 'hub') {
    // Fetch applications received FOR this business's jobs
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
  
  if (finalUserId) {
    const user = await usersRepo.getUserById(finalUserId);
    if (user) {
      userEmail = user.email;
      userName = user.name;
    }
  }

  if (!userEmail || !userName) {
    res.status(400).json({ message: 'Name and email are required' });
    return;
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
      const applicationLink = `https://snipshift.com.au/manage-jobs?jobId=${targetId}`;
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

export default router;

