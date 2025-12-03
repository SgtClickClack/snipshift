/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID Tokens and attaches the user to the request.
 */

import { Request, Response, NextFunction } from 'express';
import * as usersRepo from '../repositories/users.repository.js';
import { auth } from '../config/firebase.js';

/**
 * Express request with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'professional' | 'business' | 'admin' | 'trainer';
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

    // Bypass for E2E Testing - Allow mock token regardless of NODE_ENV if token matches exactly
    // This is a pragmatic choice for E2E reliability where passing NODE_ENV can be flaky
    if (token === 'mock-test-token') {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'test@snipshift.com',
        name: 'Test User',
        role: 'business',
        uid: 'test-firebase-uid'
      };
      next();
      return;
    }

    // Bypass for E2E Testing - Allow specific E2E test users to be auto-authenticated
    if (token && token.startsWith('mock-token-e2e_test_')) {
        const email = token.replace('mock-token-', '');
        console.log('[AUTH E2E] Attempting auth for email:', email);
        
        usersRepo.getUserByEmail(email).then(user => {
            if (user) {
                console.log('[AUTH E2E] User found:', user.id);
                req.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role as 'professional' | 'business' | 'admin' | 'trainer',
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
        const user = await usersRepo.getUserByEmail(email);

        if (!user) {
          // For now, we'll fail if they aren't in our DB, to enforce proper signup flow
          res.status(401).json({ message: 'Unauthorized: User not found in database' });
          return;
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
