import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ShiftSchema } from '../validation/schemas.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';

const router = Router();

// Create a shift (authenticated, employer only)
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('Received payload:', req.body);
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
  const newShift = await shiftsRepo.createShift({
    employerId: userId,
    title: shiftData.title,
    description: shiftData.description || shiftData.requirements || '',
    startTime,
    endTime,
    hourlyRate: (shiftData.hourlyRate || shiftData.pay || '0').toString(),
    status: shiftData.status || 'open',
    location: shiftData.location,
  });

  if (!newShift) {
    res.status(500).json({ message: 'Failed to create shift' });
    return;
  }

  res.status(201).json(newShift);
}));

// Get all open shifts (public read)
router.get('/', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const status = req.query.status as 'open' | 'filled' | 'completed' | undefined;

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
  if (!['open', 'filled', 'completed'].includes(status)) {
    res.status(400).json({ message: 'Invalid status. Must be one of: open, filled, completed' });
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

// Get shifts by employer (authenticated, owner only or public?)
// Currently implementing as authenticated for shop dashboard usage
router.get('/shop/:userId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?.id;

  // Allow users to see their own shifts, or potentially public profile shifts
  // For Shop Dashboard, we typically want to see all statuses
  
  const shifts = await shiftsRepo.getShiftsByEmployer(userId);

  res.status(200).json(shifts);
}));

export default router;
