/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID Tokens and attaches the user to the request.
 * Includes optional rate limiting for /api/register and /api/me to prevent 429s from downstream abuse.
 */

import { Request, Response, NextFunction } from 'express';

/** In-memory rate limit store: key = client id (IP), value = { count, resetAt } */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 40;

function getClientId(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Rate limiter for /api/register and /api/me.
 * Use on routes: POST /register, GET /me (when router is mounted at /api).
 * Returns 429 Too Many Requests when exceeded.
 */
export function rateLimitRegisterAndMe(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const path = (req as any).originalUrl ?? req.path;
  const isRegister = path === '/api/register' || path.endsWith('/api/register');
  const isMe = path === '/api/me' || path.endsWith('/api/me');
  if (!isRegister && !isMe) {
    next();
    return;
  }

  const now = Date.now();
  const id = getClientId(req);
  let entry = rateLimitStore.get(id);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(id, entry);
    next();
    return;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({
      message: 'Too many requests. Please try again in a minute.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
    return;
  }
  next();
}
import * as usersRepo from '../repositories/users.repository.js';
import { getAuth, getFirebaseInitError } from '../config/firebase.js';
import { isDatabaseComputeQuotaExceededError } from '../utils/dbErrors.js';

/**
 * Helper function to ensure error logs are flushed to Vercel logs
 * Uses process.stderr.write to ensure immediate flushing
 */
function logAuthError(...args: any[]): void {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  // Use process.stderr.write to ensure immediate flushing in Vercel
  process.stderr.write(`[AUTH ERROR] ${message}\n`);
  // Also call console.error for compatibility
  console.error('[AUTH ERROR]', ...args);
}

/**
 * Express request with user property
 * When user is not in DB (valid Firebase token, new signup), id may be absent and isNewUser is true.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    email: string;
    name?: string;
    role?: 'professional' | 'business' | 'admin' | 'trainer' | 'hub' | 'venue' | 'pending_onboarding' | null;
    uid?: string; // Firebase UID
    firebaseUid?: string; // Alias for uid (from decoded token)
    /** True when Firebase token is valid but user not yet in DB — /api/me returns 200 with needsOnboarding */
    needsOnboarding?: boolean;
    /** True when Firebase token verified but user NOT found in DB — allows /api/me to proceed without 401 */
    isNewUser?: boolean;
  };
}

/**
 * FOUNDER ACCESS WHITELIST (Backend)
 * 
 * Hardcoded founder emails for god-mode access during investor demos.
 * This ensures Rick can access admin endpoints even if ADMIN_EMAILS env var
 * is not configured or if the 'admin' role isn't in the database.
 * 
 * Mirrors: src/lib/roles.ts FOUNDER_EMAILS constant
 */
const FOUNDER_EMAILS = [
  'rick@hospogo.com',
  'rick@snipshift.com.au',
];

/**
 * Admin authorization middleware
 * Checks if user has admin role, is in the admin email list, OR is a founder
 * MUST be used after authenticateUser middleware
 * 
 * INVESTOR BRIEFING FIX: Added hardcoded founder email bypass to prevent
 * 403 errors during demos if the admin role isn't explicitly assigned.
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

  // FOUNDER ACCESS OVERRIDE: Hardcoded bypass for founder emails
  // This ensures Rick can access /api/admin/* endpoints during investor demos
  const isFounder = FOUNDER_EMAILS.includes(req.user.email);

  if (!isAdminRole && !isAdminEmail && !isFounder) {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
    return;
  }

  next();
}

/**
 * Business/Owner authorization middleware.
 * Allows hub, business, venue, and admin roles (venue owners, business users).
 * MUST be used after authenticateUser middleware
 */
export function requireBusinessOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: Authentication required' });
    return;
  }
  const allowed = ['hub', 'business', 'venue', 'admin'] as const;
  if (!allowed.includes(req.user.role as typeof allowed[number])) {
    res.status(403).json({ message: 'Forbidden: Business or venue owner access required' });
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
  // Path for /api/me: when router is mounted at /api, req.path is /me; use originalUrl for reliable detection
  const pathForLog = (req as any).originalUrl ?? req.path;
  const isMeEndpoint = pathForLog === '/api/me' || String(pathForLog).endsWith('/api/me');

  // Log when auth middleware is called (DEBUG)
  if (isMeEndpoint || req.path?.startsWith('/api/')) {
    process.stderr.write(`[AUTH DEBUG] authenticateUser ${req.method} path=${pathForLog} hasAuth=${!!req.headers.authorization}\n`);
    console.log(`[AUTH] authenticateUser called for ${req.method} ${pathForLog}`, {
      hasAuthHeader: !!req.headers.authorization,
      authHeaderPrefix: req.headers.authorization?.substring(0, 20),
    });
  }

  try {
    // Check if auth service is available
    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      const initError = getFirebaseInitError();
      logAuthError('Firebase auth service is not initialized', {
        message: initError?.message,
      });
      logAuthError('Check environment variables: FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      logAuthError('Project ID from env:', process.env.FIREBASE_PROJECT_ID);
      console.log('[AUTH DEBUG] Backend Project ID:', process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID);
      res.status(503).json({ 
        message: 'Authentication service unavailable',
        error: 'Firebase Admin not initialized',
        code: 'auth/init-failed',
      });
      return;
    }

    // Log Firebase Admin initialization status for /api/me debugging
    if (isMeEndpoint) {
      console.log('[AUTH DEBUG] Firebase Admin initialized successfully', {
        projectId: process.env.FIREBASE_PROJECT_ID,
        hasAuthInstance: !!firebaseAuth,
      });
      console.log('[AUTH DEBUG] Backend Project ID:', process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID);
    }

    let token: string | undefined;
    const authHeader = req.headers.authorization;

    // Harden token extraction with validation - ensure no trailing spaces
    if (authHeader && typeof authHeader === 'string') {
      // Trim the entire header first to remove any leading/trailing whitespace
      const trimmedHeader = authHeader.trim();
      if (trimmedHeader.startsWith('Bearer ')) {
        const extractedToken = trimmedHeader.substring(7).trim(); // Extract and trim token
        if (extractedToken && extractedToken.length > 0) {
          token = extractedToken;
        } else {
          console.warn('[AUTH] Bearer token is empty after extraction', {
            path: req.path,
            headerLength: authHeader.length,
            trimmedLength: trimmedHeader.length,
          });
        }
      } else {
        // Log if Authorization header exists but doesn't start with Bearer
        if (isMeEndpoint) {
          console.warn('[AUTH] Authorization header missing Bearer prefix', {
            prefix: trimmedHeader.substring(0, 20),
            originalPrefix: authHeader.substring(0, 20),
          });
        }
      }
    } else if (req.query.token && typeof req.query.token === 'string') {
      // Allow token in query param for SSE/WebSockets where headers are hard to set
      token = req.query.token.trim();
    }

    // Bypass for E2E Testing - active whenever NODE_ENV=test (Playwright webServer sets this)
    // Prevents production exploitation; E2E tests use Bearer mock-test-* with hospogo_test DB
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
      const isPublicEndpoint = isMeEndpoint || (req.path?.startsWith?.('/api/notifications') ?? false);
      if (!isPublicEndpoint) {
        console.log(`[AUTH] No token provided for ${req.method} ${req.path}`);
      }
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    // Log token start for debugging
    console.log('[AUTH] Received Token Start:', token?.substring(0, 10));

    // Wrap async logic in Promise to handle errors properly
    Promise.resolve().then(async () => {
      try {
        // Log token verification attempt for debugging (always for /api/me)
        const isUsersEndpoint = pathForLog === '/api/users' || String(pathForLog).includes('/api/users');
        if (isMeEndpoint || isUsersEndpoint) {
          console.log(`[AUTH] Verifying token for ${pathForLog}`, {
            hasToken: !!token,
            tokenLength: token?.length,
            tokenPrefix: token ? token.substring(0, 30) + '...' : 'none',
            tokenStart: token?.substring(0, 10),
            projectId: process.env.FIREBASE_PROJECT_ID,
            firebaseAuthInitialized: !!firebaseAuth,
          });
        }
        
        // Validate token before verification
        if (!token || token.length === 0) {
          logAuthError('Empty or invalid token provided', {
            path: req.path,
            hasAuthHeader: !!req.headers.authorization,
          });
          res.status(401).json({ 
            message: 'Unauthorized: Invalid token format',
            code: 'auth/invalid-token'
          });
          return;
        }
        
        // Verify token with explicit project ID check
        let decodedToken;
        try {
          decodedToken = await firebaseAuth.verifyIdToken(token);
        } catch (verifyError: any) {
          // HARDENED ERROR LOGGING: Detailed analysis of why token validation failed
          const errorCode = verifyError?.code || 'unknown';
          const errorMessage = verifyError?.message || 'Token verification failed';
          const errorName = verifyError?.name || 'UnknownError';
          
          // Decode token header to check project ID (if possible)
          let tokenProjectId: string | null = null;
          let tokenExpiry: number | null = null;
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length >= 2) {
              // Decode base64url (JWT uses base64url, not standard base64)
              const decodeBase64Url = (str: string): string => {
                // Replace base64url characters with base64 characters
                const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                // Add padding if needed
                const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
                return Buffer.from(padded, 'base64').toString('utf-8');
              };
              
              const header = JSON.parse(decodeBase64Url(tokenParts[0]));
              const payload = JSON.parse(decodeBase64Url(tokenParts[1]));
              tokenProjectId = payload.aud || payload.project_id || null;
              tokenExpiry = payload.exp || null;
            }
          } catch (decodeError) {
            // Token is malformed - can't decode
            logAuthError('Token is malformed - cannot decode header/payload:', {
              error: (decodeError as Error).message,
            });
          }

          // Determine failure reason with detailed diagnostics
          const failureReason = {
            isExpired: errorCode === 'auth/id-token-expired' || 
                      errorMessage.toLowerCase().includes('expired') ||
                      (tokenExpiry && tokenExpiry < Date.now() / 1000),
            isInvalidFormat: errorCode === 'auth/argument-error' || 
                            errorMessage.toLowerCase().includes('decoding') ||
                            errorMessage.toLowerCase().includes('malformed'),
            isProjectMismatch: errorMessage.toLowerCase().includes('project') || 
                             errorMessage.toLowerCase().includes('audience') ||
                             (tokenProjectId && tokenProjectId !== process.env.FIREBASE_PROJECT_ID),
            isRevoked: errorCode === 'auth/id-token-revoked',
            isMalformedHeader: errorCode === 'auth/argument-error' && 
                              (errorMessage.toLowerCase().includes('header') || 
                               errorMessage.toLowerCase().includes('jwt')),
            isInvalidSignature: errorMessage.toLowerCase().includes('signature') ||
                               errorMessage.toLowerCase().includes('verification'),
          };

          // Log comprehensive error details (using helper to ensure flushing)
          logAuthError('============================================');
          logAuthError('Token Verification Failed - Detailed Analysis');
          logAuthError('============================================');
          logAuthError('Error Code:', errorCode);
          logAuthError('Error Name:', errorName);
          logAuthError('Error Message:', errorMessage);
          logAuthError('Path:', req.path);
          logAuthError('Method:', req.method);
          logAuthError('============================================');
          logAuthError('Token Details:');
          logAuthError('  - Length:', token?.length);
          logAuthError('  - Prefix:', token?.substring(0, 20) + '...');
          logAuthError('  - Suffix:', '...' + token?.substring(Math.max(0, token.length - 20)));
          logAuthError('  - Token Project ID (from payload):', tokenProjectId || 'N/A (could not decode)');
          logAuthError('  - Token Expiry:', tokenExpiry ? new Date(tokenExpiry * 1000).toISOString() : 'N/A');
          logAuthError('  - Is Expired:', failureReason.isExpired);
          logAuthError('============================================');
          logAuthError('Environment Configuration:');
          logAuthError('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'NOT SET');
          logAuthError('  - Firebase Auth Initialized:', !!firebaseAuth);
          logAuthError('  - Project ID Match:', tokenProjectId === process.env.FIREBASE_PROJECT_ID ? 'YES' : 'NO');
          logAuthError('============================================');
          logAuthError('Failure Reason Analysis:');
          logAuthError('  - Is Expired:', failureReason.isExpired);
          logAuthError('  - Is Invalid Format:', failureReason.isInvalidFormat);
          logAuthError('  - Is Project Mismatch:', failureReason.isProjectMismatch);
          logAuthError('  - Is Revoked:', failureReason.isRevoked);
          logAuthError('  - Is Malformed Header:', failureReason.isMalformedHeader);
          logAuthError('  - Is Invalid Signature:', failureReason.isInvalidSignature);
          logAuthError('============================================');
          
          if (process.env.NODE_ENV === 'development') {
            logAuthError('Full Error Stack:', verifyError?.stack);
          }
          
          // Provide specific error messages based on failure reason
          let userFriendlyMessage = 'Unauthorized: Invalid token';
          let diagnosticMessage = '';
          
          if (failureReason.isExpired) {
            userFriendlyMessage = 'Unauthorized: Token expired. Please sign in again.';
            diagnosticMessage = `Token expired at ${tokenExpiry ? new Date(tokenExpiry * 1000).toISOString() : 'unknown time'}`;
          } else if (failureReason.isRevoked) {
            userFriendlyMessage = 'Unauthorized: Token revoked. Please sign in again.';
            diagnosticMessage = 'Token has been revoked by Firebase Admin SDK';
          } else if (failureReason.isProjectMismatch) {
            userFriendlyMessage = 'Unauthorized: Token project mismatch. Check FIREBASE_PROJECT_ID environment variable.';
            diagnosticMessage = `Token project ID '${tokenProjectId}' does not match expected '${process.env.FIREBASE_PROJECT_ID}'`;
            logAuthError('🔍 PROJECT ID MISMATCH DETECTED:', {
              tokenProjectId,
              expectedProjectId: process.env.FIREBASE_PROJECT_ID,
              mismatch: tokenProjectId !== process.env.FIREBASE_PROJECT_ID,
            });
          } else if (failureReason.isMalformedHeader) {
            userFriendlyMessage = 'Unauthorized: Malformed token header.';
            diagnosticMessage = 'Token header is malformed or invalid JWT format';
          } else if (failureReason.isInvalidSignature) {
            userFriendlyMessage = 'Unauthorized: Invalid token signature.';
            diagnosticMessage = 'Token signature verification failed';
          } else if (failureReason.isInvalidFormat) {
            userFriendlyMessage = 'Unauthorized: Invalid token format.';
            diagnosticMessage = 'Token format is invalid or cannot be decoded';
          } else {
            diagnosticMessage = `Unknown error: ${errorMessage}`;
          }
          
          logAuthError('Diagnostic:', diagnosticMessage);
          logAuthError('============================================');
          
          res.status(401).json({ 
            message: userFriendlyMessage,
            error: errorMessage,
            code: errorCode,
            diagnostic: diagnosticMessage,
            // Include diagnostic info in development/test environments
            ...(process.env.NODE_ENV !== 'production' ? {
              tokenProjectId,
              expectedProjectId: process.env.FIREBASE_PROJECT_ID,
              failureReasons: failureReason,
            } : {}),
          });
          return;
        }
        const firebaseUid = decodedToken.sub || decodedToken.uid;
        const { email } = decodedToken;
        
        // Log successful verification for /api/me and /api/users (always log for debugging)
        if (isMeEndpoint || isUsersEndpoint) {
          console.log(`[AUTH] Token verified successfully for ${req.path}`, {
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

        // Step 2: OPTIMIZED - Single query to find user by Firebase UID or email
        // This eliminates the sequential fallback pattern, reducing latency by ~50-100ms
        let user;
        if (isMeEndpoint) {
          process.stderr.write(`[AUTH DEBUG] GET /api/me: looking up user firebaseUid=${firebaseUid} email=${email}\n`);
        }
        try {
          // Use optimized single-query lookup
          user = await usersRepo.getUserByFirebaseUidOrEmail(firebaseUid, email);
          if (isMeEndpoint) {
            process.stderr.write(`[AUTH DEBUG] GET /api/me: DB lookup result ${user ? `found id=${user.id}` : 'null (isNewUser)'}\n`);
          }
        } catch (dbError: any) {
          if (isMeEndpoint) {
            logAuthError('[AUTH DEBUG] GET /api/me: DB lookup threw', dbError?.message, dbError?.code);
          }
          if (isDatabaseComputeQuotaExceededError(dbError)) {
            res.status(503).json({
              message: 'Service temporarily unavailable: database compute quota exceeded. Please try again later.',
              code: 'DB_QUOTA_EXCEEDED',
            });
            return;
          }
          throw dbError;
        }

        // CRITICAL: If user NOT found in DB, do NOT return 401. Set req.user with isNewUser and call next().
        // This allows requests to reach the API instead of dying at the gate.
        if (!user) {
          if (isMeEndpoint) {
            process.stderr.write(`[AUTH DEBUG] GET /api/me: user not in DB — setting isNewUser, no 401\n`);
          }
          req.user = {
            firebaseUid: decodedToken.uid,
            email: decodedToken.email || '',
            role: null,
            isNewUser: true,
          };
          next();
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
        const isPublicEndpoint = isMeEndpoint || (req.path?.startsWith?.('/api/notifications') ?? false);
        const isExpectedError = errorCode === 'auth/id-token-expired' || 
                                errorCode === 'auth/argument-error' ||
                                errorMessage.includes('Decoding Firebase ID token failed');
        
        // Always log token verification failures for /api/me and /api/users to help diagnose issues
        // but use different log levels based on whether it's expected
        const isUsersEndpointCatch = pathForLog === '/api/users' || String(pathForLog).includes('/api/users');
        if (isMeEndpoint || isUsersEndpointCatch) {
          if (isExpectedError) {
            console.log(`[AUTH] Token verification failed for ${pathForLog} (expected):`, {
              code: errorCode,
              message: errorMessage.substring(0, 100),
            });
          } else {
            logAuthError(`Token verification failed for ${pathForLog}:`, {
              code: errorCode,
              message: errorMessage,
              hasToken: !!token,
              tokenLength: token?.length,
              tokenPrefix: token ? token.substring(0, 30) + '...' : 'none',
              tokenStart: token?.substring(0, 10),
              firebaseInitialized: !!firebaseAuth,
              envProjectId: process.env.FIREBASE_PROJECT_ID,
              errorStack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
            });
          }
        } else if (!isPublicEndpoint || !isExpectedError) {
          // Log detailed error information for debugging (only for unexpected errors)
          logAuthError('Token verification failed:', {
            code: errorCode,
            message: errorMessage,
            path: req.path,
            hasToken: !!token,
            tokenLength: token?.length,
            tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
          });
          
          // Only log stack in development
          if (process.env.NODE_ENV === 'development') {
            logAuthError('Stack:', error?.stack);
          }
        }
        
        res.status(401).json({ 
          message: 'Unauthorized: Invalid token',
          error: errorMessage,
          code: errorCode
        });
      }
    }).catch((error: any) => {
      logAuthError('Promise rejection:', error?.message || error);
      logAuthError('Stack:', error?.stack);
      res.status(500).json({ 
        message: 'Internal server error during authentication',
        error: error?.message || 'Unknown error'
      });
    });
  } catch (error: any) {
    logAuthError('Synchronous error:', error?.message || error);
    logAuthError('Stack:', error?.stack);
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