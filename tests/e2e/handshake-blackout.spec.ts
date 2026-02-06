import { test, expect } from '@playwright/test';

type InstallationsRequest = {
  url: string;
  timestamp: number;
};

test.describe('Handshake Blackout Validation', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Metric capture uses desktop Chromium.');
  });

  let installationsRequests: InstallationsRequest[];

  test.beforeEach(async ({ page }) => {
    installationsRequests = [];

    await page.route('**/*firebaseinstallations*', async (route) => {
      installationsRequests.push({
        url: route.request().url(),
        timestamp: Date.now(),
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    });
  });

  test('blocks installations during briefing window + fast unlock', async ({ page }) => {
    let handshakeMs: number | null = null;
    const timerRegex = /Handshake-to-Unlock:\s*([\d.]+)ms/i;

    page.on('console', (msg) => {
      const match = msg.text().match(timerRegex);
      if (match) {
        handshakeMs = Number(match[1]);
      }
    });

    await page.addInitScript(() => {
      const e2eUser = {
        id: 'e2e-user-0001',
        email: 'test@hospogo.com',
        name: 'E2E Test User',
        roles: ['professional'],
        currentRole: 'professional',
        isOnboarded: true,
      };
      try {
        localStorage.setItem('hospogo_test_user', JSON.stringify(e2eUser));
        sessionStorage.setItem('hospogo_test_user', JSON.stringify(e2eUser));
        localStorage.setItem('E2E_MODE', 'true');
      } catch {
        // Non-fatal: storage might be blocked in some browsers
      }

      (window as Window & { __is_briefing_mode?: boolean }).__is_briefing_mode = true;

      const timeStore = new Map<string, number>();
      const originalTime = console.time.bind(console);
      const originalTimeEnd = console.timeEnd.bind(console);

      console.time = (label?: string) => {
        if (label) {
          timeStore.set(label, performance.now());
        }
        originalTime(label);
      };

      console.timeEnd = (label?: string) => {
        if (label) {
          const start = timeStore.get(label);
          if (start !== undefined) {
            const duration = performance.now() - start;
            (window as Window & { __handshake_duration_ms?: number }).__handshake_duration_ms = duration;
            console.log(`${label}: ${duration.toFixed(3)}ms`);
          }
        }
        originalTimeEnd(label);
      };

    });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5200);

    const breachDetected = installationsRequests.some(
      (request) => request.timestamp - startTime < 5000
    );
    expect(
      breachDetected,
      'Blackout Breach: Installations API detected in critical window.'
    ).toBe(false);

    await expect
      .poll(() => handshakeMs, { timeout: 10000 })
      .not.toBeNull();
    const finalHandshakeMs = handshakeMs as number;
    console.log(`Handshake-to-Unlock: ${finalHandshakeMs.toFixed(3)}ms`);
    expect(finalHandshakeMs).toBeLessThan(500);
  });

  test('installations initialize after load or 5s when not briefing', async ({ page }) => {
    await page.addInitScript(() => {
      const e2eUser = {
        id: 'e2e-user-0001',
        email: 'test@hospogo.com',
        name: 'E2E Test User',
        roles: ['professional'],
        currentRole: 'professional',
        isOnboarded: true,
      };
      try {
        localStorage.setItem('hospogo_test_user', JSON.stringify(e2eUser));
        sessionStorage.setItem('hospogo_test_user', JSON.stringify(e2eUser));
        localStorage.setItem('E2E_MODE', 'true');
      } catch {
        // Non-fatal: storage might be blocked in some browsers
      }

      (window as Window & { __is_briefing_mode?: boolean }).__is_briefing_mode = false;
    });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForLoadState('load');
    const loadTime = Date.now();

    await page.waitForFunction(
      () =>
        (window as Window & {
          __firebase_installations_attempted?: boolean;
          __firebase_installations_failed?: boolean;
        }).__firebase_installations_attempted === true ||
        (window as Window & {
          __firebase_installations_attempted?: boolean;
          __firebase_installations_failed?: boolean;
        }).__firebase_installations_failed === true,
      { timeout: 10000 }
    );

    const installationsAttempted = await page.evaluate(
      () =>
        (window as Window & {
          __firebase_installations_attempted?: boolean;
        }).__firebase_installations_attempted === true
    );

    const hasRequest = installationsRequests.length > 0;
    expect(hasRequest || installationsAttempted).toBe(true);

    if (hasRequest) {
      const firstRequestAt = installationsRequests[0].timestamp;
      const afterLoad = firstRequestAt >= loadTime;
      const afterDelay = firstRequestAt - startTime >= 5000;
      expect(afterLoad || afterDelay).toBe(true);
    }

    await page.waitForFunction(
      () =>
        (window as Window & { __firebase_messaging_attempted?: boolean })
          .__firebase_messaging_attempted === true,
      { timeout: 10000 }
    );
  });
});
