import { test, expect } from '@playwright/test';

test('Shop Owner can post a shift and see it in the feed', async ({ page }) => {
  // Poll API health endpoint until it's ready
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

  // 1. Go to Signup Page to create a NEW user
  await page.goto('/signup');

  // 2. Fill in Signup Form
  const randomId = Date.now();
  const email = `e2e_test_${randomId}@snipshift.com`;
  const password = 'password123';

  await page.fill('[data-testid="input-email"]', email);
  await page.fill('[data-testid="input-password"]', password);
  await page.fill('[data-testid="input-confirm-password"]', password);

  // 3. Click "Create Account"
  await page.click('[data-testid="button-signup"]');

  // 4. Wait for navigation to Onboarding page (Step 1)
  await expect(page).toHaveURL(/\/onboarding/);

  // 5. Select "Shop Owner" role (Business)
  await page.click('[data-testid="button-select-business"]');
  await page.click('[data-testid="button-next"]');

  // 6. Fill Name and Phone (Step 2)
  await page.fill('[data-testid="input-display-name"]', 'Test Shop Owner');
  await page.fill('[data-testid="input-phone"]', '0400000000');
  await page.click('[data-testid="button-next"]');

  // 7. Fill Bio (Step 3)
  await page.fill('[data-testid="input-bio"]', 'This is a test shop owner bio.');
  await page.click('[data-testid="button-next"]');

  // 8. Fill Location (Step 4)
  await page.fill('[data-testid="input-location"]', 'Test City');
  
  // 9. Complete Setup
  await page.click('[data-testid="button-complete-setup"]');

  // Wait for navigation - this might fail if the API returns 401, so we wait for either URL or error
  // For debugging: check if we stay on role selection
  await page.waitForTimeout(1000);

  // 10. Wait for navigation to Hub Dashboard
  await expect(page).toHaveURL(/\/hub-dashboard/);

  // 11. Click "Post New Job/Shift" (Using Quick Action button)
  await page.click('[data-testid="button-post-job"]');

  // 12. Fill inputs
  await page.fill('[data-testid="input-job-title"]', 'E2E Test Shift');
  
  // Wait for pay rate input to be visible to ensure form is loaded
  const payRateInput = page.getByTestId('input-job-pay');
  await expect(payRateInput).toBeVisible();
  await payRateInput.fill('55');
  
  // Fill required fields not explicitly mentioned in prompt but necessary for form submission
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  await page.fill('[data-testid="input-job-date"]', dateStr);
  await page.fill('[data-testid="input-job-start-time"]', '09:00'); // Uses input-job-start-time, not input-job-time
  await page.fill('[data-testid="input-job-city"]', 'New York');
  // No state field in HubDashboard form (it's in location object but UI only shows city?)
  // Wait, hub-dashboard.tsx:39: location: { city: "", state: "", address: "" }
  // But the JSX lines 417-428 ONLY render City input!
  // So I should NOT fill state.
  
  // Description is a textarea
  await page.fill('[data-testid="input-job-description"]', 'This is an automated E2E test shift description.');

  // 13. Click "Post"
  await page.click('[data-testid="button-submit-job"]');

  // 14. Assert: Success Toast appears
  // Looking for text "Shift posted successfully" as seen in hub-dashboard.tsx toast call
  await expect(page.getByText('Shift posted successfully!', { exact: true })).toBeVisible();

  // 15. Navigate to "Find Work" (Find Shifts)
  const findShiftsDesktop = page.getByTestId('link-find-shifts-desktop');
  
  if (await findShiftsDesktop.isVisible()) {
    await findShiftsDesktop.click();
  } else {
    // Mobile menu
    await page.click('[data-testid="button-mobile-menu"]');
    const findShiftsMobile = page.getByTestId('link-find-shifts-mobile');
    await expect(findShiftsMobile).toBeVisible();
    await findShiftsMobile.click();
  }

  // 16. Assert: "E2E Test Shift" is visible in the list
  // We might need to wait for the feed to load
  await expect(page.getByText('E2E Test Shift').first()).toBeVisible();
});
