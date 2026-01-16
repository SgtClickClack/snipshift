/**
 * Push Tokens Routes
 * 
 * Handles registration and management of push notification tokens
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as pushTokensRepo from '../repositories/push-tokens.repository.js';
import { z } from 'zod';

const router = Router();

const RegisterTokenSchema = z.object({
  token: z.string().min(1),
  deviceId: z.string().optional(),
  platform: z.enum(['web', 'ios', 'android']).optional(),
});

/**
 * POST /api/push-tokens
 * 
 * Register or update a push notification token for the authenticated user
 */
router.post('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const body = RegisterTokenSchema.parse(req.body);
  
  const pushToken = await pushTokensRepo.upsertPushToken({
    userId,
    token: body.token,
    deviceId: body.deviceId,
    platform: body.platform || 'web',
  });

  if (!pushToken) {
    return res.status(500).json({ message: 'Failed to register push token' });
  }

  res.status(200).json({
    message: 'Push token registered successfully',
    token: pushToken,
  });
}));

/**
 * DELETE /api/push-tokens/:token
 * 
 * Deactivate a push notification token (e.g., on logout)
 */
router.delete('/:token', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = req.params.token;
  
  // Verify the token belongs to the user
  const existingToken = await pushTokensRepo.getTokenByToken(token);
  if (!existingToken) {
    return res.status(404).json({ message: 'Token not found' });
  }

  if (existingToken.userId !== userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const success = await pushTokensRepo.deactivateToken(token);
  
  if (!success) {
    return res.status(500).json({ message: 'Failed to deactivate token' });
  }

  res.status(200).json({ message: 'Push token deactivated successfully' });
}));

/**
 * GET /api/push-tokens
 * 
 * Get all active push tokens for the authenticated user (for debugging)
 */
router.get('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const tokens = await pushTokensRepo.getActiveTokensForUser(userId);
  
  res.status(200).json({
    tokens,
    count: tokens.length,
  });
}));

export default router;
