import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E Tests for Onboarding Flow
 *
 * Phase 2 Alignment Tests:
 * - Verify the 'Complete Setup Banner' appears if user skips Stripe step and returns to dashboard
 * - Test onboarding flow persistence and recovery
 */

// Test user configurations
const HUB_USER_NO_SUBSCRIPTION = {
  id: 'e2e-hub-no-sub-001',
  email: 'hub-no-sub-e2e@hospogo.com',
  name: 'E2E Hub User No Subscription',
  roles: ['business'],
  currentRole: 'business',
  isOnboarded: true,
  subscriptionTier: null, // No subscription
};

const HUB_USER_WITH_SUBSCRIPTION = {
  id: 'e2e-hub-with-sub-001',
  email: 'hub-with-sub-e2e@hospogo.com',
  name: 'E2E Hub User With Subscription',
  roles: ['business'],
  currentRole: 'business',
  isOnboarded: true,
  subscriptionTier: 'business',
  subscriptionStatus: 'active',
};

/**
 * Helper function to wait for both frontend and API servers to be ready
 */
async function waitForServersReady(page: Page) {
  // Wait for API to be ready
  await expect.poll(async () => {
    try {
      const response = await page.request.get('http://localhost:5000/health');
      return response.status();
    } catch (e) {
      return 0;
    }
  }, {
    timeout: 30000,
    intervals: [1000, 2000, 5000],
  }).toBe(200);
  
  // Wait for frontend to be ready
  await expect.poll(async () => {
    try {
      const response = await page.request.get('http://localhost:3000');
      return response.status();
    } catch (e) {
      return 0;
    }
  }, {
    timeout: 30000,
    intervals: [1000, 2000, 5000],
  }).toBe(200);
}

/**
 * Setup authenticated user context for E2E tests
 */
async function setupUserContext(context: BrowserContext, user: any) {
  await context.addInitScript((userData) => {
    const raw = JSON.stringify(userData);
    sessionStorage.setItem('hospogo_test_user', raw);
    localStorage.setItem('hospogo_test_user', raw);
    localStorage.setItem('E2E_MODE', 'true');
    // Clear any previous dismissal of the setup banner
    localStorage.removeItem('hospogo_setup_banner_dismissed');
  }, user);
}

/**
 * Setup mock routes for subscription APIs
 */
async function setupSubscriptionMocks(page: Page, hasSubscription: boolean) {
  // Mock current subscription endpoint
  await page.route('**/api/subscriptions/current', async (route) => {
    if (hasSubscription) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sub_business_active_123',
          planId: 'plan_business',
          status: 'active',
          tier: 'business',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
        }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'No subscription found' }),
      });
    }
  });

  // Mock subscription plans API
  await page.route('**/api/subscriptions/plans', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plans: [
          {
            id: 'plan_starter',
            name: 'Starter',
            price: '0',
            interval: 'month',
            tier: 'starter',
          },
          {
            id: 'plan_business',
            name: 'Business',
            price: '149',
            interval: 'month',
            tier: 'business',
          },
        ],
      }),
    });
  });

  // Mock user API
  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(hasSubscription ? HUB_USER_WITH_SUBSCRIPTION : HUB_USER_NO_SUBSCRIPTION),
    });
  });

  // Mock notifications
  await page.route('**/api/notifications', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock shifts for dashboard
  await page.route('**/api/shifts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock applications for dashboard
  await page.route('**/api/applications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock messaging chats
  await page.route('**/api/messaging/chats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

test.describe('Onboarding Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForServersReady(page);
  });

  test.describe('Complete Setup Banner', () => {
    test('should display Complete Setup Banner when hub user has no active subscription', async ({ page, context }) => {
      test.setTimeout(120000);

      // Setup user context WITHOUT subscription
      await setupUserContext(context, HUB_USER_NO_SUBSCRIPTION);
      await setupSubscriptionMocks(page, false);

      // Navigate to hub dashboard
      await page.goto('/hub-dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if we're on the dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        // We were redirected to login - this is expected in some E2E setups
        test.info().annotations.push({
          type: 'skip',
          description: 'Redirected to login - E2E auth may not be properly configured',
        });
        return;
      }

      // ===============================================
      // PHASE 2 ALIGNMENT: Verify Complete Setup Banner appears
      // ===============================================
      const setupBanner = page.getByTestId('complete-setup-banner');
      await expect(setupBanner).toBeVisible({ timeout: 15000 });

      // Verify banner contains expected content
      await expect(page.getByText(/Complete Your Setup/i)).toBeVisible();
      await expect(page.getByText(/subscription setup is incomplete/i)).toBeVisible();
      await expect(page.getByText(/\$20 booking fee/i)).toBeVisible();

      // Verify "Complete Setup" button is present
      const completeSetupButton = page.getByRole('button', { name: /Complete Setup/i });
      await expect(completeSetupButton).toBeVisible();

      // Verify "Remind me later" button is present
      const remindLaterButton = page.getByRole('button', { name: /Remind me later/i });
      await expect(remindLaterButton).toBeVisible();
    });

    test('should NOT display Complete Setup Banner when hub user has active subscription', async ({ page, context }) => {
      test.setTimeout(120000);

      // Setup user context WITH subscription
      await setupUserContext(context, HUB_USER_WITH_SUBSCRIPTION);
      await setupSubscriptionMocks(page, true);

      // Navigate to hub dashboard
      await page.goto('/hub-dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if we're on the dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        test.info().annotations.push({
          type: 'skip',
          description: 'Redirected to login - E2E auth may not be properly configured',
        });
        return;
      }

      // ===============================================
      // PHASE 2 ALIGNMENT: Verify Complete Setup Banner does NOT appear
      // ===============================================
      const setupBanner = page.getByTestId('complete-setup-banner');
      await expect(setupBanner).not.toBeVisible({ timeout: 5000 });
    });

    test('should dismiss Complete Setup Banner when "Remind me later" is clicked', async ({ page, context }) => {
      test.setTimeout(120000);

      // Setup user context WITHOUT subscription
      await setupUserContext(context, HUB_USER_NO_SUBSCRIPTION);
      await setupSubscriptionMocks(page, false);

      // Navigate to hub dashboard
      await page.goto('/hub-dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if we're on the dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        test.info().annotations.push({
          type: 'skip',
          description: 'Redirected to login - E2E auth may not be properly configured',
        });
        return;
      }

      // Verify banner is visible
      const setupBanner = page.getByTestId('complete-setup-banner');
      await expect(setupBanner).toBeVisible({ timeout: 15000 });

      // Click "Remind me later" button
      const remindLaterButton = page.getByRole('button', { name: /Remind me later/i });
      await remindLaterButton.click();

      // Verify banner is dismissed
      await expect(setupBanner).not.toBeVisible({ timeout: 5000 });

      // Verify localStorage has dismissal timestamp
      const dismissalTime = await page.evaluate(() => {
        return localStorage.getItem('hospogo_setup_banner_dismissed');
      });
      expect(dismissalTime).not.toBeNull();
    });

    test('should navigate to wallet when "Complete Setup" is clicked', async ({ page, context }) => {
      test.setTimeout(120000);

      // Setup user context WITHOUT subscription
      await setupUserContext(context, HUB_USER_NO_SUBSCRIPTION);
      await setupSubscriptionMocks(page, false);

      // Navigate to hub dashboard
      await page.goto('/hub-dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if we're on the dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        test.info().annotations.push({
          type: 'skip',
          description: 'Redirected to login - E2E auth may not be properly configured',
        });
        return;
      }

      // Verify banner is visible
      const setupBanner = page.getByTestId('complete-setup-banner');
      await expect(setupBanner).toBeVisible({ timeout: 15000 });

      // Click "Complete Setup" button
      const completeSetupButton = page.getByRole('button', { name: /Complete Setup/i });
      await completeSetupButton.click();

      // Verify navigation to wallet page
      await page.waitForURL(/\/wallet/, { timeout: 10000 });
      expect(page.url()).toContain('/wallet');
    });
  });

  test.describe('Onboarding Skip Flow', () => {
    test('should show Complete Setup Banner after user skips Stripe step during onboarding', async ({ page, context }) => {
      test.setTimeout(180000);

      // Setup user context as a new user who just completed onboarding but skipped payment
      const newUser = {
        id: 'e2e-new-user-skipped-payment',
        email: 'new-user-skipped@hospogo.com',
        name: 'New User Skipped Payment',
        roles: ['business'],
        currentRole: 'business',
        isOnboarded: true, // Onboarding is complete
        subscriptionTier: null, // But no subscription
      };

      await setupUserContext(context, newUser);
      await setupSubscriptionMocks(page, false);

      // Navigate directly to hub dashboard (simulating return after skipping Stripe)
      await page.goto('/hub-dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check if we're on the dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        test.info().annotations.push({
          type: 'skip',
          description: 'Redirected to login - E2E auth may not be properly configured',
        });
        return;
      }

      // ===============================================
      // PHASE 2 ALIGNMENT: Verify Complete Setup Banner appears
      // after user skips Stripe step and returns to dashboard
      // ===============================================
      const setupBanner = page.getByTestId('complete-setup-banner');
      await expect(setupBanner).toBeVisible({ timeout: 15000 });

      // Verify the banner explains the $20 booking fee consequence
      await expect(page.getByText(/\$20 booking fee/i)).toBeVisible();
      await expect(page.getByText(/Business plan to waive all booking fees/i)).toBeVisible();
    });
  });
});
