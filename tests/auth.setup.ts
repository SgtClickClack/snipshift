import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
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
      
      // FIRST: Immediately update sessionStorage to set currentRole to professional
      // CRITICAL: AuthContext uses roles[0] as currentRole, so 'professional' must be first!
      console.log('📝 Updating sessionStorage with professional role...');
      await page.evaluate(() => {
        const stored = sessionStorage.getItem('snipshift_test_user');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            const roles = Array.isArray(data.roles) ? data.roles : [];
            // Ensure 'professional' is FIRST in the array (AuthContext uses roles[0] as currentRole)
            const hasProfessional = roles.includes('professional');
            const newRoles = hasProfessional 
              ? ['professional', ...roles.filter(r => r !== 'professional')]
              : ['professional', ...roles];
            
            sessionStorage.setItem('snipshift_test_user', JSON.stringify({
              ...data,
              currentRole: 'professional',
              roles: newRoles
            }));
          } catch (e) {
            console.error('Failed to update sessionStorage', e);
            // Create new entry if parsing fails
            sessionStorage.setItem('snipshift_test_user', JSON.stringify({
              roles: ['professional'],
              isOnboarded: true,
              currentRole: 'professional'
            }));
          }
        } else {
          // Create new sessionStorage entry if it doesn't exist
          sessionStorage.setItem('snipshift_test_user', JSON.stringify({
            roles: ['professional'],
            isOnboarded: true,
            currentRole: 'professional'
          }));
        }
      });
      
      // Verify sessionStorage was updated
      const sessionCheck = await page.evaluate(() => {
        const stored = sessionStorage.getItem('snipshift_test_user');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            return data.currentRole === 'professional';
          } catch (e) {
            return false;
          }
        }
        return false;
      });
      
      if (sessionCheck) {
        console.log('✅ SessionStorage updated with professional role');
      } else {
        console.log('⚠️  SessionStorage update may have failed, continuing anyway...');
      }
      
      // Reload page to apply sessionStorage changes BEFORE navigating
      console.log('🔄 Reloading page to apply role change...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Navigate to professional dashboard
      console.log('📍 Navigating to professional dashboard...');
      await page.goto(`${baseURL}/professional-dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      currentUrl = page.url();
      
      // If still redirected, try API approach as fallback
      if (currentUrl.includes('/hub-dashboard') || currentUrl.includes('/role-selection')) {
        console.log('⚠️  Still redirected after sessionStorage update, trying API approach...');
        const authToken = await page.evaluate(() => {
          return localStorage.getItem('authToken') || 
                 localStorage.getItem('firebase:authUser') ||
                 document.cookie.match(/authToken=([^;]+)/)?.[1];
        });

        if (authToken) {
          try {
            const meResponse = await page.request.get(`${baseURL}/api/me`, {
              headers: { 'Authorization': `Bearer ${authToken}` },
            });

            if (meResponse.ok()) {
              const userData = await meResponse.json();
              const userId = userData.id;
              const userRoles = userData.roles || [];
              const hasProfessionalRole = userRoles.includes('professional');
              
              console.log(`📋 User ID: ${userId}, Roles: ${JSON.stringify(userRoles)}, Current Role: ${userData.currentRole || userData.role}`);
              
              if (hasProfessionalRole) {
                try {
                  const roleResponse = await page.request.patch(`${baseURL}/api/users/${userId}/current-role`, {
                    headers: {
                      'Authorization': `Bearer ${authToken}`,
                      'Content-Type': 'application/json',
                    },
                    data: { role: 'professional' },
                  });

                  if (roleResponse.ok()) {
                    console.log('✅ Successfully synced professional role with backend');
                    // Update sessionStorage again after API call
                    // CRITICAL: Ensure 'professional' is FIRST in roles array
                    await page.evaluate(() => {
                      const stored = sessionStorage.getItem('snipshift_test_user');
                      if (stored) {
                        try {
                          const data = JSON.parse(stored);
                          const roles = Array.isArray(data.roles) ? data.roles : [];
                          const newRoles = roles.includes('professional')
                            ? ['professional', ...roles.filter(r => r !== 'professional')]
                            : ['professional', ...roles];
                          
                          sessionStorage.setItem('snipshift_test_user', JSON.stringify({
                            ...data,
                            currentRole: 'professional',
                            roles: newRoles
                          }));
                        } catch (e) {
                          console.error('Failed to update sessionStorage', e);
                        }
                      }
                    });
                    await page.reload();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(2000);
                    await page.goto(`${baseURL}/professional-dashboard`);
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(2000);
                    currentUrl = page.url();
                  }
                } catch (apiError) {
                  console.log('⚠️  Backend sync failed:', apiError);
                }
              }
            }
          } catch (error) {
            console.log('⚠️  Error checking user roles via API:', error);
          }
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
    
    // If we're on the professional dashboard URL, that's sufficient
    // The actual page content will be verified in the tests
    if (finalUrl.includes('/professional-dashboard')) {
      console.log(`✅ Successfully accessed professional dashboard at: ${finalUrl}`);
    } else {
      // Take a screenshot for debugging
      await page.screenshot({ path: path.join(__dirname, 'auth-setup-verification-failure.png'), fullPage: true });
      throw new Error(`Unexpected URL after navigation. Expected /professional-dashboard, got: ${finalUrl}`);
    }

    // CRITICAL: Poll sessionStorage to verify currentRole is set to 'professional'
    // This ensures the role is persisted before saving the session state
    console.log('🔍 Polling sessionStorage to verify currentRole is set to "professional"...');
    
    const roleVerified = await page.waitForFunction(
      () => {
        try {
          const stored = sessionStorage.getItem('snipshift_test_user');
          if (!stored) return false;
          const data = JSON.parse(stored);
          return data.currentRole === 'professional';
        } catch (e) {
          return false;
        }
      },
      { timeout: 15000, polling: 500 }
    ).then(() => true).catch(() => false);

    if (!roleVerified) {
      // Try to manually set it one more time
      console.log('⚠️  Role not found in sessionStorage, attempting to set it...');
      await page.evaluate(() => {
        const stored = sessionStorage.getItem('snipshift_test_user');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            sessionStorage.setItem('snipshift_test_user', JSON.stringify({
              ...data,
              currentRole: 'professional',
              roles: Array.isArray(data.roles) && data.roles.includes('professional') 
                ? data.roles 
                : [...(data.roles || []), 'professional']
            }));
          } catch (e) {
            console.error('Failed to update sessionStorage', e);
          }
        } else {
          sessionStorage.setItem('snipshift_test_user', JSON.stringify({
            roles: ['professional'],
            isOnboarded: true,
            currentRole: 'professional'
          }));
        }
      });
      
      // Wait a bit and verify again
      await page.waitForTimeout(1000);
      const finalCheck = await page.evaluate(() => {
        try {
          const stored = sessionStorage.getItem('snipshift_test_user');
          if (!stored) return false;
          const data = JSON.parse(stored);
          return data.currentRole === 'professional';
        } catch (e) {
          return false;
        }
      });
      
      if (!finalCheck) {
        throw new Error('Failed to set currentRole to "professional" in sessionStorage. Cannot proceed with test setup.');
      }
    }
    
    // Final verification: Read the actual sessionStorage value
    const sessionData = await page.evaluate(() => {
      const stored = sessionStorage.getItem('snipshift_test_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    
    if (sessionData && sessionData.currentRole === 'professional') {
      console.log(`✅ SessionStorage verified: currentRole is "${sessionData.currentRole}"`);
      console.log(`📋 Roles: ${JSON.stringify(sessionData.roles || [])}`);
    } else {
      throw new Error(`SessionStorage verification failed. Expected currentRole: "professional", got: ${JSON.stringify(sessionData)}`);
    }

    // Save storage state to file - only after verification passes
    const storageStatePath = path.join(__dirname, 'storageState.json');
    const storageState = await context.storageState();
    
    // Manually add sessionStorage to storageState (Playwright doesn't include it by default)
    const sessionStorageItems = await page.evaluate(() => {
      const items: Array<{ name: string; value: string }> = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          items.push({
            name: key,
            value: sessionStorage.getItem(key) || ''
          });
        }
      }
      return items;
    });
    
    // Add sessionStorage to the storage state
    const enhancedStorageState = {
      ...storageState,
      sessionStorage: sessionStorageItems
    };
    
    // Write the enhanced storage state to file
    fs.writeFileSync(storageStatePath, JSON.stringify(enhancedStorageState, null, 2));
    console.log(`💾 Session state saved to: ${storageStatePath}`);
    console.log(`📋 SessionStorage items saved: ${sessionStorageItems.length}`);

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

