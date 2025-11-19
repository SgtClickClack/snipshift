/**
 * Authentication Middleware
 * 
 * Temporary authentication helper until proper JWT-based auth is implemented.
 * For now, uses the mock business user pattern.
 */

import { Request, Response, NextFunction } from 'express';
import * as usersRepo from '../repositories/users.repository';

/**
 * Express request with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'professional' | 'business' | 'admin' | 'trainer';
  };
}

/**
 * Authentication middleware that verifies the user
 * Currently uses mock authentication - will be replaced with JWT verification
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
  // Wrap async logic in Promise to handle errors properly
  Promise.resolve().then(async () => {
    // TODO: Replace with proper JWT token verification
    // For now, get or create mock business user (temporary until proper auth is implemented)
    const user = await usersRepo.getOrCreateMockBusinessUser();
    
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'professional' | 'business' | 'admin' | 'trainer',
    };

    next();
  }).catch((error) => {
    console.error('[AUTH ERROR]', error);
    next(error); // Pass error to error handler middleware
  });
}

