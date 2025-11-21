/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID Tokens and attaches the user to the request.
 */

import { Request, Response, NextFunction } from 'express';
import * as usersRepo from '../repositories/users.repository';
import { auth } from '../config/firebase';

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
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  // Wrap async logic in Promise to handle errors properly
  Promise.resolve().then(async () => {
    try {
      const decodedToken = await auth.verifyIdToken(token);
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
    } catch (error) {
      console.error('[AUTH ERROR]', error);
      res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  }).catch((error) => {
    console.error('[AUTH ERROR]', error);
    next(error); 
  });
}
