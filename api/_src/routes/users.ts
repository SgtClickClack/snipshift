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
      roles: user.roles || [user.role], // Use roles from DB
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
      roles: updatedUser.roles || [updatedUser.role], // Use roles from DB
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
      roles: updatedUser.roles || [updatedUser.role], // Use roles from DB
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
router.post('/users/role', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
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
  
  console.log('[POST /users/role] Updating role:', { role, shopName, location, description });

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

  console.log('[POST /users/role] Update payload:', updates);

  // Fetch current user to get existing roles
  const currentUser = await usersRepo.getUserById(req.user.id);
  if (currentUser) {
    const existingRoles = currentUser.roles || [];
    const newRole = updates.role;
    
    if (newRole && !existingRoles.includes(newRole)) {
      updates.roles = [...existingRoles, newRole];
    }
  }

  const updatedUser = await usersRepo.updateUser(req.user.id, updates);
  
  if (!updatedUser) {
    console.error('[POST /users/role] User not found for update');
    res.status(404).json({ message: 'User not found' });
    return;
  }

  console.log('[POST /users/role] Updated user:', updatedUser);

  res.status(200).json({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    displayName: updatedUser.name,
    bio: updatedUser.bio,
    phone: updatedUser.phone,
    location: updatedUser.location,
    roles: updatedUser.roles || [updatedUser.role], // Use roles from DB
    currentRole: updatedUser.role,
    uid: req.user.uid,
    isOnboarded: updatedUser.isOnboarded ?? false,
  });
}));

// Update user roles (add or remove roles from the roles array)
router.patch('/users/:id/roles', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    console.error('[PATCH /users/:id/roles] Unauthorized - no user in request');
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (req.params.id !== req.user.id) {
    console.error('[PATCH /users/:id/roles] Forbidden - user ID mismatch', { 
      requestedId: req.params.id, 
      userId: req.user.id 
    });
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const schema = z.object({
    action: z.enum(['add', 'remove']),
    role: z.enum(['professional', 'business', 'admin', 'trainer', 'hub', 'brand']),
  });

  const validationResult = schema.safeParse(req.body);
  if (!validationResult.success) {
    console.error('[PATCH /users/:id/roles] Validation error:', validationResult.error.errors);
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    });
    return;
  }

  const { action, role } = validationResult.data;
  
  // Map 'hub' to 'business' for database storage
  const dbRole = role === 'hub' ? 'business' : role;

  console.log('[PATCH /users/:id/roles] Processing role update:', { 
    userId: req.user.id, 
    action, 
    role, 
    dbRole 
  });

  // Fetch current user to get existing roles
  const currentUser = await usersRepo.getUserById(req.user.id);
  if (!currentUser) {
    console.error('[PATCH /users/:id/roles] User not found:', req.user.id);
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const existingRoles = currentUser.roles || [];
  console.log('[PATCH /users/:id/roles] Current roles:', existingRoles);

  let updatedRoles: string[];
  
  if (action === 'add') {
    // Add role if not already present
    if (!existingRoles.includes(dbRole)) {
      updatedRoles = [...existingRoles, dbRole];
      console.log('[PATCH /users/:id/roles] Adding role. New roles:', updatedRoles);
    } else {
      console.log('[PATCH /users/:id/roles] Role already exists, no change needed');
      updatedRoles = existingRoles;
    }
  } else {
    // Remove role if present
    updatedRoles = existingRoles.filter(r => r !== dbRole);
    console.log('[PATCH /users/:id/roles] Removing role. New roles:', updatedRoles);
    
    // Ensure user always has at least one role
    if (updatedRoles.length === 0) {
      console.error('[PATCH /users/:id/roles] Cannot remove last role');
      res.status(400).json({ message: 'Cannot remove the last role' });
      return;
    }
  }

  // Update user with new roles array
  const updates: any = { roles: updatedRoles };
  
  // If adding the first role or if this is the primary role, also update the main role field
  if (action === 'add' && (!currentUser.role || currentUser.role === 'professional')) {
    updates.role = dbRole;
  }

  console.log('[PATCH /users/:id/roles] Updating user with:', updates);

  const updatedUser = await usersRepo.updateUser(req.user.id, updates);
  
  if (!updatedUser) {
    console.error('[PATCH /users/:id/roles] Failed to update user');
    res.status(500).json({ message: 'Failed to update user roles' });
    return;
  }

  console.log('[PATCH /users/:id/roles] Successfully updated user roles:', updatedUser.roles);

  res.status(200).json({
    id: updatedUser.id,
    roles: updatedUser.roles || [updatedUser.role],
    currentRole: updatedUser.role,
  });
}));

// Update current role (for role switching)
router.patch('/users/:id/current-role', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (req.params.id !== req.user.id) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const schema = z.object({
    role: z.enum(['professional', 'business', 'admin', 'trainer']),
  });

  const validationResult = schema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Invalid role' });
    return;
  }

  const { role } = validationResult.data;

  // Since DB is single-role, "switching" role actually updates the DB role
  // TODO: In the future, this should only toggle the session view if multiple roles are supported in DB
  // Note: We don't update 'roles' here, as switching views doesn't grant new roles
  const updatedUser = await usersRepo.updateUser(req.user.id, { role });

  if (!updatedUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.status(200).json({
    id: updatedUser.id,
    role: updatedUser.role,
    currentRole: updatedUser.role
  });
}));

export default router;
