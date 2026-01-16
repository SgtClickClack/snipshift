/**
 * Stripe Routes
 * 
 * Handles Stripe Connect account creation with identity verification
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as stripeConnectService from '../services/stripe-connect.service.js';
import * as usersRepo from '../repositories/users.repository.js';

const router = Router();

/**
 * POST /api/stripe/create-account-link
 * 
 * Creates a Stripe Connect Express account for the venue and returns an account_link URL
 * Includes identity verification requirement for Brisbane venues
 */
router.post('/create-account-link', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Check if user already has a Connect account
  if (user.stripeAccountId) {
    // If account exists, create a new account link for onboarding/updates
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/venue/dashboard?onboarding=complete`;
    const refreshUrl = `${frontendUrl}/venue/dashboard?onboarding=refresh`;

    try {
      const accountLink = await stripeConnectService.createAccountLinkWithIdentity(
        user.stripeAccountId,
        returnUrl,
        refreshUrl
      );

      res.status(200).json({
        accountLink: accountLink,
      });
    } catch (error: any) {
      console.error('[STRIPE] Error creating account link:', error);
      res.status(500).json({ message: 'Failed to create account link', error: error.message });
    }
    return;
  }

  try {
    // Create Connect account with identity verification requirement
    const accountId = await stripeConnectService.createConnectAccountWithIdentity(
      user.email,
      userId,
      user.location || 'Brisbane' // Default to Brisbane for identity verification
    );
    
    if (!accountId) {
      res.status(500).json({ message: 'Failed to create Connect account' });
      return;
    }

    // Update user with account ID
    await usersRepo.updateUser(userId, {
      stripeAccountId: accountId,
    });

    // Create account link with identity verification
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/venue/dashboard?onboarding=complete`;
    const refreshUrl = `${frontendUrl}/venue/dashboard?onboarding=refresh`;

    const accountLink = await stripeConnectService.createAccountLinkWithIdentity(
      accountId,
      returnUrl,
      refreshUrl
    );

    if (!accountLink) {
      res.status(500).json({ message: 'Failed to create account link' });
      return;
    }

    res.status(200).json({
      accountId,
      accountLink,
    });
  } catch (error: any) {
    console.error('[STRIPE] Error creating Connect account:', error);
    res.status(500).json({ message: 'Failed to create Connect account', error: error.message });
  }
}));

export default router;
