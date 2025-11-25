import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to check for horizontal scroll
 */
async function checkNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = page.viewportSize()!.width;

  // Allow 1px tolerance for sub-pixel rendering
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
}

test.describe('Mobile Layout Audit', () => {
  const routes = [
    '/professional-dashboard',
    '/hub-dashboard',
    '/job-feed',
    '/messages'
  ];

  for (const route of routes) {
    test(`Check layout for ${route}`, async ({ page }) => {
      // 1. Navigate to the route (using Auth Bypass)
      await page.goto(`${route}?test_user=true`);

      // 2. Wait for content to load
      // Adjust selector if 'main' is not present on all pages, but typically it is.
      // If not, we can wait for a common element or just load state.
      try {
        await page.waitForSelector('main', { timeout: 5000 });
      } catch (e) {
        // Fallback: wait for network idle if 'main' isn't found immediately
        await page.waitForLoadState('networkidle');
      }

      // 3. Run "Overflow Check"
      await checkNoHorizontalScroll(page);

      // 4. Specific Check: "Browse Jobs" button or any primary button
      // The prompt mentions "Browse Jobs" specifically, but also says "or any button with role='button'".
      // We'll try to find "Browse Jobs" first, then fallback to any visible button to check containment.
      
      const browseJobsBtn = page.locator('text=/Browse Jobs/i').first();
      const anyBtn = page.getByRole('button').first();
      
      let targetBtn = browseJobsBtn;
      if (!(await browseJobsBtn.isVisible().catch(() => false))) {
         targetBtn = anyBtn;
      }

      if (await targetBtn.isVisible().catch(() => false)) {
        const box = await targetBtn.boundingBox();
        if (box) {
          const viewportWidth = page.viewportSize()!.width;
          expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
          expect(box.x).toBeGreaterThanOrEqual(0);
        }
      } else {
        console.log(`No button found on ${route} to check bounding box.`);
      }
    });
  }
});

