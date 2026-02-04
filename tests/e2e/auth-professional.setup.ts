import { chromium, test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import { getTestDatabaseConfig } from '../../scripts/test-db-config';
import { E2E_PROFESSIONAL } from './e2e-business-fixtures';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-export for backward compatibility
export { E2E_PROFESSIONAL };

/**
 * Ensures the test professional user exists in the database.
 * Required so /api/me returns a valid user and shifts can be assigned.
 */
async function ensureTestProfessionalExists(): Promise<string | null> {
  try {
    const client = new Client(getTestDatabaseConfig());
    await client.connect();

    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [E2E_PROFESSIONAL.id]);
    if (userCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
         VALUES ($1, $2, $3, 'professional', ARRAY['professional']::text[], true, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
        [E2E_PROFESSIONAL.id, E2E_PROFESSIONAL.email, E2E_PROFESSIONAL.name]
      );
      console.log('[Professional Auth Setup] Created professional user:', E2E_PROFESSIONAL.id);
    }

    await client.end();
    return E2E_PROFESSIONAL.id;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Professional Auth Setup] ensureTestProfessionalExists failed:', err);
    }
    return null;
  }
}

/**
 * Runs professional auth setup: creates storageState for professional-user.json with currentRole: 'professional'.
 * Uses addInitScript to inject sessionStorage BEFORE DOM loads so AuthContext hydrates
 * with professional user and renders the correct dashboard view.
 */
export async function runProfessionalAuthSetup(): Promise<string> {
  const baseURL = 'http://localhost:3000';
  const apiBase = baseURL.replace(':3000', ':5000');

  // Ensure professional user exists via API endpoint (same DB as backend) or direct DB
  const setupViaApi = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBase}/api/test/setup-professional`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer mock-test-token', 'Content-Type': 'application/json' },
        body: JSON.stringify(E2E_PROFESSIONAL),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.existing) console.log('[Professional Auth Setup] Created user via API:', data.userId);
        return true;
      }
    } catch { /* API not ready or endpoint not available */ }
    return false;
  };

  // Try API setup first, fall back to direct DB
  for (let i = 0; i < 10; i++) {
    if (await setupViaApi()) break;
    await new Promise((r) => setTimeout(r, 2000));
    if (i === 9) {
      const userId = await ensureTestProfessionalExists();
      if (!userId) console.warn('[Professional Auth Setup] API setup failed and direct DB unavailable.');
    }
  }

  // Also ensure direct DB has the user (fallback for any race conditions)
  await ensureTestProfessionalExists();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    storageState: undefined,
  });

  // Inject auth state BEFORE page loads via addInitScript
  await context.addInitScript((user: typeof E2E_PROFESSIONAL) => {
    sessionStorage.setItem('hospogo_test_user', JSON.stringify(user));
    localStorage.setItem('hospogo_test_user', JSON.stringify(user));
    localStorage.setItem('E2E_MODE', 'true');
  }, E2E_PROFESSIONAL);

  const page = await context.newPage();

  // Navigate to professional dashboard to trigger auth context hydration
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Wait for dashboard to render (confirms AuthContext hydrated with professional user)
  // Increased timeout and expanded selectors for polished professional dashboard
  await page
    .getByTestId('professional-dashboard')
    .or(page.getByTestId('calendar-container'))
    .or(page.getByTestId('invitations-tab'))
    .or(page.getByTestId('shift-list'))
    .or(page.getByTestId('upcoming-shifts'))
    .or(page.locator('[data-testid*="dashboard"]'))
    .or(page.getByRole('heading', { name: /dashboard|shifts|schedule/i }))
    .first()
    .waitFor({ state: 'visible', timeout: 45000 })
    .catch(() => {
      console.log('[Professional Auth Setup] Dashboard elements not found, continuing...');
    });

  // Capture sessionStorage items to persist
  const sessionStorageItems = await page.evaluate(() => {
    const items: Array<{ name: string; value: string }> = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) items.push({ name: key, value: sessionStorage.getItem(key) || '' });
    }
    return items;
  });

  // Get full storage state
  const storageState = await context.storageState();
  const authDir = path.resolve(process.cwd(), 'playwright', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  const storageStatePath = path.join(authDir, 'professional-user.json');

  // Ensure hospogo_test_user is in localStorage (Playwright restores this; AuthContext falls back to localStorage)
  const userJson = JSON.stringify(E2E_PROFESSIONAL);
  const origins = storageState.origins ?? [];
  const origin = origins.find((o: { origin: string }) => o.origin === 'http://localhost:3000') ?? {
    origin: 'http://localhost:3000',
    localStorage: [] as Array<{ name: string; value: string }>,
  };
  if (!origins.find((o: { origin: string }) => o.origin === 'http://localhost:3000')) {
    origins.push(origin);
  }
  const ls = origin.localStorage ?? [];
  const existing = ls.find((e: { name: string }) => e.name === 'hospogo_test_user');
  if (!existing) {
    ls.push({ name: 'hospogo_test_user', value: userJson });
  } else {
    existing.value = userJson;
  }
  const hasE2E = ls.find((e: { name: string }) => e.name === 'E2E_MODE');
  if (!hasE2E) ls.push({ name: 'E2E_MODE', value: 'true' });

  const enhancedState = {
    ...storageState,
    origins,
    sessionStorage: sessionStorageItems.length > 0 ? sessionStorageItems : [
      { name: 'hospogo_test_user', value: userJson },
      { name: 'E2E_MODE', value: 'true' },
    ],
  };
  fs.writeFileSync(storageStatePath, JSON.stringify(enhancedState, null, 2));
  console.log('[Professional Auth Setup] Created storageState at:', storageStatePath);
  
  await browser.close();
  return storageStatePath;
}

/** Playwright setup project entry - creates professional-user.json for staff-e2e tests */
test('create professional session state', async ({ }, testInfo) => {
  testInfo.setTimeout(90000); // Allow 90s for setup (API calls + dashboard wait)
  await runProfessionalAuthSetup();
});
