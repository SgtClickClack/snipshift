import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as usersRepo from '../repositories/users.repository';
import { z } from 'zod';

const router = Router();

// Validation schema for profile updates
const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(255).optional(),
});

// Get current user profile
router.get('/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  // Fetch latest user data from DB to ensure we have bio, phone, etc.
  const user = await usersRepo.getUserById(req.user.id);
  
  if (!user) {
     res.status(404).json({ message: 'User not found' });
     return;
  }

  // Map DB user to frontend User shape
  res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.name, // Map name to displayName for frontend consistency
    bio: user.bio,
    phone: user.phone,
    location: user.location,
    roles: [user.role],
    currentRole: user.role,
    uid: req.user.uid // Keep the firebase UID from the token/request
  });
}));

// Update current user profile
router.put('/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = UpdateProfileSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const { displayName, bio, phone, location } = validationResult.data;

  // Prepare update object
  const updates: any = {};
  if (displayName !== undefined) updates.name = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (phone !== undefined) updates.phone = phone;
  if (location !== undefined) updates.location = location;

  // Update user in database
  const updatedUser = await usersRepo.updateUser(req.user.id, updates);

  if (!updatedUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Return updated user object
  res.status(200).json({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    displayName: updatedUser.name,
    bio: updatedUser.bio,
    phone: updatedUser.phone,
    location: updatedUser.location,
    roles: [updatedUser.role],
    currentRole: updatedUser.role,
    uid: req.user.uid
  });
}));

export default router;

