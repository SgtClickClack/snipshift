import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { setupUserContext } from '../e2e/seed_data';
import { E2E_VENUE_OWNER } from '../e2e/e2e-business-fixtures';
import { E2E_PROFESSIONAL } from '../e2e/auth-professional.setup';

/**
 * HospoGo Custom Playwright Fixtures
 * 
 * Centralizes auth/session logic so individual test files don't need to manage mocks.
 * 
 * Usage:
 *   import { test, expect } from '../fixtures/hospogo-fixtures';
 *   
 *   test('my test', async ({ businessPage }) => {
 *     // Already authenticated as business owner, on /venue/dashboard
 *   });
 */

type HospoGoFixtures = {
  /** A page pre-authenticated as a Business Owner, navigated to /venue/dashboard */
  businessPage: Page;
  /** A page pre-authenticated as a Professional (Staff), navigated to /dashboard */
  staffPage: Page;
};

export const test = base.extend<HospoGoFixtures>({
  // Fixture: A page pre-authenticated as a Business Owner
  businessPage: async ({ page, context }, use) => {
    // 1. Setup the E2E Auth Context (Bypassing Firebase/Redirects)
    await setupUserContext(context, E2E_VENUE_OWNER);

    // 2. Global API Mocks for Business
    await page.route('**/api/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { ...E2E_VENUE_OWNER, role: 'business', onboardingComplete: true },
          needsOnboarding: false,
        }),
      });
    });

    await page.route('**/api/venues/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-venue-id',
          name: 'E2E Test Venue',
          venueName: 'E2E Test Venue',
          ownerId: E2E_VENUE_OWNER.id,
          userId: E2E_VENUE_OWNER.id,
          address: {
            street: '123 Test St',
            suburb: 'Brisbane City',
            postcode: '4000',
            city: 'Brisbane',
            state: 'QLD',
            country: 'AU',
          },
          operatingHours: {},
          status: 'active',
        }),
      });
    });

    // 3. Mock professionals API with realistic delay to prevent race conditions
    await page.route('**/api/professionals?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      // Add 100ms delay to simulate network reality and prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'pro-sarah-johnson',
            name: 'Sarah Johnson',
            displayName: 'Sarah Johnson',
            email: 'sarah.johnson@example.com',
            avatarUrl: null,
            skills: ['Bartender', 'Server', 'Barista'],
            averageRating: 4.9,
            reviewCount: 42,
            isAvailable: true,
          },
          {
            id: 'pro-mike-chen',
            name: 'Mike Chen',
            displayName: 'Mike Chen',
            email: 'mike.chen@example.com',
            avatarUrl: null,
            skills: ['Chef', 'Line Cook'],
            averageRating: 4.7,
            reviewCount: 28,
            isAvailable: true,
          },
          {
            id: E2E_PROFESSIONAL.id,
            name: E2E_PROFESSIONAL.name,
            displayName: E2E_PROFESSIONAL.name,
            email: E2E_PROFESSIONAL.email,
            avatarUrl: null,
            skills: ['Bartender', 'Server'],
            averageRating: 4.8,
            reviewCount: 15,
            isAvailable: true,
          },
        ]),
      });
    });

    // 4. Block Stripe JS to prevent external network calls and flakiness
    await page.route('https://js.stripe.com/**', (route) => route.abort());
    await page.route('https://m.stripe.com/**', (route) => route.abort());
    await page.route('https://r.stripe.com/**', (route) => route.abort());

    // 6. Add auth header to all API requests
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const headers = { ...request.headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token';
      }
      await route.continue({ headers });
    });

    // 7. Navigate to the starting point and wait for dashboard to be ready
    await page.goto('/venue/dashboard');
    
    // Wait for either calendar-container or other dashboard indicators
    // This handles the isNavigationLocked wait
    const dashboardReady = page
      .getByTestId('calendar-container')
      .or(page.getByTestId('roster-tools-dropdown'))
      .or(page.getByTestId('venue-dashboard'))
      .or(page.getByTestId('tab-calendar'));
    
    await expect(dashboardReady.first()).toBeVisible({ timeout: 15000 });

    await use(page);
  },

  // Fixture: A page pre-authenticated as a Professional (Staff)
  staffPage: async ({ page, context }, use) => {
    // 1. Setup the E2E Auth Context
    await setupUserContext(context, E2E_PROFESSIONAL);

    // 2. Global API Mocks for Professional
    await page.route('**/api/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { ...E2E_PROFESSIONAL, role: 'professional', onboardingComplete: true },
          needsOnboarding: false,
        }),
      });
    });

    // 3. Block Stripe JS to prevent external network calls
    await page.route('https://js.stripe.com/**', (route) => route.abort());
    await page.route('https://m.stripe.com/**', (route) => route.abort());
    await page.route('https://r.stripe.com/**', (route) => route.abort());

    // 4. Add auth header to all API requests
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const headers = { ...request.headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token-professional';
      }
      await route.continue({ headers });
    });

    // 5. Navigate to professional dashboard
    await page.goto('/dashboard');

    // Wait for dashboard to be ready
    const dashboardReady = page
      .getByTestId('professional-dashboard')
      .or(page.getByTestId('calendar-container'))
      .or(page.getByTestId('invitations-tab'))
      .or(page.getByRole('heading', { name: /dashboard/i }));

    await expect(dashboardReady.first()).toBeVisible({ timeout: 15000 });

    await use(page);
  },
});

export { expect };

// Re-export fixtures for convenience
export { E2E_VENUE_OWNER, E2E_PROFESSIONAL };
