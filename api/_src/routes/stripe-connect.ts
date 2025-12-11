/**
 * Stripe Connect Routes
 * 
 * Handles Stripe Connect onboarding and account management
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as stripeConnectService from '../services/stripe-connect.service.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';

const router = Router();

// Get Connect account status for current user
router.get('/account/status', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
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

  if (!user.stripeAccountId) {
    res.status(200).json({
      hasAccount: false,
      onboardingComplete: false,
      chargesEnabled: false,
    });
    return;
  }

  try {
    const account = await stripeConnectService.getConnectAccount(user.stripeAccountId);
    const isReady = await stripeConnectService.isAccountReady(user.stripeAccountId);

    res.status(200).json({
      hasAccount: true,
      onboardingComplete: user.stripeOnboardingComplete || false,
      chargesEnabled: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      payoutsEnabled: account.payouts_enabled || false,
      accountId: user.stripeAccountId,
    });
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error getting account status:', error);
    res.status(500).json({ message: 'Failed to get account status', error: error.message });
  }
}));

// Create Connect account and onboarding link
router.post('/account/create', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
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
    res.status(400).json({ message: 'User already has a Stripe Connect account' });
    return;
  }

  try {
    // Create Connect account
    const accountId = await stripeConnectService.createConnectAccount(user.email, userId);
    
    if (!accountId) {
      res.status(500).json({ message: 'Failed to create Connect account' });
      return;
    }

    // Update user with account ID
    await usersRepo.updateUser(userId, {
      stripeAccountId: accountId,
    });

    // Create onboarding link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/professional-dashboard?view=payouts&onboarding=complete`;
    const refreshUrl = `${frontendUrl}/professional-dashboard?view=payouts&onboarding=refresh`;

    const onboardingUrl = await stripeConnectService.createConnectOnboardingLink(
      accountId,
      returnUrl,
      refreshUrl
    );

    if (!onboardingUrl) {
      res.status(500).json({ message: 'Failed to create onboarding link' });
      return;
    }

    res.status(200).json({
      accountId,
      onboardingUrl,
    });
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating Connect account:', error);
    res.status(500).json({ message: 'Failed to create Connect account', error: error.message });
  }
}));

// Create onboarding link for existing account
router.post('/account/onboarding-link', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await usersRepo.getUserById(userId);
  if (!user || !user.stripeAccountId) {
    res.status(404).json({ message: 'User does not have a Stripe Connect account' });
    return;
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/professional-dashboard?view=payouts&onboarding=complete`;
    const refreshUrl = `${frontendUrl}/professional-dashboard?view=payouts&onboarding=refresh`;

    const onboardingUrl = await stripeConnectService.createConnectOnboardingLink(
      user.stripeAccountId,
      returnUrl,
      refreshUrl
    );

    if (!onboardingUrl) {
      res.status(500).json({ message: 'Failed to create onboarding link' });
      return;
    }

    res.status(200).json({
      onboardingUrl,
    });
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating onboarding link:', error);
    res.status(500).json({ message: 'Failed to create onboarding link', error: error.message });
  }
}));

// Verify if user can accept shifts (charges_enabled check)
router.get('/account/verify', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await usersRepo.getUserById(userId);
  if (!user || !user.stripeAccountId) {
    res.status(200).json({
      canAcceptShifts: false,
      reason: 'No Stripe Connect account',
    });
    return;
  }

  try {
    const isReady = await stripeConnectService.isAccountReady(user.stripeAccountId);
    
    res.status(200).json({
      canAcceptShifts: isReady,
      reason: isReady ? null : 'Account not fully onboarded',
    });
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error verifying account:', error);
    res.status(500).json({ message: 'Failed to verify account', error: error.message });
  }
}));

// Create or get Stripe Customer for shops
router.post('/customer/create', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
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

  // If user already has a customer ID, return it
  if (user.stripeCustomerId) {
    res.status(200).json({
      customerId: user.stripeCustomerId,
    });
    return;
  }

  try {
    const customerId = await stripeConnectService.createStripeCustomer(user.email, user.name, userId);
    
    if (!customerId) {
      res.status(500).json({ message: 'Failed to create Stripe customer' });
      return;
    }

    // Update user with customer ID
    await usersRepo.updateUser(userId, {
      stripeCustomerId: customerId,
    });

    res.status(200).json({
      customerId,
    });
  } catch (error: any) {
    console.error('[STRIPE_CONNECT] Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create Stripe customer', error: error.message });
  }
}));

export default router;
