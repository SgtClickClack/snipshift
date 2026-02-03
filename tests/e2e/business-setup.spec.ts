/**
 * Business E2E Setup - runs before business-e2e project.
 * Creates storageState-business.json with currentRole: 'business'.
 */
import { test } from '@playwright/test';
import { runBusinessAuthSetup } from './auth-business.setup';

test.describe('Business Auth Setup', () => {
  test('create business session state', async () => {
    await runBusinessAuthSetup();
  });
});
