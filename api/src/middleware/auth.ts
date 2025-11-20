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
