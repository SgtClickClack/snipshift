import { test, expect } from '@playwright/test';

/**
 * End-to-End Booking Flow Test
 * 
 * Tests the complete "Booking to Payment" flow:
 * 1. Alice (Shop User) logs in
 * 2. Navigates to Calendar -> Clicks "Smart Fill" -> Confirms toast "Shifts Created"
 * 3. Logs out Alice
 * 4. Bob (Barber User) logs in
 * 5. Navigates to "Job Board" -> Applies for Alice's shift -> Verifies "Applied" state
 * 6. Logs out Bob
 * 7. Alice logs in -> "Applications" -> Clicks "Approve" on Bob's card
 * 8. Assertion: Verify Shift status is now "CONFIRMED" in the UI
 */

// Test user credentials
const ALICE = {
  email: 'alice@snipshift.com',
  password: 'password123',
  id: 'alice-user-id',
  name: 'Alice Shop Owner',
  role: 'business',
  currentRole: 'business',
};

const BOB = {
  email: 'bob@snipshift.com',
  password: 'password123',
  id: 'bob-user-id',
  name: 'Bob Barber',
  role: 'professional',
  currentRole: 'professional',
};

let createdShiftId: string | null = null;
let applicationId: string | null = null;
let shiftStatus = 'open';

test.describe('Booking Flow: Shop to Barber Application to Approval', () => {
  test('Complete booking workflow from Smart Fill to Application Approval', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for full flow

    // ============================================
    // STEP 1: Login as Alice (Shop User)
    // ============================================
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    await page.fill('input[type="email"]', ALICE.email);
    await page.fill('input[type="password"]', ALICE.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/hub-dashboard|dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Set sessionStorage for Alice
    await page.evaluate((user) => {
      sessionStorage.setItem('snipshift_test_user', JSON.stringify({
        ...user,
        roles: ['business'],
        isOnboarded: true,
      }));
    }, ALICE);

    // ============================================
    // STEP 2: Navigate to Calendar -> Click Smart Fill
    // ============================================
    // Navigate to hub dashboard if not already there
    await page.goto('/hub-dashboard');
    await page.waitForLoadState('networkidle');

    // Click on Calendar tab
    const calendarTab = page.locator('[data-testid="tab-calendar"]');
    await expect(calendarTab).toBeVisible({ timeout: 15000 });
    await calendarTab.click();

    // Wait for calendar to load
    await page.waitForSelector('[data-testid="react-big-calendar-container"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow calendar to fully render

    // Mock Smart Fill API endpoint
    await page.route('**/api/shifts/smart-fill', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON();
        createdShiftId = `shift-${Date.now()}`;
        shiftStatus = 'open';

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Shifts created successfully',
            shiftsCreated: 1,
            shifts: [{
              id: createdShiftId,
              status: 'open',
              title: 'Weekend Shift',
              startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
              endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
            }],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock shifts API to return the created shift
    await page.route('**/api/shifts/shop/**', async (route) => {
      if (route.request().method() === 'GET') {
        const shifts = createdShiftId ? [{
          id: createdShiftId,
          title: 'Weekend Shift',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          hourlyRate: '25.00',
          payRate: '25.00',
          location: '123 Main St',
          status: shiftStatus,
          _type: 'shift',
          employerId: ALICE.id,
          businessId: ALICE.id,
          description: 'Weekend shift',
          createdAt: new Date().toISOString(),
          applicationCount: 0,
        }] : [];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(shifts),
        });
      } else {
        await route.continue();
      }
    });

    // Click Smart Fill button
    const smartFillButton = page.locator('[data-testid="button-smart-fill"]');
    await expect(smartFillButton).toBeVisible({ timeout: 10000 });
    await smartFillButton.click();

    // Wait for Smart Fill confirmation modal (if it appears)
    // Some implementations may show a modal, others may directly create shifts
    await page.waitForTimeout(2000);

    // If there's a confirmation modal, confirm it
    const confirmButton = page.getByRole('button', { name: /confirm|create|yes/i }).first();
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for API call to complete
    await page.waitForResponse(
      (response) => response.url().includes('/api/shifts/smart-fill') && response.status() === 200,
      { timeout: 15000 }
    );

    // Verify toast message "Shifts Created" appears
    const toastMessage = page.getByText(/shifts created|shift created/i);
    await expect(toastMessage).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 3: Logout Alice
    // ============================================
    // Clear session storage and cookies
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.context().clearCookies();

    // ============================================
    // STEP 4: Login as Bob (Barber User)
    // ============================================
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    await page.fill('input[type="email"]', BOB.email);
    await page.fill('input[type="password"]', BOB.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/professional-dashboard|dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Set sessionStorage for Bob
    await page.evaluate((user) => {
      sessionStorage.setItem('snipshift_test_user', JSON.stringify({
        ...user,
        roles: ['professional'],
        isOnboarded: true,
      }));
    }, BOB);

    // ============================================
    // STEP 5: Navigate to Job Board -> Apply for shift
    // ============================================
    // Navigate to Job Board
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Mock Job Board API to return Alice's shift
    await page.route('**/api/shifts**', async (route) => {
      if (route.request().method() === 'GET' && route.request().url().includes('status=open')) {
        const shifts = createdShiftId ? [{
          id: createdShiftId,
          title: 'Weekend Shift',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          hourlyRate: '25.00',
          payRate: '25.00',
          location: '123 Main St',
          status: shiftStatus,
          employerId: ALICE.id,
          businessId: ALICE.id,
          businessName: ALICE.name,
          description: 'Weekend shift',
        }] : [];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(shifts),
        });
      } else {
        await route.continue();
      }
    });

    // Mock application creation endpoint
    await page.route('**/api/applications', async (route) => {
      if (route.request().method() === 'POST') {
        applicationId = `application-${Date.now()}`;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: applicationId,
            shiftId: createdShiftId,
            userId: BOB.id,
            status: 'pending',
            appliedAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Wait for shift card to appear
    const shiftCard = page.locator('[data-testid*="shift"], [data-testid*="job-card"]').first();
    await expect(shiftCard).toBeVisible({ timeout: 15000 });

    // Find and click Apply button
    const applyButton = page.getByRole('button', { name: /apply/i }).first();
    await expect(applyButton).toBeVisible({ timeout: 10000 });
    
    // Click Apply and wait for API call
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/applications') && response.status() === 201,
        { timeout: 15000 }
      ),
      applyButton.click(),
    ]);

    // Verify "Applied" state - button should change or toast should appear
    await page.waitForTimeout(2000);
    const appliedIndicator = page.getByText(/applied|application submitted/i);
    await expect(appliedIndicator.first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 6: Logout Bob
    // ============================================
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.context().clearCookies();

    // ============================================
    // STEP 7: Login as Alice -> Applications -> Approve
    // ============================================
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    await page.fill('input[type="email"]', ALICE.email);
    await page.fill('input[type="password"]', ALICE.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/hub-dashboard|dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Set sessionStorage for Alice again
    await page.evaluate((user) => {
      sessionStorage.setItem('snipshift_test_user', JSON.stringify({
        ...user,
        roles: ['business'],
        isOnboarded: true,
      }));
    }, ALICE);

    // Navigate to hub dashboard
    await page.goto('/hub-dashboard');
    await page.waitForLoadState('networkidle');

    // Mock applications API to return Bob's application
    await page.route('**/api/applications**', async (route) => {
      if (route.request().method() === 'GET') {
        const applications = applicationId ? [{
          id: applicationId,
          shiftId: createdShiftId,
          userId: BOB.id,
          status: shiftStatus === 'confirmed' ? 'accepted' : 'pending',
          appliedAt: new Date().toISOString(),
          name: BOB.name,
          user: {
            id: BOB.id,
            name: BOB.name,
            email: BOB.email,
          },
          shift: {
            id: createdShiftId,
            title: 'Weekend Shift',
            startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
            location: '123 Main St',
            hourlyRate: '25.00',
          },
        }] : [];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(applications),
        });
      } else {
        await route.continue();
      }
    });

    // Mock application approval endpoint
    await page.route('**/api/applications/*/decide', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON();
        if (requestBody.decision === 'APPROVED') {
          shiftStatus = 'confirmed';
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Application approved',
            shift: {
              id: createdShiftId,
              status: shiftStatus,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Click on Applications tab
    const applicationsTab = page.locator('[data-testid="tab-applications"]');
    await expect(applicationsTab).toBeVisible({ timeout: 15000 });
    await applicationsTab.click();

    // Wait for applications to load
    await page.waitForTimeout(2000);

    // Find Bob's application card and click Approve button
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    await expect(approveButton).toBeVisible({ timeout: 15000 });

    // Click Approve and wait for API call
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/applications') && response.url().includes('/decide') && response.status() === 200,
        { timeout: 15000 }
      ),
      approveButton.click(),
    ]);

    // Wait for success toast
    await page.waitForTimeout(2000);
    const successToast = page.getByText(/approved|application approved/i);
    await expect(successToast.first()).toBeVisible({ timeout: 10000 });

    // ============================================
    // STEP 8: Verify Shift status is CONFIRMED
    // ============================================
    // Navigate back to Calendar to verify shift status
    const calendarTab2 = page.locator('[data-testid="tab-calendar"]');
    await expect(calendarTab2).toBeVisible({ timeout: 15000 });
    await calendarTab2.click();

    // Wait for calendar to load
    await page.waitForSelector('[data-testid="react-big-calendar-container"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify the shift appears as CONFIRMED (green/confirmed status)
    const confirmedShift = page.locator('[data-testid="shift-block-confirmed"]').first();
    await expect(confirmedShift).toBeVisible({ timeout: 15000 });

    // Additional verification: Check that the shift status is confirmed
    const shiftText = await confirmedShift.textContent();
    expect(shiftText).toBeTruthy();
    expect(shiftText?.toLowerCase()).not.toContain('open');
    expect(shiftText?.toLowerCase()).not.toContain('pending');
  });
});
