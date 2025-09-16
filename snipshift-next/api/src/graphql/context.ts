import { Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { db } from '../database/connection.js';

export interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    roles: string[];
    currentRole?: string;
  };
  req: Request;
  res: Response;
  db: typeof db;
}

export async function context({ req }: { req: Request }): Promise<GraphQLContext> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    let user = undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        user = await verifyToken(token);
      } catch (error) {
        // Invalid token - continue without user
        logger.warn('Invalid token provided:', error);
      }
    }

    return {
      user,
      req,
      res: req.res as Response,
      db,
    };
  } catch (error) {
    logger.error('Error creating GraphQL context:', error);
    throw new Error('Failed to create request context');
  }
}
