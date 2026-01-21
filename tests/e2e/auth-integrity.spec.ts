import { test, expect } from '@playwright/test';

const emptyStorageState = { cookies: [], origins: [] };

test.describe('Authentication Integrity', () => {
  test.describe('public access', () => {
    test.use({ storageState: emptyStorageState });

    test('should allow public access to venue-guide without loop', async ({ page }) => {
      await page.goto('/venue-guide');
      await expect(page.getByText('Venue Launch Kit')).toBeVisible();
      expect(page.url()).toContain('/venue-guide');
    });
  });

  test('should persist shift drafts across sessions', async ({ page }) => {
    await page.request.post('/api/shifts/drafts', {
      data: {
        draftData: {
          role: 'Bartender',
          title: 'E2E Draft',
          description: 'Draft created by Playwright',
          date: '2030-01-01',
          startTime: '09:00',
          endTime: '17:00',
          hourlyRate: '45',
          location: 'Test Venue',
          uniformRequirements: '',
          rsaRequired: false,
          expectedPax: '',
        },
      },
    });

    await page.goto('/venue/dashboard');
    await page.getByTestId('tab-calendar').click();
    await page.getByRole('button', { name: /Create Shift/i }).click();

    await expect(
      page.getByText('Want to pick up where you left off?')
    ).toBeVisible();
  });
});
