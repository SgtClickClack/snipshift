import { test, expect } from '@playwright/test';

test.describe('Waitlist UI Smoke Test', () => {
  test('Waitlist page renders and toggle works correctly', async ({ page }) => {
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

    // Mock the waitlist API endpoint
    await page.route('**/api/waitlist', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to waitlist page
    await page.goto('/waitlist');
    
    // Verify page loads
    await expect(page.getByText('HospoGo is landing in Brisbane')).toBeVisible({ timeout: 10000 });
    
    // Verify default state shows Venue form
    await expect(page.getByPlaceholder('Venue Name (e.g. The Testing Tavern)')).toBeVisible();
    await expect(page.getByPlaceholder('Manager Email')).toBeVisible();
    
    // Toggle to Staff
    const staffButton = page.getByRole('button', { name: 'Staff' });
    await expect(staffButton).toBeVisible();
    await staffButton.click();
    
    // Verify Staff form fields appear
    await expect(page.getByPlaceholder('Full Name')).toBeVisible({ timeout: 2000 });
    await expect(page.getByPlaceholder('Mobile Number')).toBeVisible();
    
    // Fill in Staff form
    await page.getByPlaceholder('Full Name').fill('Test Staff Member');
    await page.getByPlaceholder('Mobile Number').fill('0400000000');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: 'Secure Early Access' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // Verify success message appears
    await expect(page.getByText("You're on the list!")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("We'll notify you as soon as HospoGo launches in Brisbane.")).toBeVisible();
  });

  test('Waitlist Venue form submission works', async ({ page }) => {
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

    // Mock the waitlist API endpoint
    await page.route('**/api/waitlist', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to waitlist page
    await page.goto('/waitlist');
    
    // Ensure we're on Venue mode (default)
    const venueButton = page.getByRole('button', { name: 'Venue' });
    if (!(await venueButton.evaluate(el => el.classList.contains('bg-gradient-to-r')))) {
      await venueButton.click();
    }
    
    // Fill in Venue form
    await page.getByPlaceholder('Venue Name (e.g. The Testing Tavern)').fill('The Testing Tavern');
    await page.getByPlaceholder('Manager Email').fill('manager@testingtavern.com');
    
    // Submit form
    const submitButton = page.getByRole('button', { name: 'Secure Early Access' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // Verify success message appears
    await expect(page.getByText("You're on the list!")).toBeVisible({ timeout: 5000 });
  });
});
