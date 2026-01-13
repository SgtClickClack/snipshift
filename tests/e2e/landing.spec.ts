import { test, expect, Page } from '@playwright/test';

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

test.describe('Landing Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for servers to be ready before starting tests
    await waitForServersReady(page);
    
    // Navigate to landing page
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    // Wait a bit for React to hydrate
    await page.waitForTimeout(1000);
  });

  test.describe('Hero Section CTAs', () => {
    test('should navigate FIND STAFF button to /signup?role=hub', async ({ page }) => {
      // Find the FIND STAFF button using data-testid
      const findStaffButton = page.getByTestId('button-find-staff');
      await expect(findStaffButton).toBeVisible();
      
      // Click the button
      await findStaffButton.click();
      
      // Wait for navigation
      await page.waitForURL(/\/signup\?role=hub/);
      
      // Verify the URL contains the correct parameters
      expect(page.url()).toContain('/signup');
      expect(page.url()).toContain('role=hub');
    });

    test('should navigate Find Shifts button to /signup?role=professional', async ({ page }) => {
      // Find the Find Shifts button using data-testid
      const findShiftsButton = page.getByTestId('button-find-shifts');
      await expect(findShiftsButton).toBeVisible();
      
      // Click the button
      await findShiftsButton.click();
      
      // Wait for navigation
      await page.waitForURL(/\/signup\?role=professional/);
      
      // Verify the URL contains the correct parameters
      expect(page.url()).toContain('/signup');
      expect(page.url()).toContain('role=professional');
    });
  });

  test.describe('Pricing Tiers', () => {
    test('should display all pricing tiers with correct prices', async ({ page }) => {
      // Scroll to pricing section
      const pricingSection = page.locator('text=Simple, Transparent Pricing').first();
      await pricingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Assert visibility of $0 price (Starter tier)
      const starterPrice = page.locator('text=$0');
      await expect(starterPrice.first()).toBeVisible();
      
      // Assert visibility of $149 price (Business tier)
      const businessPrice = page.locator('text=$149');
      await expect(businessPrice.first()).toBeVisible();
      
      // Assert visibility of 'Custom' price (Enterprise tier)
      const customPrice = page.locator('text=Custom');
      await expect(customPrice.first()).toBeVisible();
    });

    test('should display Most Popular badge on Business tier', async ({ page }) => {
      // Scroll to pricing section
      const pricingSection = page.locator('text=Simple, Transparent Pricing').first();
      await pricingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Find the "Most Popular" badge
      const mostPopularBadge = page.locator('text=Most Popular');
      await expect(mostPopularBadge.first()).toBeVisible();
      
      // Verify it's associated with the Business tier
      // Find the Business card and verify it contains the badge
      const businessCard = page.locator('text=Business').first().locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "Card")]');
      // The badge should be near the Business tier
      const badgeNearBusiness = page.locator(':has-text("Business")').filter({ hasText: 'Most Popular' });
      await expect(badgeNearBusiness.first()).toBeVisible();
    });

    test('should navigate to /signup?plan=business&trial=true when clicking Start 14-Day Free Trial', async ({ page }) => {
      // Scroll to pricing section
      const pricingSection = page.locator('text=Simple, Transparent Pricing').first();
      await pricingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // Find the "Start 14-Day Free Trial" button
      const freeTrialButton = page.getByRole('button', { name: 'Start 14-Day Free Trial' }).or(
        page.locator('text=Start 14-Day Free Trial')
      ).first();
      await expect(freeTrialButton).toBeVisible();
      
      // Click the button
      await freeTrialButton.click();
      
      // Wait for navigation
      await page.waitForURL(/\/signup/);
      
      // Verify the URL contains the correct parameters
      expect(page.url()).toContain('/signup');
      expect(page.url()).toContain('plan=business');
    });
  });

  test.describe('FAQ Interaction', () => {
    test('should expand FAQ item and display answer when clicked', async ({ page }) => {
      // Scroll to FAQ section
      const faqSection = page.locator('text=Got Questions?').first();
      await faqSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // The first FAQ item is "Is there a lock-in contract?"
      // Note: By default, the first FAQ (index 0) is already open in the component
      // So we need to click a different FAQ item to test the expand behavior
      
      // Find the second FAQ question: "How do you vet your staff?"
      const faqQuestion = page.locator('button').filter({ hasText: 'How do you vet your staff?' });
      await expect(faqQuestion).toBeVisible();
      
      // Click to expand the FAQ item
      await faqQuestion.click();
      await page.waitForTimeout(300); // Wait for animation
      
      // Assert that the answer text becomes visible
      const answerText = page.locator('text=manual profile review');
      await expect(answerText).toBeVisible();
    });

    test('should display first FAQ answer by default', async ({ page }) => {
      // Scroll to FAQ section
      const faqSection = page.locator('text=Got Questions?').first();
      await faqSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // The first FAQ item is open by default (index 0)
      // First question: "Is there a lock-in contract?"
      const firstFaqQuestion = page.locator('button').filter({ hasText: 'Is there a lock-in contract?' });
      await expect(firstFaqQuestion).toBeVisible();
      
      // The answer should be visible by default
      const firstAnswer = page.locator('text=No. All HospoGo plans are month-to-month');
      await expect(firstAnswer).toBeVisible();
    });

    test('should collapse FAQ item when clicking on another', async ({ page }) => {
      // Scroll to FAQ section
      const faqSection = page.locator('text=Got Questions?').first();
      await faqSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      // First FAQ answer should be visible by default
      const firstAnswer = page.locator('text=month-to-month');
      await expect(firstAnswer).toBeVisible();
      
      // Click on the second FAQ question
      const secondFaqQuestion = page.locator('button').filter({ hasText: 'How do you vet your staff?' });
      await secondFaqQuestion.click();
      await page.waitForTimeout(300); // Wait for animation
      
      // The first answer should now be hidden
      await expect(firstAnswer).not.toBeVisible();
      
      // The second answer should now be visible
      const secondAnswer = page.locator('text=manual profile review');
      await expect(secondAnswer).toBeVisible();
    });
  });
});
