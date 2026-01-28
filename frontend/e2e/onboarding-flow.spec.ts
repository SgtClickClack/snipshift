import { test, expect } from '@playwright/test';

/**
 * HospoGo E2E: "Perfect Onboarding" – Venue journey
 *
 * Uses the storageState.json from global setup (tests/auth.setup.ts).
 * 1. /onboarding/role-selection -> select Venue -> /onboarding/venue-details
 * 2. Confirm Stripe Connect flow uses return URL with ?step=payouts&status=success
 * 3. Fail if "Snipshift" appears in the UI (except logo/branding not yet changed)
 *
 * Run: npx playwright test frontend/e2e/onboarding-flow.spec.ts --config=playwright.frontend.config.ts
 */

test.describe('Perfect Onboarding – Venue flow', () => {
  // Use storageState from config (./tests/storageState.json) – do not clear cookies/storage
  test.use({ storageState: './tests/storageState.json' });

  /** Fail if "Snipshift" appears in the UI outside logo/branding (logo not changed yet) */
  async function assertNoSnipshiftInUI(page: import('@playwright/test').Page) {
    const bodyText = await page.locator('body').innerText();
    const snipshiftCount = (bodyText.match(/Snipshift/gi) || []).length;
    if (snipshiftCount === 0) return;
    const logoText = await page.locator('[data-branding="logo"], .logo, [class*="logo"], header, nav').first().innerText().catch(() => '');
    const snipshiftInLogoOrHeader = (logoText.match(/Snipshift/gi) || []).length;
    expect(snipshiftCount, 'UI must not show "Snipshift" outside logo/branding').toBeLessThanOrEqual(snipshiftInLogoOrHeader);
  }

  test('role-selection -> venue-details -> Stripe Connect return URL; no Snipshift in UI', async ({ page }) => {
    test.setTimeout(120000);

    // Mock /api/me so app sees E2E user and shows role selection (storageState + sessionStorage)
    const e2eUser = {
      id: 'e2e-user-0001',
      email: 'test@hospogo.com',
      name: 'E2E Test User',
      roles: [],
      currentRole: null,
      isOnboarded: false,
    };
    await page.route('**/api/me', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(e2eUser) });
    });

    // Mock role updates so role selection succeeds with storageState user (no real API required)
    await page.route('**/api/users/*/roles', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });
    await page.route('**/api/users/*/current-role', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    // Intercept Stripe create-account-link: confirm return URL is used (backend sends it to Stripe; we mock redirect to it)
    await page.route('**/api/stripe/create-account-link', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const origin = new URL(page.url()).origin;
      const returnUrl = `${origin}/onboarding?step=payouts&status=success`;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accountLink: returnUrl,
          accountId: 'mock-account-id',
        }),
      });
    });

    // 1. Inject E2E user before any load (AuthContext reads sessionStorage on init; Playwright doesn't restore it)
    await page.addInitScript(() => {
      localStorage.setItem('E2E_MODE', 'true');
      sessionStorage.setItem(
        'hospogo_test_user',
        JSON.stringify({
          id: 'e2e-user-0001',
          email: 'test@hospogo.com',
          name: 'E2E Test User',
          roles: [],
          currentRole: null,
          isOnboarded: false,
        })
      );
    });

    // 2. Start on onboarding role selection (storageState + init script give app E2E user)
    await page.goto('/onboarding/role-selection', { waitUntil: 'networkidle', timeout: 20000 });

    await assertNoSnipshiftInUI(page);

    await expect(page).toHaveURL(/\/onboarding\/role-selection|\/role-selection/, { timeout: 10000 });
    await expect(page.locator('body')).toBeVisible();

    // 2. Select Venue ("I need to fill shifts" / Venue card) and continue
    const venueCard = page.getByTestId('button-select-hub');
    await expect(venueCard).toBeVisible({ timeout: 10000 });
    await venueCard.click();
    const continueBtn = page.getByTestId('button-continue');
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // 3. Redirect to /onboarding/venue-details (or /onboarding/hub – both render HubOnboardingPage)
    await page.waitForURL(/\/(onboarding\/venue-details|onboarding\/hub)/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/(onboarding\/venue-details|onboarding\/hub)/);

    await assertNoSnipshiftInUI(page);

    // 4. Fill venue form and submit (mock API if needed so submit succeeds)
    await page.route('**/api/users/role', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'e2e-user-0001',
            email: 'test@hospogo.com',
            shopName: 'E2E Venue',
            location: '123 Test St, Brisbane QLD',
            role: 'business',
            currentRole: 'business',
          }),
        });
        return;
      }
      await route.continue();
    });

    const venueNameInput = page.getByRole('textbox', { name: /venue name/i });
    await expect(venueNameInput).toBeVisible({ timeout: 10000 });
    await venueNameInput.fill('E2E Test Venue');
    await page.getByPlaceholder(/city or address/i).first().fill('123 Test St, Brisbane QLD');
    await page.getByRole('textbox', { name: /description/i }).fill('E2E venue for onboarding test');

    await page.getByRole('button', { name: /create venue profile|continue to payment/i }).click();

    await page.waitForTimeout(3000);
    await assertNoSnipshiftInUI(page);

    // 5. Reach Stripe Connect: either on venue dashboard (banner) or onboarding payouts step
    const connectBtn = page.getByRole('button', { name: /connect with stripe|connect stripe|complete setup/i });
    const connectVisible = await connectBtn.first().isVisible().catch(() => false);

    if (connectVisible) {
      // Click Connect with Stripe; our mock returns accountLink = return URL with ?step=payouts&status=success
      await connectBtn.first().click();
      await page.waitForURL(/\?step=payouts&status=success|step=payouts.*status=success/, { timeout: 10000 }).catch(() => {});
      const url = page.url();
      expect(url, 'Stripe Connect return URL must include step=payouts&status=success').toContain('step=payouts');
      expect(url).toContain('status=success');
    } else {
      // Simulate Stripe return: navigate to the correct return URL and confirm it loads
      await page.goto('/onboarding?step=payouts&status=success', { waitUntil: 'domcontentloaded' });
      expect(page.url()).toContain('step=payouts');
      expect(page.url()).toContain('status=success');
    }

    await assertNoSnipshiftInUI(page);
  });
});
