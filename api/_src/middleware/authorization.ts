/**
 * Authorization helpers (API)
 *
 * Centralizes common authorization checks (self access, etc.) to reduce the risk
 * of inconsistent route-by-route security logic.
 */

import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { normalizeParam } from '../utils/request-params.js';

/**
 * Require that the authenticated user matches a route param (e.g. :userId).
 *
 * Notes:
 * - This mutates `req.params[paramName]` by normalizing it to a string.
 * - MUST be used after `authenticateUser`.
 */
export function requireSelfParam(paramName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Unauthorized: Authentication required' });
      return;
    }

    let paramValue: string;
    try {
      paramValue = normalizeParam((req.params as any)?.[paramName]);
      // Normalize in-place so downstream handlers can safely use it.
      (req.params as any)[paramName] = paramValue;
    } catch {
      res.status(400).json({ message: `Bad Request: Missing parameter ${paramName}` });
      return;
    }

    if (paramValue !== req.user.id) {
      res.status(403).json({ message: `Forbidden: You can only access your own ${paramName}` });
      return;
    }

    next();
  };
}

