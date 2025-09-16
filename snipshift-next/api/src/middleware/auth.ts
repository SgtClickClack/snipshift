import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserJWTPayload } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: UserJWTPayload;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    (req as AuthenticatedRequest).user = undefined;
    return next();
  }

  try {
    const payload = await verifyToken(token);
    (req as AuthenticatedRequest).user = payload;
  } catch (error) {
    // Invalid token - continue without user
    (req as AuthenticatedRequest).user = undefined;
  }

  next();
};
