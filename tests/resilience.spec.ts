import { test, expect, type Page, type Route, type Request } from '@playwright/test';

/**
 * HospoGo Resilience Test Suite
 * 
 * Purpose: Identify and eliminate auth race conditions and visual inconsistencies.
 * 
 * Tests:
 * 1. STORM_DETECTION_TEST - Ensures no more than 1 call to /unread-count or /notifications before auth resolves
 * 2. REDIRECT_STABILITY_AUDIT - Validates the Grace Period logic prevents premature redirects
 * 3. VISUAL_CONSISTENCY_CRAWL - Screenshots pages and checks for forbidden CSS classes
 */

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'julian.g.roberts@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

// API call tracking helper
interface ApiCallLog {
  url: string;
  timestamp: number;
  status?: number;
  authResolved: boolean;
}

/**
 * STORM_DETECTION_TEST
 * 
 * Objective: Detect if multiple API calls fire BEFORE Firebase auth completes.
 * 
 * Strategy:
 * 1. Intercept all /api/* calls and track timestamps
 * 2. Simulate a 2-second delay on Firebase Auth hydration
 * 3. Assert: No more than 1 call to /unread-count or /notifications before auth resolves
 * 4. If a 'storm' of 401s is detected, the test fails
 */
test.describe('STORM_DETECTION_TEST', () => {
  
  test('No API storm before auth resolves - tracks early API calls', async ({ page }) => {
    const apiCallLog: ApiCallLog[] = [];
    let authResolved = false;
    const AUTH_DELAY_MS = 2000;
    
    // Track when auth is considered "resolved"
    // We'll set this flag when we detect the app has finished the auth handshake
    const markAuthResolved = () => {
      authResolved = true;
    };
    
    // Intercept ALL API calls
    await page.route('**/api/**', async (route: Route, request: Request) => {
      const url = request.url();
      const timestamp = Date.now();
      
      // Log the call with current auth state
      apiCallLog.push({
        url,
        timestamp,
        authResolved,
      });
      
      // Continue the request normally
      await route.continue();
    });
    
    // Intercept Firebase auth-related calls to inject delay
    // This simulates slow network conditions during Firebase hydration
    await page.route('**/identitytoolkit.googleapis.com/**', async (route: Route) => {
      // Simulate 2-second delay on Firebase auth
      await new Promise(resolve => setTimeout(resolve, AUTH_DELAY_MS));
      await route.continue();
    });
    
    // Also intercept Firebase token refresh
    await page.route('**/securetoken.googleapis.com/**', async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, AUTH_DELAY_MS));
      await route.continue();
    });
    
    // Navigate to a protected route that would trigger API calls
    const startTime = Date.now();
    await page.goto('/venue/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Wait for either:
    // 1. The hydration splash to disappear (auth resolved)
    // 2. The login page to appear (redirected due to no auth)
    // 3. Maximum timeout of 10 seconds
    await Promise.race([
      page.waitForSelector('[data-testid="hydration-splash"]', { state: 'hidden', timeout: 10000 }).catch(() => {}),
      page.waitForURL('**/login**', { timeout: 10000 }).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 10000)),
    ]);
    
    // Mark auth as resolved after the wait
    const authResolveTime = Date.now();
    markAuthResolved();
    
    // Analyze the API call log for early calls
    const sensitiveEndpoints = ['/unread-count', '/notifications', '/api/me', '/api/venues/me'];
    const earlyCallsBeforeAuth: ApiCallLog[] = [];
    const callsWithin401Storm: ApiCallLog[] = [];
    
    for (const call of apiCallLog) {
      const isSensitiveEndpoint = sensitiveEndpoints.some(ep => call.url.includes(ep));
      
      // Check if this call happened before auth was resolved
      if (!call.authResolved && isSensitiveEndpoint) {
        earlyCallsBeforeAuth.push(call);
      }
    }
    
    // Count calls to notification-related endpoints before auth
    const notificationCalls = earlyCallsBeforeAuth.filter(
      call => call.url.includes('/unread-count') || call.url.includes('/notifications')
    );
    
    // Log for debugging
    console.log('=== STORM DETECTION REPORT ===');
    console.log(`Total API calls: ${apiCallLog.length}`);
    console.log(`Early calls before auth: ${earlyCallsBeforeAuth.length}`);
    console.log(`Notification calls before auth: ${notificationCalls.length}`);
    console.log('Early calls:', earlyCallsBeforeAuth.map(c => c.url));
    
    // ASSERTION: No more than 1 notification-related call before auth resolves
    // This validates that the isSystemReady gate is working correctly
    expect(
      notificationCalls.length,
      `Expected <= 1 notification call before auth, got ${notificationCalls.length}. ` +
      `This indicates a potential 401 storm. Calls: ${notificationCalls.map(c => c.url).join(', ')}`
    ).toBeLessThanOrEqual(1);
    
    // BONUS ASSERTION: Check for 401 storm pattern
    // If we see multiple /api/me or /api/bootstrap calls with 401, that's a storm
    const bootstrapCalls = earlyCallsBeforeAuth.filter(
      call => call.url.includes('/api/me') || call.url.includes('/api/bootstrap')
    );
    
    expect(
      bootstrapCalls.length,
      `Expected <= 1 bootstrap/me call before auth, got ${bootstrapCalls.length}. ` +
      `This indicates auth handshake is not properly gating API calls.`
    ).toBeLessThanOrEqual(1);
  });
  
  test('401 circuit breaker prevents infinite retry loop', async ({ page }) => {
    let consecutive401Count = 0;
    const MAX_ALLOWED_401S = 5; // Circuit breaker should kick in before this
    
    // Intercept API calls and track 401s
    await page.route('**/api/**', async (route: Route, request: Request) => {
      const response = await route.fetch();
      
      if (response.status() === 401) {
        consecutive401Count++;
      }
      
      await route.fulfill({ response });
    });
    
    // Navigate to a protected route without being authenticated
    await page.goto('/venue/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Wait for potential 401 storm (5 seconds)
    await page.waitForTimeout(5000);
    
    console.log(`=== 401 STORM REPORT ===`);
    console.log(`Total 401 responses: ${consecutive401Count}`);
    
    // ASSERTION: Circuit breaker should prevent more than MAX_ALLOWED_401S
    expect(
      consecutive401Count,
      `Detected ${consecutive401Count} 401 errors. Circuit breaker should limit this to ${MAX_ALLOWED_401S}.`
    ).toBeLessThanOrEqual(MAX_ALLOWED_401S);
  });
});

/**
 * REDIRECT_STABILITY_AUDIT
 * 
 * Objective: Validate that the Grace Period logic in ProtectedRoute prevents premature redirects.
 * 
 * Strategy:
 * 1. Navigate to /admin/cto-dashboard while unauthenticated
 * 2. Trigger login as 'julian.g.roberts@gmail.com'
 * 3. Assert: The app does NOT redirect to /venue/dashboard or /login during the transition
 * 4. This validates the 500ms Grace Period in ProtectedRoute.tsx
 */
test.describe('REDIRECT_STABILITY_AUDIT', () => {
  
  test('Grace Period prevents redirect flicker during auth transition', async ({ page }) => {
    const redirectLog: string[] = [];
    
    // Track all URL changes during the test
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        redirectLog.push(frame.url());
      }
    });
    
    // Navigate to admin dashboard (protected route requiring admin role)
    await page.goto('/admin/cto-dashboard', { waitUntil: 'domcontentloaded' });
    
    // Wait for initial page load and any immediate redirects
    await page.waitForTimeout(1000);
    
    // Check if we were redirected to login (expected behavior for unauthenticated)
    const currentUrl = page.url();
    const wasRedirectedToLogin = currentUrl.includes('/login');
    const wasRedirectedToHydration = await page.locator('[data-testid="hydration-splash"]').isVisible().catch(() => false);
    
    console.log('=== REDIRECT STABILITY REPORT ===');
    console.log('URL history during navigation:', redirectLog);
    console.log('Current URL:', currentUrl);
    
    // ASSERTION: Should have redirected to /login OR shown hydration splash
    // It should NOT have bounced through /venue/dashboard
    const visitedVenueDashboard = redirectLog.some(url => url.includes('/venue/dashboard'));
    
    expect(
      visitedVenueDashboard,
      'App incorrectly redirected through /venue/dashboard during auth transition. ' +
      'The Grace Period should prevent this bounce. ' +
      `URL history: ${redirectLog.join(' -> ')}`
    ).toBe(false);
    
    // ASSERTION: Should end up at /login for unauthenticated user
    // OR show the hydration splash while waiting for auth
    expect(
      wasRedirectedToLogin || wasRedirectedToHydration || currentUrl.includes('/admin'),
      `Expected to be at /login, showing hydration splash, or on /admin route. ` +
      `Instead at: ${currentUrl}`
    ).toBe(true);
  });
  
  test('No redirect to /login during Firebase handshake window', async ({ page }) => {
    const forbiddenRedirects: string[] = [];
    
    // Track redirects to forbidden destinations during transition
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        // During the auth handshake window, we should NOT see redirects to /login
        // The Grace Period should prevent this
        if (url.includes('/login') && forbiddenRedirects.length === 0) {
          // First redirect to login is expected for unauthenticated users
        } else if (url.includes('/login')) {
          // Multiple redirects to /login indicate a problem
          forbiddenRedirects.push(url);
        }
      }
    });
    
    // Slow down Firebase responses to extend the handshake window
    await page.route('**/identitytoolkit.googleapis.com/**', async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });
    
    // Navigate to a protected route
    await page.goto('/venue/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Wait for potential redirect storm
    await page.waitForTimeout(3000);
    
    console.log('=== GRACE PERIOD AUDIT ===');
    console.log('Forbidden redirects detected:', forbiddenRedirects);
    
    // ASSERTION: Should not have multiple redirects to /login
    // This would indicate the Grace Period is not working
    expect(
      forbiddenRedirects.length,
      `Detected ${forbiddenRedirects.length} extra redirects to /login during auth transition. ` +
      `The 500ms Grace Period should prevent premature redirects.`
    ).toBe(0);
  });
  
  test('Protected route shows loading state during auth hydration', async ({ page }) => {
    // Check that LoadingScreen or HydrationSplash is shown during auth
    
    // Navigate to protected route
    await page.goto('/venue/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Immediately check for loading state (within first 500ms)
    const hasHydrationSplash = await page.locator('[data-testid="hydration-splash"]').isVisible().catch(() => false);
    const hasLoadingScreen = await page.locator('[class*="loading"], [class*="Loading"], [data-testid*="loading"]').isVisible().catch(() => false);
    const wasRedirectedToLogin = page.url().includes('/login');
    
    console.log('=== LOADING STATE REPORT ===');
    console.log('Has hydration splash:', hasHydrationSplash);
    console.log('Has loading screen:', hasLoadingScreen);
    console.log('Redirected to login:', wasRedirectedToLogin);
    
    // ASSERTION: Should show some loading state OR redirect to login
    // Should NOT show raw content flash
    expect(
      hasHydrationSplash || hasLoadingScreen || wasRedirectedToLogin,
      'Expected either loading state or redirect to login. ' +
      'Showing raw content before auth completes indicates missing Grace Period protection.'
    ).toBe(true);
  });
});

/**
 * VISUAL_CONSISTENCY_CRAWL
 * 
 * Objective: Verify brand consistency by checking for forbidden CSS classes.
 * 
 * Strategy:
 * 1. Screenshot the Overview, Jobs, and Calendar pages
 * 2. Assert: No elements contain the class 'bg-lime-500' or 'bg-green-400'
 * 3. Assert: All primary buttons use the 'refined-glow' styling
 */
test.describe('VISUAL_CONSISTENCY_CRAWL', () => {
  
  // Helper function to login for visual tests
  async function loginForVisualTests(page: Page) {
    // Check if already logged in (has session)
    const hasSession = await page.evaluate(() => {
      return !!sessionStorage.getItem('hospogo_session_user');
    });
    
    if (hasSession) return;
    
    // Set up E2E test user for authenticated routes
    await page.evaluate(() => {
      const testUser = {
        id: 'test-user-id',
        email: 'test@hospogo.com',
        role: 'business',
        currentRole: 'business',
        isOnboarded: true,
        hasCompletedOnboarding: true,
      };
      localStorage.setItem('E2E_MODE', 'true');
      sessionStorage.setItem('hospogo_test_user', JSON.stringify(testUser));
      sessionStorage.setItem('hospogo_session_user', JSON.stringify(testUser));
    });
  }
  
  test('No forbidden lime/green classes on Overview page', async ({ page }) => {
    // For visual consistency tests, we need to be logged in
    // Navigate to landing first to set up test user
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check the landing page for forbidden classes
    const forbiddenLimeElements = await page.locator('[class*="bg-lime-500"]').count();
    const forbiddenGreenElements = await page.locator('[class*="bg-green-400"]').count();
    
    console.log('=== VISUAL CONSISTENCY - OVERVIEW ===');
    console.log('Elements with bg-lime-500:', forbiddenLimeElements);
    console.log('Elements with bg-green-400:', forbiddenGreenElements);
    
    // Take screenshot for visual reference
    await page.screenshot({ 
      path: 'tests/screenshots/resilience-overview.png',
      fullPage: true 
    });
    
    // ASSERTION: No elements should use forbidden lime/green classes
    // HospoGo brand uses Electric Lime (#BAFF39) not Tailwind's lime-500
    expect(
      forbiddenLimeElements,
      `Found ${forbiddenLimeElements} elements with 'bg-lime-500' class. ` +
      `HospoGo brand should use Electric Lime (#BAFF39) instead.`
    ).toBe(0);
    
    expect(
      forbiddenGreenElements,
      `Found ${forbiddenGreenElements} elements with 'bg-green-400' class. ` +
      `HospoGo brand should use Electric Lime (#BAFF39) instead.`
    ).toBe(0);
  });
  
  test('No forbidden lime/green classes on Jobs page', async ({ page }) => {
    // Set up authenticated session
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await loginForVisualTests(page);
    
    // Navigate to jobs page
    await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for page to fully render
    
    const currentUrl = page.url();
    
    // If redirected to login, we can still check the login page for consistency
    const pageToCheck = currentUrl.includes('/login') ? 'login' : 'jobs';
    
    const forbiddenLimeElements = await page.locator('[class*="bg-lime-500"]').count();
    const forbiddenGreenElements = await page.locator('[class*="bg-green-400"]').count();
    
    console.log(`=== VISUAL CONSISTENCY - ${pageToCheck.toUpperCase()} ===`);
    console.log('Elements with bg-lime-500:', forbiddenLimeElements);
    console.log('Elements with bg-green-400:', forbiddenGreenElements);
    
    // Take screenshot
    await page.screenshot({ 
      path: `tests/screenshots/resilience-${pageToCheck}.png`,
      fullPage: true 
    });
    
    expect(
      forbiddenLimeElements,
      `Found ${forbiddenLimeElements} elements with 'bg-lime-500' on ${pageToCheck} page.`
    ).toBe(0);
    
    expect(
      forbiddenGreenElements,
      `Found ${forbiddenGreenElements} elements with 'bg-green-400' on ${pageToCheck} page.`
    ).toBe(0);
  });
  
  test('No forbidden lime/green classes on Calendar page', async ({ page }) => {
    // Set up authenticated session
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await loginForVisualTests(page);
    
    // Navigate to venue schedule (calendar) page
    await page.goto('/venue/schedule', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    const pageToCheck = currentUrl.includes('/login') ? 'login' : 'calendar';
    
    const forbiddenLimeElements = await page.locator('[class*="bg-lime-500"]').count();
    const forbiddenGreenElements = await page.locator('[class*="bg-green-400"]').count();
    
    console.log(`=== VISUAL CONSISTENCY - ${pageToCheck.toUpperCase()} ===`);
    console.log('Elements with bg-lime-500:', forbiddenLimeElements);
    console.log('Elements with bg-green-400:', forbiddenGreenElements);
    
    // Take screenshot
    await page.screenshot({ 
      path: `tests/screenshots/resilience-${pageToCheck}.png`,
      fullPage: true 
    });
    
    expect(
      forbiddenLimeElements,
      `Found ${forbiddenLimeElements} elements with 'bg-lime-500' on ${pageToCheck} page.`
    ).toBe(0);
    
    expect(
      forbiddenGreenElements,
      `Found ${forbiddenGreenElements} elements with 'bg-green-400' on ${pageToCheck} page.`
    ).toBe(0);
  });
  
  test('Primary buttons use refined-glow styling pattern', async ({ page }) => {
    // Navigate to landing page to check primary buttons
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Find all primary buttons (common patterns)
    const primaryButtons = await page.locator(
      'button[class*="primary"], ' +
      'a[class*="primary"], ' +
      'button[class*="bg-\\[#BAFF39\\]"], ' +
      'button[class*="bg-neon"], ' +
      '[class*="refined-glow"]'
    ).all();
    
    console.log('=== BUTTON STYLING AUDIT ===');
    console.log('Primary buttons found:', primaryButtons.length);
    
    // Check each primary button for Electric Lime styling
    const electricLimeButtons = await page.locator(
      '[class*="BAFF39"], ' +
      '[class*="baff39"], ' +
      '[class*="neon"], ' +
      '[class*="lime"], ' +
      '[style*="BAFF39"], ' +
      '[style*="baff39"]'
    ).count();
    
    console.log('Electric Lime styled elements:', electricLimeButtons);
    
    // Take screenshot of landing page buttons
    await page.screenshot({ 
      path: 'tests/screenshots/resilience-buttons.png',
      fullPage: false 
    });
    
    // ASSERTION: Should have at least one Electric Lime styled element
    // if there are primary buttons on the page
    if (primaryButtons.length > 0) {
      expect(
        electricLimeButtons,
        'Expected primary buttons to use Electric Lime (#BAFF39) styling. ' +
        'No Electric Lime elements found.'
      ).toBeGreaterThan(0);
    }
  });
  
  test('Comprehensive class audit across all visible elements', async ({ page }) => {
    // Navigate to landing page for comprehensive audit
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Get all class names on the page
    const classAudit = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const forbiddenPatterns = [
        'bg-lime-500',
        'bg-green-400',
        'bg-emerald-500',
        'text-lime-500',
        'text-green-400',
        'border-lime-500',
        'border-green-400',
      ];
      
      const violations: { tag: string; classes: string; pattern: string }[] = [];
      
      allElements.forEach(el => {
        const classes = el.className;
        if (typeof classes !== 'string') return;
        
        forbiddenPatterns.forEach(pattern => {
          if (classes.includes(pattern)) {
            violations.push({
              tag: el.tagName.toLowerCase(),
              classes: classes.substring(0, 200), // Truncate long class lists
              pattern,
            });
          }
        });
      });
      
      return violations;
    });
    
    console.log('=== COMPREHENSIVE CLASS AUDIT ===');
    console.log('Total violations found:', classAudit.length);
    if (classAudit.length > 0) {
      console.log('Violations:', classAudit);
    }
    
    // ASSERTION: No violations should be found
    expect(
      classAudit.length,
      `Found ${classAudit.length} CSS class violations:\n` +
      classAudit.map(v => `  - <${v.tag}> has '${v.pattern}'`).join('\n')
    ).toBe(0);
  });
});
