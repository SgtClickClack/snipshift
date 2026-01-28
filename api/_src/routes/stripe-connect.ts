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
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error getting account status:', error);
    res.status(500).json({ message: 'Failed to get account status' });
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
    const appUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    // Redirect back to onboarding flow (payouts step) instead of dashboard to ensure wizard completion
    const returnUrl = `${appUrl}/onboarding?step=payouts&status=success`;
    const refreshUrl = `${appUrl}/onboarding?step=payouts&status=refresh`;

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
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error creating Connect account:', error);
    res.status(500).json({ message: 'Failed to create Connect account' });
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
    const appUrl = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    // Redirect back to onboarding flow (payouts step) instead of dashboard to ensure wizard completion
    const returnUrl = `${appUrl}/onboarding?step=payouts&status=success`;
    const refreshUrl = `${appUrl}/onboarding?step=payouts&status=refresh`;

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
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error creating onboarding link:', error);
    res.status(500).json({ message: 'Failed to create onboarding link' });
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
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error verifying account:', error);
    res.status(500).json({ message: 'Failed to verify account' });
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
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create Stripe customer' });
  }
}));

// Create SetupIntent for adding payment methods
router.post('/setup-intent', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
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

  // Ensure customer exists
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    customerId = await stripeConnectService.createStripeCustomer(user.email, user.name, userId);
    if (customerId) {
      await usersRepo.updateUser(userId, { stripeCustomerId: customerId });
    } else {
      res.status(500).json({ message: 'Failed to create Stripe customer' });
      return;
    }
  }

  try {
    const clientSecret = await stripeConnectService.createSetupIntent(customerId);
    
    if (!clientSecret) {
      res.status(500).json({ message: 'Failed to create SetupIntent' });
      return;
    }

    res.status(200).json({
      clientSecret,
    });
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error creating SetupIntent:', error);
    res.status(500).json({ message: 'Failed to create SetupIntent' });
  }
}));

// Create Express Dashboard login link
router.post('/account/login-link', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
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
    const returnUrl = `${frontendUrl}/professional-dashboard?view=earnings`;

    const loginUrl = await stripeConnectService.createExpressDashboardLoginLink(
      user.stripeAccountId,
      returnUrl
    );

    if (!loginUrl) {
      res.status(500).json({ message: 'Failed to create login link' });
      return;
    }

    res.status(200).json({
      loginUrl,
    });
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error creating login link:', error);
    res.status(500).json({ message: 'Failed to create login link' });
  }
}));

// List payment methods for a customer
router.get('/payment-methods', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await usersRepo.getUserById(userId);
  if (!user || !user.stripeCustomerId) {
    res.status(200).json({ methods: [] });
    return;
  }

  try {
    const methods = await stripeConnectService.listPaymentMethods(user.stripeCustomerId);
    
    res.status(200).json({
      methods: methods.map(method => ({
        id: method.id,
        type: method.type,
        card: method.card ? {
          brand: method.card.brand,
          last4: method.card.last4,
          exp_month: method.card.exp_month,
          exp_year: method.card.exp_year,
        } : null,
      })),
    });
  } catch (error: unknown) {
    console.error('[STRIPE_CONNECT] Error listing payment methods:', error);
    res.status(500).json({ message: 'Failed to list payment methods' });
  }
}));

export default router;
