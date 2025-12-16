import { test, expect } from '@playwright/test';

test.describe('Forgot Password E2E', () => {
  test('should allow requesting a password reset (neutral success messaging)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Reset your password', { exact: false })).toBeVisible();

    await page.getByTestId('input-email').fill('someone@example.com');
    await page.getByTestId('button-send-reset').click();

    // We render an on-page alert so the UX is testable without relying on toast internals.
    await expect(page.getByTestId('alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('alert-success').getByText(/If an account exists/i)).toBeVisible();
  });
});


