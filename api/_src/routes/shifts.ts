import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ShiftSchema, ShiftInviteSchema, ShiftReviewSchema, BulkAcceptSchema } from '../validation/schemas.js';
import { shiftOffers, shifts, shiftApplications, users, shiftDrafts } from '../db/schema.js';
import type { ShiftDraftData } from '../db/schema/shifts.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as shiftOffersRepo from '../repositories/shift-offers.repository.js';
import * as shiftInvitationsRepo from '../repositories/shift-invitations.repository.js';
import * as jobsRepo from '../repositories/jobs.repository.js';
import * as applicationsRepo from '../repositories/applications.repository.js';
import * as shiftApplicationsRepo from '../repositories/shift-applications.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as notificationsService from '../lib/notifications-service.js';
import * as shiftReviewsRepo from '../repositories/shift-reviews.repository.js';
import * as stripeConnectService from '../services/stripe-connect.service.js';
import { syncShiftToGoogle } from '../services/google-calendar.js';
import * as subscriptionsRepo from '../repositories/subscriptions.repository.js';
import * as proVerificationService from '../services/pro-verification.service.js';
import { SmartFillSchema, GenerateRosterSchema } from '../validation/schemas.js';
import { generateShiftSlotsForRange, filterOverlappingSlots } from '../utils/shift-slot-generator.js';
import { createBatchShifts, getShiftsByEmployerInRange, deleteDraftShiftsInRange, deleteAllShiftsForEmployer } from '../repositories/shifts.repository.js';
import { getDb } from '../db/index.js';
import { toISOStringSafe } from '../lib/date.js';
import * as reputationService from '../lib/reputation-service.js';
import * as shiftWaitlistRepo from '../repositories/shift-waitlist.repository.js';
import { triggerShiftInvite, triggerUserEvent } from '../services/pusher.service.js';
import { calculateDistance, validateLocationProximity } from '../utils/geofencing.js';
import * as shiftLogsRepo from '../repositories/shift-logs.repository.js';
import * as venuesRepo from '../repositories/venues.repository.js';
import { normalizeParam, normalizeQueryOptional } from '../utils/request-params.js';
import { normalizeRole } from '../utils/normalizeRole.js';
import * as shiftMessagesRepo from '../repositories/shift-messages.repository.js';
import { uploadProofImage } from '../middleware/upload.js';
import admin from 'firebase-admin';
import type { ErrorContext } from '../services/error-reporting.service.js';

const router = Router();

function enqueueCalendarSync(shiftIds: string[]): void {
  if (shiftIds.length === 0) {
    return;
  }

  setImmediate(() => {
    shiftIds.forEach((shiftId) => {
      void syncShiftToGoogle(shiftId);
    });
  });
}

function computeShiftLengthHours(startTime: unknown, endTime: unknown): number | null {
  const start = startTime ? new Date(startTime as any) : null;
  const end = endTime ? new Date(endTime as any) : null;
  if (!start || !end) return null;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return hours > 0 ? Math.round(hours * 100) / 100 : null;
}

function parseExpectedPax(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

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

/**
 * Mask email address to prevent platform leakage before hire
 * Example: "john.doe@gmail.com" -> "j***@g***.com"
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [local, domain] = email.split('@');
  const domainParts = domain.split('.');
  const maskedLocal = local.charAt(0) + '***';
  const maskedDomain = domainParts[0].charAt(0) + '***.' + domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask phone number to prevent platform leakage before hire
 * Example: "+61412345678" -> "+61***678"
 */
function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 6) return '***';
  return cleaned.slice(0, 3) + '***' + cleaned.slice(-3);
}

// Create a shift (authenticated, employer only)
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Enforce business-only shift creation
  const normalized = normalizeRole(req.user?.role);
  if (normalized !== 'business') {
    res.status(403).json({ message: 'Only business accounts can create shifts.' });
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
    const expectedPax = parseExpectedPax((shiftData as any).expectedPax);

    // If recurring and we have recurring shifts data, create multiple shifts in a transaction
    if (isRecurring && recurringShifts.length > 0) {
      // Extract lat/lng from request body
      const lat = (req.body as any).lat;
      const lng = (req.body as any).lng;
      
      const parentShiftData = {
        employerId: userId,
        role: (shiftData as any).role,
        title: shiftData.title,
        description: shiftData.description || shiftData.requirements || '',
        startTime,
        endTime,
        hourlyRate: (shiftData.hourlyRate || shiftData.pay || '0').toString(),
        uniformRequirements: (shiftData as any).uniformRequirements,
        rsaRequired: !!(shiftData as any).rsaRequired,
        expectedPax,
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

      enqueueCalendarSync(createdShifts.map((shift) => shift.id));

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
    
    const capacity = typeof (shiftData as any).capacity === 'number'
      ? Math.max(1, (shiftData as any).capacity)
      : typeof (req.body as any).capacity === 'string'
        ? Math.max(1, parseInt((req.body as any).capacity, 10) || 1)
        : 1;

    const shiftPayload = {
      employerId: userId,
      role: (shiftData as any).role,
      title: shiftData.title,
      description: shiftData.description || shiftData.requirements || '',
      startTime,
      endTime,
      hourlyRate: (shiftData.hourlyRate || shiftData.pay || '0').toString(),
      uniformRequirements: (shiftData as any).uniformRequirements,
      rsaRequired: !!(shiftData as any).rsaRequired,
      expectedPax,
      capacity,
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

        // Trigger Pusher real-time event for shift invite
        const venue = await usersRepo.getUserById(newShift.employerId);
        if (venue) {
          await triggerShiftInvite(assignedStaffId, {
            shiftId: newShift.id,
            shiftTitle: newShift.title,
            venueName: venue.name,
            venueId: newShift.employerId,
          });
        }
      } catch (error) {
        console.error('[POST /api/shifts] Failed to notify invited professional:', error);
      }
    }

    enqueueCalendarSync([newShift.id]);

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
  const employerIdParam = normalizeQueryOptional(req.query.employer_id);
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

    const startRaw = normalizeQueryOptional(req.query.start);
    const endRaw = normalizeQueryOptional(req.query.end);
    const statusValue = normalizeQueryOptional(req.query.status);
    const status = statusValue ? (statusValue as EmployerShiftStatus) : undefined;
    if (!startRaw || !endRaw) {
      res.status(400).json({ message: 'start and end query params are required when employer_id=me' });
      return;
    }

    const startStr = startRaw;
    const endStr = endRaw;
    const start = startStr ? new Date(startStr) : new Date();
    const end = endStr ? new Date(endStr) : new Date();
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
      shiftLengthHours: computeShiftLengthHours((shift as any).startTime, (shift as any).endTime),
    }));

    res.status(200).json(transformed);
    return;
  }
  const limitStr = normalizeQueryOptional(req.query.limit);
  const limit = limitStr ? parseInt(limitStr, 10) : 50;
  const offsetStr = normalizeQueryOptional(req.query.offset);
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
  const statusValue = normalizeQueryOptional(req.query.status);
  const status = statusValue ? (statusValue as 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled') : undefined;

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
    shiftLengthHours: computeShiftLengthHours((shift as any).startTime, (shift as any).endTime),
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
  const shiftId = normalizeParam(req.params.id);
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
  // PLATFORM LEAKAGE PROTECTION: Mask contact details until applicant is hired
  const transformed = applications.map((app) => {
    const user = app.user;
    // Only reveal full contact info if this applicant has been hired (assigneeId matches)
    const isHired = shift.assigneeId === app.userId;
    
    return {
      id: app.id,
      name: app.name,
      // Mask email until hired to prevent off-platform deals
      email: isHired ? app.email : maskEmail(app.email),
      coverLetter: app.coverLetter,
      status: app.status,
      appliedAt: app.appliedAt.toISOString(),
      respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
      userId: app.userId || undefined,
      // Flag to indicate if contact details are revealed
      contactRevealed: isHired,
      // User profile data
      applicant: user ? {
        id: user.id,
        name: user.name,
        // Mask email until hired
        email: isHired ? user.email : maskEmail(user.email),
        // Mask phone until hired (if available)
        phone: isHired ? (user as any).phone || null : maskPhone((user as any).phone),
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
  const id = normalizeParam(req.params.id);
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
  const id = normalizeParam(req.params.id);
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

  // ELITE AUDIT SPRINT PART 5 - TASK 1: Financial State Consistency
  // If shift status is changing to 'cancelled', cancel any active payment intent
  let paymentIntentCancelled = false;
  if (status === 'cancelled' && existingShift.paymentIntentId && existingShift.paymentStatus === 'AUTHORIZED') {
    try {
      const stripeConnectService = await import('../services/stripe-connect.service.js');
      const cancelled = await stripeConnectService.cancelPaymentIntent(existingShift.paymentIntentId);
      if (cancelled) {
        paymentIntentCancelled = true;
        console.info(`[SHIFT_CANCELLATION] PaymentIntent ${existingShift.paymentIntentId} cancelled for shift ${id}`);
      } else {
        console.warn(`[SHIFT_CANCELLATION] Failed to cancel PaymentIntent ${existingShift.paymentIntentId} for shift ${id} - flagging for manual review`);
        // Flag for manual review by logging the issue
        const { errorReporting } = await import('../services/error-reporting.service.js');
        await errorReporting.captureCritical(
          `PaymentIntent cancellation failed for cancelled shift`,
          undefined,
          {
            correlationId: req.correlationId,
            metadata: {
              shiftId: id,
              paymentIntentId: existingShift.paymentIntentId,
            },
            tags: {
              eventType: 'payment_intent_cancellation_failed',
              requiresManualReview: 'true',
            },
          } as ErrorContext
        );
      }
    } catch (error: any) {
      console.error(`[SHIFT_CANCELLATION] Error cancelling PaymentIntent for shift ${id}:`, error);
      // Flag for manual review
      const { errorReporting } = await import('../services/error-reporting.service.js');
      await errorReporting.captureCritical(
        `PaymentIntent cancellation error for cancelled shift`,
        error instanceof Error ? error : new Error(error?.message || 'Unknown error'),
        {
          correlationId: req.correlationId,
          metadata: {
            shiftId: id,
            paymentIntentId: existingShift.paymentIntentId,
          },
          tags: {
            eventType: 'payment_intent_cancellation_error',
            requiresManualReview: 'true',
          },
        } as ErrorContext
      );
    }
  }

  const updatedShift = await shiftsRepo.updateShift(id, { 
    status,
    // Clear payment intent if it was cancelled
    ...(paymentIntentCancelled ? { paymentIntentId: null, paymentStatus: 'UNPAID' as const } : {})
  });

  if (!updatedShift) {
    res.status(500).json({ message: 'Failed to update shift' });
    return;
  }

  res.status(200).json(updatedShift);
}));

// Get shift messages (authenticated, only assigned worker and venue owner)
// IMPORTANT: This route MUST come before DELETE /:id to avoid route conflicts
router.get('/:id/messages', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(id)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Get shift to verify access
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Check authorization: only employer or assignee can access
  const isAuthorized = shift.employerId === userId || shift.assigneeId === userId;
  if (!isAuthorized) {
    res.status(403).json({ message: 'Forbidden: You can only access messages for shifts you own or are assigned to' });
    return;
  }

  // Check if shift is filled (required for messaging)
  if (shift.status !== 'filled' && shift.status !== 'completed' && shift.status !== 'confirmed') {
    res.status(400).json({ message: 'Messaging is only available for filled shifts' });
    return;
  }

  // Get messages
  const messages = await shiftMessagesRepo.getShiftMessages(id, userId);

  // Mark messages as read when fetching
  if (messages.length > 0) {
    await shiftMessagesRepo.markShiftMessagesAsRead(id, userId);
  }

  res.status(200).json(messages);
}));

// Send shift message (authenticated, only assigned worker and venue owner)
// IMPORTANT: This route MUST come before DELETE /:id to avoid route conflicts
router.post('/:id/messages', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;
  const { content } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(id)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Validate content
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ message: 'Message content is required' });
    return;
  }

  if (content.length > 5000) {
    res.status(400).json({ message: 'Message content must be less than 5000 characters' });
    return;
  }

  // Get shift to verify access
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Check authorization: only employer or assignee can send messages
  const isAuthorized = shift.employerId === userId || shift.assigneeId === userId;
  if (!isAuthorized) {
    res.status(403).json({ message: 'Forbidden: You can only send messages for shifts you own or are assigned to' });
    return;
  }

  // Check if shift is filled (required for messaging)
  if (shift.status !== 'filled' && shift.status !== 'completed' && shift.status !== 'confirmed') {
    res.status(400).json({ message: 'Messaging is only available for filled shifts' });
    return;
  }

  // Check if channel is archived (24 hours after completion)
  if (shift.status === 'completed' || shift.status === 'confirmed') {
    const completedAt = shift.updatedAt || shift.createdAt;
    if (completedAt) {
      const completedDate = new Date(completedAt);
      const now = new Date();
      const hoursSinceCompletion = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCompletion > 24) {
        res.status(400).json({ message: 'This chat channel has been archived. Messaging is only available for 24 hours after shift completion.' });
        return;
      }
    }
  }

  // Determine recipient (the other party in the conversation)
  const recipientId = shift.employerId === userId ? shift.assigneeId : shift.employerId;
  
  if (!recipientId) {
    res.status(400).json({ message: 'Cannot send message: shift has no assigned worker' });
    return;
  }

  // Create message
  const message = await shiftMessagesRepo.createShiftMessage({
    shiftId: id,
    senderId: userId,
    recipientId: recipientId,
    content: content.trim(),
  });

  if (!message) {
    res.status(500).json({ message: 'Failed to send message' });
    return;
  }

  res.status(201).json(message);
}));

// Get unread shift message count for current user
// IMPORTANT: This route MUST come before DELETE /:id to avoid route conflicts
router.get('/messages/unread-count', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const unreadCount = await shiftMessagesRepo.getUnreadShiftMessageCount(userId);
  res.status(200).json({ unreadCount });
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
// RELIABILITY: Uses soft delete (sets deletedAt timestamp) instead of hard delete
// This preserves data for audit trails and allows recovery if needed
router.delete('/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
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

  // Check if already soft-deleted
  if ((existingShift as any).deletedAt) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Use soft delete: update shift with deletedAt timestamp instead of hard delete
  try {
    const updatedShift = await shiftsRepo.updateShift(id, {
      deletedAt: new Date() as any, // Set deletedAt to current timestamp
    });

    if (!updatedShift) {
      res.status(500).json({ message: 'Failed to delete shift' });
      return;
    }

    console.log(`[DELETE /api/shifts/:id] Successfully soft-deleted shift ${id}`);
    res.status(200).json({ message: 'Shift deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/shifts/:id] Error soft-deleting shift:', {
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

// Get shifts by employer (authenticated, owner only)
// SECURITY: Only allows users to view their own shop shifts
// FIXED: Now also fetches legacy jobs to ensure all listings are visible
router.get('/shop/:userId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = normalizeParam(req.params.userId);
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // SECURITY: Strict ownership check - users can only view their own shop shifts
  if (userId !== currentUserId) {
    res.status(403).json({ message: 'Forbidden: You can only view your own shop shifts' });
    return;
  }

  // For Shop Dashboard, we typically want to see all statuses
  
  try {
    // Fetch both shifts and legacy jobs for this user
    // Note: We pass excludeExpired: false to include past jobs for calendar/history display
    let shifts: Awaited<ReturnType<typeof shiftsRepo.getShiftsByEmployer>> = [];
    let jobs: any[] = [];

    try {
      const [shiftsResult, jobsResult] = await Promise.all([
        shiftsRepo.getShiftsByEmployer(userId),
        jobsRepo.getJobs({ businessId: userId, excludeExpired: false })
      ]);
      
      shifts = shiftsResult || [];
      jobs = jobsResult?.data || [];
    } catch (fetchError: any) {
      console.error('[GET /api/shifts/shop/:userId] Error fetching shifts/jobs:', {
        userId,
        error: fetchError?.message,
        code: fetchError?.code,
        stack: fetchError?.stack,
      });
      // Continue with empty arrays to avoid complete failure
      shifts = [];
      jobs = [];
    }

  // OPTIMIZED: Batch fetch all application counts in a single query (N+1 prevention)
  const shiftIds = (shifts || []).map(s => s?.id).filter(Boolean) as string[];
  const jobIds = (jobs || []).map(j => j?.id).filter(Boolean) as string[];
  
  let applicationCountMap: Map<string, number> = new Map();
  try {
    applicationCountMap = await applicationsRepo.getApplicationCountsBatch(shiftIds, jobIds);
    
    // Log optimization success (for monitoring)
    console.log(`[GET /shop/:userId] Batch fetched application counts for ${shiftIds.length} shifts and ${jobIds.length} jobs`, {
      correlationId: req.correlationId,
      userId: currentUserId,
      totalCounts: applicationCountMap.size,
    });
  } catch (error: any) {
    const errorReporting = await import('../services/error-reporting.service.js');
    await errorReporting.errorReporting.captureError(
      'Failed to batch fetch application counts for shop dashboard',
      error as Error,
      {
        correlationId: req.correlationId,
        userId: currentUserId,
        path: req.path,
        method: req.method,
        metadata: { shiftIdsCount: shiftIds.length, jobIdsCount: jobIds.length },
      }
    );
    // Continue with empty map (graceful degradation)
  }

  // Normalize shifts to unified format
  const normalizedShifts = (shifts || []).map((shift) => {
    try {
      if (!shift || !shift.id) {
        console.warn('[GET /api/shifts/shop/:userId] Skipping invalid shift:', shift);
        return null;
      }

      // Get application count from batch-fetched map
      const applicationCount = applicationCountMap.get(`shift:${shift.id}`) || 0;

      // Build location string
      const location = shift.location || null;

      // Convert startTime to date string for compatibility
      const startTimeISO = toISOStringSafe(shift.startTime);
      const endTimeISO = toISOStringSafe(shift.endTime);
      const createdAtISO = toISOStringSafe(shift.createdAt);
      const dateStr = startTimeISO.split('T')[0];

      return {
        id: shift.id,
        role: (shift as any).role ?? null,
        title: shift.title || 'Untitled Shift',
        payRate: shift.hourlyRate,
        date: dateStr,
        startTime: startTimeISO,
        endTime: endTimeISO,
        shiftLengthHours: computeShiftLengthHours(shift.startTime, shift.endTime),
        status: shift.status || 'draft',
        location,
        applicationCount,
        createdAt: createdAtISO,
        employerId: shift.employerId,
        uniformRequirements: (shift as any).uniformRequirements ?? null,
        rsaRequired: (shift as any).rsaRequired ?? false,
        expectedPax: (shift as any).expectedPax ?? null,
        isEmergencyFill: (shift as any).isEmergencyFill ?? false,
        // Add type indicator for debugging (optional)
        _type: 'shift'
      };
    } catch (shiftError: any) {
      console.error('[GET /api/shifts/shop/:userId] Error normalizing shift:', {
        shiftId: shift?.id,
        error: shiftError?.message,
        stack: shiftError?.stack,
      });
      return null;
    }
  }).filter(Boolean) as any[];

  // Normalize jobs to unified format
  const normalizedJobs = (jobs || []).map((job) => {
    try {
      if (!job || !job.id) {
        console.warn('[GET /api/shifts/shop/:userId] Skipping invalid job:', job);
        return null;
      }

      // Get application count from batch-fetched map
      const applicationCount = applicationCountMap.get(`job:${job.id}`) || 0;

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
      } else if (job.date) {
        // Fallback: convert to string and extract date portion
        dateStr = String(job.date).split('T')[0];
      } else {
        // If date is missing, use today as fallback
        dateStr = new Date().toISOString().split('T')[0];
      }
      
      // Extract time portion (time type returns as "HH:MM:SS" string)
      const startTimeStr = job.startTime 
        ? (typeof job.startTime === 'string' ? job.startTime : String(job.startTime))
        : '00:00:00';
      const endTimeStr = job.endTime 
        ? (typeof job.endTime === 'string' ? job.endTime : String(job.endTime))
        : '23:59:59';
      
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
      } catch (dateError) {
        // Fallback: use date with default times if parsing fails
        startDateTime = new Date(`${dateStr}T00:00:00`);
        endDateTime = new Date(`${dateStr}T23:59:59`);
      }

      // Map job status to shift status format (closed -> completed)
      let status = job.status || 'open';
      if (status === 'closed') {
        status = 'completed';
      }

      return {
        id: job.id,
        title: job.title || 'Untitled Job',
        shopName: job.shopName || undefined,
        payRate: job.payRate || null,
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
    } catch (jobError: any) {
      console.error('[GET /api/shifts/shop/:userId] Error normalizing job:', {
        jobId: job?.id,
        error: jobError?.message,
        stack: jobError?.stack,
      });
      return null;
    }
  }).filter(Boolean) as any[];

    // Combine and sort by createdAt (newest first)
    const allListings = [...normalizedShifts, ...normalizedJobs].sort((a, b) => {
      try {
        if (!a?.createdAt || !b?.createdAt) {
          // If either is missing createdAt, put missing ones at the end
          if (!a?.createdAt && !b?.createdAt) return 0;
          if (!a?.createdAt) return 1;
          if (!b?.createdAt) return -1;
        }
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        // Handle invalid dates
        if (isNaN(dateA) || isNaN(dateB)) {
          if (isNaN(dateA) && isNaN(dateB)) return 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
        }
        return dateB - dateA; // Descending order
      } catch (sortError) {
        // If sorting fails, maintain original order
        return 0;
      }
    });

    res.status(200).json(allListings);
  } catch (error: any) {
    console.error('[GET /api/shifts/shop/:userId] Error:', {
      userId,
      currentUserId,
      error: error?.message,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack,
    });
    
    // Try to send error response, but don't throw if response already sent
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Failed to fetch shop shifts',
        error: error?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
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

  // OPTIMIZED: Batch fetch all employer users in a single query (N+1 prevention)
  const employerIds = new Set<string>();
  invitations.forEach(({ shift }) => employerIds.add(shift.employerId));
  legacyShifts.forEach(shift => employerIds.add(shift.employerId));

  let employerMap: Map<string, typeof users.$inferSelect> = new Map();
  try {
    employerMap = await usersRepo.getUsersByIds(Array.from(employerIds));
    
    // Log optimization success (for monitoring)
    console.log(`[GET /invitations/pending] Batch fetched ${employerMap.size} employers for ${employerIds.size} unique IDs`, {
      correlationId: req.correlationId,
      userId,
      invitationsCount: invitations.length,
      legacyShiftsCount: legacyShifts.length,
    });
  } catch (error: any) {
    const errorReporting = await import('../services/error-reporting.service.js');
    await errorReporting.errorReporting.captureError(
      'Failed to batch fetch employer users for invitations',
      error as Error,
      {
        correlationId: req.correlationId,
        userId,
        path: req.path,
        method: req.method,
        metadata: { employerIdsCount: employerIds.size },
      }
    );
    // Continue with empty map (graceful degradation)
  }

  // Combine and enrich with business information
  const shiftMap = new Map<string, any>();

  // Process new-style invitations
  for (const { invitation, shift } of invitations) {
    const employer = employerMap.get(shift.employerId);
    
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
      const employer = employerMap.get(shift.employerId);
      
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
  const id = normalizeParam(req.params.id);
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

  // Get venue information for Pusher events
  const venue = await usersRepo.getUserById(shift.employerId);

  // Send notifications and Pusher events to all invited professionals
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

      // Trigger Pusher real-time event for shift invite
      if (venue) {
        await triggerShiftInvite(profId, {
          shiftId: shift.id,
          shiftTitle: shift.title,
          venueName: venue.name,
          venueId: shift.employerId,
        });
      }
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
  const id = normalizeParam(req.params.id);
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

  // Check if user is suspended due to strikes
  const isSuspended = await reputationService.isUserSuspended(userId);
  if (isSuspended) {
    const reputationStats = await reputationService.getUserReputationStats(userId);
    const suspendedUntil = reputationStats?.suspendedUntil;
    const suspendedUntilStr = suspendedUntil ? suspendedUntil.toLocaleString() : 'soon';
    res.status(403).json({ 
      message: `Your account is suspended until ${suspendedUntilStr} due to no-show violations.`,
      suspendedUntil: suspendedUntil?.toISOString(),
    });
    return;
  }

  // Check if professional can work this shift (RSA requirements, verification status)
  const eligibility = await proVerificationService.canProWorkShift(userId, id);
  if (!eligibility.eligible) {
    res.status(403).json({
      message: eligibility.reasons.join('. '),
      reasons: eligibility.reasons,
    });
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
  // ELITE AUDIT SPRINT PART 5 - TASK 1: Financial State Consistency
  // Strict rounding policy: 2 decimal places for AUD to prevent floating-point errors
  const hourlyRate = parseFloat(shift.hourlyRate.toString());
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  // Round hours to 2 decimal places to prevent floating-point errors
  const hoursRounded = Math.round(hours * 100) / 100;
  // Calculate shift amount in dollars, round to 2 decimal places, then convert to cents
  const shiftAmountDollars = Math.round((hourlyRate * hoursRounded) * 100) / 100;
  const shiftAmount = Math.round(shiftAmountDollars * 100); // Convert to cents
  const commissionRate = parseFloat(process.env.HOSPOGO_COMMISSION_RATE || '0.10'); // 10% default
  // Round commission to 2 decimal places in dollars, then convert to cents
  const commissionAmountDollars = Math.round((shiftAmountDollars * commissionRate) * 100) / 100;
  const commissionAmount = Math.round(commissionAmountDollars * 100);
  const barberAmount = shiftAmount - commissionAmount;

  // ATOMIC TRANSACTION: Lock shift, verify availability, create payment, update shift
  // If any step fails, rollback transaction and cancel PaymentIntent
  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  let paymentIntentId: string | null = null;
  let updatedShift: typeof shifts.$inferSelect | null = null;

  try {
    // SECURITY AUDIT: Use REPEATABLE READ isolation for shift updates to prevent deadlocks
    const { withTransactionIsolation } = await import('../db/transactions.js');
    updatedShift = await withTransactionIsolation(async (tx) => {
      // Step 1: Lock the shift row with FOR UPDATE to prevent race conditions
      const lockedShiftResult = await (tx as any).execute(
        sql`SELECT * FROM shifts WHERE id = ${id} FOR UPDATE`
      );
      
      // Handle different result formats
      const lockedShift = Array.isArray(lockedShiftResult) 
        ? lockedShiftResult[0] 
        : lockedShiftResult?.rows?.[0] || lockedShiftResult?.[0];

      if (!lockedShift) {
        throw new Error('Shift not found');
      }

      // Step 2: Verify shift is still available (double-check after lock)
      if (lockedShift.assignee_id) {
        throw new Error('Shift has already been accepted by another professional');
      }

      if (lockedShift.status !== 'invited' && lockedShift.status !== 'pending' && lockedShift.status !== 'open') {
        throw new Error('Shift is not in a valid status for acceptance');
      }

      // Step 3: Create PaymentIntent (external API call - must succeed before DB update)
      // This is outside the transaction but we'll handle rollback if it fails
      try {
        paymentIntentId = await stripeConnectService.createAndConfirmPaymentIntent(
          shiftAmount,
          'aud', // Using AUD for Australian market
          customerId,
          paymentMethodId,
          commissionAmount,
          {
            destination: barber.stripeAccountId || '',
          },
          {
            shiftId: shift.id,
            barberId: userId,
            shopId: shift.employerId,
            type: 'shift_payment',
          }
        );
      } catch (stripeError: any) {
        console.error('[SHIFT_ACCEPT] Error creating PaymentIntent:', stripeError);
        // Throw to trigger transaction rollback
        throw new Error(`Failed to create payment authorization: ${stripeError.message}`);
      }

      if (!paymentIntentId) {
        throw new Error('Failed to create payment authorization');
      }

      // Step 4: Check if this is a substitution request
      const originalWorkerId = lockedShift.substitution_requested_by;

      // Step 5: Update shift with assignee and payment info (within transaction)
      // Clear substitutionRequestedBy if it was set (substitution completed)
      const [updated] = await tx
        .update(shifts)
        .set({
          assigneeId: userId,
          status: 'confirmed',
          paymentStatus: 'AUTHORIZED',
          paymentIntentId: paymentIntentId,
          applicationFeeAmount: commissionAmount,
          transferAmount: barberAmount,
          substitutionRequestedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(shifts.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update shift');
      }

      // Step 6: If this was a substitution, release the original worker
      if (originalWorkerId) {
        // Reject any accepted application from the original worker
        await tx
          .update(shiftApplications)
          .set({
            status: 'rejected',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(shiftApplications.shiftId, id),
              eq(shiftApplications.workerId, originalWorkerId),
              eq(shiftApplications.status, 'accepted')
            )
          );
      }

      // Step 7: Expire all other invitations for this shift (within transaction)
      await shiftInvitationsRepo.expireAllPendingInvitationsForShift(id, userId);
      await shiftOffersRepo.declineAllPendingOffersForShift(id);

      // Step 8: If worker was on waitlist, mark as converted
      await shiftWaitlistRepo.markAsConverted(id, userId);

      // Transaction will commit automatically if no errors thrown
      return updated;
    }, 'REPEATABLE READ');

    // Transaction succeeded - shift is now assigned and payment is authorized
    console.log(`[SHIFT_ACCEPT] Successfully accepted shift ${id} with PaymentIntent ${paymentIntentId}`);

    // Get professional information
    const professional = await usersRepo.getUserById(userId);
    const professionalName = professional?.name || 'Professional';

    // Send notification to business (non-blocking)
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

    // Notify the original worker if this was a substitution
    if (shift.substitutionRequestedBy) {
      try {
        await notificationsService.createInAppNotification(
          shift.substitutionRequestedBy,
          'SYSTEM',
          'Substitution Completed',
          `A substitute has been found for "${shift.title}". You have been released from this shift.`,
          {
            shiftId: shift.id,
            type: 'substitution_completed',
          }
        );
      } catch (error) {
        console.error('[POST /api/shifts/:id/accept] Error notifying original worker:', error);
      }
    }

    res.status(200).json(updatedShift);
  } catch (error: any) {
    console.error('[SHIFT_ACCEPT] Transaction error:', error);
    
    // CRITICAL: If PaymentIntent was created but transaction failed, cancel it
    if (paymentIntentId) {
      console.log(`[SHIFT_ACCEPT] Attempting to cancel orphaned PaymentIntent ${paymentIntentId}`);
      try {
        const canceled = await stripeConnectService.cancelPaymentIntent(paymentIntentId);
        if (canceled) {
          console.log(`[SHIFT_ACCEPT] Successfully canceled orphaned PaymentIntent ${paymentIntentId}`);
        } else {
          console.error(`[SHIFT_ACCEPT] Failed to cancel PaymentIntent ${paymentIntentId} - manual intervention may be required`);
        }
      } catch (cancelError) {
        console.error(`[SHIFT_ACCEPT] Error canceling PaymentIntent ${paymentIntentId}:`, cancelError);
      }
    }

    // Return appropriate error response
    if (error.message?.includes('already been accepted')) {
      res.status(409).json({ 
        message: 'Already Taken', 
        error: 'This shift was just accepted by another professional' 
      });
    } else if (error.message?.includes('payment authorization')) {
      res.status(500).json({ message: 'Failed to create payment authorization' });
    } else {
      res.status(500).json({ message: 'Failed to accept shift' });
    }
  }
}));

// Decline a shift offer (update invitation status to DECLINED)
router.post('/:id/decline', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
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

  // Check if user is suspended due to strikes
  const isSuspended = await reputationService.isUserSuspended(userId);
  if (isSuspended) {
    const reputationStats = await reputationService.getUserReputationStats(userId);
    const suspendedUntil = reputationStats?.suspendedUntil;
    const suspendedUntilStr = suspendedUntil ? suspendedUntil.toLocaleString() : 'soon';
    res.status(403).json({ 
      message: `Your account is suspended until ${suspendedUntilStr} due to no-show violations.`,
      suspendedUntil: suspendedUntil?.toISOString(),
    });
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
      // ELITE AUDIT SPRINT PART 5 - TASK 1: Financial State Consistency
      // Strict rounding policy: 2 decimal places for AUD to prevent floating-point errors
      const hourlyRate = parseFloat(shift.hourlyRate.toString());
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      // Round hours to 2 decimal places to prevent floating-point errors
      const hoursRounded = Math.round(hours * 100) / 100;
      // Calculate shift amount in dollars, round to 2 decimal places, then convert to cents
      const shiftAmountDollars = Math.round((hourlyRate * hoursRounded) * 100) / 100;
      const shiftAmount = Math.round(shiftAmountDollars * 100);
      
      // Check if employer has an active Business subscription (booking fee waiver)
      const employerSubscription = await subscriptionsRepo.getCurrentSubscription(shift.employerId);
      let commissionAmount = 0;
      
      if (employerSubscription) {
        // Get the plan details to check if it's Business/Enterprise tier
        const plan = await subscriptionsRepo.getSubscriptionPlanById(employerSubscription.planId);
        
        // Use tier field for robust fee waiver logic (fallback to name matching for legacy data)
        const isBusinessTier = plan?.tier === 'business' || 
                               plan?.tier === 'enterprise' ||
                               plan?.name?.toLowerCase().includes('business') || 
                               plan?.name?.toLowerCase().includes('enterprise');
        
        if (isBusinessTier) {
          // Business/Enterprise tier: booking fee waived
          commissionAmount = 0;
          console.log(`[SHIFTS] Booking fee waived for employer ${shift.employerId} (${plan?.name} tier: ${plan?.tier})`);
        } else {
          // Other subscription (shouldn't happen with current plans): apply standard commission
          const commissionRate = parseFloat(process.env.HOSPOGO_COMMISSION_RATE || process.env.SNIPSHIFT_COMMISSION_RATE || '0.10');
          commissionAmount = Math.round(shiftAmount * commissionRate);
        }
      } else {
        // No subscription (Starter/free tier): apply $20 booking fee per shift
        // Using $20 flat fee (2000 cents) as documented in pricing
        const BOOKING_FEE_CENTS = 2000;
        commissionAmount = BOOKING_FEE_CENTS;
        console.log(`[SHIFTS] Applying $20 booking fee for employer ${shift.employerId} (no subscription)`);
      }
      
      const barberAmount = shiftAmount - commissionAmount;

      // ATOMIC TRANSACTION: Lock shift, verify availability, create payment, update shift
      let paymentIntentId: string | null = null;
      let updatedShift: typeof shifts.$inferSelect | null = null;

      try {
        // SECURITY AUDIT: Use REPEATABLE READ isolation for shift updates to prevent deadlocks
        const { withTransactionIsolation } = await import('../db/transactions.js');
        updatedShift = await withTransactionIsolation(async (tx) => {
          // Step 1: Lock the shift row with FOR UPDATE to prevent race conditions
          const lockedShiftResult = await (tx as any).execute(
            sql`SELECT * FROM shifts WHERE id = ${shiftId} FOR UPDATE`
          );
          
          // Handle different result formats
          const lockedShift = Array.isArray(lockedShiftResult) 
            ? lockedShiftResult[0] 
            : lockedShiftResult?.rows?.[0] || lockedShiftResult?.[0];

          if (!lockedShift) {
            throw new Error('Shift not found');
          }

          // Step 2: Verify shift is still available (double-check after lock)
          if (lockedShift.assignee_id) {
            throw new Error('Shift has already been accepted by another professional');
          }

          if (lockedShift.status !== 'invited' && lockedShift.status !== 'pending' && lockedShift.status !== 'open') {
            throw new Error('Shift is not in a valid status for acceptance');
          }

          // Step 3: Create PaymentIntent (external API call - must succeed before DB update)
          try {
            paymentIntentId = await stripeConnectService.createAndConfirmPaymentIntent(
              shiftAmount,
              'aud',
              customerId,
              paymentMethodId,
              commissionAmount,
              { destination: barber.stripeAccountId || '' },
              { shiftId: shift.id, barberId: userId, shopId: shift.employerId, type: 'shift_payment' }
            );
          } catch (stripeError: any) {
            console.error(`[BULK_ACCEPT] Error creating PaymentIntent for shift ${shiftId}:`, stripeError);
            throw new Error(`Failed to create payment authorization: ${stripeError.message}`);
          }

          if (!paymentIntentId) {
            throw new Error('Failed to create payment authorization');
          }

          // Step 4: Update shift with assignee and payment info (within transaction)
          const [updated] = await tx
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
            .where(eq(shifts.id, shiftId))
            .returning();

          if (!updated) {
            throw new Error('Failed to update shift');
          }

          // Step 5: Expire all other invitations for this shift (within transaction)
          await shiftInvitationsRepo.expireAllPendingInvitationsForShift(shiftId, userId);
          await shiftOffersRepo.declineAllPendingOffersForShift(shiftId);

          // Transaction will commit automatically if no errors thrown
          return updated;
        }, 'REPEATABLE READ');

        // Transaction succeeded for this shift
        results.accepted.push(shiftId);
      } catch (error: any) {
        console.error(`[BULK_ACCEPT] Error processing shift ${shiftId}:`, error);
        
        // CRITICAL: If PaymentIntent was created but transaction failed, cancel it
        if (paymentIntentId) {
          console.log(`[BULK_ACCEPT] Attempting to cancel orphaned PaymentIntent ${paymentIntentId} for shift ${shiftId}`);
          try {
            const canceled = await stripeConnectService.cancelPaymentIntent(paymentIntentId);
            if (canceled) {
              console.log(`[BULK_ACCEPT] Successfully canceled orphaned PaymentIntent ${paymentIntentId}`);
            } else {
              console.error(`[BULK_ACCEPT] Failed to cancel PaymentIntent ${paymentIntentId} - manual intervention may be required`);
            }
          } catch (cancelError) {
            console.error(`[BULK_ACCEPT] Error canceling PaymentIntent ${paymentIntentId}:`, cancelError);
          }
        }

        // Categorize the error
        if (error.message?.includes('already been accepted') || error.message?.includes('already taken')) {
          results.alreadyTaken.push(shiftId);
        } else if (error.message?.includes('not found')) {
          results.notFound.push(shiftId);
        } else {
          results.failed.push(shiftId);
          results.errors.push({ shiftId, error: error.message || 'Unknown error' });
        }
      }

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
  const shiftId = normalizeParam(req.params.id);
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

// Save shift templates (calendar settings)
router.post('/templates', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body - expect shiftPattern and defaultShiftLength
  const { shiftPattern, defaultShiftLength } = req.body;
  
  if (!shiftPattern || !['full-day', 'half-day', 'thirds', 'custom'].includes(shiftPattern)) {
    res.status(400).json({ message: 'Valid shiftPattern is required (full-day, half-day, thirds, or custom)' });
    return;
  }

  if (shiftPattern === 'custom' && (!defaultShiftLength || defaultShiftLength < 1)) {
    res.status(400).json({ message: 'defaultShiftLength is required when shiftPattern is custom' });
    return;
  }

  // Note: businessSettings field removed from schema
  // Shift template settings are now handled via shift templates directly
  // This endpoint validates the input but doesn't persist to user record

  res.status(200).json({
    success: true,
    shiftPattern,
    defaultShiftLength: shiftPattern === 'custom' ? defaultShiftLength : undefined,
  });
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
  const offerId = normalizeParam(req.params.id);
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

  // Check if professional can work this shift (RSA requirements, verification status)
  const eligibility = await proVerificationService.canProWorkShift(userId, offer.shiftId);
  if (!eligibility.eligible) {
    res.status(403).json({
      message: eligibility.reasons.join('. '),
      reasons: eligibility.reasons,
    });
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
  const id = normalizeParam(req.params.id);
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

  // Conflict detection: Check for overlapping shifts
  // All times are stored in UTC, but we compare them directly for overlap detection
  const shiftStart = new Date(shift.startTime);
  const shiftEnd = new Date(shift.endTime);

  // Helper function to check if two time ranges overlap
  const doShiftsOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    // Shifts overlap if one starts before the other ends
    return start1 < end2 && start2 < end1;
  };

  // 1. Check confirmed/filled shifts (already assigned)
  const userShifts = await shiftsRepo.getShiftsByAssignee(userId);
  const hasOverlapWithConfirmed = userShifts.some((userShift) => {
    if (userShift.status !== 'confirmed' && userShift.status !== 'filled') {
      return false;
    }

    const userShiftStart = new Date(userShift.startTime);
    const userShiftEnd = new Date(userShift.endTime);

    return doShiftsOverlap(shiftStart, shiftEnd, userShiftStart, userShiftEnd);
  });

  // 2. Check accepted shift applications
  const acceptedApplications = await shiftApplicationsRepo.getApplicationsByWorker(userId);
  const acceptedShiftIds = acceptedApplications
    .filter(app => app.status === 'accepted')
    .map(app => app.shiftId);

  let hasOverlapWithAccepted = false;
  let conflictingShift: shiftsRepo.ShiftWithShop | null = null;
  
  if (acceptedShiftIds.length > 0) {
    const acceptedShifts = await Promise.all(
      acceptedShiftIds.map(id => shiftsRepo.getShiftById(id))
    );
    
    for (const acceptedShift of acceptedShifts) {
      if (!acceptedShift) continue;
      
      const acceptedStart = new Date(acceptedShift.startTime);
      const acceptedEnd = new Date(acceptedShift.endTime);

      if (doShiftsOverlap(shiftStart, shiftEnd, acceptedStart, acceptedEnd)) {
        hasOverlapWithAccepted = true;
        conflictingShift = acceptedShift;
        break;
      }
    }
  }

  if (hasOverlapWithConfirmed || hasOverlapWithAccepted) {
    res.status(400).json({ 
      message: 'This shift conflicts with an existing accepted shift',
      code: 'SHIFT_CONFLICT',
      conflictType: hasOverlapWithConfirmed ? 'confirmed' : 'accepted',
      conflictingShift: conflictingShift ? {
        id: conflictingShift.id,
        title: conflictingShift.title,
        startTime: conflictingShift.startTime.toISOString(),
        endTime: conflictingShift.endTime.toISOString(),
      } : null
    });
    return;
  }

  // Check if user has already applied for this shift (using new shift_applications table)
  const hasApplied = await shiftApplicationsRepo.hasWorkerApplied(id, userId);
  if (hasApplied) {
    res.status(409).json({ message: 'You have already applied for this shift' });
    return;
  }

  // Check if shift has autoAccept enabled
  const autoAccept = shift.autoAccept || false;

  // Get message from request body
  const { message } = req.body;

  if (autoAccept) {
    // Create application record in shift_applications table for tracking
    await shiftApplicationsRepo.createShiftApplication({
      shiftId: id,
      workerId: userId,
      venueId: shift.employerId,
      message: message || null,
    });
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

      // Get user details for notification
      const user = await usersRepo.getUserById(userId);

      // Send notification to shop
      try {
        await notificationsService.notifyBusinessOfAcceptance(
          shift.employerId,
          user?.name || 'Professional',
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
    // Create application record in shift_applications table
    const application = await shiftApplicationsRepo.createShiftApplication({
      shiftId: id,
      workerId: userId,
      venueId: shift.employerId,
      message: message || null,
    });

    if (!application) {
      res.status(500).json({ message: 'Failed to create application' });
      return;
    }

    // Get user details for notification
    const user = await usersRepo.getUserById(userId);

    // Send notification to venue owner
    try {
      await notificationsService.notifyBusinessOfApplication(
        shift.employerId,
        {
          id: application.id,
          shiftId: shift.id,
          professionalName: user?.name || 'Professional',
          shiftTitle: shift.title,
        }
      );
    } catch (error) {
      console.error('[POST /api/shifts/:id/apply] Error sending notification:', error);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        shiftId: application.shiftId,
        workerId: application.workerId,
        venueId: application.venueId,
        status: application.status,
        message: application.message,
        createdAt: application.createdAt,
      },
      instantAccept: false,
    });
  }
}));

// Update shift application status (accept/reject) - Venue owner only
router.patch('/applications/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;
  const { status, reason } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!status || !['accepted', 'rejected'].includes(status)) {
    res.status(400).json({ message: 'Invalid status. Must be "accepted" or "rejected"' });
    return;
  }

  // Get the application
  const application = await shiftApplicationsRepo.getShiftApplicationById(id);
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Verify ownership - check if the application is for a shift owned by this user
  if (application.venueId !== userId) {
    res.status(403).json({ message: 'Forbidden: You do not own this shift' });
    return;
  }

  // Get shift to verify it exists
  const shift = await shiftsRepo.getShiftById(application.shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Get worker info for notifications
  const worker = await usersRepo.getUserById(application.workerId);
  const workerName = worker?.name || 'Worker';

  if (status === 'accepted') {
    // Use transaction to ensure atomicity
    const { getDb } = await import('../db/index.js');
    const db = getDb();
    if (!db) {
      res.status(500).json({ message: 'Database not available' });
      return;
    }

    try {
      await db.transaction(async (tx) => {
        // 1. Lock the shift row to prevent race conditions
        const result = await (tx as any).execute(
          sql`SELECT * FROM shifts WHERE id = ${application.shiftId} FOR UPDATE`
        );
        
        const lockedShift = Array.isArray(result) ? result[0] : result?.rows?.[0] || result?.[0];

        if (!lockedShift) {
          throw new Error('Shift not found');
        }

        // Check if shift is already assigned
        if (lockedShift.assignee_id) {
          throw new Error('Shift has already been filled by another applicant');
        }

        // 2. Update application status to accepted
        await tx
          .update(shiftApplications)
          .set({
            status: 'accepted',
            updatedAt: new Date(),
          })
          .where(eq(shiftApplications.id, id));

        // 3. Check if this is a substitution request
        const originalWorkerId = lockedShift.substitution_requested_by;
        
        // 4. Update shift with assignee and mark as filled
        // Clear substitutionRequestedBy if it was set (substitution completed)
        await tx
          .update(shifts)
          .set({
            assigneeId: application.workerId,
            status: 'filled',
            substitutionRequestedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(shifts.id, application.shiftId));

        // 5. If this was a substitution, release the original worker
        if (originalWorkerId) {
          // Reject any accepted application from the original worker
          await tx
            .update(shiftApplications)
            .set({
              status: 'rejected',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(shiftApplications.shiftId, application.shiftId),
                eq(shiftApplications.workerId, originalWorkerId),
                eq(shiftApplications.status, 'accepted')
              )
            );
        }

        // 6. Auto-reject other pending applications for this shift
        await tx
          .update(shiftApplications)
          .set({
            status: 'rejected',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(shiftApplications.shiftId, application.shiftId),
              eq(shiftApplications.status, 'pending'),
              sql`${shiftApplications.id} != ${id}`
            )
          );
      });

      // Fetch updated application and shift
      const updatedApplication = await shiftApplicationsRepo.getShiftApplicationById(id);
      const updatedShift = await shiftsRepo.getShiftById(application.shiftId);

      // Notify the new worker
      try {
        await notificationsService.notifyApplicationApproved(
          application.workerId,
          updatedShift,
          null
        );
      } catch (error) {
        console.error('[PATCH /api/shifts/applications/:id] Error sending approval notification:', error);
      }

      // Notify the original worker if this was a substitution
      if (shift.substitutionRequestedBy) {
        try {
          await notificationsService.createInAppNotification(
            shift.substitutionRequestedBy,
            'SYSTEM',
            'Substitution Completed',
            `A substitute has been found for "${shift.title}". You have been released from this shift.`,
            {
              shiftId: shift.id,
              type: 'substitution_completed',
            }
          );
        } catch (error) {
          console.error('[PATCH /api/shifts/applications/:id] Error notifying original worker:', error);
        }
      }

      res.status(200).json({
        message: 'Application accepted successfully',
        application: updatedApplication,
      });
    } catch (error: any) {
      console.error('[PATCH /api/shifts/applications/:id] Error accepting application:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
      });
      
      if (error.message.includes('already been filled')) {
        res.status(409).json({ message: error.message });
        return;
      }
      
      throw error;
    }
  } else {
    // REJECTED
    const updatedApplication = await shiftApplicationsRepo.updateApplicationStatus(id, 'rejected');

    if (!updatedApplication) {
      res.status(500).json({ message: 'Failed to update application' });
      return;
    }

    // Notify the worker
    try {
      await notificationsService.notifyApplicationDeclined(
        application.workerId,
        shift,
        null
      );
    } catch (error) {
      console.error('[PATCH /api/shifts/applications/:id] Error sending decline notification:', error);
    }

    res.status(200).json({
      message: 'Application rejected',
      application: updatedApplication,
    });
  }
}));

// Complete a shift (Venue owner only) - Marks shift as completed and triggers payout
router.patch('/:id/complete', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
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

  // Verify ownership
  if (shift.employerId !== userId) {
    res.status(403).json({ message: 'Forbidden: Only the venue owner can complete this shift' });
    return;
  }

  // Verify shift has an assignee
  if (!shift.assigneeId) {
    res.status(400).json({ message: 'Shift has no assigned worker' });
    return;
  }

  // Verify shift is not already completed
  if (shift.status === 'completed') {
    res.status(400).json({ message: 'Shift is already completed' });
    return;
  }

  // Verify shift has proof photo (required for completion)
  if (!shift.proofImageUrl) {
    res.status(400).json({ 
      message: 'Cannot complete shift: Worker has not uploaded proof photo. Please wait for the worker to clock out with proof photo.',
      error: 'PROOF_PHOTO_REQUIRED'
    });
    return;
  }

  // Verify shift is in pending_completion status (worker has clocked out)
  if (shift.status !== 'pending_completion') {
    res.status(400).json({ 
      message: 'Shift must be clocked out by worker before completion. Current status: ' + shift.status,
      error: 'INVALID_STATUS'
    });
    return;
  }

  // Verify current time is past shift end time
  const now = new Date();
  const shiftEndTime = new Date(shift.endTime);
  if (now < shiftEndTime) {
    res.status(400).json({ 
      message: 'Cannot complete shift before end time',
      shiftEndTime: shiftEndTime.toISOString(),
    });
    return;
  }

  // Calculate payout using HIGA Award Engine (2026 Rates)
  const hourlyRate = parseFloat(shift.hourlyRate.toString());
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  
  // Import award engine service
  const { calculateGrossPay } = await import('../services/award-engine.service.js');
  
  // Get worker's employment type (default to 'casual' for hospitality workers)
  // TODO: Add userType field to user profile schema if needed
  const userType: 'casual' | 'fulltime' | 'parttime' = 'casual'; // Default to casual
  
  // Calculate gross pay with award interpretation (2026 HIGA rates)
  const awardCalculation = calculateGrossPay({
    baseRate: hourlyRate,
    startTime,
    endTime,
    userType,
  });
  
  const amountCents = awardCalculation.grossPayCents;
  const hoursWorked = awardCalculation.hoursWorked;

  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  // Import repositories
  const payoutsRepo = await import('../repositories/payouts.repository.js');
  const ledgerRepo = await import('../repositories/financial-ledger.repository.js');

  try {
    // STEP 1: Atomically mark shift completed (only from pending_completion) and create payout record.
    // NOTE: Stripe capture is an external side effect and cannot be part of a DB transaction.
    let payoutId: string | null = null;
    await db.transaction(async (tx) => {
      // Ensure shift is still completable (protects against concurrent completions).
      const updated = await tx
        .update(shifts)
        .set({
          status: 'completed',
          attendanceStatus: 'completed',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(shifts.id, id),
            eq(shifts.employerId, userId),
            eq(shifts.status, 'pending_completion')
          )
        )
        .returning({ id: shifts.id });

      if (!updated || updated.length === 0) {
        throw new Error('Shift is not in a completable state (already completed or status changed)');
      }

      // Prevent duplicate payouts for the same shift (unique constraint exists, but we fail fast).
      const existingPayout = await payoutsRepo.getPayoutByShiftId(id, tx);
      if (existingPayout) {
        throw new Error('Payout already exists for this shift');
      }

      if (!shift.assigneeId) {
        throw new Error('Cannot create payout: shift has no assigned worker');
      }

      const payout = await payoutsRepo.createPayout(
        {
          shiftId: id,
          workerId: shift.assigneeId,
          venueId: shift.employerId,
          amountCents,
          hourlyRate: hourlyRate.toString(),
          hoursWorked,
          status: 'processing', // Only mark completed after Stripe capture succeeds
        },
        tx
      );

      if (!payout) {
        throw new Error('Failed to create payout record');
      }

      payoutId = payout.id;
    });

    // STEP 2: ATOMIC SETTLEMENT - Capture payment and create immediate transfer
    // This bypasses the old 'Pending Batch' state and triggers immediate transfer to connected account.
    const captureNeeded = !!shift.paymentIntentId && shift.paymentStatus === 'AUTHORIZED';
    let stripeChargeId: string | null = null;
    let stripeTransferId: string | null = null;
    let captureSucceeded = false;
    
    // Get the payout to retrieve the settlement ID
    const payoutForSettlement = await payoutsRepo.getPayoutByShiftId(id);
    const settlementId = payoutForSettlement?.settlementId || '';
    
    if (captureNeeded) {
      try {
        // Use atomic settlement to capture and get both charge ID and transfer ID
        // Pass amountCents to ensure PaymentIntent is updated with award-calculated amount
        // This ensures the worker receives the correct 2026 HIGA award-based pay
        const settlementResult = await stripeConnectService.capturePaymentIntentAtomic(
          shift.paymentIntentId!,
          settlementId,
          amountCents // Award-calculated amount (includes Sunday penalty, late-night loading, etc.)
        );
        
        captureSucceeded = settlementResult.success;
        stripeChargeId = settlementResult.chargeId;
        stripeTransferId = settlementResult.transferId;
        
        if (!stripeChargeId) {
          console.warn(`[SHIFT_COMPLETE] Atomic settlement returned no chargeId for shift ${id}`);
        }
        if (!stripeTransferId) {
          console.warn(`[SHIFT_COMPLETE] Atomic settlement returned no transferId for shift ${id} - funds may still be in transit`);
        }
        
        console.log(`[SHIFT_COMPLETE] Atomic settlement completed - Settlement: ${settlementId}, Charge: ${stripeChargeId}, Transfer: ${stripeTransferId}`);
      } catch (error: any) {
        console.error(`[SHIFT_COMPLETE] Error in atomic settlement for shift ${id}:`, error);
      }
    }

    // If no capture is needed (already PAID, or no PaymentIntent), treat it as succeeded.
    if (!captureNeeded) {
      captureSucceeded = true;
    }

    if (!payoutId) {
      throw new Error('Payout creation failed: missing payoutId');
    }

    await db.transaction(async (tx) => {
      if (captureSucceeded) {
        // Mark payout as completed with both charge and transfer IDs for full audit trail
        await payoutsRepo.updatePayoutStatus(
          payoutId!,
          'completed',
          { 
            stripeChargeId: stripeChargeId || undefined, 
            stripeTransferId: stripeTransferId || undefined 
          },
          tx
        );

        // Append immutable ledger entry with Settlement ID for D365/Workday reconciliation
        const ledgerEntry = await ledgerRepo.createLedgerEntry(
          {
            entryType: 'IMMEDIATE_SETTLEMENT_COMPLETED',
            amountCents,
            currency: 'aud',
            settlementId: settlementId || null,
            shiftId: id,
            payoutId: payoutId!,
            workerId: shift.assigneeId ?? null,
            venueId: shift.employerId,
            stripePaymentIntentId: shift.paymentIntentId ?? null,
            stripeChargeId: stripeChargeId ?? null,
            stripeTransferId: stripeTransferId ?? null,
          },
          tx
        );

        // Create ledger line items for award breakdown (Base Pay, Sunday Penalty, Late Night Loading)
        if (ledgerEntry?.id && awardCalculation.lineItems.length > 0) {
          await ledgerRepo.createLedgerLineItemsFromAwardCalculation(
            ledgerEntry.id,
            settlementId || null,
            awardCalculation.lineItems,
            tx
          );
        }

        // Update shift payment status if a capture occurred
        if (stripeChargeId) {
          await tx
            .update(shifts)
            .set({
              paymentStatus: 'PAID',
              stripeChargeId,
              updatedAt: new Date(),
            })
            .where(eq(shifts.id, id));
        }

        // Atomic earnings increment (prevents lost updates under concurrency)
        if (shift.assigneeId) {
          await tx
            .update(users)
            .set({
              totalEarnedCents: sql`${users.totalEarnedCents} + ${amountCents}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, shift.assigneeId));
        }
      } else {
        // Capture failed: mark payout as failed and reflect payment failure for follow-up/retry.
        await payoutsRepo.updatePayoutStatus(payoutId!, 'failed', undefined, tx);
        await ledgerRepo.createLedgerEntry(
          {
            entryType: 'IMMEDIATE_SETTLEMENT_FAILED',
            amountCents,
            currency: 'aud',
            settlementId: settlementId || null,
            shiftId: id,
            payoutId: payoutId!,
            workerId: shift.assigneeId ?? null,
            venueId: shift.employerId,
            stripePaymentIntentId: shift.paymentIntentId ?? null,
            stripeChargeId: stripeChargeId ?? null,
          },
          tx
        );
        await tx
          .update(shifts)
          .set({
            paymentStatus: captureNeeded ? 'PAYMENT_FAILED' : shift.paymentStatus,
            updatedAt: new Date(),
          })
          .where(eq(shifts.id, id));
      }
    });

    // Fetch updated shift
    const updatedShift = await shiftsRepo.getShiftById(id);
    const payout = await payoutsRepo.getPayoutByShiftId(id);

    // Notify worker (non-blocking)
    try {
      await notificationsService.notifyShiftCompleted(
        shift.assigneeId,
        {
          id: shift.id,
          title: shift.title,
          startTime: shift.startTime,
          endTime: shift.endTime,
          hourlyRate: shift.hourlyRate,
          amountCents,
        }
      );
    } catch (error) {
      console.error('[PATCH /api/shifts/:id/complete] Error sending notification:', error);
    }

    res.status(200).json({
      message: 'Shift completed successfully',
      shift: updatedShift,
      payout: payout ? {
        id: payout.id,
        settlementId: payout.settlementId, // For D365/Workday reconciliation
        amountCents: payout.amountCents,
        hoursWorked: parseFloat(payout.hoursWorked),
        hourlyRate: parseFloat(payout.hourlyRate),
        status: payout.status,
        settlementType: payout.settlementType,
        stripeTransferId: payout.stripeTransferId,
      } : null,
    });
  } catch (error: any) {
    console.error('[PATCH /api/shifts/:id/complete] Error completing shift:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });
    
    if (error.message.includes('already exists') || error.message.includes('Payout already exists')) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error.message.includes('not in a completable state')) {
      res.status(409).json({ message: error.message });
      return;
    }
    
    throw error;
  }
}));

// Request substitution for an accepted shift
router.patch('/:id/request-substitute', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get shift to verify it exists and is assigned to the worker
  const shift = await shiftsRepo.getShiftById(id);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Check if shift is assigned to this worker
  const isAssignedToWorker = shift.assigneeId === userId;
  if (!isAssignedToWorker) {
    // Also check if worker has an accepted application for this shift
    const applications = await shiftApplicationsRepo.getApplicationsByWorker(userId);
    const hasAcceptedApplication = applications.some(
      app => app.shiftId === id && app.status === 'accepted'
    );

    if (!hasAcceptedApplication) {
      res.status(403).json({ message: 'You can only request substitution for shifts assigned to you' });
      return;
    }
  }

  // Check if shift is in confirmed/filled status or has accepted application
  const isConfirmed = shift.status === 'confirmed' || shift.status === 'filled';
  const applications = await shiftApplicationsRepo.getApplicationsByWorker(userId);
  const hasAcceptedApplication = applications.some(
    app => app.shiftId === id && app.status === 'accepted'
  );

  if (!isConfirmed && !hasAcceptedApplication) {
    res.status(400).json({ message: 'Shift must be confirmed or have an accepted application to request substitution' });
    return;
  }

  // Check if request is made at least 24 hours before shift start
  const shiftStart = new Date(shift.startTime);
  const now = new Date();
  const hoursUntilStart = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilStart < 24) {
    res.status(400).json({ 
      message: 'Substitution requests must be made at least 24 hours before the shift start time',
      error: 'TOO_LATE_FOR_SUBSTITUTION'
    });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  try {
    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // 1. Update shift: set status to 'open', keep assigneeId for now (will be cleared when substitute accepts)
      // Set substitutionRequestedBy to track the original worker
      await tx
        .update(shifts)
        .set({
          status: 'open',
          substitutionRequestedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(shifts.id, id));

      // 2. If there's an accepted application, we'll keep it but the shift is now open for others
      // The original worker will be released when a new worker accepts
    });

    // 3. Find recommended workers for this shift
    // Get professionals who match the shift criteria
    const shiftLat = shift.lat ? parseFloat(shift.lat.toString()) : null;
    const shiftLng = shift.lng ? parseFloat(shift.lng.toString()) : null;

    // Get all active professionals (excluding the requesting worker)
    const allProfessionals = await usersRepo.listProfessionals({
      search: '',
      limit: 100,
      offset: 0,
    });

    // Filter professionals who:
    // - Are not the requesting worker
    // - Match the shift role (if specified)
    // - Are within reasonable distance (if location available)
    // - Haven't already applied to this shift
    const existingApplications = await shiftApplicationsRepo.getApplicationsForShift(id);
    const existingWorkerIds = new Set(existingApplications.map(app => app.workerId));
    existingWorkerIds.add(userId); // Exclude the requesting worker

    const recommendedWorkers = allProfessionals
      .filter(prof => {
        // Exclude the requesting worker and those who already applied
        if (existingWorkerIds.has(prof.id)) {
          return false;
        }
        // Additional filtering can be added here (role matching, distance, etc.)
        return true;
      })
      .slice(0, 20); // Limit to top 20 recommended workers

    // 4. Send notifications to recommended workers
    const venue = await usersRepo.getUserById(shift.employerId);
    const venueName = venue?.name || 'Venue';

    for (const worker of recommendedWorkers) {
      try {
        await notificationsService.notifyProfessionalOfInvite(worker.id, {
          id: shift.id,
          title: `${shift.title} (Substitution Requested)`,
          startTime: shift.startTime,
          endTime: shift.endTime,
          location: shift.location,
          hourlyRate: shift.hourlyRate,
          employerId: shift.employerId,
        });

        // Trigger Pusher real-time event
        if (venue) {
          await triggerShiftInvite(worker.id, {
            shiftId: shift.id,
            shiftTitle: `${shift.title} (Substitution Requested)`,
            venueName: venueName,
            venueId: shift.employerId,
          });
        }
      } catch (error) {
        console.error('[PATCH /api/shifts/:id/request-substitute] Error sending notification to', worker.id, ':', error);
      }
    }

    // 5. Notify the venue owner about the substitution request
    try {
      const requestingWorker = await usersRepo.getUserById(userId);
      const workerName = requestingWorker?.name || 'Worker';
      
      await notificationsService.createInAppNotification(
        shift.employerId,
        'SYSTEM',
        'Substitution Requested',
        `${workerName} has requested a substitute for "${shift.title}"`,
        {
          shiftId: shift.id,
          type: 'substitution_requested',
          requestingWorkerId: userId,
        }
      );
    } catch (error) {
      console.error('[PATCH /api/shifts/:id/request-substitute] Error notifying venue owner:', error);
    }

    // Fetch updated shift
    const updatedShift = await shiftsRepo.getShiftById(id);

    res.status(200).json({
      message: 'Substitution request submitted successfully',
      shift: updatedShift,
      notifiedWorkers: recommendedWorkers.length,
    });
  } catch (error: any) {
    console.error('[PATCH /api/shifts/:id/request-substitute] Error:', {
      message: error?.message,
      shiftId: id,
      userId,
    });
    throw error;
  }
}));

// Submit a review for a shift
router.post('/:id/review', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const shiftId = normalizeParam(req.params.id);

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

  // REVIEW BOMBING PROTECTION: Only allow reviews for completed shifts
  // This prevents reviews on cancelled, draft, or in-progress shifts
  if (shift.status !== 'completed' && shift.status !== 'pending_completion') {
    res.status(400).json({ 
      message: 'Can only review completed shifts',
      currentStatus: shift.status 
    });
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

    // Apply strikes for no-show (2 strikes + 48h suspension)
    if (shift.assigneeId) {
      const noShowResult = await reputationService.handleNoShow(shift.assigneeId, shiftId);
      console.log(`[SHIFT_REVIEW] No-show strike applied: ${noShowResult.message}`);
      
      // Update pro verification status for no-show
      await proVerificationService.onNoShow(shift.assigneeId, shiftId);
    }
  }

  // Create review (initially anonymous for double-blind)
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

  // Check if both parties have now reviewed (reveal both reviews if so)
  const bothReviewed = await shiftReviewsRepo.haveBothPartiesReviewed(shiftId);
  if (bothReviewed) {
    await shiftReviewsRepo.revealReviewsForShift(shiftId);
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

    // Record successful shift completion (may remove a strike if 5th shift since last strike)
    if (shift.assigneeId) {
      const successResult = await reputationService.handleSuccessfulShift(shift.assigneeId, shiftId);
      console.log(`[SHIFT_REVIEW] Successful shift recorded: ${successResult.message}`);
    }
  }

  // Recalculate and update reviewee's rating
  await shiftReviewsRepo.updateUserRating(revieweeId);

  // Update pro verification status based on review (Top Rated badge, rating warnings)
  if (reviewData.type === 'SHOP_REVIEWING_BARBER' && shift.assigneeId) {
    await proVerificationService.onReviewReceived(shift.assigneeId, reviewData.rating, shiftId);
    
    // If shift was completed (not no-show), update verification status
    if (!reviewData.markAsNoShow) {
      await proVerificationService.onShiftCompleted(shift.assigneeId, shiftId);
      
      // Process rating-based strike recovery
      // - Rating >= 4.5: Increment recovery progress (toward strike removal)
      // - Rating < 3.0: Reset recovery progress (poor performance resets redemption)
      const recoveryResult = await reputationService.processShiftSuccess(
        shift.assigneeId,
        reviewData.rating,
        shiftId
      );
      
      if (recoveryResult.strikeRemoved) {
        console.log(`[SHIFT_REVIEW] Strike removed via recovery: ${recoveryResult.message}`);
      } else if (recoveryResult.progressReset) {
        console.log(`[SHIFT_REVIEW] Recovery progress reset: ${recoveryResult.message}`);
      } else if (recoveryResult.recoveryProgress > recoveryResult.previousRecoveryProgress) {
        console.log(`[SHIFT_REVIEW] Recovery progress updated: ${recoveryResult.message}`);
      }
    }
  }

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

// Report No-Show - Venue action to report a staff member who didn't show up
// POST /api/shifts/:id/no-show
router.post('/:id/no-show', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
  const userId = req.user?.uid;

  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(shiftId)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Get the shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify the user is the employer (venue owner) for this shift
  if (shift.employerId !== userId) {
    res.status(403).json({ message: 'Only the venue owner can report a no-show' });
    return;
  }

  // Check if shift has an assigned staff member
  if (!shift.assigneeId) {
    res.status(400).json({ message: 'Cannot report no-show - no staff member assigned to this shift' });
    return;
  }

  // Check if shift start time has passed
  const shiftStartTime = new Date(shift.startTime);
  const now = new Date();
  if (now < shiftStartTime) {
    res.status(400).json({ 
      message: 'Cannot report no-show before shift start time',
      shiftStartTime: shiftStartTime.toISOString()
    });
    return;
  }

  // Check if shift is in a valid state for no-show reporting
  // Valid states: assigned (confirmed), filled, pending_completion
  const validStatuses: string[] = ['assigned', 'confirmed', 'filled', 'pending_completion'];
  if (!validStatuses.includes(shift.status)) {
    res.status(400).json({ 
      message: `Cannot report no-show for a shift with status: ${shift.status}`,
      currentStatus: String(shift.status)
    });
    return;
  }

  // Check if no-show was already reported
  if (shift.attendanceStatus === 'no_show') {
    res.status(400).json({ message: 'No-show has already been reported for this shift' });
    return;
  }

  console.log(`[NO_SHOW] Venue ${userId} reporting no-show for shift ${shiftId}, staff ${shift.assigneeId}`);

  // 1. Update shift status to no_show
  await shiftsRepo.updateShift(shiftId, {
    status: 'completed', // Mark shift as ended
    attendanceStatus: 'no_show',
  });

  // 2. Trigger Reputation Service (2 strikes + 48h suspension)
  const noShowResult = await reputationService.handleNoShow(shift.assigneeId, shiftId);
  console.log(`[NO_SHOW] Strike result: ${noShowResult.message}`);

  // 3. Update pro verification status for no-show
  await proVerificationService.onNoShow(shift.assigneeId, shiftId);

  // 4. Notify the staff member
  await notificationsService.createNotification(shift.assigneeId, {
    type: 'no_show_reported',
    title: 'No-Show Reported',
    message: `A venue has reported you as a no-show for a shift. You have received ${noShowResult.strikesAdded} strike(s). Current total: ${noShowResult.strikeCount} strikes.`,
    data: {
      shiftId,
      strikesAdded: noShowResult.strikesAdded,
      totalStrikes: noShowResult.strikeCount,
      suspendedUntil: noShowResult.suspendedUntil,
      reliabilityScore: noShowResult.reliabilityScore,
    },
  });

  // 5. Get staff member details for response
  const staffMember = await usersRepo.getUserById(shift.assigneeId);

  res.status(200).json({
    message: 'No-show reported successfully',
    shiftId,
    staffId: shift.assigneeId,
    staffName: staffMember?.name || 'Unknown',
    strikesAdded: noShowResult.strikesAdded,
    totalStrikes: noShowResult.strikeCount,
    suspendedUntil: noShowResult.suspendedUntil,
    reliabilityScore: noShowResult.reliabilityScore,
  });
}));

// Clock In - Staff action to clock in for a shift with geofencing validation
// POST /api/shifts/:id/clock-in
router.post('/:id/clock-in', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(shiftId)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Validate request body
  const { latitude, longitude, accuracy, timestamp } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ 
      message: 'Invalid coordinates. latitude and longitude are required and must be numbers.',
      error: 'INVALID_COORDINATES'
    });
    return;
  }

  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({ 
      message: 'Invalid coordinate values. Latitude must be between -90 and 90, longitude between -180 and 180.',
      error: 'INVALID_COORDINATE_RANGE'
    });
    return;
  }

  // Get the shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify the user is the assigned staff member for this shift
  if (shift.assigneeId !== userId) {
    res.status(403).json({ 
      message: 'Only the assigned staff member can clock in for this shift',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  // Check if shift is already clocked in
  if (shift.clockInTime) {
    res.status(400).json({ 
      message: 'Shift has already been clocked in',
      error: 'ALREADY_CLOCKED_IN',
      clockInTime: shift.clockInTime instanceof Date ? shift.clockInTime.toISOString() : shift.clockInTime
    });
    return;
  }

  // Validate that the current time is within a reasonable window of the shift start time (30 mins before)
  const shiftStartTime = new Date(shift.startTime);
  const now = new Date();
  const thirtyMinutesBefore = new Date(shiftStartTime.getTime() - 30 * 60 * 1000);
  
  if (now < thirtyMinutesBefore) {
    res.status(400).json({ 
      message: 'Cannot clock in more than 30 minutes before shift start time',
      error: 'TOO_EARLY',
      shiftStartTime: shiftStartTime.toISOString(),
      earliestClockIn: thirtyMinutesBefore.toISOString()
    });
    return;
  }

  // Validate timestamp freshness if provided (location must be < 1 minute old)
  if (timestamp && typeof timestamp === 'number') {
    const locationAge = Date.now() - timestamp;
    if (locationAge > 60000) { // 1 minute in milliseconds
      res.status(400).json({ 
        message: 'Location data is too old. Please refresh your location and try again.',
        error: 'STALE_LOCATION',
        locationAgeMs: locationAge
      });
      return;
    }
  }

  // Get venue coordinates
  // First try to get coordinates from shift's lat/lng fields
  let venueLat: number | null = null;
  let venueLng: number | null = null;

  const shiftLatRaw = (shift as any).lat;
  const shiftLngRaw = (shift as any).lng;
  
  if (shiftLatRaw !== null && shiftLatRaw !== undefined && shiftLngRaw !== null && shiftLngRaw !== undefined) {
    const shiftLatParsed = typeof shiftLatRaw === 'number' ? shiftLatRaw : typeof shiftLatRaw === 'string' ? parseFloat(shiftLatRaw) : NaN;
    const shiftLngParsed = typeof shiftLngRaw === 'number' ? shiftLngRaw : typeof shiftLngRaw === 'string' ? parseFloat(shiftLngRaw) : NaN;
    
    if (Number.isFinite(shiftLatParsed) && Number.isFinite(shiftLngParsed)) {
      venueLat = shiftLatParsed;
      venueLng = shiftLngParsed;
    }
  }

  // If shift doesn't have coordinates, try to get them from the venue
  if (venueLat === null || venueLng === null) {
    const venue = await venuesRepo.getVenueByUserId(shift.employerId);
    if (venue && venue.address?.lat && venue.address?.lng) {
      const latValue = venue.address.lat;
      const lngValue = venue.address.lng;
      venueLat = typeof latValue === 'number' ? latValue : parseFloat(String(latValue));
      venueLng = typeof lngValue === 'number' ? lngValue : parseFloat(String(lngValue));
    }
  }

  // If still no coordinates, reject the request
  if (venueLat === null || venueLng === null) {
    res.status(400).json({ 
      message: 'Venue location coordinates are not available. Cannot validate geofencing.',
      error: 'VENUE_COORDINATES_MISSING'
    });
    return;
  }

  // Calculate distance using Haversine formula
  const maxRadiusMeters = parseFloat(process.env.CLOCK_IN_MAX_RADIUS_METERS || '200');
  const proximityCheck = validateLocationProximity(
    latitude,
    longitude,
    venueLat,
    venueLng,
    maxRadiusMeters
  );

  // Reject if too far from venue
  if (!proximityCheck.isValid) {
    // Log the failed attempt with correlationId for searchability
    await shiftLogsRepo.createShiftLog({
      shiftId,
      staffId: userId,
      eventType: 'CLOCK_IN_ATTEMPT_FAILED',
      latitude,
      longitude,
      venueLatitude: venueLat,
      venueLongitude: venueLng,
      distanceMeters: proximityCheck.distance,
      accuracy: accuracy || null,
      metadata: JSON.stringify({ 
        reason: 'TOO_FAR_FROM_VENUE', 
        maxRadiusMeters,
        correlationId: req.correlationId,
        userId,
        shiftId,
        userCoordinates: { latitude, longitude },
        venueCoordinates: { latitude: venueLat, longitude: venueLng }
      })
    });

    // Report failed geofence attempt to error tracking service
    const { errorReporting } = await import('../services/error-reporting.service.js');
    await errorReporting.captureWarning(
      `Failed geofence clock-in attempt: User ${userId} attempted to clock in ${proximityCheck.distance}m from venue (max: ${maxRadiusMeters}m)`,
      {
        correlationId: req.correlationId,
        userId,
        path: req.path,
        method: req.method,
        metadata: {
          shiftId,
          distance: proximityCheck.distance,
          maxRadiusMeters,
          latitude,
          longitude,
          venueLatitude: venueLat,
          venueLongitude: venueLng,
        },
        tags: {
          eventType: 'geofence_failure',
          shiftId,
        },
      }
    );

    res.status(403).json({
      success: false,
      error: 'TOO_FAR_FROM_VENUE',
      message: `You must be within ${maxRadiusMeters} meters of the venue to clock in`,
      distance: proximityCheck.distance,
      maxDistance: maxRadiusMeters
    });
    return;
  }

  // Validate GPS accuracy if provided (require accuracy within 50 meters)
  if (accuracy !== undefined && accuracy !== null) {
    if (typeof accuracy !== 'number' || accuracy > 50) {
      res.status(400).json({ 
        message: 'GPS accuracy insufficient. Please ensure you have a clear view of the sky.',
        error: 'INSUFFICIENT_GPS_ACCURACY',
        accuracy
      });
      return;
    }
  }

  // All validations passed - proceed with clock-in
  const clockInTime = new Date();

  // Update shift status and clock-in time in a transaction
  // Use 'IN_PROGRESS' or 'CLOCKED_IN' status - checking what statuses are available
  // Based on the schema, we'll use 'filled' status and set clockInTime
  const updatedShift = await shiftsRepo.updateShift(shiftId, {
    status: 'filled', // Shift is now in progress
    clockInTime: clockInTime,
    attendanceStatus: 'completed', // Mark attendance as completed (clocked in)
  });

  if (!updatedShift) {
    res.status(500).json({ 
      message: 'Failed to update shift status',
      error: 'UPDATE_FAILED'
    });
    return;
  }

  // Log the successful clock-in event
  await shiftLogsRepo.createShiftLog({
    shiftId,
    staffId: userId,
    eventType: 'CLOCK_IN',
    latitude,
    longitude,
    venueLatitude: venueLat,
    venueLongitude: venueLng,
    distanceMeters: proximityCheck.distance,
    accuracy: accuracy || null,
    metadata: JSON.stringify({ 
      clockInTime: clockInTime.toISOString(),
      shiftStartTime: shiftStartTime.toISOString(),
      timeDifferenceMinutes: Math.round((clockInTime.getTime() - shiftStartTime.getTime()) / (1000 * 60))
    })
  });

  // Get staff member details for notification
  const staffMember = await usersRepo.getUserById(userId);
  const venueOwner = await usersRepo.getUserById(shift.employerId);

  // Trigger Pusher notification to the venue owner
  try {
    await triggerUserEvent(shift.employerId, 'STAFF_CLOCKED_IN', {
      shiftId,
      shiftTitle: shift.title,
      staffId: userId,
      staffName: staffMember?.name || 'Staff member',
      clockInTime: clockInTime.toISOString(),
      distance: proximityCheck.distance,
      location: {
        latitude,
        longitude
      }
    });
  } catch (error: any) {
    console.error('[CLOCK_IN] Error triggering Pusher notification:', error);
    // Don't fail the request if Pusher fails
  }

  // Send in-app notification to venue owner
  try {
    await notificationsService.createNotification(shift.employerId, {
      type: 'shift_status_change',
      title: 'Staff Clocked In',
      message: `${staffMember?.name || 'A staff member'} has clocked in for shift: ${shift.title}`,
      data: {
        shiftId,
        staffId: userId,
        clockInTime: clockInTime.toISOString(),
        link: `/shifts/${shiftId}`
      }
    });
  } catch (error: any) {
    console.error('[CLOCK_IN] Error creating notification:', error);
    // Don't fail the request if notification fails
  }

  res.status(200).json({
    success: true,
    clockInTime: clockInTime.toISOString(),
    message: 'Clocked in successfully',
    distance: proximityCheck.distance,
    maxDistance: maxRadiusMeters,
    shift: {
      id: shift.id,
      title: shift.title,
      status: updatedShift.status,
      clockInTime: clockInTime.toISOString()
    }
  });
}));

// Check In - Staff action to check in for a shift with geofencing validation
// PATCH /api/shifts/:id/check-in
router.patch('/:id/check-in', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(shiftId)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Validate request body - expect latitude and longitude
  const { latitude, longitude } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ 
      message: 'Invalid coordinates. latitude and longitude are required and must be numbers.',
      error: 'INVALID_COORDINATES'
    });
    return;
  }

  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({ 
      message: 'Invalid coordinate values. Latitude must be between -90 and 90, longitude between -180 and 180.',
      error: 'INVALID_COORDINATE_RANGE'
    });
    return;
  }

  // Get the shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify the user is the assigned staff member for this shift
  if (shift.assigneeId !== userId) {
    res.status(403).json({ 
      message: 'Only the assigned staff member can check in for this shift',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  // Check if shift is already checked in
  if (shift.attendanceStatus === 'checked_in') {
    res.status(400).json({ 
      message: 'Shift has already been checked in',
      error: 'ALREADY_CHECKED_IN',
      actualStartTime: (shift as any).actualStartTime
    });
    return;
  }

  // Get venue coordinates
  let venueLat: number | null = null;
  let venueLng: number | null = null;

  const shiftLatRaw = (shift as any).lat;
  const shiftLngRaw = (shift as any).lng;
  
  if (shiftLatRaw !== null && shiftLatRaw !== undefined && shiftLngRaw !== null && shiftLngRaw !== undefined) {
    const shiftLatParsed = typeof shiftLatRaw === 'number' ? shiftLatRaw : typeof shiftLatRaw === 'string' ? parseFloat(shiftLatRaw) : NaN;
    const shiftLngParsed = typeof shiftLngRaw === 'number' ? shiftLngRaw : typeof shiftLngRaw === 'string' ? parseFloat(shiftLngRaw) : NaN;
    
    if (Number.isFinite(shiftLatParsed) && Number.isFinite(shiftLngParsed)) {
      venueLat = shiftLatParsed;
      venueLng = shiftLngParsed;
    }
  }

  // If shift doesn't have coordinates, try to get them from the venue
  if (venueLat === null || venueLng === null) {
    const venue = await venuesRepo.getVenueByUserId(shift.employerId);
    if (venue && venue.address?.lat && venue.address?.lng) {
      const latValue = venue.address.lat;
      const lngValue = venue.address.lng;
      venueLat = typeof latValue === 'number' ? latValue : parseFloat(String(latValue));
      venueLng = typeof lngValue === 'number' ? lngValue : parseFloat(String(lngValue));
    }
  }

  // If still no coordinates, reject the request
  if (venueLat === null || venueLng === null) {
    res.status(400).json({ 
      message: 'Venue location coordinates are not available. Cannot validate geofencing.',
      error: 'VENUE_COORDINATES_MISSING'
    });
    return;
  }

  // Calculate distance using Haversine formula (200m radius requirement)
  const maxRadiusMeters = 200;
  const proximityCheck = validateLocationProximity(
    latitude,
    longitude,
    venueLat,
    venueLng,
    maxRadiusMeters
  );

  // Reject if too far from venue
  if (!proximityCheck.isValid) {
    // Log the failed attempt for audit with correlationId for searchability
    await shiftLogsRepo.createShiftLog({
      shiftId,
      staffId: userId,
      eventType: 'CHECK_IN_ATTEMPT_FAILED',
      latitude,
      longitude,
      venueLatitude: venueLat,
      venueLongitude: venueLng,
      distanceMeters: proximityCheck.distance,
      accuracy: null,
      metadata: JSON.stringify({ 
        reason: 'TOO_FAR_FROM_VENUE', 
        maxRadiusMeters, 
        distance: proximityCheck.distance,
        correlationId: req.correlationId,
        userId,
        shiftId,
        userCoordinates: { latitude, longitude },
        venueCoordinates: { latitude: venueLat, longitude: venueLng }
      })
    });

    res.status(403).json({
      success: false,
      error: 'TOO_FAR_FROM_VENUE',
      message: 'You must be at the venue to check in',
      distance: proximityCheck.distance,
      maxDistance: maxRadiusMeters
    });
    return;
  }

  // All validations passed - proceed with check-in
  const actualStartTime = new Date();

  // Update shift status and actual start time
  const updatedShift = await shiftsRepo.updateShift(shiftId, {
    attendanceStatus: 'checked_in',
    actualStartTime: actualStartTime,
  });

  if (!updatedShift) {
    res.status(500).json({ 
      message: 'Failed to update shift status',
      error: 'UPDATE_FAILED'
    });
    return;
  }

  // Log the successful check-in event with precise distance for audit
  await shiftLogsRepo.createShiftLog({
    shiftId,
    staffId: userId,
    eventType: 'CHECK_IN',
    latitude,
    longitude,
    venueLatitude: venueLat,
    venueLongitude: venueLng,
    distanceMeters: proximityCheck.distance, // Precise distance logged for audit
    accuracy: null,
    metadata: JSON.stringify({ 
      actualStartTime: actualStartTime.toISOString(),
      distance: proximityCheck.distance,
      maxRadiusMeters
    })
  });

  res.status(200).json({
    success: true,
    actualStartTime: actualStartTime.toISOString(),
    message: 'Checked in successfully',
    distance: proximityCheck.distance, // Return distance for client display
    maxDistance: maxRadiusMeters,
    shift: {
      id: shift.id,
      title: shift.title,
      attendanceStatus: 'checked_in',
      actualStartTime: actualStartTime.toISOString()
    }
  });
}));

// Clock Out - Staff action to clock out from a shift with proof photo upload
// PATCH /api/shifts/:id/clock-out
router.patch('/:id/clock-out', authenticateUser, uploadProofImage, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(shiftId)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Get the shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify the user is the assigned staff member for this shift
  if (shift.assigneeId !== userId) {
    res.status(403).json({ 
      message: 'Only the assigned staff member can clock out from this shift',
      error: 'UNAUTHORIZED'
    });
    return;
  }

  // Check if shift has been clocked in
  if (!shift.clockInTime && (shift as any).attendanceStatus !== 'checked_in') {
    res.status(400).json({ 
      message: 'You must clock in before clocking out',
      error: 'NOT_CLOCKED_IN'
    });
    return;
  }

  // Verify proof image is provided
  const file = (req as any).file;
  if (!file) {
    res.status(400).json({ 
      message: 'Proof photo is required. Please capture a photo to complete your shift.',
      error: 'PROOF_IMAGE_REQUIRED'
    });
    return;
  }

  // Verify it's an image
  if (!file.mimetype.startsWith('image/')) {
    res.status(400).json({ 
      message: 'Proof must be an image file',
      error: 'INVALID_FILE_TYPE'
    });
    return;
  }

  // Upload proof image to Firebase Storage
  let proofImageUrl: string;
  try {
    const firebaseAdmin = (admin as any).default || admin;
    const appName = process.env.FIREBASE_ADMIN_APP_NAME || 'hospogo-worker-v2';
    let app: admin.app.App;
    try {
      app = firebaseAdmin.app(appName);
    } catch (e) {
      throw new Error('Firebase app not initialized');
    }
    const bucket = firebaseAdmin.storage(app).bucket();

    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `shifts/${shiftId}/proof-${timestamp}.${fileExtension}`;
    const firebaseFile = bucket.file(fileName);

    await firebaseFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedBy: userId,
          shiftId: shiftId,
          uploadedAt: new Date().toISOString(),
          type: 'shift_completion_proof',
        },
      },
    });

    // Make file accessible
    await firebaseFile.makePublic();
    proofImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`[CLOCK_OUT] Proof image uploaded for shift ${shiftId}: ${proofImageUrl.substring(0, 50)}...`);
  } catch (error: any) {
    console.error('[CLOCK_OUT] Failed to upload proof image:', error);
    res.status(500).json({ 
      message: 'Failed to upload proof photo: ' + (error.message || 'Unknown error'),
      error: 'UPLOAD_FAILED'
    });
    return;
  }

  // Update shift with proof image URL and mark as pending completion
  // Status should be 'pending_completion' so venue owner can review the photo before approving
  const updatedShift = await shiftsRepo.updateShift(shiftId, {
    proofImageUrl: proofImageUrl,
    status: 'pending_completion', // Venue owner must review photo before completing
  });

  if (!updatedShift) {
    res.status(500).json({ 
      message: 'Failed to update shift',
      error: 'UPDATE_FAILED'
    });
    return;
  }

  // Log the clock-out event
  await shiftLogsRepo.createShiftLog({
    shiftId,
    staffId: userId,
    eventType: 'CLOCK_OUT',
    latitude: null,
    longitude: null,
    venueLatitude: null,
    venueLongitude: null,
    distanceMeters: null,
    accuracy: null,
    metadata: JSON.stringify({ 
      clockOutTime: new Date().toISOString(),
      proofImageUrl: proofImageUrl,
    })
  });

  // Notify venue owner that shift is ready for review
  try {
    await notificationsService.createInAppNotification(
      shift.employerId,
      'SYSTEM',
      'Shift Ready for Review',
      `Worker has clocked out from "${shift.title}". Please review the proof photo and complete the shift.`,
      {
        shiftId: shift.id,
        type: 'shift_pending_completion',
        proofImageUrl: proofImageUrl,
      }
    );
  } catch (error) {
    console.error('[CLOCK_OUT] Error sending notification:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Clocked out successfully. Your shift is pending venue owner review.',
    proofImageUrl: proofImageUrl,
    shift: {
      id: shift.id,
      title: shift.title,
      status: 'pending_completion',
      proofImageUrl: proofImageUrl,
    }
  });
}));

// Get a single shift by ID (public read)
// NOTE: Keep this near the end of the file to avoid shadowing more specific routes like:
// - /shop/:userId
// - /offers/me
// - /pending-review
// SECURITY AUDIT: Public route - returns full data for open shifts, sanitized for others
// TODO: Add optional authentication middleware to return full data for authorized users
router.get('/:id', asyncHandler(async (req, res) => {
  const id = normalizeParam(req.params.id);

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

  // SECURITY: For non-open shifts, exclude sensitive fields if not authenticated
  // Open shifts are public and can show full data
  const isPublicShift = shift.status === 'open';

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
    role: (shift as any).role ?? null,
    title: shift.title,
    description: shift.description,
    startTime: toISOStringSafe((shift as any).startTime),
    endTime: toISOStringSafe((shift as any).endTime),
    shiftLengthHours: computeShiftLengthHours((shift as any).startTime, (shift as any).endTime),
    hourlyRate: shift.hourlyRate,
    location: shift.location,
    lat,
    lng,
    cancellationWindowHours: (shift as any).cancellationWindowHours ?? 24,
    killFeeAmount: (shift as any).killFeeAmount ?? null,
    staffCancellationReason: (shift as any).staffCancellationReason ?? null,
    isEmergencyFill: (shift as any).isEmergencyFill ?? false,
    uniformRequirements: (shift as any).uniformRequirements ?? null,
    rsaRequired: (shift as any).rsaRequired ?? false,
    expectedPax: (shift as any).expectedPax ?? null,
    status: shift.status,
    attendanceStatus: isPublicShift ? (shift.attendanceStatus ?? null) : null,
    employerId: isPublicShift ? shift.employerId : undefined, // Hide for non-open shifts
    assigneeId: isPublicShift ? (shift.assigneeId ?? null) : null, // Hide for non-open shifts
    shopName: employer?.name ?? null,
    shopAvatarUrl: employer?.avatarUrl ?? null,
    actualStartTime: (shift as any).actualStartTime ? toISOStringSafe((shift as any).actualStartTime) : null,
    proofImageUrl: (shift as any).proofImageUrl ?? null,
    lateArrivalEtaMinutes: (shift as any).lateArrivalEtaMinutes ?? null,
    lateArrivalEtaSetAt: (shift as any).lateArrivalEtaSetAt ? toISOStringSafe((shift as any).lateArrivalEtaSetAt) : null,
    lateArrivalSignalSent: (shift as any).lateArrivalSignalSent ?? false,
    backupRequestedAt: (shift as any).backupRequestedAt ? toISOStringSafe((shift as any).backupRequestedAt) : null,
    backupWorkerId: (shift as any).backupWorkerId ?? null,
    originalWorkerId: (shift as any).originalWorkerId ?? null,
    createdAt: toISOStringSafe((shift as any).createdAt),
    updatedAt: toISOStringSafe((shift as any).updatedAt),
    // Get waitlist count if shift is filled
    waitlistCount: (shift.status === 'filled' || shift.status === 'confirmed') 
      ? await shiftWaitlistRepo.getWaitlistCount(shift.id) 
      : 0,
  });
}));

// Join waitlist for a filled shift
// POST /api/shifts/:id/waitlist
router.post('/:id/waitlist', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
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

  // Get shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Only allow waitlist for filled/confirmed shifts
  if (shift.status !== 'filled' && shift.status !== 'confirmed') {
    res.status(400).json({ message: 'Waitlist is only available for filled shifts' });
    return;
  }

  // Check if shift is in the past
  const now = new Date();
  const shiftStart = new Date(shift.startTime);
  if (shiftStart < now) {
    res.status(400).json({ message: 'Cannot join waitlist for past shifts' });
    return;
  }

  try {
    const entry = await shiftWaitlistRepo.addToWaitlist({
      shiftId,
      workerId: userId,
    });

    if (!entry) {
      res.status(500).json({ message: 'Failed to join waitlist' });
      return;
    }

    res.status(201).json({
      message: 'Successfully joined waitlist',
      entry: {
        id: entry.id,
        shiftId: entry.shiftId,
        rank: entry.rank,
        status: entry.status,
      },
    });
  } catch (error: any) {
    if (error.message === 'Worker is already on the waitlist') {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error.message === 'Waitlist is full (maximum 5 workers)') {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('[POST /api/shifts/:id/waitlist] Error:', error);
    res.status(500).json({ message: 'Failed to join waitlist' });
  }
}));

// Leave waitlist
// DELETE /api/shifts/:id/waitlist
router.delete('/:id/waitlist', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
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

  const success = await shiftWaitlistRepo.removeFromWaitlist(shiftId, userId);

  if (!success) {
    res.status(404).json({ message: 'You are not on the waitlist for this shift' });
    return;
  }

  res.status(200).json({ message: 'Successfully left waitlist' });
}));

// Get waitlist status for a shift (for authenticated users)
// GET /api/shifts/:id/waitlist
router.get('/:id/waitlist', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
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

  const isOnWaitlist = await shiftWaitlistRepo.isWorkerOnWaitlist(shiftId, userId);
  const waitlistCount = await shiftWaitlistRepo.getWaitlistCount(shiftId);

  res.status(200).json({
    isOnWaitlist,
    waitlistCount,
    maxWaitlistSize: 5,
  });
}));

// Report late arrival with ETA
// POST /api/shifts/:id/late-arrival
router.post('/:id/late-arrival', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
  const userId = req.user?.id;
  const { etaMinutes } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate UUID format
  if (!isValidUUID(shiftId)) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Validate ETA
  const validEtaOptions = [5, 10, 15];
  const eta = typeof etaMinutes === 'number' ? etaMinutes : parseInt(etaMinutes, 10);
  if (!validEtaOptions.includes(eta)) {
    res.status(400).json({ message: 'Invalid ETA. Must be 5, 10, or 15 minutes' });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  // Get shift
  const shift = await shiftsRepo.getShiftById(shiftId);
  if (!shift) {
    res.status(404).json({ message: 'Shift not found' });
    return;
  }

  // Verify worker is assigned to this shift
  if (shift.assigneeId !== userId) {
    res.status(403).json({ message: 'You are not assigned to this shift' });
    return;
  }

  // Check if shift is in valid state
  if (shift.status !== 'filled' && shift.status !== 'confirmed') {
    res.status(400).json({ message: 'Can only report late arrival for filled or confirmed shifts' });
    return;
  }

  // Check if late signal already sent (limit to one per shift)
  if ((shift as any).lateArrivalSignalSent) {
    res.status(400).json({ message: 'Late arrival signal has already been sent for this shift' });
    return;
  }

  // Check if shift starts within 15 minutes (button should only appear 15 min before)
  const now = new Date();
  const shiftStart = new Date(shift.startTime);
  const minutesUntilStart = (shiftStart.getTime() - now.getTime()) / (1000 * 60);
  
  if (minutesUntilStart > 15) {
    res.status(400).json({ message: 'Can only report late arrival within 15 minutes of shift start' });
    return;
  }

  if (minutesUntilStart < -30) {
    res.status(400).json({ message: 'Shift has already started or is too far in the past' });
    return;
  }

  try {
    // Update shift with ETA
    await db
      .update(shifts)
      .set({
        lateArrivalEtaMinutes: eta,
        lateArrivalEtaSetAt: now,
        lateArrivalSignalSent: true,
        updatedAt: now,
      })
      .where(eq(shifts.id, shiftId));

    // Get worker name
    const worker = await usersRepo.getUserById(userId);
    const workerName = worker?.name || 'Worker';

    // Calculate new expected arrival time
    const expectedArrivalTime = new Date(shiftStart.getTime() + eta * 60 * 1000);

    // Send high-priority notification to venue owner
    const title = '⚠️ Worker Running Late';
    const message = `${workerName} is running late. Expected arrival: ${expectedArrivalTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} (${eta} min delay)`;
    
    await notificationsService.createInAppNotification(
      shift.employerId,
      'SYSTEM',
      title,
      message,
      {
        type: 'worker_late_arrival',
        shiftId: shift.id,
        shiftTitle: shift.title,
        workerName,
        etaMinutes: eta,
        expectedArrivalTime: expectedArrivalTime.toISOString(),
        link: `/venue/dashboard?shift=${shift.id}`,
      }
    );

    // Send push notification
    const pushNotificationService = await import('../services/push-notification.service.js');
    await pushNotificationService.sendGenericPushNotification(
      shift.employerId,
      title,
      message,
      {
        type: 'worker_late_arrival',
        shiftId: shift.id,
        link: `/venue/dashboard?shift=${shift.id}`,
      }
    );

    res.status(200).json({
      message: 'Late arrival ETA sent successfully',
      etaMinutes: eta,
      expectedArrivalTime: expectedArrivalTime.toISOString(),
    });
  } catch (error) {
    console.error('[POST /api/shifts/:id/late-arrival] Error:', error);
    res.status(500).json({ message: 'Failed to report late arrival' });
  }
}));

// Request backup from waitlist (venue owner only)
// POST /api/shifts/:id/request-backup
router.post('/:id/request-backup', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
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

  const backupRequestService = await import('../services/backup-request.service.js');
  const result = await backupRequestService.requestBackupFromWaitlist(shiftId, userId);

  if (!result.success) {
    res.status(400).json({ message: result.message });
    return;
  }

  res.status(200).json({
    message: result.message,
    notifiedWorkers: result.notifiedWorkers,
  });
}));

// Accept backup shift (waitlisted worker)
// POST /api/shifts/:id/accept-backup
router.post('/:id/accept-backup', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const shiftId = normalizeParam(req.params.id);
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

  const backupRequestService = await import('../services/backup-request.service.js');
  const result = await backupRequestService.acceptBackupShift(shiftId, userId);

  if (!result.success) {
    res.status(400).json({ message: result.message });
    return;
  }

  res.status(200).json({
    message: result.message,
    shift: result.shift,
  });
}));

const normalizeDraftData = (input: unknown): ShiftDraftData | null => {
  if (!input || typeof input !== 'object') return null;

  const draft = { ...(input as Record<string, unknown>) };
  const recurringOptions = draft.recurringOptions;

  if (recurringOptions === null || recurringOptions === undefined) {
    delete draft.recurringOptions;
  } else if (typeof recurringOptions === 'string') {
    try {
      draft.recurringOptions = JSON.parse(recurringOptions);
    } catch {
      delete draft.recurringOptions;
    }
  } else if (typeof recurringOptions !== 'object') {
    delete draft.recurringOptions;
  }

  return draft as ShiftDraftData;
};

// Shift Drafts endpoints
// GET /api/shifts/drafts - Get draft for current venue
router.get('/drafts', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    // Get venue for this user
    const venue = await venuesRepo.getVenueByUserId(userId);
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    const db = getDb();
    if (!db) {
      res.status(500).json({ message: 'Database not available' });
      return;
    }

    // Get the most recent draft for this venue
    const [draft] = await db
      .select()
      .from(shiftDrafts)
      .where(eq(shiftDrafts.venueId, venue.id))
      .orderBy(sql`${shiftDrafts.updatedAt} DESC`)
      .limit(1);

    if (!draft) {
      res.status(200).json({ draft: null });
      return;
    }

    res.status(200).json({
      draft: {
        id: draft.id,
        draftData: (draft.draftData ?? {}) as ShiftDraftData,
        updatedAt: draft.updatedAt ? draft.updatedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('[GET /api/shifts/drafts] Error:', error);
    res.status(500).json({ message: 'Failed to fetch draft' });
  }
}));

// POST /api/shifts/drafts - Save or update draft
router.post('/drafts', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { draftData } = req.body;

  const normalizedDraftData = normalizeDraftData(draftData);

  if (!normalizedDraftData) {
    res.status(400).json({ message: 'Invalid draft data' });
    return;
  }

  try {
    // Get venue for this user
    const venue = await venuesRepo.getVenueByUserId(userId);
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    const db = getDb();
    if (!db) {
      res.status(500).json({ message: 'Database not available' });
      return;
    }

    // Check if draft exists
    const [existingDraft] = await db
      .select()
      .from(shiftDrafts)
      .where(eq(shiftDrafts.venueId, venue.id))
      .limit(1);

    if (existingDraft) {
      // Update existing draft
      const [updated] = await db
        .update(shiftDrafts)
        .set({
          draftData: normalizedDraftData,
          updatedAt: new Date(),
        })
        .where(eq(shiftDrafts.id, existingDraft.id))
        .returning();

      res.status(200).json({
        draft: {
          id: updated.id,
          draftData: (updated.draftData ?? {}) as ShiftDraftData,
          updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
        },
      });
    } else {
      // Create new draft
      const [newDraft] = await db
        .insert(shiftDrafts)
        .values({
          venueId: venue.id,
          draftData: normalizedDraftData,
        })
        .returning();

      res.status(201).json({
        draft: {
          id: newDraft.id,
          draftData: (newDraft.draftData ?? {}) as ShiftDraftData,
          updatedAt: newDraft.updatedAt ? newDraft.updatedAt.toISOString() : null,
        },
      });
    }
  } catch (error) {
    console.error('[POST /api/shifts/drafts] Error:', error);
    res.status(500).json({ message: 'Failed to save draft' });
  }
}));

// DELETE /api/shifts/drafts - Delete draft
router.delete('/drafts', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    // Get venue for this user
    const venue = await venuesRepo.getVenueByUserId(userId);
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' });
      return;
    }

    const db = getDb();
    if (!db) {
      res.status(500).json({ message: 'Database not available' });
      return;
    }

    // Delete draft for this venue
    await db
      .delete(shiftDrafts)
      .where(eq(shiftDrafts.venueId, venue.id));

    res.status(200).json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/shifts/drafts] Error:', error);
    res.status(500).json({ message: 'Failed to delete draft' });
  }
}));

export default router;
