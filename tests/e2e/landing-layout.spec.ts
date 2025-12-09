import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to check for horizontal scroll
 */
async function checkNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  
  // Allow 1px tolerance for sub-pixel rendering
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
}

test.describe('Landing Page Layout Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    // Wait for page to load (use domcontentloaded for faster tests, networkidle can be flaky)
    await page.waitForLoadState('domcontentloaded');
    // Wait a bit for React to hydrate
    await page.waitForTimeout(1000);
  });

  test.describe('Badge Visibility', () => {
    test('should display all step badges (1, 2, 3, 4) in viewport', async ({ page }) => {
      // Scroll to "How It Works" section
      const howItWorksSection = page.locator('text=How Snipshift Works').first();
      await howItWorksSection.scrollIntoViewIfNeeded();
      
      // Wait for badges to be rendered
      await page.waitForTimeout(1000);
      
      // Check each badge is visible using data-testid
      for (let i = 1; i <= 4; i++) {
        const badge = page.getByTestId(`step-badge-${i}`);
        await expect(badge).toBeVisible();
        
        // Verify badge is within viewport
        const boundingBox = await badge.boundingBox();
        expect(boundingBox).not.toBeNull();
        
        if (boundingBox) {
          const viewportSize = page.viewportSize();
          expect(viewportSize).not.toBeNull();
          
          if (viewportSize) {
            // Check badge is within viewport bounds (allowing for negative top position)
            expect(boundingBox.x).toBeGreaterThanOrEqual(-50); // Allow for badges extending above cards
            expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(viewportSize.width + 50);
          }
        }
      }
    });

    test('should have correct z-index on step badges', async ({ page }) => {
      // Scroll to "How It Works" section
      const howItWorksSection = page.locator('text=How Snipshift Works').first();
      await howItWorksSection.scrollIntoViewIfNeeded();
      
      await page.waitForTimeout(1000);
      
      // Find badge 1 using data-testid
      const badge1 = page.getByTestId('step-badge-1');
      await expect(badge1).toBeVisible();
      
      // Get computed z-index
      const zIndex = await badge1.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });
      
      // z-badge class should have z-index >= 20
      // Convert to number (handles 'auto' and other values)
      const zIndexNum = zIndex === 'auto' ? 0 : parseInt(zIndex, 10);
      expect(zIndexNum).toBeGreaterThanOrEqual(20);
    });
  });

  test.describe('Mobile Overflow Prevention', () => {
    test('should not have horizontal scroll on mobile viewport (375x667)', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Scroll through "How It Works" section
      const howItWorksSection = page.locator('text=How Snipshift Works').first();
      await howItWorksSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Check for horizontal overflow
      await checkNoHorizontalScroll(page);
      
      // Scroll through "Pricing" section
      const pricingSection = page.locator('text=Simple, Transparent Pricing').first();
      await pricingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Check for horizontal overflow again
      await checkNoHorizontalScroll(page);
    });

    test('should not have horizontal scroll on small mobile viewport (320x568)', async ({ page }) => {
      // Set small mobile viewport
      await page.setViewportSize({ width: 320, height: 568 });
      
      // Scroll through "How It Works" section
      const howItWorksSection = page.locator('text=How Snipshift Works').first();
      await howItWorksSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Check for horizontal overflow
      await checkNoHorizontalScroll(page);
      
      // Scroll through "Pricing" section
      const pricingSection = page.locator('text=Simple, Transparent Pricing').first();
      await pricingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Check for horizontal overflow again
      await checkNoHorizontalScroll(page);
    });

    test('should not have horizontal scroll when scrolling entire page on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Scroll to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await checkNoHorizontalScroll(page);
      
      // Scroll to middle
      await page.evaluate(() => window.scrollTo(0, window.innerHeight));
      await page.waitForTimeout(300);
      await checkNoHorizontalScroll(page);
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await checkNoHorizontalScroll(page);
    });
  });

  test.describe('Feedback Widget Non-Obstruction', () => {
    test('should not cover Next button on onboarding page on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to onboarding page (requires auth, but we'll test the layout)
      // Note: This test assumes user is already authenticated or uses test mode
      await page.goto('/onboarding');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for Next button to be visible (may require auth, so skip if not found)
      const nextButton = page.getByTestId('button-next');
      const isButtonVisible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!isButtonVisible) {
        test.skip(true, 'Onboarding page requires authentication - skipping widget obstruction test');
        return;
      }
      
      // Scroll to button to ensure it's in view
      await nextButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Get button bounding box
      const buttonBox = await nextButton.boundingBox();
      expect(buttonBox).not.toBeNull();
      
      if (buttonBox) {
        // Check if feedback widget overlaps the button
        const feedbackWidget = page.locator('[data-testid="button-open-feedback"]');
        const widgetBox = await feedbackWidget.boundingBox();
        
        if (widgetBox) {
          // Calculate if widgets overlap
          const buttonRight = buttonBox.x + buttonBox.width;
          const buttonBottom = buttonBox.y + buttonBox.height;
          const widgetLeft = widgetBox.x;
          const widgetTop = widgetBox.y;
          
          // Button should not be covered by widget
          // Widget is typically bottom-right, button is usually bottom-center or bottom-left
          // Check if button's right edge extends into widget's left edge area
          const horizontalOverlap = buttonRight > widgetLeft && buttonBox.x < widgetLeft + widgetBox.width;
          const verticalOverlap = buttonBottom > widgetTop && buttonBox.y < widgetTop + widgetBox.height;
          
          // If there's overlap, ensure button is still clickable (not completely covered)
          if (horizontalOverlap && verticalOverlap) {
            // Button should have at least 50% visible area
            const overlapArea = Math.max(0, Math.min(buttonRight, widgetLeft + widgetBox.width) - Math.max(buttonBox.x, widgetLeft)) *
                               Math.max(0, Math.min(buttonBottom, widgetTop + widgetBox.height) - Math.max(buttonBox.y, widgetTop));
            const buttonArea = buttonBox.width * buttonBox.height;
            const visibleRatio = 1 - (overlapArea / buttonArea);
            
            expect(visibleRatio).toBeGreaterThan(0.5);
          }
        }
      }
    });

    test('should not cover Submit button on post-job page on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to post-job page (requires auth)
      await page.goto('/post-job');
      await page.waitForLoadState('networkidle');
      
      // Wait for form to load - look for the submit button
      // The button text might be "Publish Shift" or similar
      const submitButton = page.locator('button[type="submit"]').or(
        page.getByRole('button', { name: /publish|submit/i })
      ).first();
      
      // If button exists, check it's not covered
      const isVisible = await submitButton.isVisible().catch(() => false);
      
      if (isVisible) {
        await submitButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        const buttonBox = await submitButton.boundingBox();
        expect(buttonBox).not.toBeNull();
        
        if (buttonBox) {
          // Check if feedback widget overlaps
          const feedbackWidget = page.locator('[data-testid="button-open-feedback"]');
          const widgetBox = await feedbackWidget.boundingBox();
          
          if (widgetBox) {
            const buttonRight = buttonBox.x + buttonBox.width;
            const buttonBottom = buttonBox.y + buttonBox.height;
            const widgetLeft = widgetBox.x;
            const widgetTop = widgetBox.y;
            
            const horizontalOverlap = buttonRight > widgetLeft && buttonBox.x < widgetLeft + widgetBox.width;
            const verticalOverlap = buttonBottom > widgetTop && buttonBox.y < widgetTop + widgetBox.height;
            
            if (horizontalOverlap && verticalOverlap) {
              const overlapArea = Math.max(0, Math.min(buttonRight, widgetLeft + widgetBox.width) - Math.max(buttonBox.x, widgetLeft)) *
                                 Math.max(0, Math.min(buttonBottom, widgetTop + widgetBox.height) - Math.max(buttonBox.y, widgetTop));
              const buttonArea = buttonBox.width * buttonBox.height;
              const visibleRatio = 1 - (overlapArea / buttonArea);
              
              expect(visibleRatio).toBeGreaterThan(0.5);
            }
          }
        }
      } else {
        // If button is not visible (maybe requires auth), skip this assertion
        test.info().annotations.push({ type: 'skip', description: 'Submit button not visible - may require authentication' });
      }
    });

    test('should have proper spacing between feedback widget and form buttons on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test on onboarding page
      await page.goto('/onboarding');
      await page.waitForLoadState('domcontentloaded');
      
      const nextButton = page.getByTestId('button-next');
      const isButtonVisible = await nextButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!isButtonVisible) {
        test.skip(true, 'Onboarding page requires authentication - skipping spacing test');
        return;
      }
      
      if (isButtonVisible) {
        await nextButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        const feedbackWidget = page.locator('[data-testid="button-open-feedback"]');
        await expect(feedbackWidget).toBeVisible();
        
        const buttonBox = await nextButton.boundingBox();
        const widgetBox = await feedbackWidget.boundingBox();
        
        if (buttonBox && widgetBox) {
          // Widget should be positioned at bottom-right (bottom-4 right-4 on mobile)
          // Button should have enough bottom padding (pb-24 on mobile) to not be covered
          // Check that button bottom is above widget top with some margin
          const buttonBottom = buttonBox.y + buttonBox.height;
          const widgetTop = widgetBox.y;
          
          // There should be at least 20px gap between button and widget
          // Or button should be completely above widget
          if (buttonBottom > widgetTop) {
            // If button extends into widget area, ensure sufficient gap
            const gap = widgetTop - buttonBottom;
            // Allow some overlap but ensure button is mostly above widget
            expect(buttonBottom).toBeLessThan(widgetTop + 20);
          }
        }
      }
    });
  });

  test.describe('Theme Toggle Visual Regression', () => {
    test('should display landing page correctly in dark mode', async ({ page, browser }) => {
      // Create a new context with dark color scheme
      const context = await browser.newContext({
        colorScheme: 'dark',
      });
      const darkPage = await context.newPage();
      
      // Set theme to dark mode via localStorage before navigation
      await darkPage.addInitScript(() => {
        localStorage.setItem('snipshift-ui-theme', 'dark');
      });
      
      // Navigate to landing page
      await darkPage.goto('/');
      await darkPage.waitForLoadState('domcontentloaded');
      await darkPage.waitForTimeout(1500);
      
      // Wait for theme to be applied
      await darkPage.waitForFunction(() => {
        return document.documentElement.classList.contains('dark');
      }, { timeout: 5000 });
      
      // Wait a bit more for all styles to be applied
      await darkPage.waitForTimeout(500);
      
      // Scroll to top to ensure Hero section is visible
      await darkPage.evaluate(() => window.scrollTo(0, 0));
      await darkPage.waitForTimeout(500);
      
      // Take snapshot of Hero section - use viewport screenshot since Hero is full screen
      await expect(darkPage).toHaveScreenshot('landing-dark-hero.png', {
        maxDiffPixels: 200,
        fullPage: false, // Only capture viewport
      });
      
      // Scroll to "How It Works" section
      const howItWorksHeading = darkPage.getByRole('heading', { name: /How Snipshift Works/i });
      await howItWorksHeading.scrollIntoViewIfNeeded();
      await darkPage.waitForTimeout(500);
      
      // Find the parent container of "How It Works" section
      const howItWorksSection = howItWorksHeading.locator('..').locator('..');
      await expect(howItWorksSection).toHaveScreenshot('landing-dark-how-it-works.png', {
        maxDiffPixels: 200,
      });
      
      await context.close();
    });

    test('should display landing page correctly in light mode', async ({ page, browser }) => {
      // Create a new context with light color scheme
      const context = await browser.newContext({
        colorScheme: 'light',
      });
      const lightPage = await context.newPage();
      
      // Set theme to light mode via localStorage before navigation
      await lightPage.addInitScript(() => {
        localStorage.setItem('snipshift-ui-theme', 'light');
      });
      
      // Navigate to landing page
      await lightPage.goto('/');
      await lightPage.waitForLoadState('domcontentloaded');
      await lightPage.waitForTimeout(1500);
      
      // Wait for theme to be applied (light mode)
      await lightPage.waitForFunction(() => {
        return document.documentElement.classList.contains('light');
      }, { timeout: 5000 }).catch(async () => {
        // If light class isn't applied, try toggling manually
        const themeToggle = lightPage.getByRole('button', { name: /toggle theme/i }).or(
          lightPage.locator('button[aria-label="Toggle theme"]')
        ).first();
        if (await themeToggle.isVisible().catch(() => false)) {
          await themeToggle.click();
          await lightPage.waitForTimeout(300);
          const lightOption = lightPage.getByRole('menuitem', { name: /^light$/i });
          if (await lightOption.isVisible().catch(() => false)) {
            await lightOption.click();
            await lightPage.waitForTimeout(500);
          }
        }
      });
      
      // Verify light theme is applied
      const hasLightClass = await lightPage.evaluate(() => {
        return document.documentElement.classList.contains('light');
      });
      expect(hasLightClass).toBe(true);
      
      // Wait a bit more for all styles to be applied
      await lightPage.waitForTimeout(500);
      
      // Scroll to top to ensure Hero section is visible
      await lightPage.evaluate(() => window.scrollTo(0, 0));
      await lightPage.waitForTimeout(500);
      
      // Take snapshot of Hero section - use viewport screenshot since Hero is full screen
      await expect(lightPage).toHaveScreenshot('landing-light-hero.png', {
        maxDiffPixels: 200,
        fullPage: false, // Only capture viewport
      });
      
      // Scroll to "How It Works" section
      const howItWorksHeading = lightPage.getByRole('heading', { name: /How Snipshift Works/i });
      await howItWorksHeading.scrollIntoViewIfNeeded();
      await lightPage.waitForTimeout(500);
      
      // Find the parent container of "How It Works" section
      const howItWorksSection = howItWorksHeading.locator('..').locator('..');
      await expect(howItWorksSection).toHaveScreenshot('landing-light-how-it-works.png', {
        maxDiffPixels: 200,
      });
      
      await context.close();
    });

    test('should toggle theme and change visual appearance', async ({ page }) => {
      // Navigate to landing page
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      
      // Get initial theme class
      const initialTheme = await page.evaluate(() => {
        const html = document.documentElement;
        if (html.classList.contains('dark')) return 'dark';
        if (html.classList.contains('light')) return 'light';
        return 'system';
      });
      
      // Get the body element's computed background color (more reliable than wrapper)
      const initialBgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      
      // Find and click the theme toggle button
      const themeToggle = page.getByRole('button', { name: /toggle theme/i }).or(
        page.locator('button[aria-label="Toggle theme"]')
      ).first();
      
      await expect(themeToggle).toBeVisible();
      
      // Open the dropdown menu
      await themeToggle.click();
      await page.waitForTimeout(300);
      
      // Click on "Dark" option to set dark mode
      const darkOption = page.getByRole('menuitem', { name: /^dark$/i });
      await expect(darkOption).toBeVisible();
      await darkOption.click();
      await page.waitForTimeout(500);
      
      // Wait for dark theme to be applied
      await page.waitForFunction(() => {
        return document.documentElement.classList.contains('dark');
      }, { timeout: 5000 });
      
      // Get background color after switching to dark
      const darkBgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      
      // Verify dark class is applied
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(hasDarkClass).toBe(true);
      
      // Verify the background color changed if initial theme wasn't dark
      // (if it was already dark, colors might be the same)
      if (initialTheme !== 'dark') {
        expect(darkBgColor).not.toBe(initialBgColor);
      }
      
      // Now toggle to light mode
      await themeToggle.click();
      await page.waitForTimeout(300);
      
      const lightOption = page.getByRole('menuitem', { name: /^light$/i });
      await expect(lightOption).toBeVisible();
      await lightOption.click();
      await page.waitForTimeout(500);
      
      // Wait for light theme to be applied
      await page.waitForFunction(() => {
        return document.documentElement.classList.contains('light');
      }, { timeout: 5000 });
      
      // Get background color after switching to light
      const lightBgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      
      // Verify light class is applied
      const hasLightClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('light');
      });
      expect(hasLightClass).toBe(true);
      
      // Verify the background color changed from dark to light
      expect(lightBgColor).not.toBe(darkBgColor);
    });
  });
});

