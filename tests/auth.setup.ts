import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global Setup: Authenticate once and save session state
 * 
 * This runs before all tests to authenticate a user and save the session
 * state (cookies, localStorage) so tests don't need to log in repeatedly.
 */
async function globalSetup(config: FullConfig) {
  console.log('🔐 Global Setup: Authenticating test user...');

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3002';
  const testEmail = process.env.TEST_EMAIL || 'test@snipshift.com';
  const testPassword = process.env.TEST_PASSWORD || 'password123';

  // Create a new browser context
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log(`📝 Navigating to login page: ${baseURL}/login`);
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for login form to be visible
    const emailInput = page.getByTestId('input-email').or(page.locator('input[type="email"]')).first();
    const passwordInput = page.getByTestId('input-password').or(page.locator('input[type="password"]')).first();

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

    console.log('✍️  Filling in credentials...');
    // Fill in credentials
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    // Click sign in button
    const signInButton = page.getByTestId('button-signin').or(
      page.getByRole('button', { name: /sign in/i })
    ).first();
    
    await signInButton.click();

    // Wait for navigation away from login page
    console.log('⏳ Waiting for authentication...');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // If redirected to role selection, select professional role
    if (page.url().includes('/role-selection')) {
      console.log('👤 Selecting professional role...');
      const professionalButton = page.getByRole('button', { name: /professional/i }).or(
        page.locator('button:has-text("Professional")')
      ).first();

      if (await professionalButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await professionalButton.click();
        await page.waitForTimeout(2000);
        await page.waitForURL((url) => !url.pathname.includes('/role-selection'), { timeout: 10000 });
      }
    }

    // Verify we're authenticated by checking if we're on a dashboard
    let currentUrl = page.url();
    const isAuthenticated = !currentUrl.includes('/login') && !currentUrl.includes('/role-selection');
    
    if (!isAuthenticated) {
      throw new Error(`Authentication failed. Current URL: ${currentUrl}`);
    }

    // If we're on hub-dashboard or need to ensure professional role, use API to set role
    if (currentUrl.includes('/hub-dashboard') || currentUrl.includes('/role-selection')) {
      console.log('🔄 Setting user role to professional via API...');
      
      // Get auth token from localStorage
      const authToken = await page.evaluate(() => {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('firebase:authUser') ||
               document.cookie.match(/authToken=([^;]+)/)?.[1];
      });

      if (authToken) {
        try {
          // Get user ID from /api/me
          const meResponse = await page.request.get(`${baseURL}/api/me`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          });

          if (meResponse.ok()) {
            const userData = await meResponse.json();
            const userId = userData.id;

            // Update current role to professional via API
            const roleResponse = await page.request.patch(`${baseURL}/api/users/${userId}/current-role`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              data: {
                role: 'professional',
              },
            });

            if (roleResponse.ok()) {
              console.log('✅ Successfully set role to professional via API');
              // Refresh the page to get updated role
              await page.reload();
              await page.waitForLoadState('domcontentloaded');
              await page.waitForTimeout(2000);
              currentUrl = page.url();
            } else {
              console.log('⚠️  Failed to set role via API, trying UI approach...');
            }
          }
        } catch (error) {
          console.log('⚠️  Error setting role via API:', error);
        }
      }

      // Fallback: Try UI approach if API didn't work
      if (currentUrl.includes('/hub-dashboard') || currentUrl.includes('/role-selection')) {
        console.log('🔄 Attempting to switch role via UI...');
        await page.goto(`${baseURL}/professional-dashboard`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        currentUrl = page.url();
        
        if (currentUrl.includes('/hub-dashboard') || currentUrl.includes('/role-selection')) {
          await page.goto(`${baseURL}/role-selection`);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000);
          
          const professionalButton = page.getByRole('button', { name: /professional/i }).or(
            page.locator('button:has-text("Professional")')
          ).first();
          
          if (await professionalButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await professionalButton.click();
            await page.waitForTimeout(2000);
            await page.waitForURL((url) => url.pathname.includes('/professional-dashboard'), { timeout: 10000 });
            currentUrl = page.url();
          }
        }
      }
    }

    console.log(`✅ Authentication successful! Current URL: ${currentUrl}`);

    // Save storage state to file
    const storageStatePath = path.join(__dirname, 'storageState.json');
    await context.storageState({ path: storageStatePath });
    console.log(`💾 Session state saved to: ${storageStatePath}`);

    await browser.close();
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    // Take a screenshot for debugging
    await page.screenshot({ path: path.join(__dirname, 'auth-setup-failure.png'), fullPage: true });
    await browser.close();
    throw error;
  }
}

export default globalSetup;

