/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID Tokens and attaches the user to the request.
 */

import { Request, Response, NextFunction } from 'express';
import * as usersRepo from '../repositories/users.repository.js';
import { auth } from '../config/firebase.js';
import { isDatabaseComputeQuotaExceededError } from '../utils/dbErrors.js';

/**
 * Express request with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'professional' | 'business' | 'admin' | 'trainer' | 'hub';
    uid: string; // Firebase UID
  };
}

/**
 * Admin authorization middleware
 * Checks if user has admin role or is in the admin email list
 * MUST be used after authenticateUser middleware
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: Authentication required' });
    return;
  }

  // Check if user has admin role
  const isAdminRole = req.user.role === 'admin';

  // Check if user email is in admin email list (from env)
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const isAdminEmail = adminEmails.includes(req.user.email);

  if (!isAdminRole && !isAdminEmail) {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
    return;
  }

  next();
}

/**
 * Super Admin authorization middleware (alias for requireAdmin)
 * For platform owner access - ensures only admin role can access
 * MUST be used after authenticateUser middleware
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Use the same logic as requireAdmin
  requireAdmin(req, res, next);
}

/**
 * Authentication middleware that verifies the user via Firebase Auth
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Log when auth middleware is called
  if (req.path.startsWith('/api/')) {
    console.log(`[AUTH] authenticateUser called for ${req.method} ${req.path}`, {
      hasAuthHeader: !!req.headers.authorization,
      authHeaderPrefix: req.headers.authorization?.substring(0, 20),
    });
  }

  try {
    // Check if auth service is available
    const firebaseAuth = auth;
    if (!firebaseAuth) {
      console.error('[AUTH] Firebase auth service is not initialized');
      console.error('[AUTH] Check environment variables: FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      res.status(500).json({ 
        message: 'Internal Server Error: Auth service unavailable',
        error: 'Firebase Admin not initialized',
        details: 'The server failed to initialize the authentication service. Please check server logs for configuration errors.'
      });
      return;
    }

    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (req.query.token && typeof req.query.token === 'string') {
      // Allow token in query param for SSE/WebSockets where headers are hard to set
      token = req.query.token;
    }

    // Bypass for E2E Testing - Only allow in test environment for security
    // This prevents production exploitation while maintaining E2E test reliability
    if (token === 'mock-test-token' && process.env.NODE_ENV === 'test') {
      const mockUserId = '00000000-0000-0000-0000-000000000001';
      const mockEmail = 'test@snipshift.com';
      
      // Ensure the user exists in the database with the specific ID
      Promise.resolve().then(async () => {
        try {
          // First check if user exists by ID
          let user = await usersRepo.getUserById(mockUserId);
          
          if (!user) {
            // Check if user exists by email (might have different ID)
            const userByEmail = await usersRepo.getUserByEmail(mockEmail);
            
            if (userByEmail) {
              // User exists but with different ID - try to update it to use the expected ID
              // First, check if the expected ID is available (not used by another user)
              const userWithExpectedId = await usersRepo.getUserById(mockUserId);
              
              if (!userWithExpectedId) {
                // Expected ID is free, but user exists with different ID
                // For E2E tests, we'll use the existing user's ID to avoid conflicts
                user = userByEmail;
                console.log(`[AUTH E2E] Using existing user with ID: ${user.id} (test will use this ID)`);
              } else {
                // Expected ID is taken by another user, use existing user
                user = userByEmail;
                console.log(`[AUTH E2E] Using existing user with ID: ${user.id}`);
              }
            } else {
              // Create the user with the specific ID using direct database insert
              const { getDb } = await import('../db/index.js');
              const { users } = await import('../db/schema.js');
              const db = getDb();
              
              if (db) {
                try {
                  const [newUser] = await db
                    .insert(users)
                    .values({
                      id: mockUserId,
                      email: mockEmail,
                      name: 'Test User',
                      role: 'professional',
                      roles: ['professional'],
                    })
                    .returning();
                  
                  user = newUser;
                  console.log(`[AUTH E2E] Created test user in database: ${user.id}`);
                } catch (insertError: any) {
                  // If insert fails (e.g., duplicate), try to get the user again
                  if (insertError?.code === '23505') { // Unique violation
                    user = await usersRepo.getUserByEmail(mockEmail);
                    if (user) {
                      console.log(`[AUTH E2E] User already exists: ${user.id}`);
                    }
                  } else {
                    throw insertError;
                  }
                }
              } else {
                console.warn('[AUTH E2E] Database not available, using mock user');
              }
            }
          }
          
          // Set user on request
          req.user = {
            id: user?.id || mockUserId,
            email: user?.email || mockEmail,
            name: user?.name || 'Test User',
            role: (user?.role as 'professional' | 'business' | 'admin' | 'trainer' | 'hub') || 'professional',
            uid: 'test-firebase-uid'
          };
          
          next();
        } catch (error: any) {
          console.error('[AUTH E2E] Error ensuring test user exists:', error);
          // Fallback to hardcoded user if database operation fails
          req.user = {
            id: mockUserId,
            email: mockEmail,
            name: 'Test User',
            role: 'professional',
            uid: 'test-firebase-uid'
          };
          next();
        }
      }).catch((error: any) => {
        console.error('[AUTH E2E] Promise rejection:', error);
        // Fallback to hardcoded user
        req.user = {
          id: mockUserId,
          email: mockEmail,
          name: 'Test User',
          role: 'professional',
          uid: 'test-firebase-uid'
        };
        next();
      });
      return;
    }

    // Bypass for E2E Testing - Only allow in test environment for security
    // Allow specific E2E test users to be auto-authenticated
    if (token && token.startsWith('mock-token-e2e_test_') && process.env.NODE_ENV === 'test') {
        const email = token.replace('mock-token-', '');
        console.debug('[AUTH E2E] Attempting auth for email:', email);
        
        usersRepo.getUserByEmail(email).then(user => {
            if (user) {
                console.debug('[AUTH E2E] User found:', user.id);
                req.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role as 'professional' | 'business' | 'admin' | 'trainer' | 'hub',
                    uid: `mock-uid-${user.id}`
                };
                next();
            } else {
                 console.warn('[AUTH E2E] User not found for email:', email);
                 res.status(401).json({ message: 'Unauthorized: E2E User not found' });
            }
        }).catch(err => {
             console.error('[AUTH E2E] Error looking up user:', err);
             res.status(500).json({ message: 'Internal Auth Error' });
        });
        return;
    }

    if (!token) {
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    // Wrap async logic in Promise to handle errors properly
    Promise.resolve().then(async () => {
      try {
        const decodedToken = await firebaseAuth.verifyIdToken(token!);
        const { uid, email } = decodedToken;

        if (!email) {
           res.status(401).json({ message: 'Unauthorized: No email in token' });
           return;
        }

        // Find user in our DB to get role
        let user;
        try {
          user = await usersRepo.getUserByEmail(email);
        } catch (dbError: any) {
          if (isDatabaseComputeQuotaExceededError(dbError)) {
            res.status(503).json({
              message: 'Service temporarily unavailable: database compute quota exceeded. Please try again later.',
              code: 'DB_QUOTA_EXCEEDED',
            });
            return;
          }
          throw dbError;
        }

        if (!user) {
          // Auto-create user if they have valid Firebase token but don't exist in DB
          // This handles race conditions during OAuth sign-up flow where /api/me is called
          // before /api/register completes
          console.log('[AUTH] User not found, auto-creating from Firebase token:', email);
          const displayName = decodedToken.name || decodedToken.display_name || email.split('@')[0];
          try {
            user = await usersRepo.createUser({
              email,
              name: displayName,
              role: 'professional', // Default role for new OAuth users
            });
            console.log('[AUTH] Auto-created user:', user?.id);
          } catch (createError: any) {
            // If creation fails due to race condition (user was just created), try to fetch again
            if (createError?.code === '23505') { // Postgres unique violation
              console.log('[AUTH] Race condition detected, fetching user again');
              user = await usersRepo.getUserByEmail(email);
            } else {
              console.error('[AUTH] Failed to auto-create user:', createError);
              res.status(500).json({ message: 'Failed to create user account' });
              return;
            }
          }
          
          if (!user) {
            res.status(401).json({ message: 'Unauthorized: User not found in database' });
            return;
          }
        }

        // Attach user to request object
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'professional' | 'business' | 'admin' | 'trainer',
          uid: uid
        };

        next();
      } catch (error: any) {
        console.error('[AUTH ERROR] Token verification failed:', error?.message || error);
        console.error('[AUTH ERROR] Stack:', error?.stack);
        res.status(401).json({ 
          message: 'Unauthorized: Invalid token',
          error: error?.message || 'Token verification failed'
        });
      }
    }).catch((error: any) => {
      console.error('[AUTH ERROR] Promise rejection:', error?.message || error);
      console.error('[AUTH ERROR] Stack:', error?.stack);
      res.status(500).json({ 
        message: 'Internal server error during authentication',
        error: error?.message || 'Unknown error'
      });
    });
  } catch (error: any) {
    console.error('[AUTH ERROR] Synchronous error:', error?.message || error);
    console.error('[AUTH ERROR] Stack:', error?.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error?.message || 'Unknown error'
    });
  }
}
