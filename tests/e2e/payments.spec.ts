import { test, expect } from '@playwright/test';

/**
 * Payment UI Test (Mocked Stripe)
 * 
 * Tests the payment method setup flow:
 * - Intercepts Stripe API calls to avoid real charges
 * - Navigates to Billing Settings as Venue user
 * - Fills Stripe Element with test card "4242"
 * - Asserts "Payment Method Saved" toast appears
 */

// Test user credentials
const VENUE_USER = {
  email: 'alice@hospogo.com',
  password: 'password123',
  id: 'venue-user-id',
  name: 'Alice Venue Owner',
  role: 'business',
  currentRole: 'business',
};

test.describe('Payment UI: Stripe Payment Method Setup', () => {
  test('Add payment method with mocked Stripe API', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    // Mock Stripe API endpoints to avoid real charges
    await page.route('**/api/stripe-connect/setup-intent', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            clientSecret: 'seti_test_mock_client_secret_123456789',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock Stripe Elements initialization
    await page.route('https://js.stripe.com/**', async (route) => {
      // Return a mock Stripe.js script
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.Stripe = function() {
            return {
              elements: function() {
                return {
                  create: function() {
                    return {
                      mount: function() {},
                      unmount: function() {},
                      on: function() {},
                    };
                  },
                };
              },
              confirmSetup: async function() {
                return { error: null };
              },
            };
          };
        `,
      });
    });

    // Mock Stripe API calls (payment methods, setup intents)
    await page.route('https://api.stripe.com/**', async (route) => {
      const url = route.request().url();
      
      // Mock setup intent confirmation
      if (url.includes('/setup_intents') && route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'seti_test_123',
            status: 'succeeded',
            payment_method: 'pm_test_123',
          }),
        });
      }
      // Mock payment method retrieval
      else if (url.includes('/payment_methods') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
          }),
        });
      }
      // Mock customer creation
      else if (url.includes('/customers') && route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cus_test_123',
            email: VENUE_USER.email,
          }),
        });
      }
      else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
    });

    // Mock our backend API endpoints
    await page.route('**/api/stripe-connect/customer/create', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            customerId: 'cus_test_123',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/stripe-connect/payment-methods', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            methods: [],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // ============================================
    // STEP 1: Login as Venue User
    // ============================================
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    await page.fill('input[type="email"]', VENUE_USER.email);
    await page.fill('input[type="password"]', VENUE_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/hub-dashboard|dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Set sessionStorage
    await page.evaluate((user) => {
      sessionStorage.setItem('hospogo_test_user', JSON.stringify({
        ...user,
        roles: ['business'],
        isOnboarded: true,
      }));
    }, VENUE_USER);

    // ============================================
    // STEP 2: Navigate to Billing Settings
    // ============================================
    // Navigate to settings page - adjust route based on your app structure
    // Common routes: /settings, /hub-dashboard?tab=billing, /billing
    await page.goto('/hub-dashboard?tab=billing');
    
    // If that doesn't work, try navigating via UI
    // Look for Settings link or Billing link in navigation
    const billingLink = page.getByRole('link', { name: /billing|payment|settings/i }).first();
    if (await billingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await billingLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try direct navigation to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      
      // Look for Billing tab or section
      const billingTab = page.getByRole('tab', { name: /billing|payment/i }).first();
      if (await billingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await billingTab.click();
        await page.waitForTimeout(1000);
      }
    }

    // Wait for billing settings to load
    await page.waitForTimeout(2000);

    // ============================================
    // STEP 3: Click "Add Payment Method" button
    // ============================================
    const addPaymentButton = page.getByRole('button', { name: /add payment method|add card/i }).first();
    await expect(addPaymentButton).toBeVisible({ timeout: 15000 });
    await addPaymentButton.click();

    // Wait for Stripe Elements to load
    await page.waitForTimeout(3000);

    // ============================================
    // STEP 4: Fill Stripe Element with test card
    // ============================================
    // Stripe Elements are in an iframe, so we need to handle them carefully
    // The test card number is 4242 4242 4242 4242
    
    // Wait for Stripe iframe to appear
    const stripeFrame = page.frameLocator('iframe[name*="stripe"], iframe[title*="Secure payment input"]').first();
    
    // Try to find and fill card number field in iframe
    // Note: Stripe Elements may use different selectors, so we'll try multiple approaches
    try {
      // Approach 1: Look for card number input in iframe
      const cardNumberField = stripeFrame.locator('input[name="cardnumber"], input[placeholder*="Card number"], input[autocomplete="cc-number"]');
      if (await cardNumberField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cardNumberField.fill('4242 4242 4242 4242');
      } else {
        // Approach 2: Use a more generic selector
        const anyInput = stripeFrame.locator('input').first();
        if (await anyInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await anyInput.fill('4242 4242 4242 4242');
        }
      }

      // Fill expiry date (if separate field)
      const expiryField = stripeFrame.locator('input[name="exp-date"], input[placeholder*="MM / YY"], input[autocomplete="cc-exp"]');
      if (await expiryField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expiryField.fill('12/34');
      }

      // Fill CVC (if separate field)
      const cvcField = stripeFrame.locator('input[name="cvc"], input[placeholder*="CVC"], input[autocomplete="cc-csc"]');
      if (await cvcField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cvcField.fill('123');
      }
    } catch (error) {
      // If iframe approach doesn't work, try filling in the main page
      // Some implementations may not use iframes
      console.log('Iframe approach failed, trying main page inputs...');
      
      const cardInput = page.locator('input[name*="card"], input[placeholder*="Card"], input[autocomplete="cc-number"]').first();
      if (await cardInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cardInput.fill('4242 4242 4242 4242');
      }
    }

    // ============================================
    // STEP 5: Submit the form
    // ============================================
    const saveButton = page.getByRole('button', { name: /save payment method|add card|submit/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    
    // Mock the setup intent confirmation to succeed
    await page.route('**/api/stripe-connect/setup-intent/confirm', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          paymentMethodId: 'pm_test_123',
        }),
      });
    });

    // Click save button
    await saveButton.click();

    // ============================================
    // STEP 6: Assert "Payment Method Saved" toast
    // ============================================
    // Wait for success toast/message
    const successMessage = page.getByText(/payment method saved|payment method added|successfully added/i);
    await expect(successMessage.first()).toBeVisible({ timeout: 15000 });

    // Additional verification: Check that the form is closed or payment method appears in list
    await page.waitForTimeout(2000);
    
    // Verify we're back to the payment methods list or form is hidden
    const addButtonAgain = page.getByRole('button', { name: /add payment method|add card/i }).first();
    // The button should be visible again (form closed) OR payment method should be listed
    const paymentMethodList = page.getByText(/payment method|card ending/i);
    const isFormClosed = await addButtonAgain.isVisible({ timeout: 3000 }).catch(() => false);
    const isMethodListed = await paymentMethodList.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(isFormClosed || isMethodListed).toBeTruthy();
  });
});
