/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID Tokens and attaches the user to the request.
 */

import { Request, Response, NextFunction } from 'express';
import * as usersRepo from '../repositories/users.repository.js';
import { getAuth, getFirebaseInitError } from '../config/firebase.js';
import { isDatabaseComputeQuotaExceededError } from '../utils/dbErrors.js';

/**
 * Express request with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'professional' | 'business' | 'admin' | 'trainer' | 'hub' | 'venue' | 'pending_onboarding';
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
    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      const initError = getFirebaseInitError();
      console.error('[AUTH] Firebase auth service is not initialized', {
        message: initError?.message,
      });
      console.error('[AUTH] Check environment variables: FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      console.error('[AUTH DEBUG] Project ID from env:', process.env.FIREBASE_PROJECT_ID);
      res.status(503).json({ 
        message: 'Authentication service unavailable',
        error: 'Firebase Admin not initialized',
        code: 'auth/init-failed',
      });
      return;
    }

    // Log Firebase Admin initialization status for /api/me debugging
    const isMeEndpoint = req.path === '/api/me';
    if (isMeEndpoint) {
      console.log('[AUTH DEBUG] Firebase Admin initialized successfully', {
        projectId: process.env.FIREBASE_PROJECT_ID,
        hasAuthInstance: !!firebaseAuth,
      });
    }

    let token: string | undefined;
    const authHeader = req.headers.authorization;

    // Harden token extraction with validation
    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        const extractedToken = authHeader.substring(7); // More reliable than split
        if (extractedToken && extractedToken.trim().length > 0) {
          token = extractedToken.trim();
        } else {
          console.warn('[AUTH] Bearer token is empty after extraction', {
            path: req.path,
            headerLength: authHeader.length,
          });
        }
      } else {
        // Log if Authorization header exists but doesn't start with Bearer
        if (isMeEndpoint) {
          console.warn('[AUTH] Authorization header missing Bearer prefix', {
            prefix: authHeader.substring(0, 20),
          });
        }
      }
    } else if (req.query.token && typeof req.query.token === 'string') {
      // Allow token in query param for SSE/WebSockets where headers are hard to set
      token = req.query.token.trim();
    }

    // Bypass for E2E Testing - Only allow in test environment for security
    // This prevents production exploitation while maintaining E2E test reliability
    // Accept any token starting with 'mock-test-' to bypass Firebase verification
    if (token && token.startsWith('mock-test-') && process.env.NODE_ENV === 'test') {
      // Return specific mock user object for E2E tests
      // This bypasses Firebase token verification
      req.user = {
        id: '8eaee523-79a2-4077-8f5b-4b7fd4058ede',
        email: 'test-owner@example.com',
        name: 'Test Owner',
        role: 'business', // 'client' maps to 'business' role
        uid: 'mock-user-owner-123'
      };
      next();
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
                    role: user.role as 'professional' | 'business' | 'admin' | 'trainer' | 'hub' | 'venue',
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
      // Suppress logging for expected 401s (when user is not authenticated)
      // Only log if this is not a common public endpoint that might be called without auth
      const isPublicEndpoint = req.path === '/api/me' || req.path.startsWith('/api/notifications');
      if (!isPublicEndpoint) {
        console.log(`[AUTH] No token provided for ${req.method} ${req.path}`);
      }
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    // Wrap async logic in Promise to handle errors properly
    Promise.resolve().then(async () => {
      try {
        // Log token verification attempt for debugging (always for /api/me)
        const isMeEndpoint = req.path === '/api/me';
        if (isMeEndpoint) {
          console.log('[AUTH] Verifying token for /api/me', {
            hasToken: !!token,
            tokenLength: token?.length,
            tokenPrefix: token ? token.substring(0, 30) + '...' : 'none',
            projectId: process.env.FIREBASE_PROJECT_ID,
            firebaseAuthInitialized: !!firebaseAuth,
          });
        }
        
        // Validate token before verification
        if (!token || token.length === 0) {
          console.error('[AUTH ERROR] Empty or invalid token provided', {
            path: req.path,
            hasAuthHeader: !!req.headers.authorization,
          });
          res.status(401).json({ 
            message: 'Unauthorized: Invalid token format',
            code: 'auth/invalid-token'
          });
          return;
        }
        
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        const firebaseUid = decodedToken.sub || decodedToken.uid;
        const { email } = decodedToken;
        
        // Log successful verification for /api/me (always log for debugging)
        if (isMeEndpoint) {
          console.log('[AUTH] Token verified successfully', {
            uid: firebaseUid,
            email,
            tokenProjectId: decodedToken.project_id || decodedToken.aud,
            envProjectId: process.env.FIREBASE_PROJECT_ID,
            projectIdMatch: (decodedToken.project_id || decodedToken.aud) === process.env.FIREBASE_PROJECT_ID,
          });
        }

        if (!email) {
           res.status(401).json({ message: 'Unauthorized: No email in token' });
           return;
        }

        if (!firebaseUid) {
          res.status(401).json({ message: 'Unauthorized: No UID in token' });
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
              role: 'pending_onboarding',
              firebaseUid,
            });
            console.log('[AUTH] Auto-created user with pending_onboarding role (isOnboarded: false):', user?.id);
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

        if (!user.firebaseUid || user.firebaseUid !== firebaseUid) {
          try {
            const updatedUser = await usersRepo.updateUser(user.id, { firebaseUid });
            if (updatedUser) {
              user = updatedUser;
            }
          } catch (updateError: any) {
            console.warn('[AUTH] Failed to sync firebase UID to user record', {
              userId: user.id,
              firebaseUid,
              error: updateError?.message || updateError,
            });
          }
        }
        }

        // Attach user to request object
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'professional' | 'business' | 'admin' | 'trainer' | 'hub' | 'venue' | 'pending_onboarding',
          uid: firebaseUid
        };

        next();
      } catch (error: any) {
        const errorCode = error?.code || 'unknown';
        const errorMessage = error?.message || 'Token verification failed';
        
        // Suppress detailed logging for expected 401s on public endpoints
        // (e.g., when user is not authenticated and tries to access /api/me)
        const isPublicEndpoint = req.path === '/api/me' || req.path.startsWith('/api/notifications');
        const isExpectedError = errorCode === 'auth/id-token-expired' || 
                                errorCode === 'auth/argument-error' ||
                                errorMessage.includes('Decoding Firebase ID token failed');
        
        // Always log token verification failures for /api/me to help diagnose issues
        // but use different log levels based on whether it's expected
        if (isMeEndpoint) {
          if (isExpectedError) {
            console.log('[AUTH] Token verification failed for /api/me (expected):', {
              code: errorCode,
              message: errorMessage.substring(0, 100),
            });
          } else {
            console.error('[AUTH ERROR] Token verification failed for /api/me:', {
              code: errorCode,
              message: errorMessage,
              hasToken: !!token,
              tokenLength: token?.length,
              tokenPrefix: token ? token.substring(0, 30) + '...' : 'none',
              firebaseInitialized: !!firebaseAuth,
              envProjectId: process.env.FIREBASE_PROJECT_ID,
              errorStack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
            });
          }
        } else if (!isPublicEndpoint || !isExpectedError) {
          // Log detailed error information for debugging (only for unexpected errors)
          console.error('[AUTH ERROR] Token verification failed:', {
            code: errorCode,
            message: errorMessage,
            path: req.path,
            hasToken: !!token,
            tokenLength: token?.length,
            tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
          });
          
          // Only log stack in development
          if (process.env.NODE_ENV === 'development') {
            console.error('[AUTH ERROR] Stack:', error?.stack);
          }
        }
        
        res.status(401).json({ 
          message: 'Unauthorized: Invalid token',
          error: errorMessage,
          code: errorCode
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

/**
 * Optional authentication middleware.
 *
 * If no bearer token (or token query param) is provided, it simply calls `next()`
 * and does NOT set `req.user`. If a token is provided, it delegates to
 * `authenticateUser` and will return 401 on invalid tokens.
 *
 * Use this for public endpoints that can optionally enrich responses when a user
 * is authenticated (e.g., personalization like `isLiked`).
 */
export function authenticateUserOptional(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const hasBearerHeader = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
  const hasQueryToken = typeof req.query?.token === 'string' && req.query.token.length > 0;

  if (!hasBearerHeader && !hasQueryToken) {
    next();
    return;
  }

  authenticateUser(req, res, next);
}