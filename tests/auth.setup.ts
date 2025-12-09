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

    // If we're on hub-dashboard or need to ensure professional role, set role
    if (currentUrl.includes('/hub-dashboard') || currentUrl.includes('/role-selection')) {
      console.log('🔄 Setting user role to professional...');
      
      // First, try to get user info and check if they already have professional role
      const authToken = await page.evaluate(() => {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('firebase:authUser') ||
               document.cookie.match(/authToken=([^;]+)/)?.[1];
      });

      let hasProfessionalRole = false;
      let userId: string | null = null;

      if (authToken) {
        try {
          const meResponse = await page.request.get(`${baseURL}/api/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          });

          if (meResponse.ok()) {
            const userData = await meResponse.json();
            userId = userData.id;
            const userRoles = userData.roles || [];
            hasProfessionalRole = userRoles.includes('professional');
            
            console.log(`📋 User ID: ${userId}, Roles: ${JSON.stringify(userRoles)}, Current Role: ${userData.currentRole || userData.role}`);
            
            // If user already has professional role, just switch to it
            if (hasProfessionalRole) {
              console.log('✅ User already has professional role, switching to it...');
              const roleResponse = await page.request.patch(`${baseURL}/api/users/${userId}/current-role`, {
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                },
                data: { role: 'professional' },
              });

              if (roleResponse.ok()) {
                console.log('✅ Successfully switched to professional role via API');
                await page.waitForTimeout(2000);
                await page.reload();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
                await page.goto(`${baseURL}/professional-dashboard`);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
                currentUrl = page.url();
              }
            }
          }
        } catch (error) {
          console.log('⚠️  Error checking user roles:', error);
        }
      }

      // If user doesn't have professional role or API didn't work, use UI
      if (!hasProfessionalRole || currentUrl.includes('/hub-dashboard') || currentUrl.includes('/role-selection')) {
        console.log('🔄 Adding professional role via UI...');
        
        // Navigate to role selection page
        await page.goto(`${baseURL}/role-selection`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // Find and click the professional role card (uses data-testid)
        const professionalCard = page.getByTestId('button-select-professional');
        const cardVisible = await professionalCard.isVisible({ timeout: 10000 }).catch(() => false);
        
        if (cardVisible) {
          console.log('👆 Clicking Professional role card...');
          await professionalCard.click();
          await page.waitForTimeout(1000);
          
          // Click the Continue button
          const continueButton = page.getByTestId('button-continue');
          const continueVisible = await continueButton.isVisible({ timeout: 5000 }).catch(() => false);
          
          if (continueVisible) {
            console.log('👆 Clicking Continue button...');
            await continueButton.click();
            
            // Wait for navigation to professional dashboard
            await page.waitForURL((url) => url.pathname.includes('/professional-dashboard'), { timeout: 15000 });
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
            currentUrl = page.url();
            
            if (currentUrl.includes('/professional-dashboard')) {
              console.log('✅ Successfully added and selected professional role via UI');
            } else {
              console.log(`⚠️  Clicked continue but redirected to: ${currentUrl}`);
            }
          } else {
            console.log('⚠️  Continue button not found');
          }
        } else {
          console.log('⚠️  Professional role card not found on role-selection page');
        }
      }
    }

    // Final assertion: Explicitly navigate to professional dashboard and verify access
    console.log('🔍 Verifying professional role access...');
    await page.goto(`${baseURL}/professional-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    
    // Check if we were redirected away from professional dashboard
    if (finalUrl.includes('/login') || finalUrl.includes('/role-selection') || finalUrl.includes('/hub-dashboard')) {
      throw new Error(`Failed to access professional dashboard. Final URL: ${finalUrl}. Role may not be set correctly.`);
    }
    
    // Verify we're on the professional dashboard by checking for a required element
    // Look for the "Overview" tab or "Professional Dashboard" title
    const overviewTab = page.getByTestId('tab-overview');
    const dashboardTitle = page.getByText('Professional Dashboard', { exact: false });
    
    const hasOverviewTab = await overviewTab.isVisible({ timeout: 10000 }).catch(() => false);
    const hasDashboardTitle = await dashboardTitle.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (!hasOverviewTab && !hasDashboardTitle) {
      // Take a screenshot for debugging
      await page.screenshot({ path: path.join(__dirname, 'auth-setup-verification-failure.png'), fullPage: true });
      throw new Error('Professional dashboard elements not found. Screenshot saved. Role may not be set correctly.');
    }
    
    console.log(`✅ Professional role verified! Successfully accessed professional dashboard at: ${finalUrl}`);

    // Save storage state to file - only after verification passes
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

