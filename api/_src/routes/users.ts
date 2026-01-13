import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as profilesRepo from '../repositories/profiles.repository.js';
import * as emailService from '../services/email.service.js';
import * as proVerificationService from '../services/pro-verification.service.js';
import { auth } from '../config/firebase.js';
import { isDatabaseComputeQuotaExceededError } from '../utils/dbErrors.js';
import { z } from 'zod';
import { uploadProfileImages } from '../middleware/upload.js';
import admin from 'firebase-admin';

const router = Router();

// Validation schema for profile updates
const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(255).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  // HospoGo compliance + preferences
  rsaNumber: z.string().max(100).optional(),
  rsaExpiry: z.string().optional(), // expected YYYY-MM-DD (stored as date)
  rsaStateOfIssue: z.string().max(10).optional(),
  rsaCertificateUrl: z.string().url().optional(),
  rsaNotRequired: z.boolean().optional(), // User doesn't need RSA (e.g., kitchen staff, non-alcohol venues)
  hospitalityRole: z.enum(['Bartender', 'Waitstaff', 'Barista', 'Kitchen Hand', 'Manager']).optional(),
  hourlyRatePreference: z.union([
    z.number().nonnegative(),
    z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'hourlyRatePreference must be a non-negative number'),
  ]).optional(),
  businessSettings: z.object({
    openingHours: z.record(z.string(), z.object({
      open: z.string(),
      close: z.string(),
      enabled: z.boolean(),
    }).passthrough()), // Use passthrough to allow extra fields
    shiftSplitType: z.enum(['halves', 'thirds', 'custom', 'full-day']),
    customShiftLength: z.number().optional(),
  }).passthrough().optional(), // Use passthrough to allow extra fields
});

// Validation schema for onboarding completion
// Accepts both canonical roles and clean-break aliases:
// - 'staff' / 'worker' → maps to 'professional'
// - 'venue' / 'hub' → maps to 'business' (hub is stored as-is in roles array)
const OnboardingCompleteSchema = z.object({
  role: z.enum(['professional', 'business', 'trainer', 'brand', 'hub', 'staff', 'worker', 'venue']),
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
// Role is optional and defaults to 'professional' if not provided
const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  password: z.union([
    z.string().min(8),
    z.literal(''),
  ]).optional(),
  role: z.enum(['professional', 'business', 'admin', 'trainer', 'hub', 'brand']).optional(),
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

    const { email, password, role } = validationResult.data;
    let { name } = validationResult.data;

    // E2E Test Hook - If running in E2E mode, check for special test emails
    // This allows tests to "register" without needing a real backend cleanup
    if (email.startsWith('e2e_test_')) {
       // Check if user exists, if so, return success (idempotency for tests)
       const existingUser = await usersRepo.getUserByEmail(email);
       if (existingUser) {
          res.status(201).json({
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role,
          });
          return;
       }
    }

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

    // Check if user already exists - if so, treat as login and return existing profile
    // This prevents 409 Conflict errors from breaking frontend redirect flow (OAuth flows)
    const existingUser = await usersRepo.getUserByEmail(email);
    if (existingUser) {
      console.log('[REGISTER] User already exists, returning existing profile for:', email);
      res.status(200).json({
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        isOnboarded: existingUser.isOnboarded ?? false,
      });
      return;
    }

    // Create user
    // Map frontend role 'brand' to database role 'business' if needed
    const dbRole = role === 'brand' ? 'business' : (role || 'professional');
    
    let newUser;
    try {
      newUser = await usersRepo.createUser({
        email,
        name: finalName,
        role: dbRole as 'professional' | 'business' | 'admin' | 'trainer' | 'hub',
      });
    } catch (dbError: any) {
      if (isDatabaseComputeQuotaExceededError(dbError)) {
        res.status(503).json({
          message: 'Service temporarily unavailable: database compute quota exceeded. Please try again later.',
          code: 'DB_QUOTA_EXCEEDED',
        });
        return;
      }
      console.error('[REGISTER ERROR] Database error creating user:', dbError);
      console.error('[REGISTER ERROR] Database error stack:', dbError?.stack);
      res.status(500).json({ 
        message: 'Failed to create user in database',
        error: dbError?.message || 'Database operation failed',
        details: process.env.NODE_ENV === 'development' ? dbError?.stack : undefined
      });
      return;
    }

    if (!newUser) {
      console.error('[REGISTER ERROR] createUser returned null/undefined');
      res.status(500).json({ 
        message: 'Failed to create user',
        error: 'User creation returned no result'
      });
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

    const profileCompliance = await profilesRepo.getProfileCompliance(req.user.id);

    // Map DB user to frontend User shape
    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.name, // Map name to displayName for frontend consistency
      bio: user.bio,
      phone: user.phone,
      location: user.location,
      avatarUrl: user.avatarUrl || null,
      bannerUrl: user.bannerUrl || null,
      rsaVerified: (user as any).rsaVerified ?? false,
      rsaNotRequired: (user as any).rsaNotRequired ?? false,
      rsaNumber: (user as any).rsaNumber ?? null,
      rsaExpiry: (user as any).rsaExpiry ?? null,
      rsaStateOfIssue: (user as any).rsaStateOfIssue ?? null,
      rsaCertificateUrl: (user as any).rsaCertUrl ?? (user as any).rsaCertificateUrl ?? null,
      profile: profileCompliance,
      hospitalityRole: (user as any).hospitalityRole ?? null,
      hourlyRatePreference: (user as any).hourlyRatePreference
        ? parseFloat((user as any).hourlyRatePreference)
        : null,
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

/**
 * GET /api/me/verification-status
 *
 * Returns the current user's pro verification status
 * Includes: verificationStatus, completedShiftCount, noShowCount, topRatedBadge, etc.
 */
router.get('/me/verification-status', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const status = await proVerificationService.getProVerificationStatus(req.user.id);
  
  if (!status) {
    res.status(404).json({ message: 'Verification status not found' });
    return;
  }

  res.status(200).json(status);
}));

/**
 * GET /api/me/can-work-alcohol-shifts
 *
 * Check if the current user can work alcohol service shifts
 * Returns eligibility status and reasons
 */
router.get('/me/can-work-alcohol-shifts', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const result = await proVerificationService.canWorkAlcoholServiceShift(req.user.id);
  res.status(200).json(result);
}));

/**
 * GET /api/professionals
 *
 * Returns a lightweight list of professionals for business scheduling/invites.
 * Auth is required to avoid public scraping.
 *
 * Query Parameters:
 * - search: optional free-text search (name/email)
 * - rsaRequired: if true, only returns professionals with RSA certificates
 * - prioritized: if true, sorts by rating and reliability (4.8+ rating, zero no-shows)
 * - limit: max results (default 100, max 200)
 * - offset: pagination offset (default 0)
 */
router.get('/professionals', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const rsaRequired = req.query.rsaRequired === 'true';
  const prioritized = req.query.prioritized === 'true';
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 100;
  const offsetRaw = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  // Use prioritized search if requested (for venues looking to fill shifts)
  if (prioritized) {
    const result = await proVerificationService.searchProsWithPrioritization({
      search: search.length > 0 ? search : undefined,
      rsaRequired,
      limit,
      offset,
    });

    res.status(200).json(result);
    return;
  }

  // Standard search (backwards compatible)
  const result = await usersRepo.listProfessionals({
    search: search.length > 0 ? search : undefined,
    limit,
    offset,
  });

  res.status(200).json(result);
}));

// Update current user profile
router.put('/me', authenticateUser, uploadProfileImages, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Check for uploaded files (FormData)
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  
  // Log incoming request for debugging
  console.log('[PUT /api/me] Update request:', {
    userId: req.user.id,
    hasFiles: !!files,
    fileFields: files ? Object.keys(files) : [],
    hasAvatarUrl: !!req.body.avatarUrl,
    hasBannerUrl: !!req.body.bannerUrl,
    hasLogo: !!(files && files.logo),
    hasBanner: !!(files && files.banner),
    hasAvatar: !!(files && files.avatar),
    hasGovernmentId: !!(files && (files as any).governmentId),
    avatarUrl: req.body.avatarUrl ? req.body.avatarUrl.substring(0, 50) + '...' : undefined,
    bannerUrl: req.body.bannerUrl ? req.body.bannerUrl.substring(0, 50) + '...' : undefined,
  });

  // Process uploaded files (FormData) - upload to Firebase Storage if present
  let processedAvatarUrl: string | undefined = undefined;
  let processedBannerUrl: string | undefined = undefined;
  let processedRsaCertificateUrl: string | undefined = undefined;
  let processedGovernmentIdUrl: string | undefined = undefined;

  if (files) {
    console.log('[PUT /api/me] Files received:', {
      logo: files.logo ? files.logo[0]?.originalname : undefined,
      banner: files.banner ? files.banner[0]?.originalname : undefined,
      avatar: files.avatar ? files.avatar[0]?.originalname : undefined,
      rsaCertificate: files.rsaCertificate ? files.rsaCertificate[0]?.originalname : undefined,
      governmentId: files.governmentId ? files.governmentId[0]?.originalname : undefined,
    });

    try {
      // Get Firebase Storage bucket
      const firebaseAdmin = (admin as any).default || admin;
      // Keep Firebase Admin app naming consistent with lazy init in `api/_src/config/firebase.ts`
      // to avoid "Firebase app not initialized" errors when accessing Storage.
      const appName = process.env.FIREBASE_ADMIN_APP_NAME || 'hospogo-worker-v2';
      let app: admin.app.App;
      try {
        app = firebaseAdmin.app(appName);
      } catch (e) {
        throw new Error('Firebase app not initialized');
      }
      const bucket = firebaseAdmin.storage(app).bucket();

      // Process logo/avatar file
      const logoFile = files.logo?.[0] || files.avatar?.[0];
      if (logoFile) {
        const fileExtension = logoFile.originalname.split('.').pop() || 'jpg';
        const fileName = `users/${req.user.uid}/avatar.${fileExtension}`;
        const file = bucket.file(fileName);

        // Upload file buffer to Firebase Storage
        await file.save(logoFile.buffer, {
          metadata: {
            contentType: logoFile.mimetype,
          },
        });

        // Make file publicly accessible
        await file.makePublic();

        // Get public URL
        processedAvatarUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log('[PUT /api/me] Uploaded avatar/logo to Firebase Storage:', processedAvatarUrl.substring(0, 50) + '...');
      }

      // Process banner file
      const bannerFile = files.banner?.[0];
      if (bannerFile) {
        const fileExtension = bannerFile.originalname.split('.').pop() || 'jpg';
        const fileName = `users/${req.user.uid}/banner.${fileExtension}`;
        const file = bucket.file(fileName);

        // Upload file buffer to Firebase Storage
        await file.save(bannerFile.buffer, {
          metadata: {
            contentType: bannerFile.mimetype,
          },
        });

        // Make file publicly accessible
        await file.makePublic();

        // Get public URL
        processedBannerUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log('[PUT /api/me] Uploaded banner to Firebase Storage:', processedBannerUrl.substring(0, 50) + '...');
      }

      // Process RSA certificate file (PDF or image)
      const rsaFile = files.rsaCertificate?.[0];
      if (rsaFile) {
        const isPdf = rsaFile.mimetype === 'application/pdf';
        const fileExtension = isPdf
          ? 'pdf'
          : (rsaFile.originalname.split('.').pop() || 'jpg');
        const fileName = `users/${req.user.uid}/rsa-certificate.${fileExtension}`;
        const file = bucket.file(fileName);

        await file.save(rsaFile.buffer, {
          metadata: {
            contentType: rsaFile.mimetype,
          },
        });

        await file.makePublic();

        processedRsaCertificateUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log('[PUT /api/me] Uploaded RSA certificate to Firebase Storage:', processedRsaCertificateUrl.substring(0, 50) + '...');
      }

      // Process Government ID file (PDF or image)
      const governmentIdFile = files.governmentId?.[0];
      if (governmentIdFile) {
        const isPdf = governmentIdFile.mimetype === 'application/pdf';
        const fileExtension = isPdf
          ? 'pdf'
          : (governmentIdFile.originalname.split('.').pop() || 'jpg');
        const fileName = `users/${req.user.uid}/government-id.${fileExtension}`;
        const file = bucket.file(fileName);

        await file.save(governmentIdFile.buffer, {
          metadata: {
            contentType: governmentIdFile.mimetype,
          },
        });

        await file.makePublic();

        processedGovernmentIdUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log('[PUT /api/me] Uploaded Government ID to Firebase Storage:', processedGovernmentIdUrl.substring(0, 50) + '...');
      }
    } catch (error: any) {
      console.error('[PUT /api/me] Error uploading files to Firebase Storage:', error);
      res.status(500).json({ 
        message: 'Failed to upload files: ' + (error.message || 'Unknown error')
      });
      return;
    }
  }

  // Parse request body - handle both JSON and FormData
  let requestBody = req.body;
  
  // If businessSettings is a string (from FormData), parse it
  if (requestBody.businessSettings && typeof requestBody.businessSettings === 'string') {
    try {
      requestBody = {
        ...requestBody,
        businessSettings: JSON.parse(requestBody.businessSettings),
      };
    } catch (error) {
      console.error('[PUT /api/me] Failed to parse businessSettings string:', error);
      res.status(400).json({ 
        message: 'Invalid businessSettings format: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      return;
    }
  }

  // Validate request body (files are handled separately, body contains other fields)
  // If files were uploaded, we'll use those URLs instead of body URLs
  const validationResult = UpdateProfileSchema.safeParse(requestBody);
  if (!validationResult.success) {
    console.error('[PUT /api/me] Validation error:', validationResult.error.errors);
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const {
    displayName,
    bio,
    phone,
    location,
    avatarUrl,
    bannerUrl,
    rsaNumber,
    rsaExpiry,
    rsaStateOfIssue,
    rsaCertificateUrl,
    rsaNotRequired,
    hospitalityRole,
    hourlyRatePreference,
    businessSettings,
  } = validationResult.data;

  // Prepare update object
  const updates: any = {};
  if (displayName !== undefined) updates.name = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (phone !== undefined) updates.phone = phone;
  if (location !== undefined) updates.location = location;
  if (rsaNumber !== undefined) updates.rsaNumber = rsaNumber;
  if (rsaExpiry !== undefined) updates.rsaExpiry = rsaExpiry;
  if (rsaStateOfIssue !== undefined) updates.rsaStateOfIssue = rsaStateOfIssue;
  if (rsaNotRequired !== undefined) updates.rsaNotRequired = rsaNotRequired;
  if (hospitalityRole !== undefined) updates.hospitalityRole = hospitalityRole;
  if (hourlyRatePreference !== undefined) updates.hourlyRatePreference = String(hourlyRatePreference);
  if (businessSettings !== undefined) {
    // Store businessSettings as JSON in the database
    // Note: This assumes the database column exists or can be added
    // For now, we'll store it as a JSON string in a text field or JSON column
    updates.businessSettings = JSON.stringify(businessSettings);
  }
  
  // Helper to validate URL is non-empty and looks like a valid URL
  // This prevents accidental overwrites with empty/null values (the "disappearing data" bug)
  const isValidUrl = (url: unknown): url is string => {
    if (typeof url !== 'string' || url.trim() === '') return false;
    // Basic URL format check - must start with http/https
    return url.startsWith('http://') || url.startsWith('https://');
  };
  
  // Use processed file URLs if available, otherwise use URLs from body
  // CRITICAL: Only update URL fields if the new value is a valid non-empty URL
  // This prevents accidental overwrites when forms send stale/empty values
  if (processedAvatarUrl !== undefined && isValidUrl(processedAvatarUrl)) {
    updates.avatarUrl = processedAvatarUrl;
    console.log('[PUT /api/me] Updating avatarUrl from uploaded file:', processedAvatarUrl.substring(0, 50) + '...');
  } else if (avatarUrl !== undefined && isValidUrl(avatarUrl)) {
    updates.avatarUrl = avatarUrl;
    console.log('[PUT /api/me] Updating avatarUrl from body:', avatarUrl.substring(0, 50) + '...');
  } else if (avatarUrl !== undefined) {
    // Received invalid/empty avatarUrl - intentionally NOT updating to prevent data loss
    console.log('[PUT /api/me] Skipping avatarUrl update - received invalid/empty value:', avatarUrl);
  }
  
  if (processedBannerUrl !== undefined && isValidUrl(processedBannerUrl)) {
    updates.bannerUrl = processedBannerUrl;
    console.log('[PUT /api/me] Updating bannerUrl from uploaded file:', processedBannerUrl.substring(0, 50) + '...');
  } else if (bannerUrl !== undefined && isValidUrl(bannerUrl)) {
    updates.bannerUrl = bannerUrl;
    console.log('[PUT /api/me] Updating bannerUrl from body:', bannerUrl.substring(0, 50) + '...');
  } else if (bannerUrl !== undefined) {
    // Received invalid/empty bannerUrl - intentionally NOT updating to prevent data loss
    console.log('[PUT /api/me] Skipping bannerUrl update - received invalid/empty value:', bannerUrl);
  }

  if (processedRsaCertificateUrl !== undefined && isValidUrl(processedRsaCertificateUrl)) {
    updates.rsaCertUrl = processedRsaCertificateUrl;
    updates.rsaCertificateUrl = processedRsaCertificateUrl;
    console.log('[PUT /api/me] Updating rsaCertificateUrl from uploaded file:', processedRsaCertificateUrl.substring(0, 50) + '...');
  } else if (rsaCertificateUrl !== undefined && isValidUrl(rsaCertificateUrl)) {
    updates.rsaCertUrl = rsaCertificateUrl;
    updates.rsaCertificateUrl = rsaCertificateUrl;
    console.log('[PUT /api/me] Updating rsaCertificateUrl from body:', rsaCertificateUrl.substring(0, 50) + '...');
  } else if (rsaCertificateUrl !== undefined) {
    console.log('[PUT /api/me] Skipping rsaCertificateUrl update - received invalid/empty value:', rsaCertificateUrl);
  }

  // Update user in database
  let updatedUser;
  try {
    updatedUser = await usersRepo.updateUser(req.user.id, updates);
  } catch (dbError: any) {
    // Detailed error logging for database write failures
    console.error('[PUT /api/me] Database write failed:', {
      userId: req.user.id,
      error: dbError?.message || dbError,
      errorCode: dbError?.code,
      errorName: dbError?.name,
      updates: Object.keys(updates),
      // Check for common database errors
      isUniqueConstraint: dbError?.code === '23505' || dbError?.message?.includes('unique constraint'),
      isNullConstraint: dbError?.code === '23502' || dbError?.message?.includes('null constraint'),
      isForeignKeyConstraint: dbError?.code === '23503' || dbError?.message?.includes('foreign key'),
      stack: dbError?.stack
    });
    
    // Return appropriate error response
    if (dbError?.code === '23505' || dbError?.message?.includes('unique constraint')) {
      res.status(409).json({ 
        message: 'A record with this information already exists. Please check your input.',
        error: 'UNIQUE_CONSTRAINT_VIOLATION'
      });
      return;
    }
    if (dbError?.code === '23502' || dbError?.message?.includes('null constraint')) {
      res.status(400).json({ 
        message: 'Required field is missing. Please check all required fields are filled.',
        error: 'NULL_CONSTRAINT_VIOLATION'
      });
      return;
    }
    
    // Generic database error
    res.status(500).json({ 
      message: 'Failed to update profile. Please try again.',
      error: 'DATABASE_ERROR'
    });
    return;
  }

  if (!updatedUser) {
    console.error('[PUT /api/me] User not found after update attempt:', {
      userId: req.user.id,
      updates: Object.keys(updates)
    });
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Also upsert RSA compliance fields into the profiles table (canonical compliance store).
  // Note: rsa_verified is intentionally NOT writable by the user.
  try {
    const profileUpdates: {
      rsa_verified?: boolean;
      rsa_expiry?: string;
      rsa_state_of_issue?: string;
      rsa_cert_url?: string;
      id_document_url?: string;
    } = {};
    if (rsaExpiry !== undefined) profileUpdates.rsa_expiry = rsaExpiry;
    if (rsaStateOfIssue !== undefined) profileUpdates.rsa_state_of_issue = rsaStateOfIssue;
    if (processedRsaCertificateUrl !== undefined && isValidUrl(processedRsaCertificateUrl)) {
      profileUpdates.rsa_cert_url = processedRsaCertificateUrl;
    } else if (rsaCertificateUrl !== undefined && isValidUrl(rsaCertificateUrl)) {
      profileUpdates.rsa_cert_url = rsaCertificateUrl;
    }
    if (processedGovernmentIdUrl !== undefined && isValidUrl(processedGovernmentIdUrl)) {
      profileUpdates.id_document_url = processedGovernmentIdUrl;
    }
    if (Object.keys(profileUpdates).length > 0) {
      await profilesRepo.upsertProfileCompliance(req.user.id, profileUpdates);
    }
  } catch (error) {
    console.warn('[PUT /api/me] Failed to upsert profile compliance fields:', error);
  }

  const profileCompliance = await profilesRepo.getProfileCompliance(req.user.id);

  console.log('[PUT /api/me] Update successful:', {
    userId: updatedUser.id,
    avatarUrl: updatedUser.avatarUrl ? updatedUser.avatarUrl.substring(0, 50) + '...' : null,
    bannerUrl: updatedUser.bannerUrl ? updatedUser.bannerUrl.substring(0, 50) + '...' : null,
  });

  // Parse businessSettings if it exists
  let businessSettingsParsed = null;
  if ((updatedUser as any).businessSettings) {
    try {
      businessSettingsParsed = typeof (updatedUser as any).businessSettings === 'string'
        ? JSON.parse((updatedUser as any).businessSettings)
        : (updatedUser as any).businessSettings;
    } catch (error) {
      console.error('[PUT /api/me] Failed to parse businessSettings:', error);
    }
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
    avatarUrl: updatedUser.avatarUrl || null,
    bannerUrl: updatedUser.bannerUrl || null,
    rsaVerified: (updatedUser as any).rsaVerified ?? false,
    rsaNotRequired: (updatedUser as any).rsaNotRequired ?? false,
    rsaNumber: (updatedUser as any).rsaNumber ?? null,
    rsaExpiry: (updatedUser as any).rsaExpiry ?? null,
    rsaStateOfIssue: (updatedUser as any).rsaStateOfIssue ?? null,
    rsaCertificateUrl: (updatedUser as any).rsaCertUrl ?? (updatedUser as any).rsaCertificateUrl ?? null,
    profile: profileCompliance,
    hospitalityRole: (updatedUser as any).hospitalityRole ?? null,
    hourlyRatePreference: (updatedUser as any).hourlyRatePreference
      ? parseFloat((updatedUser as any).hourlyRatePreference)
      : null,
    roles: updatedUser.roles || [updatedUser.role], // Use roles from DB
    currentRole: updatedUser.role,
    uid: req.user.uid,
    businessSettings: businessSettingsParsed,
  });
}));

// Complete onboarding
router.post('/onboarding/complete', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    console.warn('[POST /onboarding/complete] Unauthorized - no user');
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

  // Map frontend roles to backend database roles (clean break migration)
  // Clean-break aliases:
  // - 'staff' / 'worker' → 'professional' in DB
  // - 'venue' → 'business' in DB  
  // - 'hub' stays as 'hub' in DB
  // Legacy aliases:
  // - 'brand' → 'business' in DB
  // - 'trainer' stays as 'trainer'
  let dbRole: string;
  switch (role) {
    case 'staff':
    case 'worker':
      dbRole = 'professional';
      break;
    case 'venue':
      dbRole = 'business';
      break;
    case 'brand':
      dbRole = 'business';
      break;
    case 'hub':
    case 'trainer':
    case 'professional':
    case 'business':
    default:
      dbRole = role;
  }

  // Fetch current user to get existing roles
  const currentUser = await usersRepo.getUserById(req.user.id);
  const existingRoles = currentUser?.roles || [];
  
  // Add the role to the roles array if not already present
  // Store the frontend role name (e.g., 'brand') in the roles array
  const rolesToStore = Array.from(new Set([...existingRoles, role]));

  // Prepare update object
  const updates: any = {
    name: displayName,
    role: dbRole, // Database role (business for brand, trainer for trainer, etc.)
    roles: rolesToStore, // Frontend roles array
    bio: bio || null,
    phone: phone,
    location: location,
    isOnboarded: true,
  };
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  // Update user in database
  const updatedUser = await usersRepo.updateUser(req.user.id, updates);

  if (!updatedUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

    // Return updated user object
    // Map database role back to frontend role for currentRole if needed
    const frontendCurrentRole = role; // Use the original frontend role (brand, trainer, etc.)
    
    res.status(200).json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      displayName: updatedUser.name,
      bio: updatedUser.bio,
      phone: updatedUser.phone,
      location: updatedUser.location,
      avatarUrl: updatedUser.avatarUrl || null,
      bannerUrl: updatedUser.bannerUrl || null,
      roles: updatedUser.roles || [role], // Use roles from DB (includes frontend role names)
      currentRole: frontendCurrentRole, // Return the frontend role name
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

  // Fetch current user to get existing roles
  const currentUser = await usersRepo.getUserById(req.user.id);
  if (!currentUser) {
    console.error('[PATCH /users/:id/roles] User not found:', req.user.id);
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const existingRoles = currentUser.roles || [];

  let updatedRoles: string[];
  
  if (action === 'add') {
    // Add role if not already present
    if (!existingRoles.includes(dbRole)) {
      updatedRoles = [...existingRoles, dbRole];
    } else {
      updatedRoles = existingRoles;
    }
  } else {
    // Remove role if present
    updatedRoles = existingRoles.filter(r => r !== dbRole);
    
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

  const updatedUser = await usersRepo.updateUser(req.user.id, updates);
  
  if (!updatedUser) {
    console.error('[PATCH /users/:id/roles] Failed to update user');
    res.status(500).json({ message: 'Failed to update user roles' });
    return;
  }

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

// Get public user profile by ID
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await usersRepo.getUserById(id);
  
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Return public profile data
  res.status(200).json({
    id: user.id,
    name: user.name,
    displayName: user.name,
    role: user.role,
    bio: user.bio,
    location: user.location,
    avatarUrl: user.avatarUrl || null,
    bannerUrl: user.bannerUrl || null,
    averageRating: user.averageRating ? parseFloat(user.averageRating) : null,
    reviewCount: user.reviewCount ? parseInt(user.reviewCount, 10) : 0,
    joinedDate: user.createdAt.toISOString(),
    verified: user.isOnboarded,
  });
}));

// Get current user's reputation stats (for professionals)
router.get('/me/reputation', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = req.user.id;
  
  // Import reputation service dynamically to avoid circular deps
  const reputationService = await import('../lib/reputation-service.js');
  
  const stats = await reputationService.getUserReputationStats(userId);
  
  if (!stats) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.status(200).json({
    strikes: stats.strikes,
    reliabilityScore: stats.reliabilityScore,
    reliabilityLabel: stats.reliabilityLabel,
    shiftsSinceLastStrike: stats.shiftsSinceLastStrike,
    shiftsUntilStrikeRemoval: stats.shiftsUntilStrikeRemoval,
    recoveryProgress: stats.recoveryProgress,
    suspendedUntil: stats.suspendedUntil?.toISOString() || null,
    isSuspended: stats.isSuspended,
    completedShiftCount: stats.completedShiftCount,
    noShowCount: stats.noShowCount,
  });
}));

export default router;
