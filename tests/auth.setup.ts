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
 * and the app hydrates auth state from `sessionStorage['snipshift_test_user']`.
 */
async function globalSetup(config: FullConfig) {
  console.log('🔐 Global Setup: Preparing E2E authenticated state...');

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const testEmail = process.env.TEST_EMAIL || 'test@snipshift.com';

  // Wait for servers to be ready before starting
  console.log('⏳ Waiting for servers to be ready...');
  const maxWaitTime = 120000; // 2 minutes
  const startTime = Date.now();
  let serversReady = false;

  while (Date.now() - startTime < maxWaitTime && !serversReady) {
    try {
      const frontendResponse = await fetch(`${baseURL}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      const apiResponse = await fetch('http://localhost:5000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (frontendResponse?.ok && apiResponse?.ok) {
        console.log('✅ Servers are ready!');
        serversReady = true;
        break;
      }

      console.log('⏳ Waiting for servers...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch {
      console.log('⏳ Servers not ready, retrying...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (!serversReady) {
    throw new Error('Servers did not become ready within timeout period');
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
        'snipshift_test_user',
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

    await page.reload({ waitUntil: 'networkidle' });

    // Save storage state to file
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
            value: sessionStorage.getItem(key) || '',
          });
        }
      }
      return items;
    });

    const enhancedStorageState = {
      ...storageState,
      sessionStorage: sessionStorageItems,
    };

    fs.writeFileSync(storageStatePath, JSON.stringify(enhancedStorageState, null, 2));
    console.log(`💾 Session state saved to: ${storageStatePath}`);
    console.log(`📋 SessionStorage items saved: ${sessionStorageItems.length}`);

    await browser.close();
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    await page.screenshot({ path: path.join(__dirname, 'auth-setup-failure.png'), fullPage: true });
    await browser.close();
    throw error;
  }
}

export default globalSetup;
