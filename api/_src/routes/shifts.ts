import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ShiftSchema } from '../validation/schemas.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import * as usersRepo from '../repositories/users.repository.js';

const router = Router();

// Create a shift (authenticated, employer only)
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = ShiftSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const shiftData = validationResult.data;
  
  // Handle frontend compatibility mapping
  // If date provided but not startTime/endTime, construct them
  let startTime = shiftData.startTime;
  let endTime = shiftData.endTime;
  
  if (shiftData.date && (!startTime || !endTime)) {
    // Default to 9am - 5pm on the given date if not specified
    const baseDate = new Date(shiftData.date);
    const start = new Date(baseDate);
    start.setHours(9, 0, 0, 0);
    
    const end = new Date(baseDate);
    end.setHours(17, 0, 0, 0);
    
    startTime = start.toISOString();
    endTime = end.toISOString();
  }

  if (!startTime || !endTime) {
    res.status(400).json({ message: 'Start time and end time are required' });
    return;
  }

  // Create shift
  try {
    const shiftPayload = {
      employerId: userId,
      title: shiftData.title,
      description: shiftData.description || shiftData.requirements || '',
      startTime,
      endTime,
      hourlyRate: (shiftData.hourlyRate || shiftData.pay || '0').toString(),
      status: shiftData.status || 'draft',
      location: shiftData.location,
    };
    
    const newShift = await shiftsRepo.createShift(shiftPayload);

    if (!newShift) {
      console.error('[POST /api/shifts] createShift returned null - database may not be available');
      res.status(500).json({ 
        message: 'Failed to create shift - database unavailable',
        error: 'Database connection failed or insert returned no result'
      });
      return;
    }

    res.status(201).json(newShift);
  } catch (error: any) {
    // Error will be caught by asyncHandler and passed to errorHandler middleware
    console.error('[POST /api/shifts] Error creating shift:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      stack: error?.stack,
      body: req.body,
    });
    throw error;
  }
}));

// Get all open shifts (public read)
router.get('/', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const status = req.query.status as 'draft' | 'invited' | 'open' | 'filled' | 'completed' | undefined;

  const result = await shiftsRepo.getShifts({
    status: status || 'open', // Default to open shifts only for public feed
    limit,
    offset,
  });

  if (!result) {
    res.status(200).json([]);
    return;
  }

  res.status(200).json(result.data);
}));

// Get shift by ID (public read)
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shift = await shiftsRepo.getShiftById(id);

  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  res.status(200).json(shift);
}));

// Update shift (full update - for drag-and-drop rescheduling) (authenticated, employer only)
router.put('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, description, startTime, endTime, hourlyRate, status, location } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift to check ownership
  const existingShift = await shiftsRepo.getShiftById(id);
  if (!existingShift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (existingShift.employerId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only update your own shifts' });
    return;
  }

  // Build update object with only provided fields
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (startTime !== undefined) updates.startTime = startTime;
  if (endTime !== undefined) updates.endTime = endTime;
  if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate;
  if (status !== undefined) {
    if (!['draft', 'invited', 'open', 'filled', 'completed'].includes(status)) {
      res.status(400).json({ message: 'Invalid status. Must be one of: draft, invited, open, filled, completed' });
      return;
    }
    updates.status = status;
  }
  
  // Handle assignedStaff if provided (store as JSON in description or separate field)
  // For now, we'll store it in the shift object - in production, you might want a separate table
  if (req.body.assignedStaffId !== undefined || req.body.assignedStaff !== undefined) {
    // Store assigned staff info - in a real app, you'd have a separate shift_assignments table
    // For now, we'll just update the status to 'invited' if assignedStaffId is provided
    if (req.body.assignedStaffId && !updates.status) {
      updates.status = 'invited';
    }
  }
  if (location !== undefined) updates.location = location;

  const updatedShift = await shiftsRepo.updateShift(id, updates);

  if (!updatedShift) {
    res.status(500).json({ message: 'Failed to update shift' });
    return;
  }

  res.status(200).json(updatedShift);
}));

// Update shift status (authenticated, employer only)
router.patch('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { status } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate status
  if (!['draft', 'invited', 'open', 'filled', 'completed'].includes(status)) {
    res.status(400).json({ message: 'Invalid status. Must be one of: draft, invited, open, filled, completed' });
    return;
  }

  // Get shift to check ownership
  const existingShift = await shiftsRepo.getShiftById(id);
  if (!existingShift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (existingShift.employerId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only update your own shifts' });
    return;
  }

  const updatedShift = await shiftsRepo.updateShift(id, { status });

  if (!updatedShift) {
    res.status(500).json({ message: 'Failed to update shift' });
    return;
  }

  res.status(200).json(updatedShift);
}));

// Delete shift (authenticated, employer only)
router.delete('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift to check ownership
  const existingShift = await shiftsRepo.getShiftById(id);
  if (!existingShift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (existingShift.employerId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only delete your own shifts' });
    return;
  }

  const deleted = await shiftsRepo.deleteShift(id);

  if (!deleted) {
    res.status(500).json({ message: 'Failed to delete shift' });
    return;
  }

  res.status(200).json({ message: 'Shift deleted successfully' });
}));

// Get shifts by employer (authenticated, owner only or public?)
// Currently implementing as authenticated for shop dashboard usage
// FIXED: Now also fetches legacy jobs to ensure all listings are visible
router.get('/shop/:userId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?.id;

  // Allow users to see their own shifts, or potentially public profile shifts
  // For Shop Dashboard, we typically want to see all statuses
  
  // Fetch both shifts and legacy jobs for this user
  const [shifts, jobsResult] = await Promise.all([
    shiftsRepo.getShiftsByEmployer(userId),
    jobsRepo.getJobs({ businessId: userId })
  ]);

  const jobs = jobsResult?.data || [];

  // Normalize shifts to unified format
  const normalizedShifts = await Promise.all(
    shifts.map(async (shift) => {
      // Get application count for shift
      const shiftApplications = await applicationsRepo.getApplications({ shiftId: shift.id });
      const applicationCount = shiftApplications?.total || 0;

      // Build location string
      const location = shift.location || null;

      // Convert startTime to date string for compatibility
      const startTimeDate = new Date(shift.startTime);
      const dateStr = startTimeDate.toISOString().split('T')[0];

      return {
        id: shift.id,
        title: shift.title,
        payRate: shift.hourlyRate,
        date: dateStr,
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        status: shift.status,
        location,
        applicationCount,
        createdAt: shift.createdAt.toISOString(),
        employerId: shift.employerId,
        // Add type indicator for debugging (optional)
        _type: 'shift'
      };
    })
  );

  // Normalize jobs to unified format
  const normalizedJobs = await Promise.all(
    jobs.map(async (job) => {
      // Get application count for job
      const jobApplications = await applicationsRepo.getApplications({ jobId: job.id });
      const applicationCount = jobApplications?.total || 0;

      // Build location string
      const locationParts = [job.address, job.city, job.state].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(', ') : null;

      // Convert date and times to ISO strings
      // job.date is a Date object or string, job.startTime/endTime are time strings (HH:MM:SS)
      let dateStr: string;
      if (typeof job.date === 'string') {
        dateStr = job.date;
      } else if (job.date && typeof job.date === 'object' && 'toISOString' in job.date) {
        // Handle Date object or Date-like object
        dateStr = (job.date as Date).toISOString().split('T')[0];
      } else {
        // Fallback: convert to string and extract date portion
        dateStr = String(job.date).split('T')[0];
      }
      
      // Extract time portion (time type returns as "HH:MM:SS" string)
      const startTimeStr = typeof job.startTime === 'string' 
        ? job.startTime 
        : String(job.startTime);
      const endTimeStr = typeof job.endTime === 'string' 
        ? job.endTime 
        : String(job.endTime);
      
      // Create full datetime strings (combining date with time)
      // Handle both "HH:MM:SS" and "HH:MM:SS.mmm" formats
      let startDateTime: Date;
      let endDateTime: Date;
      
      try {
        startDateTime = new Date(`${dateStr}T${startTimeStr}`);
        endDateTime = new Date(`${dateStr}T${endTimeStr}`);
        
        // Validate dates
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          // Fallback: use date with default times if parsing fails
          startDateTime = new Date(`${dateStr}T00:00:00`);
          endDateTime = new Date(`${dateStr}T23:59:59`);
        }
      } catch (error) {
        // Fallback: use date with default times if parsing fails
        startDateTime = new Date(`${dateStr}T00:00:00`);
        endDateTime = new Date(`${dateStr}T23:59:59`);
      }

      // Map job status to shift status format (closed -> completed)
      let status = job.status;
      if (status === 'closed') {
        status = 'completed';
      }

      return {
        id: job.id,
        title: job.title,
        shopName: job.shopName || undefined,
        payRate: job.payRate,
        date: dateStr,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        status,
        location,
        applicationCount,
        createdAt: job.createdAt.toISOString(),
        businessId: job.businessId,
        // Add type indicator for debugging (optional)
        _type: 'job'
      };
    })
  );

  // Combine and sort by createdAt (newest first)
  const allListings = [...normalizedShifts, ...normalizedJobs].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Descending order
  });

  res.status(200).json(allListings);
}));

// Get shift offers for a professional (shifts where assigneeId == current user AND status == 'invited')
router.get('/offers/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Fetch shifts assigned to this user with status 'invited'
  const shifts = await shiftsRepo.getShiftsByAssignee(userId, 'invited');

  // Enrich shifts with employer (business) information
  const enrichedShifts = await Promise.all(
    shifts.map(async (shift) => {
      const employer = await usersRepo.getUserById(shift.employerId);
      
      return {
        id: shift.id,
        title: shift.title,
        description: shift.description,
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        hourlyRate: shift.hourlyRate,
        location: shift.location,
        status: shift.status,
        employerId: shift.employerId,
        businessName: employer?.name || 'Unknown Business',
        businessLogo: employer?.avatarUrl || null,
        createdAt: shift.createdAt.toISOString(),
      };
    })
  );

  res.status(200).json(enrichedShifts);
}));

// Accept a shift offer (update status to 'confirmed')
router.post('/:id/accept', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift to verify it's assigned to this user
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (shift.assigneeId !== userId) {
    res.status(403).json({ message: 'Forbidden: This shift is not assigned to you' });
    return;
  }

  if (shift.status !== 'invited') {
    res.status(400).json({ message: 'Shift is not in invited status' });
    return;
  }

  // Update shift status to confirmed
  const updatedShift = await shiftsRepo.updateShift(id, { status: 'confirmed' });

  if (!updatedShift) {
    res.status(500).json({ message: 'Failed to accept shift' });
    return;
  }

  res.status(200).json(updatedShift);
}));

// Decline a shift offer (remove assigneeId and revert status to 'draft')
router.post('/:id/decline', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift to verify it's assigned to this user
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (shift.assigneeId !== userId) {
    res.status(403).json({ message: 'Forbidden: This shift is not assigned to you' });
    return;
  }

  if (shift.status !== 'invited') {
    res.status(400).json({ message: 'Shift is not in invited status' });
    return;
  }

  // Remove assigneeId and revert status to draft
  const updatedShift = await shiftsRepo.updateShift(id, { 
    assigneeId: null,
    status: 'draft'
  });

  if (!updatedShift) {
    res.status(500).json({ message: 'Failed to decline shift' });
    return;
  }

  res.status(200).json(updatedShift);
}));

export default router;
