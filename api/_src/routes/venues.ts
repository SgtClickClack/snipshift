import express from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as venuesRepo from '../repositories/venues.repository.js';
import * as shiftApplicationsRepo from '../repositories/shift-applications.repository.js';

const router = express.Router();

// Get current user's venue
router.get('/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const venue = await venuesRepo.getVenueByUserId(userId);
  
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' });
    return;
  }

  res.status(200).json({
    id: venue.id,
    userId: venue.userId,
    venueName: venue.venueName,
    liquorLicenseNumber: venue.liquorLicenseNumber,
    address: venue.address,
    operatingHours: venue.operatingHours,
    status: venue.status,
    createdAt: venue.createdAt.toISOString(),
    updatedAt: venue.updatedAt.toISOString(),
  });
}));

// Get all applications for current venue owner
router.get('/me/applications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { status } = req.query;

  // Get applications for this venue owner
  const applications = await shiftApplicationsRepo.getApplicationsForVenue(
    userId,
    status ? { status: status as 'pending' | 'accepted' | 'rejected' } : undefined
  );

  // Transform to include only necessary fields
  const transformed = applications.map((app) => ({
    id: app.id,
    shiftId: app.shiftId,
    workerId: app.workerId,
    venueId: app.venueId,
    status: app.status,
    message: app.message,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    // Worker details
    worker: app.worker ? {
      id: app.worker.id,
      name: app.worker.name,
      email: app.worker.email,
      avatarUrl: app.worker.avatarUrl,
      bio: app.worker.bio,
      phone: app.worker.phone,
    } : null,
    // Shift details
    shift: app.shift ? {
      id: app.shift.id,
      title: app.shift.title,
      description: app.shift.description,
      startTime: app.shift.startTime.toISOString(),
      endTime: app.shift.endTime.toISOString(),
      hourlyRate: app.shift.hourlyRate,
      location: app.shift.location,
      status: app.shift.status,
    } : null,
  }));

  res.status(200).json(transformed);
}));

export default router;
