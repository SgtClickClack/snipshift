/**
 * Professional Routes
 * 
 * API routes for professional dashboard features
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as applicationsRepo from '../repositories/applications.repository.js';

const router = Router();

/**
 * Format date and time for display
 * Returns a human-readable string like "Tomorrow, 9:00 AM - 5:00 PM" or "Dec 15, 2024, 9:00 AM - 5:00 PM"
 */
function formatDateTime(dateStr: string, startTimeStr: string, endTimeStr: string): string {
  try {
    // Parse date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'Date TBD';
    }

    // Combine date with time strings
    const startDateTime = new Date(`${dateStr}T${startTimeStr}`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return 'Date TBD';
    }

    // Format date part
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jobDate = new Date(date);
    jobDate.setHours(0, 0, 0, 0);
    
    const diffTime = jobDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    let datePart: string;
    if (diffDays === 0) {
      datePart = 'Today';
    } else if (diffDays === 1) {
      datePart = 'Tomorrow';
    } else if (diffDays === -1) {
      datePart = 'Yesterday';
    } else {
      // Format as "MMM d, yyyy"
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      datePart = `${month} ${day}, ${year}`;
    }

    // Format time part
    const formatTime = (date: Date): string => {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
      return `${hours}:${minutesStr} ${ampm}`;
    };

    const startTimeFormatted = formatTime(startDateTime);
    const endTimeFormatted = formatTime(endDateTime);

    return `${datePart}, ${startTimeFormatted} - ${endTimeFormatted}`;
  } catch (error) {
    return 'Date TBD';
  }
}

/**
 * Format pay rate for display
 * Returns a string like "$35/hr"
 */
function formatPayRate(payRate: string | null | undefined): string {
  if (!payRate) {
    return 'Rate TBD';
  }
  
  const rate = parseFloat(payRate);
  if (isNaN(rate)) {
    return 'Rate TBD';
  }
  
  return `$${rate.toFixed(0)}/hr`;
}

/**
 * Format location from address components
 * Returns a string like "Richmond, VIC" or "123 Main St, Melbourne, VIC"
 */
function formatLocation(address: string | null, city: string | null, state: string | null): string {
  const parts = [address, city, state].filter(Boolean);
  if (parts.length === 0) {
    return 'Location TBD';
  }
  
  // If we have city and state, prefer that format
  if (city && state) {
    return `${city}, ${state}`;
  }
  
  return parts.join(', ');
}

/**
 * GET /api/professional/jobs
 * 
 * Fetch available jobs for professional dashboard with filtering
 * 
 * Query Parameters:
 * - location: Filter by city name
 * - minPayRate: Minimum pay rate (number)
 * - maxPayRate: Maximum pay rate (number)
 * - startDate: Start date for date range filter (YYYY-MM-DD)
 * - endDate: End date for date range filter (YYYY-MM-DD)
 * - jobType: Filter by job role ('barber' | 'hairdresser' | 'stylist' | 'other')
 * - limit: Number of results to return (default: 50)
 * - offset: Number of results to skip (default: 0)
 */
router.get('/jobs', asyncHandler(async (req, res) => {
  // Parse query parameters
  const location = req.query.location as string | undefined;
  const minPayRate = req.query.minPayRate ? parseFloat(req.query.minPayRate as string) : undefined;
  const maxPayRate = req.query.maxPayRate ? parseFloat(req.query.maxPayRate as string) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const jobType = req.query.jobType as 'barber' | 'hairdresser' | 'stylist' | 'other' | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  // Build filters for repository
  const filters: jobsRepo.JobFilters = {
    status: 'open', // Only return open jobs for professionals
    excludeExpired: true, // Exclude jobs that have already passed
    limit,
    offset,
  };

  // Apply filters
  if (location) {
    filters.city = location;
  }

  if (minPayRate !== undefined && !isNaN(minPayRate)) {
    filters.minRate = minPayRate;
  }

  if (maxPayRate !== undefined && !isNaN(maxPayRate)) {
    filters.maxRate = maxPayRate;
  }

  if (startDate) {
    filters.startDate = startDate;
  }

  if (endDate) {
    filters.endDate = endDate;
  }

  if (jobType) {
    filters.role = jobType;
  }

  // Fetch jobs from repository
  const result = await jobsRepo.getJobs(filters);

  if (!result) {
    // Database not available or error occurred
    res.status(200).json([]);
    return;
  }

  // Transform database results to match JobCardData interface
  const transformedJobs = result.data.map((job) => {
    // Format date string
    let dateStr: string;
    if (typeof job.date === 'string') {
      dateStr = job.date;
    } else if (job.date && typeof job.date === 'object' && 'toISOString' in job.date) {
      dateStr = (job.date as Date).toISOString().split('T')[0];
    } else {
      dateStr = String(job.date).split('T')[0];
    }

    // Format time strings (handle time type from database)
    // Time from database is typically in "HH:MM:SS" or "HH:MM:SS.mmm" format
    let startTimeStr = typeof job.startTime === 'string' 
      ? job.startTime 
      : String(job.startTime || '09:00:00');
    let endTimeStr = typeof job.endTime === 'string' 
      ? job.endTime 
      : String(job.endTime || '17:00:00');
    
    // Remove milliseconds if present and ensure proper format
    startTimeStr = startTimeStr.split('.')[0];
    endTimeStr = endTimeStr.split('.')[0];

    // Format dateTime
    const dateTime = formatDateTime(dateStr, startTimeStr, endTimeStr);

    // Format location
    const location = formatLocation(job.address || null, job.city || null, job.state || null);

    // Format pay rate
    const payRate = formatPayRate(job.payRate);

    return {
      id: job.id,
      title: job.title,
      location,
      payRate,
      dateTime,
    };
  });

  // Return transformed jobs
  res.status(200).json(transformedJobs);
}));

/**
 * GET /api/professional/applications
 * 
 * Fetch all job applications submitted by the current professional user.
 * Supports filtering by application status.
 * 
 * Query Parameters:
 * - status: Filter by application status ('pending', 'confirmed', 'rejected')
 *   - 'confirmed' maps to 'accepted' in the database
 *   - If not provided, returns all applications
 * 
 * Returns: Array of application objects with job details
 */
router.get('/applications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = req.user.id;
  
  // Parse and map status query parameter
  // UI uses "confirmed" but database uses "accepted"
  let status: 'pending' | 'accepted' | 'rejected' | undefined;
  const statusParam = req.query.status as string | undefined;
  
  if (statusParam) {
    if (statusParam === 'confirmed') {
      status = 'accepted';
    } else if (statusParam === 'pending' || statusParam === 'rejected') {
      status = statusParam;
    }
    // If status is invalid, ignore it and return all
  }

  // Fetch applications from repository with status filter
  const applications = await applicationsRepo.getApplicationsForUser(userId, {
    status
  });

  if (!applications) {
    // Database not available or error occurred
    res.status(200).json([]);
    return;
  }

  // Transform database results to match ApplicationCard component structure
  const transformedApplications = applications.map((app) => {
    // Get job or shift details (prefer job over shift)
    const job = app.job;
    const shift = app.shift;
    const isJob = !!job;
    const jobData = job || shift;

    if (!jobData) {
      // Skip applications without job or shift data
      return null;
    }

    // Handle date and time differently for jobs vs shifts
    let dateStr: string | undefined;
    let startTimeStr: string | undefined;
    let endTimeStr: string | undefined;

    if (isJob) {
      // Jobs have separate date and time fields
      if (job.date) {
        if (typeof job.date === 'string') {
          dateStr = job.date;
        } else if (job.date && typeof job.date === 'object' && 'toISOString' in job.date) {
          dateStr = (job.date as Date).toISOString().split('T')[0];
        } else {
          dateStr = String(job.date).split('T')[0];
        }
      }

      if (job.startTime) {
        startTimeStr = typeof job.startTime === 'string' 
          ? job.startTime 
          : String(job.startTime);
        startTimeStr = startTimeStr.split('.')[0];
      }

      if (job.endTime) {
        endTimeStr = typeof job.endTime === 'string' 
          ? job.endTime 
          : String(job.endTime);
        endTimeStr = endTimeStr.split('.')[0];
      }
    } else if (shift) {
      // Shifts have startTime and endTime as timestamps
      if (shift.startTime) {
        const startDate = typeof shift.startTime === 'string' 
          ? new Date(shift.startTime) 
          : (shift.startTime as Date);
        if (!isNaN(startDate.getTime())) {
          dateStr = startDate.toISOString().split('T')[0];
          const hours = startDate.getHours();
          const minutes = startDate.getMinutes();
          startTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        }
      }

      if (shift.endTime) {
        const endDate = typeof shift.endTime === 'string' 
          ? new Date(shift.endTime) 
          : (shift.endTime as Date);
        if (!isNaN(endDate.getTime())) {
          const hours = endDate.getHours();
          const minutes = endDate.getMinutes();
          endTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        }
      }
    }

    // Format location - jobs have address/city/state, shifts have single location field
    let location: string;
    if (isJob) {
      location = formatLocation(
        job.address || null,
        job.city || null,
        job.state || null
      );
    } else if (shift) {
      location = shift.location || 'Location TBD';
    } else {
      location = 'Location TBD';
    }

    // Format pay rate - jobs have payRate, shifts have hourlyRate
    let payRate: string | undefined;
    if (isJob && job.payRate) {
      payRate = formatPayRate(job.payRate);
    } else if (shift && shift.hourlyRate) {
      payRate = formatPayRate(shift.hourlyRate);
    }

    // Map application status: database uses 'accepted', UI uses 'accepted' (we'll keep it as is)
    // The frontend ApplicationCard expects 'accepted' not 'confirmed'
    let applicationStatus: 'pending' | 'accepted' | 'rejected' = app.status;

    // Format applied date
    let appliedAtStr: string;
    if (typeof app.appliedAt === 'string') {
      appliedAtStr = app.appliedAt;
    } else if (app.appliedAt && typeof app.appliedAt === 'object' && 'toISOString' in app.appliedAt) {
      appliedAtStr = (app.appliedAt as Date).toISOString();
    } else {
      appliedAtStr = new Date().toISOString();
    }

    return {
      id: app.id,
      jobId: app.jobId || app.shiftId || '',
      jobTitle: jobData.title || 'Shift',
      jobLocation: location !== 'Location TBD' ? location : undefined,
      jobPayRate: payRate !== 'Rate TBD' ? payRate : undefined,
      jobDate: dateStr,
      jobStartTime: startTimeStr,
      jobEndTime: endTimeStr,
      status: applicationStatus,
      appliedAt: appliedAtStr,
      respondedAt: app.respondedAt 
        ? (typeof app.respondedAt === 'string' 
            ? app.respondedAt 
            : (app.respondedAt as Date).toISOString())
        : null,
      businessId: isJob ? job.businessId : (shift ? shift.employerId : undefined),
      shopName: isJob ? (job.shopName || undefined) : undefined,
    };
  }).filter((app): app is NonNullable<typeof app> => app !== null);

  // Return transformed applications
  res.status(200).json(transformedApplications);
}));

/**
 * POST /api/professional/applications/:id/withdraw
 * 
 * Withdraw a pending job application.
 * Only the application owner (professional) can withdraw their own application.
 * Only pending applications can be withdrawn.
 * 
 * Path Parameters:
 * - id: Application ID to withdraw
 * 
 * Returns: 200 on success with success message
 */
router.post('/applications/:id/withdraw', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = req.user.id;
  const { id: applicationId } = req.params;

  // Get application to verify ownership and status
  const application = await applicationsRepo.getApplicationById(applicationId);
  
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Verify the current user owns the application
  if (application.userId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only withdraw your own applications' });
    return;
  }

  // Check if the application status is 'pending' (only pending applications can be withdrawn)
  if (application.status !== 'pending') {
    res.status(400).json({ 
      message: `Cannot withdraw application. Only pending applications can be withdrawn. Current status: ${application.status}` 
    });
    return;
  }

  // Delete the application (withdrawal)
  const deleted = await applicationsRepo.deleteApplication(applicationId);
  
  if (!deleted) {
    res.status(500).json({ message: 'Failed to withdraw application' });
    return;
  }

  res.status(200).json({ 
    message: 'Application withdrawn successfully',
    applicationId 
  });
}));

/**
 * GET /api/professional/applications/:id/updates
 * 
 * Fetch status update history for a specific application.
 * Returns a chronological list of status updates and correspondence.
 * 
 * Path Parameters:
 * - id: Application ID
 * 
 * Returns: Array of status update objects
 */
router.get('/applications/:id/updates', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = req.user.id;
  const { id: applicationId } = req.params;

  // Verify the application exists and belongs to the user
  const application = await applicationsRepo.getApplicationById(applicationId);
  
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Verify the current user owns the application
  if (application.userId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only view updates for your own applications' });
    return;
  }

  // TODO: Replace with actual database query once status update tracking is implemented
  // For now, return mock data based on application status and creation date
  const mockUpdates = generateMockStatusUpdates(application);

  res.status(200).json(mockUpdates);
}));

/**
 * Generate mock status updates for an application
 * This will be replaced with actual database queries in the future
 */
function generateMockStatusUpdates(application: any) {
  const updates: Array<{
    id: string;
    timestamp: string;
    statusType: 'Submitted' | 'Viewed' | 'Shortlisted' | 'Needs Info' | 'Under Review' | 'Accepted' | 'Rejected';
    message?: string;
  }> = [];

  // Always start with submission
  updates.push({
    id: `${application.id}-1`,
    timestamp: application.appliedAt ? 
      (typeof application.appliedAt === 'string' ? application.appliedAt : application.appliedAt.toISOString()) :
      new Date().toISOString(),
    statusType: 'Submitted',
    message: 'Your application has been submitted successfully.',
  });

  // Add viewed update (1-2 hours after submission)
  const viewedTime = new Date(application.appliedAt || new Date());
  viewedTime.setHours(viewedTime.getHours() + Math.floor(Math.random() * 2) + 1);
  updates.push({
    id: `${application.id}-2`,
    timestamp: viewedTime.toISOString(),
    statusType: 'Viewed',
    message: 'The shop owner has viewed your application.',
  });

  // Add status-specific updates based on current application status
  if (application.status === 'pending') {
    // For pending applications, add "Under Review" or "Shortlisted"
    const reviewTime = new Date(viewedTime);
    reviewTime.setHours(reviewTime.getHours() + Math.floor(Math.random() * 24) + 12);
    
    if (Math.random() > 0.5) {
      updates.push({
        id: `${application.id}-3`,
        timestamp: reviewTime.toISOString(),
        statusType: 'Shortlisted',
        message: 'Your application has been shortlisted. The shop owner may contact you soon.',
      });
    } else {
      updates.push({
        id: `${application.id}-3`,
        timestamp: reviewTime.toISOString(),
        statusType: 'Under Review',
        message: 'Your application is currently under review.',
      });
    }
  } else if (application.status === 'accepted') {
    // For accepted applications, show the acceptance update
    const acceptedTime = application.respondedAt ? 
      (typeof application.respondedAt === 'string' ? new Date(application.respondedAt) : application.respondedAt) :
      new Date(viewedTime.getTime() + 24 * 60 * 60 * 1000);
    
    updates.push({
      id: `${application.id}-3`,
      timestamp: acceptedTime.toISOString(),
      statusType: 'Accepted',
      message: 'Congratulations! Your application has been accepted. The shop owner will contact you with next steps.',
    });
  } else if (application.status === 'rejected') {
    // For rejected applications, show the rejection update
    const rejectedTime = application.respondedAt ? 
      (typeof application.respondedAt === 'string' ? new Date(application.respondedAt) : application.respondedAt) :
      new Date(viewedTime.getTime() + 24 * 60 * 60 * 1000);
    
    updates.push({
      id: `${application.id}-3`,
      timestamp: rejectedTime.toISOString(),
      statusType: 'Rejected',
      message: 'Unfortunately, your application was not successful at this time. Thank you for your interest.',
    });
  }

  // Sort by timestamp (oldest first for chronological display)
  return updates.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export default router;

