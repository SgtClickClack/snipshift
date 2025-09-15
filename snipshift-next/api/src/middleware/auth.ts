import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    currentRole?: string;
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    (req as AuthenticatedRequest).user = undefined;
    return next();
  }

  try {
    const payload = verifyToken(token);
    (req as AuthenticatedRequest).user = payload;
  } catch (error) {
    // Invalid token - continue without user
    (req as AuthenticatedRequest).user = undefined;
  }

  next();
};
