import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as usersRepo from '../repositories/users.repository';
import * as emailService from '../services/email.service';
import { z } from 'zod';

const router = Router();

// Validation schema for profile updates
const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(255).optional(),
  avatarUrl: z.string().url().optional(),
});

// Validation schema for user registration
const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).optional(),
});

// Register new user (creates user and sends welcome email)
router.post('/register', asyncHandler(async (req, res) => {
  const validationResult = RegisterSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const { email, name } = validationResult.data;

  // Check if user already exists
  const existingUser = await usersRepo.getUserByEmail(email);
  if (existingUser) {
    res.status(409).json({ message: 'User with this email already exists' });
    return;
  }

  // Create user
  const newUser = await usersRepo.createUser({
    email,
    name,
    role: 'professional',
  });

  if (!newUser) {
    res.status(500).json({ message: 'Failed to create user' });
    return;
  }

  // Send welcome email (non-blocking)
  emailService.sendWelcomeEmail(email, name).catch(error => {
    console.error('Failed to send welcome email:', error);
    // Don't fail the request if email fails
  });

  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
  });
}));

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
    uid: req.user.uid, // Keep the firebase UID from the token/request
    averageRating: user.averageRating ? parseFloat(user.averageRating) : null,
    reviewCount: user.reviewCount ? parseInt(user.reviewCount, 10) : 0,
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

  const { displayName, bio, phone, location, avatarUrl } = validationResult.data;

  // Prepare update object
  const updates: any = {};
  if (displayName !== undefined) updates.name = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (phone !== undefined) updates.phone = phone;
  if (location !== undefined) updates.location = location;
  // Note: avatarUrl might need to be stored in a separate field or handled differently

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
