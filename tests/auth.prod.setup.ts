import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(process.cwd(), 'playwright', '.auth', 'user.json');

setup('authenticate as Johnny', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('https://hospogo.com/login');

  await page.getByRole('button', { name: /Sign in with Google/i }).click();

  await page.getByLabel('Email or phone').fill(process.env.TEST_EMAIL!);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Enter your password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Next' }).click();

  await page.waitForURL('**/dashboard');

  await expect(page.getByTestId('button-profile-menu')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
