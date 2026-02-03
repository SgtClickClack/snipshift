import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global Setup: Prepare an authenticated E2E session.
 *
 * We intentionally avoid brittle UI-driven Firebase auth in automation.
 * During Playwright runs we set `VITE_E2E=1` (see `playwright.config.ts`),
 * and the app hydrates auth state from `sessionStorage['hospogo_test_user']`.
 */
async function globalSetup(config: FullConfig) {
  console.log('ðŸ” Global Setup: Preparing E2E authenticated state...');

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const testEmail = process.env.TEST_EMAIL || 'test@hospogo.com';

  // Wait for frontend to be ready before starting
  // Note: Tests use mocked API routes via Playwright's page.route(), so we only need the frontend
  console.log('â³ Waiting for frontend to be ready...');
  const maxWaitTime = 120000; // 2 minutes
  const startTime = Date.now();
  let frontendReady = false;

  while (Date.now() - startTime < maxWaitTime && !frontendReady) {
    try {
      const frontendResponse = await fetch(`${baseURL}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (frontendResponse?.ok) {
        console.log('âœ… Frontend is ready!');
        frontendReady = true;
        break;
      }

      console.log('â³ Waiting for frontend...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch {
      console.log('â³ Frontend not ready, retrying...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (!frontendReady) {
    throw new Error('Frontend did not become ready within timeout period');
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Set E2E user in sessionStorage (app hydrates this when VITE_E2E=1)
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.evaluate((email) => {
      try {
        localStorage.setItem('E2E_MODE', 'true');
      } catch {
        // ignore
      }

      sessionStorage.setItem(
        'hospogo_test_user',
        JSON.stringify({
          id: 'e2e-user-0001',
          email,
          name: 'E2E Test User',
          roles: ['professional'],
          currentRole: 'professional',
          isOnboarded: true,
        })
      );
    }, testEmail);

    // ================================================
    // DEFENSIVE GLOBAL SETUP: Wait for backend handshake
    // ================================================
    // Wait for /api/me or /api/auth/session endpoint to ensure backend is ready
    console.log('🔄 Waiting for backend handshake...');
    try {
      await page.waitForResponse(
        (response) => {
          const url = response.url();
          return (
            (url.includes('/api/me') || url.includes('/api/auth/session')) &&
            response.status() === 200
          );
        },
        { timeout: 30000 }
      ).catch(() => {
        // If the endpoint isn't called automatically, make a manual request
        console.log('⚠️  Auto-handshake not detected, making manual request...');
      });

      // Verify database user record exists by making a direct API call
      const apiBaseURL = baseURL.replace(':3000', ':5000'); // API runs on port 5000
      const meResponse = await page.request.get(`${apiBaseURL}/api/me`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => null);

      if (meResponse && meResponse.ok()) {
        const userData = await meResponse.json();
        console.log(`✅ Backend handshake complete. User record verified: ${userData.email || 'N/A'}`);
      } else {
        console.log('⚠️  Could not verify user record via API (this may be expected in E2E mode)');
      }
    } catch (error) {
      console.log('⚠️  Backend handshake check failed (may be expected in E2E mode):', error);
      // Don't fail the setup if this check fails - E2E mode may use mocked APIs
    }

    // Save storage state to file
    const storageStatePath = path.join(__dirname, 'storageState.json');
    
    // Get sessionStorage BEFORE reload (to avoid access issues)
    const sessionStorageItems = await page.evaluate(() => {
      try {
        const items: Array<{ name: string; value: string }> = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            items.push({
              name: key,
              value: sessionStorage.getItem(key) || '',
            });
          }
        }
        return items;
      } catch (error) {
        console.error('Error accessing sessionStorage:', error);
        return [];
      }
    });

    await page.reload({ waitUntil: 'networkidle' });

    const storageState = await context.storageState();

    const enhancedStorageState = {
      ...storageState,
      sessionStorage: sessionStorageItems,
    };

    fs.writeFileSync(storageStatePath, JSON.stringify(enhancedStorageState, null, 2));
    console.log(`ðŸ’¾ Session state saved to: ${storageStatePath}`);
    console.log(`ðŸ“‹ SessionStorage items saved: ${sessionStorageItems.length}`);

    await browser.close();
  } catch (error) {
    console.error('âŒ Authentication setup failed:', error);
    await page.screenshot({ path: path.join(__dirname, 'auth-setup-failure.png'), fullPage: true });
    await browser.close();
    throw error;
  }
}

export default globalSetup;
