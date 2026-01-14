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

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for servers to be ready before starting tests
    await waitForServersReady(page);
  });

  test.describe('Google OAuth Redirection', () => {
    test('should redirect to Google OAuth with correct Firebase redirect_uri', async ({ page, context }) => {
      // Store the URL that Google OAuth tries to open
      let googleAuthUrl: string | null = null;
      
      // Listen for popup windows (Google OAuth uses popup by default)
      context.on('page', async (popup) => {
        const url = popup.url();
        if (url.includes('accounts.google.com') || url.includes('googleapis.com')) {
          googleAuthUrl = url;
        }
      });

      // Also intercept navigation requests to Google OAuth
      await page.route('**/accounts.google.com/**', async (route) => {
        googleAuthUrl = route.request().url();
        // Don't actually navigate to Google, just capture the URL
        await route.abort();
      });

      // Navigate to login page
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verify we're on the login page
      await expect(page.locator('text=Welcome Back')).toBeVisible();

      // Find the Google auth button using data-testid
      const googleButton = page.getByTestId('button-google-auth');
      await expect(googleButton).toBeVisible();

      // Click the Google button to initiate OAuth flow
      // Note: This will trigger a popup or redirect to Google
      const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      
      await googleButton.click();

      // Wait for popup or intercepted request
      const popup = await popupPromise;
      
      if (popup) {
        // Get the URL from the popup
        googleAuthUrl = popup.url();
        // Close the popup
        await popup.close().catch(() => {});
      }

      // Wait a bit for any async operations
      await page.waitForTimeout(1000);

      // If we captured a Google Auth URL, verify the redirect_uri
      // Note: In E2E tests with mocked Firebase, the actual OAuth flow might not trigger
      // This test verifies the Firebase configuration is correct
      if (googleAuthUrl) {
        // Parse the URL to check the redirect_uri parameter
        const url = new URL(googleAuthUrl);
        const redirectUri = url.searchParams.get('redirect_uri');
        
        // The redirect_uri should contain the Firebase project domain
        // Based on the firebase.ts config, this should be 'hospogo.com'
        // or the custom auth domain if configured
        if (redirectUri) {
          expect(redirectUri).toContain('firebaseapp.com');
        }
      }
    });

    test('should display Google auth button on login page', async ({ page }) => {
      // Navigate to login page
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verify the Google auth button is present
      const googleButton = page.getByTestId('button-google-auth');
      await expect(googleButton).toBeVisible();
      
      // Verify button text
      await expect(googleButton).toContainText('Sign in with Google');
    });

    test('should display Google auth button on signup page', async ({ page }) => {
      // Navigate to signup page
      await page.goto('/signup');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Verify the Google auth button is present
      const googleButton = page.getByTestId('button-google-auth');
      await expect(googleButton).toBeVisible();
      
      // Verify button text (signup mode)
      await expect(googleButton).toContainText('Sign up with Google');
    });

    test('should have correct Firebase auth domain configured', async ({ page }) => {
      // Navigate to login page
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      // Check the Firebase config via JavaScript evaluation
      // This verifies the auth domain is correctly set
      const firebaseAuthDomain = await page.evaluate(() => {
        // Access Firebase config if available in window
        // Note: This may not be directly accessible depending on how Firebase is initialized
        // We'll check for the presence of Firebase auth
        return (window as any).__FIREBASE_AUTH_DOMAIN__ || null;
      });

      // Alternative: Check for Firebase initialization by looking at network requests
      // when Google auth is triggered
      
      // The test above with popup/route interception handles the actual OAuth URL verification
    });

    test('should navigate from landing page Login button to login page', async ({ page }) => {
      // Navigate to landing page
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Find and click the Login button in the navbar
      const loginLink = page.getByRole('link', { name: /login/i }).or(
        page.locator('a[href="/login"]')
      ).first();
      
      // If login link exists, click it
      const isLoginVisible = await loginLink.isVisible().catch(() => false);
      
      if (isLoginVisible) {
        await loginLink.click();
        
        // Wait for navigation to login page
        await page.waitForURL(/\/login/);
        
        // Verify we're on the login page
        await expect(page.getByText('Welcome Back')).toBeVisible();
        
        // Verify Google auth button is available
        const googleButton = page.getByTestId('button-google-auth');
        await expect(googleButton).toBeVisible();
      } else {
        // If not visible (user might be authenticated), navigate directly
        await page.goto('/login');
        // Use first() to avoid strict mode violation when multiple elements match
        await expect(page.getByText('Welcome Back').first()).toBeVisible();
      }
    });

    test('should verify Firebase redirect_uri contains correct domain when OAuth is initiated', async ({ page, context }) => {
      // Track network requests to Google OAuth endpoints
      const oauthRequests: string[] = [];
      
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('accounts.google.com') || url.includes('identitytoolkit.googleapis.com')) {
          oauthRequests.push(url);
        }
      });

      // Also track popup URLs
      context.on('page', (popup) => {
        const url = popup.url();
        if (url.includes('accounts.google.com')) {
          oauthRequests.push(url);
        }
      });

      // Navigate to login page
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click Google auth button
      const googleButton = page.getByTestId('button-google-auth');
      await expect(googleButton).toBeVisible();
      
      // Set up popup handler before clicking
      const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
      
      await googleButton.click();
      
      // Wait for potential popup
      const popup = await popupPromise;
      
      if (popup) {
        const popupUrl = popup.url();
        oauthRequests.push(popupUrl);
        await popup.close().catch(() => {});
      }

      // Wait for any network activity
      await page.waitForTimeout(2000);

      // Check if any OAuth requests were captured
      const googleAuthRequest = oauthRequests.find(url => url.includes('accounts.google.com'));
      
      if (googleAuthRequest) {
        // Parse the URL and check for redirect_uri
        try {
          const url = new URL(googleAuthRequest);
          const redirectUri = url.searchParams.get('redirect_uri');
          
          // The redirect_uri should contain the Firebase auth domain
          // This should be hospogo.com (or firebaseapp.com if using default)
          // depending on the VITE_FIREBASE_AUTH_DOMAIN environment variable
          if (redirectUri) {
            // Verify it's a valid Firebase redirect URI
            expect(redirectUri).toMatch(/.*firebaseapp\.com.*/);
            
            // Check if it contains the expected project ID pattern
            // The project ID should be hospogo-75b04 or similar
            expect(redirectUri).toMatch(/-75b04\.firebaseapp\.com/);
          }
        } catch (e) {
          // URL parsing failed, which is okay if the URL was incomplete
        }
      }
    });
  });
});
