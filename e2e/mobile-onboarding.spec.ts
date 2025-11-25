import { test, expect } from '@playwright/test';

test.describe('Mobile Onboarding', () => {
  test('Professional Onboarding - Mobile Layout Check', async ({ page }) => {
    // 1. Setup API Mocks to avoid backend dependencies/errors
    await page.route('**/api/users/role', async route => {
        await route.fulfill({ 
            status: 200,
            json: { 
                id: 'test-user-id', 
                role: 'professional', 
                isOnboarded: true 
            } 
        });
    });

    await page.route('**/api/me', async route => {
      await route.fulfill({ 
          json: {
            id: 'test-user-id',
            email: 'test@snipshift.com',
            name: 'Test User',
            roles: ['professional'],
            currentRole: 'professional',
            isOnboarded: true // Assuming we allow access even if onboarded, or we can set false
          }
      });
    });

    // 2. Navigate with Auth Bypass
    // Using test_user=true to skip login screen
    // We go directly to the target page. 
    // If AuthGuard redirects, we might need to adjust, but standard flow allows accessing this page.
    await page.goto('/onboarding/professional?test_user=true');
    
    // Wait for page content to load
    // Note: CardTitle renders as div, not heading. Avoiding button with same text.
    await expect(page.locator('.text-2xl').filter({ hasText: 'Create Professional Profile' })).toBeVisible();

    // 3. Viewport Check: Assert body width does not exceed viewport width
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("Viewport size is null");
    
    // Check if horizontal scrollbar exists or content is wider than viewport
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    // Allow a small buffer for rounding differences
    expect(scrollWidth).toBeLessThanOrEqual(viewportSize.width + 1);

    // 4. Input Focus: Click the "Location" input
    // Using placeholder as it's reliable based on code inspection
    const locationInput = page.getByPlaceholder('City, State or Address');
    await expect(locationInput).toBeVisible();
    
    // Scroll into view if needed (Playwright does this automatically on click usually)
    await locationInput.click();

    // 5. Submit Button: Assert visible
    const submitButton = page.getByRole('button', { name: /Create Professional Profile/i });
    await expect(submitButton).toBeVisible();
    
    // Optional: Take a screenshot for visual verification (useful in report)
    // await page.screenshot({ path: 'mobile-onboarding-layout.png' });
  });
});
