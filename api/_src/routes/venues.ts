import express from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as venuesRepo from '../repositories/venues.repository.js';

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

export default router;
