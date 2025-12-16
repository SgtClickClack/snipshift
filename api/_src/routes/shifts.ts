import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ShiftSchema, ShiftInviteSchema, ShiftReviewSchema, BulkAcceptSchema } from '../validation/schemas.js';
import { shiftOffers, shifts } from '../db/schema.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as shiftOffersRepo from '../repositories/shift-offers.repository.js';
import * as shiftInvitationsRepo from '../repositories/shift-invitations.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as notificationsService from '../lib/notifications-service.js';
import * as shiftReviewsRepo from '../repositories/shift-reviews.repository.js';
import * as stripeConnectService from '../services/stripe-connect.service.js';
import { SmartFillSchema, GenerateRosterSchema } from '../validation/schemas.js';
import { generateShiftSlotsForRange, filterOverlappingSlots } from '../utils/shift-slot-generator.js';
import { createBatchShifts, getShiftsByEmployerInRange, deleteDraftShiftsInRange, deleteAllShiftsForEmployer } from '../repositories/shifts.repository.js';
import { getDb } from '../db/index.js';
import { toISOStringSafe } from '../lib/date.js';

const router = Router();

const authenticateIfEmployerQuery = (req: Request, res: Response, next: NextFunction) => {
  if (!req.query?.employer_id) {
    next();
    return;
  }
  authenticateUser(req, res, next);
};

// Helper function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

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
  const assignedStaffIdRaw = (req.body as any)?.assignedStaffId;
  const assignedStaffId =
    typeof assignedStaffIdRaw === 'string' && isValidUUID(assignedStaffIdRaw)
      ? assignedStaffIdRaw
      : undefined;
  
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

  // Create shift(s)
  try {
    const isRecurring = shiftData.isRecurring || false;
    const recurringShifts = shiftData.recurringShifts || [];

    // If recurring and we have recurring shifts data, create multiple shifts in a transaction
    if (isRecurring && recurringShifts.length > 0) {
      // Extract lat/lng from request body
      const lat = (req.body as any).lat;
      const lng = (req.body as any).lng;
      
      const parentShiftData = {
        employerId: userId,
        title: shiftData.title,
        description: shiftData.description || shiftData.requirements || '',
        startTime,
        endTime,
        hourlyRate: (shiftData.hourlyRate || shiftData.pay || '0').toString(),
        status: shiftData.status || 'draft',
        location: shiftData.location,
        lat: lat !== undefined ? (typeof lat === 'string' ? parseFloat(lat) : lat) : undefined,
        lng: lng !== undefined ? (typeof lng === 'string' ? parseFloat(lng) : lng) : undefined,
      };

      const createdShifts = await shiftsRepo.createRecurringShifts(
        parentShiftData,
        recurringShifts
      );

      if (!createdShifts || createdShifts.length === 0) {
        console.error('[POST /api/shifts] createRecurringShifts returned empty - database may not be available');
        res.status(500).json({ 
          message: 'Failed to create recurring shifts - database unavailable',
          error: 'Database connection failed or insert returned no result'
        });
        return;
      }

      res.status(201).json({
        parent: createdShifts[0],
        children: createdShifts.slice(1),
        total: createdShifts.length,
      });
      return;
    }

    // Single shift creation
    // Extract lat/lng from request body
    const lat = (req.body as any).lat;
    const lng = (req.body as any).lng;
    
    const shiftPayload = {
      employerId: userId,
      title: shiftData.title,
      description: shiftData.description || shiftData.requirements || '',
      startTime,
      endTime,
      hourlyRate: (shiftData.hourlyRate || shiftData.pay || '0').toString(),
      // If a staff member is selected, create an invited shift
      status: assignedStaffId ? 'invited' : (shiftData.status || 'draft'),
      location: shiftData.location,
      lat: lat !== undefined ? (typeof lat === 'string' ? parseFloat(lat) : lat) : undefined,
      lng: lng !== undefined ? (typeof lng === 'string' ? parseFloat(lng) : lng) : undefined,
      isRecurring: isRecurring,
      assigneeId: assignedStaffId,
    };
    
    const newShift = await shiftsRepo.createShift(shiftPayload);

    if (!newShift) {
      // Check if database is available
      const { getDatabase } = await import('../db/connection.js');
      const db = getDatabase();
      const dbAvailable = db !== null;
      
      console.error('[POST /api/shifts] createShift returned null', {
        databaseAvailable: dbAvailable,
        shiftPayload: {
          employerId: shiftPayload.employerId,
          title: shiftPayload.title,
          startTime: shiftPayload.startTime,
          endTime: shiftPayload.endTime,
        }
      });
      
      res.status(500).json({ 
        message: 'Failed to create shift',
        error: dbAvailable 
          ? 'Database insert returned no result - check database logs' 
          : 'Database connection unavailable',
        databaseAvailable: dbAvailable
      });
      return;
    }

    // If shift is invited to a specific professional, also create an offer + notify them.
    if (assignedStaffId) {
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await shiftOffersRepo.createShiftOffer({
          shiftId: newShift.id,
          professionalId: assignedStaffId,
          expiresAt,
        });
      } catch (error) {
        // Don’t fail shift creation if the offer table isn’t available yet.
        console.error('[POST /api/shifts] Failed to create shift offer for invited shift:', error);
      }

      try {
        await notificationsService.notifyProfessionalOfInvite(assignedStaffId, {
          id: newShift.id,
          title: newShift.title,
          startTime: (newShift as any).startTime,
          endTime: (newShift as any).endTime,
          location: (newShift as any).location,
          hourlyRate: (newShift as any).hourlyRate,
          employerId: newShift.employerId,
        });
      } catch (error) {
        console.error('[POST /api/shifts] Failed to notify invited professional:', error);
      }
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

// Get shifts (public feed by default; authenticated employer view when employer_id is provided)
router.get('/', authenticateIfEmployerQuery, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const employerIdParam = req.query.employer_id as string | undefined;
  if (employerIdParam) {
    type EmployerShiftStatus =
      | 'draft'
      | 'pending'
      | 'invited'
      | 'open'
      | 'filled'
      | 'completed'
      | 'confirmed'
      | 'cancelled'
      | 'pending_completion';

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (employerIdParam !== 'me') {
      res.status(400).json({ message: 'Invalid employer_id. Use employer_id=me.' });
      return;
    }

    const startRaw = req.query.start as string | undefined;
    const endRaw = req.query.end as string | undefined;
    const status = req.query.status as EmployerShiftStatus | undefined;
    if (!startRaw || !endRaw) {
      res.status(400).json({ message: 'start and end query params are required when employer_id=me' });
      return;
    }

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid start/end. Expected ISO date strings.' });
      return;
    }
    if (start >= end) {
      res.status(400).json({ message: 'start must be before end.' });
      return;
    }

    const employerShifts = await getShiftsByEmployerInRange(userId, start, end);

    const filtered = status ? employerShifts.filter((s) => s.status === status) : employerShifts;

    const transformed = filtered.map((shift) => ({
      ...shift,
      startTime: toISOStringSafe((shift as any).startTime),
      endTime: toISOStringSafe((shift as any).endTime),
      createdAt: toISOStringSafe((shift as any).createdAt),
      updatedAt: toISOStringSafe((shift as any).updatedAt),
      date: (shift as any).startTime ? toISOStringSafe((shift as any).startTime) : undefined,
      pay: shift.hourlyRate ? String(shift.hourlyRate) : undefined,
      requirements: shift.description,
    }));

    res.status(200).json(transformed);
    return;
  }
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const status = req.query.status as 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | undefined;

  const filters: any = {
    status: status || 'open', // Default to open shifts only for public feed
    limit,
    offset,
  };

  // For open shifts, only show future shifts (startTime > NOW)
  if ((status || 'open') === 'open') {
    filters.startTimeAfter = new Date();
  }

  const result = await shiftsRepo.getShifts(filters);

  if (!result) {
    res.status(200).json([]);
    return;
  }

  // Transform shifts to include frontend compatibility fields
  const transformedData = result.data.map((shift) => ({
    ...shift,
    // Frontend compatibility: add date and pay aliases
    date: (shift as any).startTime ? toISOStringSafe((shift as any).startTime) : undefined,
    pay: shift.hourlyRate ? String(shift.hourlyRate) : undefined,
    requirements: shift.description, // Alias for description
  }));

  res.status(200).json(transformedData);
}));

// Get shifts pending review for the current user
// IMPORTANT: This route must come BEFORE /:id to avoid route conflicts
router.get('/pending-review', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get user to determine role
  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Role-aware fetching:
  // - Professionals only need shifts where they are the assignee
  // - Businesses only need shifts where they are the employer
  // Avoid querying both unconditionally (prevents unnecessary DB work and reduces risk of role-mismatched queries).
  const roleSet = new Set<string>();
  if ((user as any).role) roleSet.add((user as any).role);
  if (Array.isArray((user as any).roles)) {
    for (const r of (user as any).roles) {
      if (typeof r === 'string') roleSet.add(r);
    }
  }
  const isBusiness = roleSet.has('business');
  const isProfessional = roleSet.has('professional');
  const isAdmin = roleSet.has('admin');

  // Find shifts that need review:
  // 1. For shops: shifts with status 'pending_completion' or 'completed' where shop hasn't reviewed barber
  // 2. For barbers: shifts with status 'pending_completion' or 'completed' where barber hasn't reviewed shop
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Get shifts where user is employer (shop) and needs to review barber
  const shopShifts = (isBusiness || isAdmin)
    ? await shiftsRepo.getShifts({
      employerId: userId,
      status: 'pending_completion',
      limit: 100,
    })
    : null;

  // Get shifts where user is assignee (barber) and needs to review shop
  const barberShifts = (isProfessional || isAdmin)
    ? await shiftsRepo.getShifts({
      assigneeId: userId,
      status: 'pending_completion',
      limit: 100,
    })
    : null;

  // Filter to only include shifts where review hasn't been submitted
  const pendingReviews = [];

  for (const shift of [...(shopShifts?.data || []), ...(barberShifts?.data || [])]) {
    if (!shift.assigneeId) continue; // Skip shifts without assignee

    const isShop = shift.employerId === userId;
    const reviewType = isShop ? 'SHOP_REVIEWING_BARBER' : 'BARBER_REVIEWING_SHOP';
    
    // Check if review already exists
    const hasReviewed = await shiftReviewsRepo.hasUserReviewedShift(shift.id, userId, reviewType);
    
    if (!hasReviewed && shift.endTime && new Date(shift.endTime) < oneHourAgo) {
      // Get names for display
      const employer = await usersRepo.getUserById(shift.employerId);
      const assignee = shift.assigneeId ? await usersRepo.getUserById(shift.assigneeId) : null;

      pendingReviews.push({
        id: shift.id,
        title: shift.title,
        endTime: toISOStringSafe((shift as any).endTime),
        employerId: shift.employerId,
        assigneeId: shift.assigneeId,
        employerName: employer?.name,
        assigneeName: assignee?.name,
        status: shift.status,
        attendanceStatus: shift.attendanceStatus,
      });
    }
  }

  res.status(200).json(pendingReviews);
}));

// Get applications for a specific shift (authenticated, employer only)
// NOTE: This route must come BEFORE /:id to be matched correctly
router.get('/:id/applications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id: shiftId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(shiftId)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify shift exists and user owns it
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Strict ownership check
  if (shift.employerId !== userId) {
    res.status(403).json({ message: 'Forbidden: You do not own this shift' });
    return;
  }

  // Get applications with user profile data
  const applications = await applicationsRepo.getApplicationsForShift(shiftId);
  
  if (!applications) {
    res.status(200).json([]);
    return;
  }

  // Transform to include applicant profile information
  const transformed = applications.map((app) => {
    const user = app.user;
    return {
      id: app.id,
      name: app.name,
      email: app.email,
      coverLetter: app.coverLetter,
      status: app.status,
      appliedAt: app.appliedAt.toISOString(),
      respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
      userId: app.userId || undefined,
      // User profile data
      applicant: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        displayName: user.name, // Use name as displayName
        // Rating can be calculated from reviews if needed
        rating: null, // TODO: Calculate from reviews
      } : null,
    };
  });

  res.status(200).json(transformed);
}));

// Update shift (full update - for drag-and-drop rescheduling) (authenticated, employer only)
router.put('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, description, startTime, endTime, hourlyRate, status, location, changeReason } = req.body as any;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate UUID format to prevent route conflicts
  if (!isValidUUID(id)) {
    res.status(404).json({ message: 'Shift not found' });
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

  // Safety: modifying a CONFIRMED shift requires a reason and notifies the professional.
  const requestedStart = startTime !== undefined ? new Date(startTime) : null;
  const requestedEnd = endTime !== undefined ? new Date(endTime) : null;
  const isTimeUpdateRequested = requestedStart !== null || requestedEnd !== null;
  const oldStart = existingShift.startTime ? new Date(existingShift.startTime as any) : null;
  const oldEnd = existingShift.endTime ? new Date(existingShift.endTime as any) : null;
  const nextStart = requestedStart && !isNaN(requestedStart.getTime()) ? requestedStart : oldStart;
  const nextEnd = requestedEnd && !isNaN(requestedEnd.getTime()) ? requestedEnd : oldEnd;
  const timeChanged =
    (!!(nextStart && oldStart && nextStart.getTime() !== oldStart.getTime())) ||
    (!!(nextEnd && oldEnd && nextEnd.getTime() !== oldEnd.getTime()));

  if (existingShift.status === 'confirmed' && existingShift.assigneeId && isTimeUpdateRequested && timeChanged) {
    const reason = typeof changeReason === 'string' ? changeReason.trim() : '';
    if (!reason || reason.length < 5) {
      res.status(400).json({ message: 'A changeReason (min 5 chars) is required to modify a confirmed shift.' });
      return;
    }
  }

  // Build update object with only provided fields
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (startTime !== undefined) updates.startTime = startTime;
  if (endTime !== undefined) updates.endTime = endTime;
  if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate;
  if (status !== undefined) {
    if (!['draft', 'pending', 'invited', 'open', 'filled', 'completed', 'confirmed', 'cancelled'].includes(status)) {
      res.status(400).json({ message: 'Invalid status. Must be one of: draft, pending, invited, open, filled, completed, confirmed, cancelled' });
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

  if (existingShift.status === 'confirmed' && existingShift.assigneeId && isTimeUpdateRequested && timeChanged) {
    const reason = typeof changeReason === 'string' ? changeReason.trim() : '';
    try {
      await notificationsService.notifyProfessionalOfShiftChange(existingShift.assigneeId, {
        shiftId: existingShift.id,
        title: (updatedShift as any).title || existingShift.title,
        oldStartTime: existingShift.startTime,
        oldEndTime: existingShift.endTime,
        newStartTime: (updatedShift as any).startTime,
        newEndTime: (updatedShift as any).endTime,
        reason,
        employerId: existingShift.employerId,
      });
    } catch (error) {
      console.error('[PUT /api/shifts/:id] Error sending shift change notification:', error);
    }
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

  // Validate UUID format to prevent route conflicts
  if (!isValidUUID(id)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Validate status
  if (!['draft', 'pending', 'invited', 'open', 'filled', 'completed', 'confirmed', 'cancelled'].includes(status)) {
    res.status(400).json({ message: 'Invalid status. Must be one of: draft, pending, invited, open, filled, completed, confirmed, cancelled' });
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

// Clear all shifts AND jobs for the current user (dangerous - use with caution)
// IMPORTANT: This route MUST be declared before `DELETE /:id` or it will be treated as id="clear-all".
router.delete('/clear-all', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Delete both shifts (employerId) and jobs (businessId)
  const deletedShiftsCount = await deleteAllShiftsForEmployer(userId);
  const deletedJobsCount = await jobsRepo.deleteAllJobsForBusiness(userId);
  const totalDeleted = deletedShiftsCount + deletedJobsCount;

  console.log(`[DELETE /api/shifts/clear-all] User ${userId}: Deleted ${deletedShiftsCount} shifts and ${deletedJobsCount} jobs`);

  res.status(200).json({
    success: true,
    count: totalDeleted,
    shiftsDeleted: deletedShiftsCount,
    jobsDeleted: deletedJobsCount,
    message: `Deleted ${deletedShiftsCount} shift(s) and ${deletedJobsCount} job(s)`,
  });
}));

// Delete shift (authenticated, employer only)
// Uses a transaction to first delete related records (shift_invitations, applications, shift_offers)
// to avoid foreign key constraint errors
router.delete('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate UUID format to prevent route conflicts
  if (!isValidUUID(id)) {
    res.status(404).json({ message: 'Shift not found' });
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

  // Use a transaction to delete related records first, then the shift
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const normalizeRows = (result: any): any[] => {
        if (!result) return [];
        if (Array.isArray(result)) return result;
        if (Array.isArray(result.rows)) return result.rows;
        return [];
      };

      const tableExists = async (tableName: string): Promise<boolean> => {
        const result = await tx.execute(
          sql`SELECT to_regclass(${`public.${tableName}`}) IS NOT NULL AS exists`
        );
        const rows = normalizeRows(result);
        const value = rows?.[0]?.exists;
        return value === true || value === 't' || value === 1;
      };

      const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
        const result = await tx.execute(sql`
          SELECT 1 AS exists
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${tableName}
            AND column_name = ${columnName}
          LIMIT 1
        `);
        const rows = normalizeRows(result);
        return rows.length > 0;
      };

      // 1) shift_invitations (new multi-invite system) - might not exist on legacy DBs
      if (await tableExists('shift_invitations')) {
        await tx.execute(sql`DELETE FROM shift_invitations WHERE shift_id = ${id}`);
      }

      // 2) shift_offers (legacy invite system) - might not exist on some DBs
      if (await tableExists('shift_offers')) {
        await tx.execute(sql`DELETE FROM shift_offers WHERE shift_id = ${id}`);
      }

      // 3) applications linkage - shift_id column may not exist on older installs
      if (await tableExists('applications')) {
        if (await columnExists('applications', 'shift_id')) {
          await tx.execute(sql`DELETE FROM applications WHERE shift_id = ${id}`);
        }
        // Legacy compatibility: some installs may still store shift references in job_id
        // (older unified listing flows / migrations). If job_id exists, delete those too.
        if (await columnExists('applications', 'job_id')) {
          await tx.execute(sql`DELETE FROM applications WHERE job_id = ${id}`);
        }
      }

      // 4) Finally delete the shift itself
      await tx.delete(shifts).where(eq(shifts.id, id));
    });

    console.log(`[DELETE /api/shifts/:id] Successfully deleted shift ${id} and related records`);
    res.status(200).json({ message: 'Shift deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/shifts/:id] Error deleting shift:', {
      shiftId: id,
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
    });
    res.status(500).json({ 
      message: 'Failed to delete shift',
      error: error?.message || 'Unknown error'
    });
  }
}));

// Get shifts by employer (authenticated, owner only or public?)
// Currently implementing as authenticated for shop dashboard usage
// FIXED: Now also fetches legacy jobs to ensure all listings are visible
router.get('/shop/:userId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?.id;

  // Allow users to see their own shifts, or potentially public profile shifts
  // For Shop Dashboard, we typically want to see all statuses
  
  try {
    // Fetch both shifts and legacy jobs for this user
    // Note: We pass excludeExpired: false to include past jobs for calendar/history display
    const [shifts, jobsResult] = await Promise.all([
      shiftsRepo.getShiftsByEmployer(userId),
      jobsRepo.getJobs({ businessId: userId, excludeExpired: false })
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
      const startTimeISO = toISOStringSafe(shift.startTime);
      const endTimeISO = toISOStringSafe(shift.endTime);
      const createdAtISO = toISOStringSafe(shift.createdAt);
      const dateStr = startTimeISO.split('T')[0];

      return {
        id: shift.id,
        title: shift.title,
        payRate: shift.hourlyRate,
        date: dateStr,
        startTime: startTimeISO,
        endTime: endTimeISO,
        status: shift.status,
        location,
        applicationCount,
        createdAt: createdAtISO,
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
        // `jobsRepo.getJobs()` can return `createdAt` as a string in some environments.
        // Normalize defensively to avoid runtime 500s in `/api/shifts/shop/:userId`.
        createdAt: (() => {
          const raw: any = (job as any).createdAt;
          if (raw && typeof raw.toISOString === 'function') return raw.toISOString();
          const d = new Date(raw ?? Date.now());
          return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        })(),
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
  } catch (error: any) {
    console.error('[GET /api/shifts/shop/:userId] Error:', error);
    console.error('[GET /api/shifts/shop/:userId] Stack:', error?.stack);
    res.status(500).json({ 
      message: 'Failed to fetch shop shifts',
      error: error?.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}));

// Get shift offers for a professional (shifts where assigneeId == current user AND status == 'invited')
// This is the legacy endpoint for backwards compatibility
router.get('/offers/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Fetch shifts assigned to this user with status 'invited'
  const legacyShifts = await shiftsRepo.getShiftsByAssignee(userId, 'invited');

  // Also fetch shifts from new invitations system
  const newInvitations = await shiftInvitationsRepo.getPendingInvitationsWithShiftDetails(userId);

  // Combine both sources (avoiding duplicates)
  const shiftIds = new Set<string>();
  const allShifts: any[] = [];

  // Add legacy shifts
  for (const shift of legacyShifts) {
    if (!shiftIds.has(shift.id)) {
      shiftIds.add(shift.id);
      allShifts.push(shift);
    }
  }

  // Add shifts from new invitations
  for (const { shift } of newInvitations) {
    if (!shiftIds.has(shift.id)) {
      shiftIds.add(shift.id);
      allShifts.push(shift);
    }
  }

  // Enrich shifts with employer (business) information
  const enrichedShifts = await Promise.all(
    allShifts.map(async (shift) => {
      const employer = await usersRepo.getUserById(shift.employerId);
      
      return {
        id: shift.id,
        title: shift.title,
        description: shift.description,
        startTime: toISOStringSafe((shift as any).startTime),
        endTime: toISOStringSafe((shift as any).endTime),
        hourlyRate: shift.hourlyRate,
        location: shift.location,
        status: shift.status,
        employerId: shift.employerId,
        businessName: employer?.name || 'Unknown Business',
        businessLogo: employer?.avatarUrl || null,
        createdAt: toISOStringSafe((shift as any).createdAt),
      };
    })
  );

  res.status(200).json(enrichedShifts);
}));

// Get pending invitations for bulk review (grouped by shop and week)
router.get('/invitations/pending', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Wrap database calls in try-catch for graceful degradation
  // Some production environments may have older DB schemas
  let invitations: Awaited<ReturnType<typeof shiftInvitationsRepo.getPendingInvitationsWithShiftDetails>> = [];
  let legacyShifts: Awaited<ReturnType<typeof shiftsRepo.getShiftsByAssignee>> = [];

  try {
    // Fetch pending invitations with shift details
    invitations = await shiftInvitationsRepo.getPendingInvitationsWithShiftDetails(userId);
  } catch (error: any) {
    console.error('[GET /invitations/pending] Failed to fetch new-style invitations:', {
      userId,
      message: error?.message,
      code: error?.code || error?.cause?.code,
    });
    // Continue with empty invitations - don't fail the whole request
  }

  try {
    // Also include legacy invited shifts (assigned directly to user)
    legacyShifts = await shiftsRepo.getShiftsByAssignee(userId, 'invited');
  } catch (error: any) {
    console.error('[GET /invitations/pending] Failed to fetch legacy shifts:', {
      userId,
      message: error?.message,
      code: error?.code || error?.cause?.code,
    });
    // Continue with empty legacy shifts - don't fail the whole request
  }

  // Combine and enrich with business information
  const shiftMap = new Map<string, any>();

  // Process new-style invitations
  for (const { invitation, shift } of invitations) {
    const employer = await usersRepo.getUserById(shift.employerId);
    
    shiftMap.set(shift.id, {
      id: shift.id,
      invitationId: invitation.id,
      title: shift.title,
      description: shift.description,
      startTime: toISOStringSafe((shift as any).startTime),
      endTime: toISOStringSafe((shift as any).endTime),
      hourlyRate: shift.hourlyRate,
      location: shift.location,
      status: shift.status,
      employerId: shift.employerId,
      businessName: employer?.name || 'Unknown Business',
      businessLogo: employer?.avatarUrl || null,
      createdAt: toISOStringSafe((shift as any).createdAt),
      invitedAt: toISOStringSafe((invitation as any).createdAt),
      invitationType: 'multi', // First-to-Accept style
    });
  }

  // Process legacy shifts
  for (const shift of legacyShifts) {
    if (!shiftMap.has(shift.id)) {
      const employer = await usersRepo.getUserById(shift.employerId);
      
      shiftMap.set(shift.id, {
        id: shift.id,
        invitationId: null,
        title: shift.title,
        description: shift.description,
        startTime: toISOStringSafe((shift as any).startTime),
        endTime: toISOStringSafe((shift as any).endTime),
        hourlyRate: shift.hourlyRate,
        location: shift.location,
        status: shift.status,
        employerId: shift.employerId,
        businessName: employer?.name || 'Unknown Business',
        businessLogo: employer?.avatarUrl || null,
        createdAt: toISOStringSafe((shift as any).createdAt),
        invitedAt: toISOStringSafe((shift as any).createdAt),
        invitationType: 'direct', // Legacy direct assignment
      });
    }
  }

  const allInvitations = Array.from(shiftMap.values());

  // Group by week and shop for roster view
  const groupedByShop: Record<string, {
    shopId: string;
    shopName: string;
    shopLogo: string | null;
    shifts: typeof allInvitations;
  }> = {};

  const groupedByWeek: Record<string, {
    weekStart: string;
    weekEnd: string;
    shifts: typeof allInvitations;
  }> = {};

  for (const inv of allInvitations) {
    // Group by shop
    if (!groupedByShop[inv.employerId]) {
      groupedByShop[inv.employerId] = {
        shopId: inv.employerId,
        shopName: inv.businessName,
        shopLogo: inv.businessLogo,
        shifts: [],
      };
    }
    groupedByShop[inv.employerId].shifts.push(inv);

    // Group by week
    const shiftDate = new Date(inv.startTime);
    const weekStart = new Date(shiftDate);
    weekStart.setDate(shiftDate.getDate() - shiftDate.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!groupedByWeek[weekKey]) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      groupedByWeek[weekKey] = {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        shifts: [],
      };
    }
    groupedByWeek[weekKey].shifts.push(inv);
  }

  res.status(200).json({
    invitations: allInvitations,
    totalCount: allInvitations.length,
    groupedByShop: Object.values(groupedByShop),
    groupedByWeek: Object.values(groupedByWeek).sort((a, b) => 
      new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
    ),
  });
}));

// Invite one or more professionals to a shift (First-to-Accept pattern)
router.post('/:id/invite', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { professionalId, professionalIds } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Build array of professionals to invite
  let targetProfessionalIds: string[] = [];
  if (professionalIds && Array.isArray(professionalIds)) {
    targetProfessionalIds = professionalIds;
  } else if (professionalId) {
    targetProfessionalIds = [professionalId];
  }

  if (targetProfessionalIds.length === 0) {
    res.status(400).json({ message: 'professionalId or professionalIds is required' });
    return;
  }

  // Get shift to check ownership
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (shift.employerId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only invite professionals to your own shifts' });
    return;
  }

  // Check if shift is already taken
  if (shift.assigneeId) {
    res.status(400).json({ message: 'This shift has already been accepted by someone' });
    return;
  }

  // Check if shift is in a valid state for inviting
  if (shift.status !== 'draft' && shift.status !== 'open' && shift.status !== 'invited' && shift.status !== 'pending') {
    res.status(400).json({ message: 'Shift must be in draft, open, or pending status to send invites' });
    return;
  }

  // Create invitations for all professionals using the new shift_invitations table
  const invitations = await shiftInvitationsRepo.createBulkInvitations(id, targetProfessionalIds);
  
  // Also create shift offers for backwards compatibility
  const createdOffers: typeof shiftOffers.$inferSelect[] = [];
  for (const profId of targetProfessionalIds) {
    try {
      const offer = await shiftOffersRepo.createShiftOffer({
        shiftId: id,
        professionalId: profId,
      });
      if (offer) {
        createdOffers.push(offer);
      }
    } catch {
      // Ignore duplicate offer errors
    }
  }

  // Update shift status to 'invited' (without setting assigneeId)
  const updatedShift = await shiftsRepo.updateShift(id, {
    status: 'invited',
    // Do NOT set assigneeId - this is the key change for First-to-Accept
  });

  if (!updatedShift) {
    res.status(500).json({ message: 'Failed to update shift' });
    return;
  }

  // Send notifications to all invited professionals
  for (const profId of targetProfessionalIds) {
    try {
      await notificationsService.notifyProfessionalOfInvite(profId, {
        id: shift.id,
        title: shift.title,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location,
        hourlyRate: shift.hourlyRate,
        employerId: shift.employerId,
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error('[POST /api/shifts/:id/invite] Error sending notification to', profId, ':', error);
    }
  }

  res.status(201).json({
    shift: updatedShift,
    invitationsCreated: invitations.length,
    offersCreated: createdOffers.length,
    invitedProfessionals: targetProfessionalIds,
  });
}));

// Accept a shift offer (First-to-Accept race condition handling)
router.post('/:id/accept', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift to verify it exists
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // FIRST-TO-ACCEPT CHECK: If assigneeId is already set, the shift is taken
  if (shift.assigneeId) {
    res.status(409).json({ 
      message: 'Already Taken', 
      error: 'This shift has already been accepted by another professional' 
    });
    return;
  }

  // Check if user has a pending invitation for this shift
  const hasPendingInvitation = await shiftInvitationsRepo.hasPendingInvitation(id, userId);
  
  // Also check legacy shift offers
  const pendingOffers = await shiftOffersRepo.getOffersForProfessional(userId, 'pending');
  const hasLegacyOffer = pendingOffers.some(offer => offer.shiftId === id);

  if (!hasPendingInvitation && !hasLegacyOffer) {
    res.status(403).json({ message: 'Forbidden: You do not have a pending invitation for this shift' });
    return;
  }

  if (shift.status !== 'invited' && shift.status !== 'pending' && shift.status !== 'open') {
    res.status(400).json({ message: 'Shift is not in a valid status for acceptance' });
    return;
  }

  // Verify barber has completed Stripe Connect onboarding
  const barber = await usersRepo.getUserById(userId);
  if (!barber || !barber.stripeAccountId) {
    res.status(400).json({ message: 'You must complete payout setup before accepting shifts' });
    return;
  }

  const canAcceptShifts = await stripeConnectService.isAccountReady(barber.stripeAccountId);
  if (!canAcceptShifts) {
    res.status(400).json({ message: 'Your payout account is not fully set up. Please complete onboarding.' });
    return;
  }

  // Get shop (employer) information
  const shop = await usersRepo.getUserById(shift.employerId);
  if (!shop) {
    res.status(404).json({ message: 'Shop not found' });
    return;
  }

  // Ensure shop has a Stripe customer ID
  let customerId = shop.stripeCustomerId;
  if (!customerId) {
    customerId = await stripeConnectService.createStripeCustomer(shop.email, shop.name, shop.id);
    if (customerId) {
      await usersRepo.updateUser(shop.id, { stripeCustomerId: customerId });
    }
  }

  if (!customerId) {
    res.status(500).json({ message: 'Failed to set up payment for shop' });
    return;
  }

  // Get default payment method for shop
  const paymentMethods = await stripeConnectService.listPaymentMethods(customerId);
  if (paymentMethods.length === 0) {
    res.status(400).json({ message: 'Shop must add a payment method before accepting shifts. Please add a payment method in your billing settings.' });
    return;
  }
  const paymentMethodId = paymentMethods[0].id; // Use first payment method

  // Calculate shift amount and commission
  const hourlyRate = parseFloat(shift.hourlyRate.toString());
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const shiftAmount = Math.round(hourlyRate * hours * 100); // Convert to cents
  const commissionRate = parseFloat(process.env.SNIPSHIFT_COMMISSION_RATE || '0.10'); // 10% default
  const commissionAmount = Math.round(shiftAmount * commissionRate);
  const barberAmount = shiftAmount - commissionAmount;

  // Create and confirm PaymentIntent with manual capture
  let paymentIntentId: string | null = null;
  try {
    paymentIntentId = await stripeConnectService.createAndConfirmPaymentIntent(
      shiftAmount,
      'aud', // Using AUD for Australian market
      customerId,
      paymentMethodId,
      commissionAmount,
      {
        destination: barber.stripeAccountId,
      },
      {
        shiftId: shift.id,
        barberId: userId,
        shopId: shift.employerId,
        type: 'shift_payment',
      }
    );
  } catch (error: any) {
    console.error('[SHIFT_ACCEPT] Error creating PaymentIntent:', error);
    res.status(500).json({ message: 'Failed to create payment authorization', error: error.message });
    return;
  }

  if (!paymentIntentId) {
    res.status(500).json({ message: 'Failed to create payment authorization' });
    return;
  }

  // TRANSACTION: Use atomic update to prevent race condition
  // This uses a WHERE clause that includes assigneeId IS NULL to ensure atomic claim
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  try {
    // Atomic update: only succeeds if assigneeId is still NULL
    const [updatedShift] = await db
      .update(shifts)
      .set({
        assigneeId: userId,
        status: 'confirmed',
        paymentStatus: 'AUTHORIZED',
        paymentIntentId: paymentIntentId,
        applicationFeeAmount: commissionAmount,
        transferAmount: barberAmount,
        updatedAt: new Date(),
      })
      .where(and(
        eq(shifts.id, id),
        sql`${shifts.assigneeId} IS NULL` // Critical: atomic check
      ))
      .returning();

    if (!updatedShift) {
      // Race condition: someone else got it first
      res.status(409).json({ 
        message: 'Already Taken', 
        error: 'This shift was just accepted by another professional' 
      });
      return;
    }

    // Expire all other invitations for this shift
    const expiredCount = await shiftInvitationsRepo.expireAllPendingInvitationsForShift(id, userId);
    console.log(`[SHIFT_ACCEPT] Expired ${expiredCount} other invitations for shift ${id}`);

    // Also update legacy shift offers
    await shiftOffersRepo.declineAllPendingOffersForShift(id);

    // Get professional information
    const professional = await usersRepo.getUserById(userId);
    const professionalName = professional?.name || 'Professional';

    // Send notification to business
    try {
      await notificationsService.notifyBusinessOfAcceptance(
        shift.employerId,
        professionalName,
        {
          id: shift.id,
          title: shift.title,
          startTime: shift.startTime,
          endTime: shift.endTime,
          location: shift.location,
          hourlyRate: shift.hourlyRate,
        }
      );
    } catch (error) {
      // Log error but don't fail the request
      console.error('[POST /api/shifts/:id/accept] Error sending notification:', error);
    }

    res.status(200).json(updatedShift);
  } catch (error: any) {
    console.error('[SHIFT_ACCEPT] Transaction error:', error);
    res.status(500).json({ message: 'Failed to accept shift', error: error.message });
  }
}));

// Decline a shift offer (update invitation status to DECLINED)
router.post('/:id/decline', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Check if user has a pending invitation for this shift
  const hasPendingInvitation = await shiftInvitationsRepo.hasPendingInvitation(id, userId);
  
  // Also check legacy: if assigneeId matches
  const isLegacyAssignee = shift.assigneeId === userId;

  if (!hasPendingInvitation && !isLegacyAssignee) {
    res.status(403).json({ message: 'Forbidden: You do not have a pending invitation for this shift' });
    return;
  }

  if (shift.status !== 'invited' && shift.status !== 'pending') {
    res.status(400).json({ message: 'Shift is not in a valid status for decline' });
    return;
  }

  // Decline the invitation in shift_invitations
  if (hasPendingInvitation) {
    await shiftInvitationsRepo.declineInvitation(id, userId);
  }

  // If this was a legacy single-assignee shift, remove assigneeId and revert status
  if (isLegacyAssignee) {
    const updatedShift = await shiftsRepo.updateShift(id, { 
      assigneeId: undefined,
      status: 'draft'
    });

    if (!updatedShift) {
      res.status(500).json({ message: 'Failed to decline shift' });
      return;
    }

    res.status(200).json(updatedShift);
    return;
  }

  // For multi-invite, check if there are still pending invitations
  const remainingInvitations = await shiftInvitationsRepo.getPendingInvitationsForShift(id);
  
  // If no more pending invitations, revert shift to draft
  if (remainingInvitations.length === 0) {
    await shiftsRepo.updateShift(id, { status: 'draft' });
  }

  res.status(200).json({ message: 'Invitation declined successfully' });
}));

// Bulk accept multiple shift invitations (Roster Review feature)
router.post('/bulk-accept', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = BulkAcceptSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const { shiftIds } = validationResult.data;

  // Verify barber has completed Stripe Connect onboarding
  const barber = await usersRepo.getUserById(userId);
  if (!barber || !barber.stripeAccountId) {
    res.status(400).json({ message: 'You must complete payout setup before accepting shifts' });
    return;
  }

  const canAcceptShifts = await stripeConnectService.isAccountReady(barber.stripeAccountId);
  if (!canAcceptShifts) {
    res.status(400).json({ message: 'Your payout account is not fully set up. Please complete onboarding.' });
    return;
  }

  const results = {
    accepted: [] as string[],
    alreadyTaken: [] as string[],
    notFound: [] as string[],
    failed: [] as string[],
    errors: [] as { shiftId: string; error: string }[],
  };

  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  // Process each shift
  for (const shiftId of shiftIds) {
    try {
      // Get shift
      const shift = await shiftsRepo.getShiftById(shiftId);
      if (!shift) {
        results.notFound.push(shiftId);
        continue;
      }

      // Check if already taken
      if (shift.assigneeId) {
        results.alreadyTaken.push(shiftId);
        continue;
      }

      // Check if user has invitation
      const hasPendingInvitation = await shiftInvitationsRepo.hasPendingInvitation(shiftId, userId);
      const pendingOffers = await shiftOffersRepo.getOffersForProfessional(userId, 'pending');
      const hasLegacyOffer = pendingOffers.some(offer => offer.shiftId === shiftId);

      if (!hasPendingInvitation && !hasLegacyOffer) {
        results.failed.push(shiftId);
        results.errors.push({ shiftId, error: 'No invitation found' });
        continue;
      }

      // Get shop for payment
      const shop = await usersRepo.getUserById(shift.employerId);
      if (!shop) {
        results.failed.push(shiftId);
        results.errors.push({ shiftId, error: 'Shop not found' });
        continue;
      }

      // Get or create Stripe customer
      let customerId = shop.stripeCustomerId;
      if (!customerId) {
        customerId = await stripeConnectService.createStripeCustomer(shop.email, shop.name, shop.id);
        if (customerId) {
          await usersRepo.updateUser(shop.id, { stripeCustomerId: customerId });
        }
      }

      if (!customerId) {
        results.failed.push(shiftId);
        results.errors.push({ shiftId, error: 'Failed to set up payment' });
        continue;
      }

      // Get payment method
      const paymentMethods = await stripeConnectService.listPaymentMethods(customerId);
      if (paymentMethods.length === 0) {
        results.failed.push(shiftId);
        results.errors.push({ shiftId, error: 'Shop has no payment method' });
        continue;
      }
      const paymentMethodId = paymentMethods[0].id;

      // Calculate amounts
      const hourlyRate = parseFloat(shift.hourlyRate.toString());
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const shiftAmount = Math.round(hourlyRate * hours * 100);
      const commissionRate = parseFloat(process.env.SNIPSHIFT_COMMISSION_RATE || '0.10');
      const commissionAmount = Math.round(shiftAmount * commissionRate);
      const barberAmount = shiftAmount - commissionAmount;

      // Create payment intent
      let paymentIntentId: string | null = null;
      try {
        paymentIntentId = await stripeConnectService.createAndConfirmPaymentIntent(
          shiftAmount,
          'aud',
          customerId,
          paymentMethodId,
          commissionAmount,
          { destination: barber.stripeAccountId },
          { shiftId: shift.id, barberId: userId, shopId: shift.employerId, type: 'shift_payment' }
        );
      } catch (error: any) {
        results.failed.push(shiftId);
        results.errors.push({ shiftId, error: 'Payment authorization failed' });
        continue;
      }

      if (!paymentIntentId) {
        results.failed.push(shiftId);
        results.errors.push({ shiftId, error: 'Payment authorization failed' });
        continue;
      }

      // Atomic update with race condition protection
      const [updatedShift] = await db
        .update(shifts)
        .set({
          assigneeId: userId,
          status: 'confirmed',
          paymentStatus: 'AUTHORIZED',
          paymentIntentId: paymentIntentId,
          applicationFeeAmount: commissionAmount,
          transferAmount: barberAmount,
          updatedAt: new Date(),
        })
        .where(and(
          eq(shifts.id, shiftId),
          sql`${shifts.assigneeId} IS NULL`
        ))
        .returning();

      if (!updatedShift) {
        results.alreadyTaken.push(shiftId);
        continue;
      }

      // Expire other invitations
      await shiftInvitationsRepo.expireAllPendingInvitationsForShift(shiftId, userId);
      await shiftOffersRepo.declineAllPendingOffersForShift(shiftId);

      results.accepted.push(shiftId);

      // Send notification to business
      try {
        const professionalName = barber.name || 'Professional';
        await notificationsService.notifyBusinessOfAcceptance(
          shift.employerId,
          professionalName,
          {
            id: shift.id,
            title: shift.title,
            startTime: shift.startTime,
            endTime: shift.endTime,
            location: shift.location,
            hourlyRate: shift.hourlyRate,
          }
        );
      } catch (error) {
        console.error('[POST /api/shifts/bulk-accept] Notification error for shift', shiftId, ':', error);
      }
    } catch (error: any) {
      console.error('[POST /api/shifts/bulk-accept] Error processing shift', shiftId, ':', error);
      results.failed.push(shiftId);
      results.errors.push({ shiftId, error: error.message || 'Unknown error' });
    }
  }

  const summary = {
    accepted: results.accepted.length,
    alreadyTaken: results.alreadyTaken.length,
    notFound: results.notFound.length,
    failed: results.failed.length,
    total: shiftIds.length,
  };

  res.status(200).json({
    message: `Accepted ${summary.accepted} shifts, ${summary.alreadyTaken} already taken, ${summary.failed} failed`,
    summary,
    details: results,
  });
}));

// Smart Fill: Invite a professional to a shift
router.post('/:id/invite', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id: shiftId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = ShiftInviteSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const { professionalId } = validationResult.data;

  if (!professionalId) {
    res.status(400).json({ message: 'professionalId is required for single invites' });
    return;
  }

  // Get shift to check ownership
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (shift.employerId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only invite professionals to your own shifts' });
    return;
  }

  // Check if shift is in a valid state for inviting
  if (shift.status !== 'draft' && shift.status !== 'open') {
    res.status(400).json({ message: 'Shift must be in draft or open status to send invites' });
    return;
  }

  // Check if professional exists
  const professional = await usersRepo.getUserById(professionalId);
  if (!professional) {
    res.status(404).json({ message: 'Professional not found' });
    return;
  }

  // Check if there's already a pending offer for this shift and professional
  const existingOffers = await shiftOffersRepo.getOffersForProfessional(professionalId, 'pending');
  const hasExistingOffer = existingOffers.some(offer => offer.shiftId === shiftId);
  
  if (hasExistingOffer) {
    res.status(409).json({ message: 'An invite has already been sent to this professional for this shift' });
    return;
  }

  // Create shift offer (expires in 7 days by default)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const offer = await shiftOffersRepo.createShiftOffer({
    shiftId,
    professionalId,
    expiresAt,
  });

  if (!offer) {
    res.status(500).json({ message: 'Failed to create shift offer' });
    return;
  }

  // Update shift status to 'pending' if it was 'draft'
  if (shift.status === 'draft') {
    await shiftsRepo.updateShift(shiftId, { status: 'pending' });
  }

  // Send notification to professional
  try {
    await notificationsService.notifyProfessionalOfInvite(professionalId, {
      id: shift.id,
      title: shift.title,
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location,
      hourlyRate: shift.hourlyRate,
      employerId: shift.employerId,
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('[POST /api/shifts/:id/invite] Error sending notification:', error);
  }

  res.status(201).json({
    message: 'Invite sent successfully',
    offer,
  });
}));

// Copy previous week shifts into the current week (as drafts)
router.post('/copy-previous-week', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { start, end } = (req.body || {}) as { start?: string; end?: string };
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ message: 'Invalid start/end. Expected ISO date strings.' });
    return;
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const prevStart = new Date(startDate.getTime() - weekMs);
  const prevEnd = new Date(endDate.getTime() - weekMs);

  const previousWeekShifts = await getShiftsByEmployerInRange(userId, prevStart, prevEnd);
  if (!previousWeekShifts || previousWeekShifts.length === 0) {
    res.status(200).json({ success: true, count: 0 });
    return;
  }

  const shiftsToCreate = previousWeekShifts
    .filter((s) => s.status !== 'cancelled' && s.status !== 'completed')
    .map((s) => ({
      employerId: userId,
      title: s.title,
      description: s.description,
      startTime: new Date(s.startTime.getTime() + weekMs),
      endTime: new Date(s.endTime.getTime() + weekMs),
      hourlyRate: String(s.hourlyRate),
      status: 'draft' as const,
      location: s.location || undefined,
    }));

  const created = await createBatchShifts(shiftsToCreate);
  res.status(201).json({ success: true, count: created.length });
}));

// Publish all draft shifts in a date range (draft -> open)
router.post('/publish-all', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { start, end } = (req.body || {}) as { start?: string; end?: string };
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ message: 'Invalid start/end. Expected ISO date strings.' });
    return;
  }

  const shiftsInRange = await getShiftsByEmployerInRange(userId, startDate, endDate);
  const draftShifts = (shiftsInRange || []).filter((s) => s.status === 'draft');
  if (draftShifts.length === 0) {
    res.status(200).json({ success: true, count: 0 });
    return;
  }

  await Promise.all(draftShifts.map((s) => shiftsRepo.updateShift(s.id, { status: 'open' })));
  res.status(200).json({ success: true, count: draftShifts.length });
}));

// Generate Roster: Create DRAFT slots from opening hours settings
// This is the Phase 1 implementation for "Define Hours -> View Slots" workflow
router.post('/generate-roster', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = GenerateRosterSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      message: 'Validation error: ' + validationResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
    });
    return;
  }

  const { startDate, endDate, calendarSettings, defaultHourlyRate, defaultLocation, clearExistingDrafts } = validationResult.data;

  try {
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    if (start >= end) {
      res.status(400).json({ message: 'startDate must be before endDate' });
      return;
    }

    // Step 1: Optionally clear existing unassigned DRAFT shifts in the range
    let deletedCount = 0;
    if (clearExistingDrafts) {
      deletedCount = await deleteDraftShiftsInRange(userId, start, end);
      console.log(`[generate-roster] Deleted ${deletedCount} existing draft shifts for user ${userId}`);
    }

    // Step 2: Generate theoretical slots based on calendar settings
    const generatedSlots = generateShiftSlotsForRange(start, end, calendarSettings);

    if (generatedSlots.length === 0) {
      res.status(200).json({
        success: true,
        created: 0,
        deleted: deletedCount,
        message: 'No slots generated for the specified date range and settings',
      });
      return;
    }

    // Step 3: Fetch existing non-draft shifts to avoid overlapping
    const existingShifts = await getShiftsByEmployerInRange(userId, start, end);
    const nonDraftShifts = existingShifts.filter(s => s.status !== 'draft');

    // Step 4: Filter out slots that overlap with existing non-draft shifts
    const existingShiftRanges = nonDraftShifts.map(shift => ({
      start: shift.startTime,
      end: shift.endTime,
    }));
    const availableSlots = filterOverlappingSlots(generatedSlots, existingShiftRanges);

    if (availableSlots.length === 0) {
      res.status(200).json({
        success: true,
        created: 0,
        deleted: deletedCount,
        message: 'All slots overlap with existing shifts',
      });
      return;
    }

    // Step 5: Prepare DRAFT shift data for batch creation
    const hourlyRate = typeof defaultHourlyRate === 'string' ? defaultHourlyRate : defaultHourlyRate.toString();
    const shiftsToCreate = availableSlots.map((slot) => {
      // Generate title based on pattern and slot index
      let title = 'Draft Shift';
      if (slot.pattern === 'half-day') {
        title = slot.slotIndex === 0 ? 'Morning Shift' : 'Afternoon Shift';
      } else if (slot.pattern === 'thirds') {
        const labels = ['Morning Shift', 'Afternoon Shift', 'Close Shift'];
        title = labels[slot.slotIndex] || 'Draft Shift';
      } else if (slot.pattern === 'full-day') {
        title = 'Full Day Shift';
      }

      return {
        employerId: userId,
        title,
        description: 'Auto-generated from opening hours',
        startTime: slot.start,
        endTime: slot.end,
        hourlyRate,
        status: 'draft' as const,
        location: defaultLocation || undefined,
      };
    });

    // Step 6: Batch create DRAFT shifts
    const createdShifts = await createBatchShifts(shiftsToCreate);

    res.status(201).json({
      success: true,
      created: createdShifts.length,
      deleted: deletedCount,
      message: `${createdShifts.length} draft slot(s) created successfully`,
      shifts: createdShifts,
    });
  } catch (error: any) {
    console.error('[POST /api/shifts/generate-roster] Error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack,
      body: req.body,
    });
    throw error;
  }
}));

// Smart Fill: Batch create shifts for unassigned slots
router.post('/smart-fill', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = SmartFillSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      message: 'Validation error: ' + validationResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
    });
    return;
  }

  const { startDate, endDate, shopId, actionType, calendarSettings, favoriteProfessionalIds, defaultHourlyRate, defaultLocation } = validationResult.data;

  // Security: Ensure the requester is the owner of the shop
  if (shopId !== userId) {
    res.status(403).json({ message: 'Forbidden: You can only smart fill shifts for your own shop' });
    return;
  }

  // Validate favoriteProfessionalIds if actionType is 'invite_favorites'
  if (actionType === 'invite_favorites') {
    if (!favoriteProfessionalIds || favoriteProfessionalIds.length === 0) {
      res.status(400).json({ message: 'favoriteProfessionalIds is required when actionType is "invite_favorites"' });
      return;
    }
  }

  try {
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    if (start >= end) {
      res.status(400).json({ message: 'startDate must be before endDate' });
      return;
    }

    // 1. Generate theoretical slots based on calendar settings
    const generatedSlots = generateShiftSlotsForRange(start, end, calendarSettings);

    if (generatedSlots.length === 0) {
      res.status(200).json({
        success: true,
        count: 0,
        message: 'No slots generated for the specified date range and settings',
      });
      return;
    }

    // 2. Fetch existing shifts in the date range
    const existingShifts = await getShiftsByEmployerInRange(shopId, start, end);

    // 3. Filter out slots that overlap with existing shifts
    const existingShiftRanges = existingShifts.map(shift => ({
      start: shift.startTime,
      end: shift.endTime,
    }));

    const availableSlots = filterOverlappingSlots(generatedSlots, existingShiftRanges);

    if (availableSlots.length === 0) {
      res.status(200).json({
        success: true,
        count: 0,
        message: 'All slots are already filled',
      });
      return;
    }

    // 4. Determine status and assigneeId based on actionType
    const status = actionType === 'post_to_board' ? 'open' : 'invited';
    const hourlyRate = typeof defaultHourlyRate === 'string' ? defaultHourlyRate : defaultHourlyRate.toString();

    // 5. Prepare shift data for batch creation
    const shiftsToCreate = availableSlots.map((slot, index) => {
      let assigneeId: string | undefined;
      
      // If inviting favorites, assign to favorite professionals in round-robin fashion
      if (actionType === 'invite_favorites' && favoriteProfessionalIds && favoriteProfessionalIds.length > 0) {
        assigneeId = favoriteProfessionalIds[index % favoriteProfessionalIds.length];
      }

      // Generate title based on pattern and slot index
      let title = 'Open Shift';
      if (slot.pattern === 'half-day') {
        title = slot.slotIndex === 0 ? 'Morning Shift' : 'Afternoon Shift';
      } else if (slot.pattern === 'thirds') {
        const labels = ['Morning Shift', 'Afternoon Shift', 'Close Shift'];
        title = labels[slot.slotIndex] || 'Open Shift';
      } else if (slot.pattern === 'full-day') {
        title = 'Full Day Shift';
      }

      return {
        employerId: shopId,
        title,
        description: `Shift posted via Smart Fill`,
        startTime: slot.start,
        endTime: slot.end,
        hourlyRate,
        status: status as 'open' | 'invited',
        location: defaultLocation || undefined,
        assigneeId,
      };
    });

    // 6. Batch create shifts
    const createdShifts = await createBatchShifts(shiftsToCreate);

    // 7. Send notifications if actionType is 'invite_favorites'
    if (actionType === 'invite_favorites' && favoriteProfessionalIds && favoriteProfessionalIds.length > 0) {
      // Group shifts by assigneeId
      const shiftsByAssignee = new Map<string, typeof createdShifts>();
      
      createdShifts.forEach((shift) => {
        if (shift.assigneeId) {
          if (!shiftsByAssignee.has(shift.assigneeId)) {
            shiftsByAssignee.set(shift.assigneeId, []);
          }
          shiftsByAssignee.get(shift.assigneeId)!.push(shift);
        }
      });

      // Send notifications to each professional
      for (const [professionalId, shifts] of shiftsByAssignee.entries()) {
        try {
          // Send notification for each shift (or batch them - your choice)
          for (const shift of shifts) {
            await notificationsService.notifyProfessionalOfInvite(professionalId, {
              id: shift.id,
              title: shift.title,
              startTime: shift.startTime,
              endTime: shift.endTime,
              location: shift.location || undefined,
              hourlyRate: shift.hourlyRate,
              employerId: shift.employerId,
            });
          }
        } catch (error) {
          // Log error but don't fail the request
          console.error(`[POST /api/shifts/smart-fill] Error sending notification to ${professionalId}:`, error);
        }
      }
    }

    res.status(201).json({
      success: true,
      count: createdShifts.length,
      message: `${createdShifts.length} shift${createdShifts.length !== 1 ? 's' : ''} ${actionType === 'post_to_board' ? 'posted to job board' : 'created and invitations sent'} successfully`,
    });
  } catch (error: any) {
    console.error('[POST /api/shifts/smart-fill] Error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack,
      body: req.body,
    });
    throw error;
  }
}));

// Accept a shift offer
router.put('/offers/:id/accept', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id: offerId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get offer
  const offer = await shiftOffersRepo.getShiftOfferById(offerId);
  if (!offer) {
    res.status(404).json({ message: 'Shift offer not found' });
    return;
  }

  // Verify the offer belongs to the current user
  if (offer.professionalId !== userId) {
    res.status(403).json({ message: 'Forbidden: This offer is not for you' });
    return;
  }

  // Verify the offer is still valid
  const isValid = await shiftOffersRepo.isOfferValid(offerId);
  if (!isValid) {
    res.status(400).json({ message: 'This offer is no longer valid (expired or already processed)' });
    return;
  }

  // Get the shift
  const shift = await shiftsRepo.getShiftById(offer.shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Check if shift is still available
  if (shift.status === 'filled' || shift.status === 'confirmed' || shift.status === 'completed') {
    res.status(400).json({ message: 'This shift is no longer available' });
    return;
  }

  // Use transaction to:
  // 1. Update offer status to accepted
  // 2. Update shift assigneeId and status to confirmed
  // 3. Decline all other pending offers for this shift
  const { getDb } = await import('../db/index.js');
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Update offer to accepted
      await tx
        .update(shiftOffers)
        .set({ status: 'accepted' })
        .where(eq(shiftOffers.id, offerId));

      // Update shift
      await tx
        .update(shifts)
        .set({
          assigneeId: userId,
          status: 'confirmed',
        })
        .where(eq(shifts.id, offer.shiftId));

      // Decline all other pending offers for this shift
      const conditions = [
        eq(shiftOffers.shiftId, offer.shiftId),
        eq(shiftOffers.status, 'pending'),
        sql`${shiftOffers.id} != ${offerId}`
      ];
      await tx
        .update(shiftOffers)
        .set({
          status: 'declined',
        })
        .where(and(...conditions));
    });

    // Fetch updated shift
    const updatedShift = await shiftsRepo.getShiftById(offer.shiftId);
    const updatedOffer = await shiftOffersRepo.getShiftOfferById(offerId);

    // Get professional information
    const professional = await usersRepo.getUserById(userId);
    const professionalName = professional?.name || 'Professional';

    // Send notification to business
    try {
      await notificationsService.notifyBusinessOfAcceptance(
        shift.employerId,
        professionalName,
        {
          id: shift.id,
          title: shift.title,
          startTime: shift.startTime,
          endTime: shift.endTime,
          location: shift.location,
          hourlyRate: shift.hourlyRate,
        }
      );
    } catch (error) {
      // Log error but don't fail the request
      console.error('[PUT /api/shifts/offers/:id/accept] Error sending notification:', error);
    }

  res.status(200).json({
    message: 'Shift offer accepted successfully',
    shift: updatedShift,
    offer: updatedOffer,
  });
  } catch (error: any) {
    console.error('[PUT /api/shifts/offers/:id/accept] Error accepting offer:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });
    throw error;
  }
}));

// Apply for a shift (authenticated, professional only)
router.post('/:id/apply', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift to verify it exists and is open
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  if (shift.status !== 'open') {
    res.status(400).json({ message: 'Shift is not available for application' });
    return;
  }

  // Double-booking protection: Check if user already has a shift at this time
  const userShifts = await shiftsRepo.getShiftsByAssignee(userId);
  const shiftStart = new Date(shift.startTime);
  const shiftEnd = new Date(shift.endTime);

  const hasOverlap = userShifts.some((userShift) => {
    // Only check confirmed or accepted shifts
    if (userShift.status !== 'confirmed' && userShift.status !== 'filled') {
      return false;
    }

    const userShiftStart = new Date(userShift.startTime);
    const userShiftEnd = new Date(userShift.endTime);

    // Check if shifts overlap
    return (
      (shiftStart >= userShiftStart && shiftStart < userShiftEnd) ||
      (shiftEnd > userShiftStart && shiftEnd <= userShiftEnd) ||
      (shiftStart <= userShiftStart && shiftEnd >= userShiftEnd)
    );
  });

  if (hasOverlap) {
    res.status(409).json({ message: 'You already have a shift scheduled during this time' });
    return;
  }

  // Check if user has already applied for this shift
  const existingApplication = await applicationsRepo.hasUserApplied(id, 'shift', userId);
  if (existingApplication) {
    res.status(409).json({ message: 'You have already applied for this shift' });
    return;
  }

  // Get user information for application
  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Check if shift has autoAccept enabled
  const autoAccept = shift.autoAccept || false;

  if (autoAccept) {
    // Instant accept: Update shift to CONFIRMED and assign professional
    const { getDb } = await import('../db/index.js');
    const db = getDb();
    if (!db) {
      res.status(500).json({ message: 'Database not available' });
      return;
    }

    try {
      await db.transaction(async (tx) => {
        // Update shift to confirmed and assign professional
        await tx
          .update(shifts)
          .set({
            assigneeId: userId,
            status: 'confirmed',
          })
          .where(eq(shifts.id, id));
      });

      // Fetch updated shift
      const updatedShift = await shiftsRepo.getShiftById(id);

      // Send notification to shop
      try {
        await notificationsService.notifyBusinessOfAcceptance(
          shift.employerId,
          user.name || 'Professional',
          {
            id: shift.id,
            title: shift.title,
            startTime: shift.startTime,
            endTime: shift.endTime,
            location: shift.location || undefined,
            hourlyRate: shift.hourlyRate,
          }
        );
      } catch (error) {
        console.error('[POST /api/shifts/:id/apply] Error sending notification:', error);
      }

      res.status(200).json({
        message: 'Shift accepted successfully',
        shift: updatedShift,
        instantAccept: true,
      });
    } catch (error: any) {
      console.error('[POST /api/shifts/:id/apply] Error accepting shift:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
      });
      throw error;
    }
  } else {
    // Create application record
    const application = await applicationsRepo.createApplication({
      shiftId: id,
      userId: userId,
      name: user.name || 'Professional',
      email: user.email || '',
      coverLetter: `Application for shift: ${shift.title}`,
    });

    if (!application) {
      res.status(500).json({ message: 'Failed to create application' });
      return;
    }

    // Send notification to shop
    try {
      await notificationsService.notifyBusinessOfApplication(
        shift.employerId,
        {
          id: application.id,
          shiftId: shift.id,
          professionalName: user.name || 'Professional',
          shiftTitle: shift.title,
        }
      );
    } catch (error) {
      console.error('[POST /api/shifts/:id/apply] Error sending notification:', error);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
      instantAccept: false,
    });
  }
}));

// Submit a review for a shift
router.post('/:id/review', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const shiftId = req.params.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = ShiftReviewSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      message: 'Validation error: ' + validationResult.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
    });
    return;
  }

  const reviewData = validationResult.data;

  // Get the shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify user is authorized to review this shift
  const isShop = shift.employerId === userId;
  const isBarber = shift.assigneeId === userId;

  if (!isShop && !isBarber) {
    res.status(403).json({ message: 'You are not authorized to review this shift' });
    return;
  }

  // Validate review type matches user role
  if (reviewData.type === 'SHOP_REVIEWING_BARBER' && !isShop) {
    res.status(403).json({ message: 'Only the shop can submit SHOP_REVIEWING_BARBER reviews' });
    return;
  }

  if (reviewData.type === 'BARBER_REVIEWING_SHOP' && !isBarber) {
    res.status(403).json({ message: 'Only the barber can submit BARBER_REVIEWING_SHOP reviews' });
    return;
  }

  // Determine reviewee ID based on review type
  const revieweeId = reviewData.type === 'SHOP_REVIEWING_BARBER' 
    ? shift.assigneeId 
    : shift.employerId;

  if (!revieweeId) {
    res.status(400).json({ message: 'Cannot review shift without assignee' });
    return;
  }

  // Check for duplicate review
  const hasReviewed = await shiftReviewsRepo.hasUserReviewedShift(shiftId, userId, reviewData.type);
  if (hasReviewed) {
    res.status(409).json({ message: 'You have already reviewed this shift' });
    return;
  }

  // Handle no-show marking (shop side only)
  if (reviewData.markAsNoShow && reviewData.type === 'SHOP_REVIEWING_BARBER') {
    // Update shift attendance status to no_show
    await shiftsRepo.updateShift(shiftId, {
      attendanceStatus: 'no_show',
      status: 'completed', // Mark shift as completed even if no-show
    });
  }

  // Create review
  const newReview = await shiftReviewsRepo.createShiftReview({
    shiftId,
    reviewerId: userId,
    revieweeId,
    type: reviewData.type,
    rating: reviewData.rating,
    comment: reviewData.comment,
  });

  if (!newReview) {
    res.status(500).json({ message: 'Failed to create review' });
    return;
  }

  // If shop is reviewing barber, mark attendance as completed (unless no-show)
  if (reviewData.type === 'SHOP_REVIEWING_BARBER' && !reviewData.markAsNoShow) {
    // Capture payment and transfer to barber
    if (shift.paymentIntentId && shift.paymentStatus === 'AUTHORIZED') {
      try {
        const chargeId = await stripeConnectService.capturePaymentIntentWithChargeId(shift.paymentIntentId);
        if (chargeId) {
          await shiftsRepo.updateShift(shiftId, {
            attendanceStatus: 'completed',
            status: 'completed',
            paymentStatus: 'PAID',
            stripeChargeId: chargeId,
          });
        } else {
          console.error(`[SHIFT_REVIEW] Failed to capture payment for shift ${shiftId}`);
          // Still mark as completed, but payment status remains AUTHORIZED
          await shiftsRepo.updateShift(shiftId, {
            attendanceStatus: 'completed',
            status: 'completed',
          });
        }
      } catch (error: any) {
        console.error(`[SHIFT_REVIEW] Error capturing payment for shift ${shiftId}:`, error);
        // Still mark as completed
        await shiftsRepo.updateShift(shiftId, {
          attendanceStatus: 'completed',
          status: 'completed',
        });
      }
    } else {
      // No payment to capture, just mark as completed
      await shiftsRepo.updateShift(shiftId, {
        attendanceStatus: 'completed',
        status: 'completed',
      });
    }
  }

  // Recalculate and update reviewee's rating
  await shiftReviewsRepo.updateUserRating(revieweeId);

  res.status(201).json({
    id: newReview.id,
    shiftId: newReview.shiftId,
    reviewerId: newReview.reviewerId,
    revieweeId: newReview.revieweeId,
    type: newReview.type,
    rating: parseInt(newReview.rating),
    comment: newReview.comment,
    createdAt: newReview.createdAt.toISOString(),
  });
}));

// Get a single shift by ID (public read)
// NOTE: Keep this near the end of the file to avoid shadowing more specific routes like:
// - /shop/:userId
// - /offers/me
// - /pending-review
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate UUID format to prevent route conflicts (e.g. "shop", "offers")
  if (!isValidUUID(id)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Enrich with employer info for nicer UI
  const employer = await usersRepo.getUserById(shift.employerId);
  const latRaw = (shift as any).lat;
  const lngRaw = (shift as any).lng;
  const latParsed = typeof latRaw === 'number' ? latRaw : typeof latRaw === 'string' ? parseFloat(latRaw) : NaN;
  const lngParsed = typeof lngRaw === 'number' ? lngRaw : typeof lngRaw === 'string' ? parseFloat(lngRaw) : NaN;
  const lat = Number.isFinite(latParsed) ? latParsed : null;
  const lng = Number.isFinite(lngParsed) ? lngParsed : null;

  res.status(200).json({
    id: shift.id,
    title: shift.title,
    description: shift.description,
    startTime: toISOStringSafe((shift as any).startTime),
    endTime: toISOStringSafe((shift as any).endTime),
    hourlyRate: shift.hourlyRate,
    location: shift.location,
    lat,
    lng,
    status: shift.status,
    employerId: shift.employerId,
    assigneeId: shift.assigneeId ?? null,
    shopName: employer?.name ?? null,
    shopAvatarUrl: employer?.avatarUrl ?? null,
    createdAt: toISOStringSafe((shift as any).createdAt),
    updatedAt: toISOStringSafe((shift as any).updatedAt),
  });
}));

export default router;
