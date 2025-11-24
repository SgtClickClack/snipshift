import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as emailService from '../services/email.service.js';
import { auth } from '../config/firebase.js';
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

// Validation schema for onboarding completion
const OnboardingCompleteSchema = z.object({
  role: z.enum(['professional', 'business']),
  displayName: z.string().min(1).max(255),
  phone: z.string().max(50),
  bio: z.string().max(1000).optional(),
  location: z.string().max(255),
  avatarUrl: z.string().url().optional(),
});

// Validation schema for user registration
// Name and password are optional to support OAuth flows where:
// - Name can be extracted from Firebase token (displayName)
// - Password is not required for OAuth providers
const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  password: z.union([
    z.string().min(8),
    z.literal(''),
  ]).optional(),
});

// Register new user (creates user and sends welcome email)
router.post('/register', asyncHandler(async (req, res) => {
  try {
    const validationResult = RegisterSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ 
        message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
      });
      return;
    }

    let { email, name } = validationResult.data;

    // Ensure email is defined (should always be due to schema validation)
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // If name is not provided, try to extract it from Firebase token (OAuth flow)
    if (!name) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split('Bearer ')[1];
          if (auth) {
            const decodedToken = await auth.verifyIdToken(token);
            // Extract name from token (displayName or name field)
            name = decodedToken.name || decodedToken.display_name || decodedToken.email?.split('@')[0] || 'User';
          }
        } catch (tokenError: any) {
          // If token verification fails, we'll use email as fallback
          console.warn('[REGISTER] Token verification failed, using email as name:', tokenError?.message);
          name = email.split('@')[0];
        }
      } else {
        // No token and no name provided - use email prefix as fallback
        name = email.split('@')[0];
      }
    }

    // Ensure name is always a string (fallback to email prefix if somehow still undefined)
    const finalName = name || email.split('@')[0];

    // Check if user already exists
    const existingUser = await usersRepo.getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    // Create user
    const newUser = await usersRepo.createUser({
      email,
      name: finalName,
      role: 'professional',
    });

    if (!newUser) {
      res.status(500).json({ message: 'Failed to create user' });
      return;
    }

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(email, finalName).catch(error => {
      console.error('Failed to send welcome email:', error);
      // Don't fail the request if email fails
    });

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });
  } catch (error: any) {
    console.error('[REGISTER ERROR]', error);
    console.error('[REGISTER ERROR] Stack:', error?.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}));

// Get current user profile
router.get('/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
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
      isOnboarded: user.isOnboarded ?? false,
    });
  } catch (error: any) {
    console.error('[ME ERROR]', error);
    console.error('[ME ERROR] Stack:', error?.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
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

// Complete onboarding
router.post('/onboarding/complete', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = OnboardingCompleteSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const { role, displayName, bio, phone, location, avatarUrl } = validationResult.data;

  // Prepare update object
  const updates: any = {
    name: displayName,
    role: role === 'professional' ? 'professional' : 'business',
    bio: bio || null,
    phone: phone,
    location: location,
    isOnboarded: true,
  };
  // Note: avatarUrl might need to be stored in a separate field or handled differently
  // For now, we'll skip it as it's not in the schema

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
    uid: req.user.uid,
    isOnboarded: updatedUser.isOnboarded ?? false,
  });
}));

// Validation schema for role update
const UpdateRoleSchema = z.object({
  role: z.string(),
  shopName: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

// Update user role (e.g. for Shop Onboarding)
router.post('/role', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = UpdateRoleSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    });
    return;
  }

  const { role, shopName, location, description } = validationResult.data;
  const updates: any = {};

  if (role === 'hub') {
    updates.role = 'business'; // Map 'hub' to 'business'
    if (shopName) updates.name = shopName;
    if (location) updates.location = location;
    if (description) updates.bio = description;
    updates.isOnboarded = true;
  } else {
     // Allow other role updates if valid enum
     const validRoles = ['professional', 'business', 'brand', 'trainer'];
     if (validRoles.includes(role)) {
        updates.role = role;
        if (shopName) updates.name = shopName;
        if (location) updates.location = location;
        if (description) updates.bio = description;
     } else {
        res.status(400).json({ message: 'Invalid role for this endpoint' });
        return;
     }
  }

  const updatedUser = await usersRepo.updateUser(req.user.id, updates);
  
  if (!updatedUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

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
    uid: req.user.uid,
    isOnboarded: updatedUser.isOnboarded ?? false,
  });
}));

export default router;
