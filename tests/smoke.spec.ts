import { test, expect } from '@playwright/test';

test('server up', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
});


