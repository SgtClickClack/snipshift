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

test.describe('Enterprise Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for servers to be ready before starting tests
    await waitForServersReady(page);
  });

  test.describe('Enterprise Form Submission', () => {
    test('should successfully submit enterprise inquiry form', async ({ page }) => {
      // Intercept POST to /api/leads/enterprise and return 200
      await page.route('**/api/leads/enterprise', async (route) => {
        // Verify the request method
        if (route.request().method() === 'POST') {
          // Return a successful response
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Lead submitted successfully',
              id: 'mock-lead-id-123',
            }),
          });
        } else {
          // Let other methods pass through
          await route.continue();
        }
      });

      // Navigate to /contact?inquiry=enterprise
      await page.goto('/contact?inquiry=enterprise');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verify we're on the enterprise contact page
      await expect(page.getByRole('heading', { name: 'Enterprise Solutions' })).toBeVisible();

      // Fill out the form fields
      // Company Name (required)
      const companyNameInput = page.locator('#companyName');
      await expect(companyNameInput).toBeVisible();
      await companyNameInput.fill('Test Hospitality Group');

      // Contact Name
      const contactNameInput = page.locator('#contactName');
      await expect(contactNameInput).toBeVisible();
      await contactNameInput.fill('John Smith');

      // Email (required)
      const emailInput = page.locator('#email');
      await expect(emailInput).toBeVisible();
      await emailInput.fill('john.smith@testhospitality.com');

      // Number of Locations
      const locationsInput = page.locator('#numberOfLocations');
      await expect(locationsInput).toBeVisible();
      await locationsInput.fill('10');

      // Submit the form
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Get in Touch|Sending/i });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Assert that the 'Message Sent!' success screen appears
      await expect(page.locator('text=Message Sent!')).toBeVisible({ timeout: 10000 });

      // Verify success message content
      await expect(page.locator('text=Our hospitality partnerships manager will reach out within 24 hours')).toBeVisible();
    });

    test('should validate required fields before submission', async ({ page }) => {
      // Navigate to /contact?inquiry=enterprise
      await page.goto('/contact?inquiry=enterprise');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Get in Touch/i });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Should show validation error for company name
      // The form uses HTML5 validation, so we check if the input is invalid
      const companyNameInput = page.locator('#companyName');
      const isInvalid = await companyNameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBe(true);
    });

    test('should validate email format', async ({ page }) => {
      // Navigate to /contact?inquiry=enterprise
      await page.goto('/contact?inquiry=enterprise');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Fill company name but invalid email
      const companyNameInput = page.locator('#companyName');
      await companyNameInput.fill('Test Company');

      const emailInput = page.locator('#email');
      await emailInput.fill('invalid-email');

      // Try to submit - click and wait for validation
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Get in Touch/i });
      await submitButton.click();
      await page.waitForTimeout(300);

      // Should show email validation error (the component shows this after form validation)
      // Check for the error message or that the email input shows invalid state
      const emailError = page.locator('text=Please enter a valid email address');
      const isErrorVisible = await emailError.isVisible().catch(() => false);
      
      if (!isErrorVisible) {
        // Fallback: check if email input is marked as invalid
        const isEmailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
        expect(isEmailInvalid).toBe(true);
      } else {
        await expect(emailError).toBeVisible();
      }
    });

    test('should handle API error gracefully', async ({ page }) => {
      // Intercept POST and return an error
      await page.route('**/api/leads/enterprise', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Internal server error',
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Navigate to /contact?inquiry=enterprise
      await page.goto('/contact?inquiry=enterprise');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Fill out the form
      await page.locator('#companyName').fill('Test Company');
      await page.locator('#email').fill('test@company.com');

      // Submit the form
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Get in Touch/i });
      await submitButton.click();

      // Should show error message
      // Check both locators separately to avoid strict mode violation
      const errorMsg1 = page.locator('text=Something went wrong');
      const errorMsg2 = page.locator('text=Internal server error');
      const hasError = await errorMsg1.isVisible({ timeout: 5000 }).catch(() => false) ||
                      await errorMsg2.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasError).toBe(true);
    });

    test('should send correct payload to API', async ({ page }) => {
      let capturedPayload: any = null;

      // Intercept POST and capture the payload
      await page.route('**/api/leads/enterprise', async (route) => {
        if (route.request().method() === 'POST') {
          capturedPayload = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else {
          await route.continue();
        }
      });

      // Navigate to /contact?inquiry=enterprise
      await page.goto('/contact?inquiry=enterprise');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Fill out the form
      await page.locator('#companyName').fill('Test Hospitality Group');
      await page.locator('#contactName').fill('Jane Doe');
      await page.locator('#email').fill('jane@testhospitality.com');
      await page.locator('#phone').fill('+61 400 123 456');
      await page.locator('#numberOfLocations').fill('15');

      // Submit the form
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /Get in Touch/i });
      await submitButton.click();

      // Wait for success
      await expect(page.locator('text=Message Sent!')).toBeVisible({ timeout: 10000 });

      // Verify the payload
      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.companyName).toBe('Test Hospitality Group');
      expect(capturedPayload.contactName).toBe('Jane Doe');
      expect(capturedPayload.email).toBe('jane@testhospitality.com');
      expect(capturedPayload.phone).toBe('+61 400 123 456');
      expect(capturedPayload.numberOfLocations).toBe(15);
      expect(capturedPayload.inquiryType).toBe('enterprise_plan');
    });
  });
});
