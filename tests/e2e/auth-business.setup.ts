import { chromium, test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import { getTestDatabaseConfig } from '../../scripts/test-db-config';
import { E2E_VENUE_OWNER } from './e2e-business-fixtures';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensures the test venue exists for E2E auth user. Must run before business-setup navigates
 * so /api/venues/me returns 200 and dashboard shows calendar (not Profile Incomplete).
 */
async function ensureTestVenueExists(): Promise<string | null> {
  try {
    const client = new Client(getTestDatabaseConfig());
    await client.connect();

    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [E2E_VENUE_OWNER.id]);
    if (userCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
         VALUES ($1, $2, $3, 'business', ARRAY['business']::text[], true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [E2E_VENUE_OWNER.id, E2E_VENUE_OWNER.email, E2E_VENUE_OWNER.name]
      );
    }

    const existing = await client.query(
      'SELECT id FROM venues WHERE user_id = $1 LIMIT 1',
      [E2E_VENUE_OWNER.id]
    );

    let venueId: string | null = null;
    if (existing.rows.length === 0) {
      const defaultAddress = JSON.stringify({
        street: '123 Test St',
        suburb: 'Brisbane City',
        postcode: '4000',
        city: 'Brisbane',
        state: 'QLD',
        country: 'AU',
      });
      const defaultHours = JSON.stringify({
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '09:00', close: '17:00' },
        sunday: { closed: true },
      });

      const insertResult = await client.query(
        `INSERT INTO venues (user_id, venue_name, address, operating_hours, status, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, 'active', NOW(), NOW())
         RETURNING id`,
        [E2E_VENUE_OWNER.id, 'E2E Auto-Fill Venue', defaultAddress, defaultHours]
      );
      venueId = insertResult.rows[0]?.id ?? null;
    } else {
      venueId = existing.rows[0].id;
    }

    await client.end();
    return venueId;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Business Auth Setup] ensureTestVenue failed:', err);
    }
    return null;
  }
}

/**
 * Runs business auth setup: creates storageState-business.json with currentRole: 'business'.
 * Uses addInitScript to inject sessionStorage BEFORE DOM loads so AuthContext hydrates
 * with business user and renders VenueDashboardContent (not skeleton).
 */
export async function runBusinessAuthSetup(): Promise<string> {
  const baseURL = 'http://localhost:3000';
  const apiBase = baseURL.replace(':3000', ':5000');

  // Ensure venue exists: prefer API endpoint (guarantees same DB as API), fallback to direct DB
  const setupViaApi = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBase}/api/test/setup-venue`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer mock-test-token', 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.existing) console.log('[Business Auth Setup] Created venue via API:', data.venueId);
        return true;
      }
    } catch { /* API not ready */ }
    return false;
  };
  for (let i = 0; i < 10; i++) {
    if (await setupViaApi()) break;
    await new Promise((r) => setTimeout(r, 2000));
    if (i === 9) {
      const venueId = await ensureTestVenueExists();
      if (!venueId) console.warn('[Business Auth Setup] API setup failed and direct DB unavailable.');
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    storageState: undefined,
  });

  await context.addInitScript((user: typeof E2E_VENUE_OWNER) => {
    sessionStorage.setItem('hospogo_test_user', JSON.stringify(user));
    localStorage.setItem('hospogo_test_user', JSON.stringify(user));
    localStorage.setItem('E2E_MODE', 'true');
  }, E2E_VENUE_OWNER);

  const page = await context.newPage();
  await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Wait for dashboard to render (confirms AuthContext hydrated with business user)
  await page
    .getByTestId('calendar-container')
    .or(page.getByTestId('roster-tools-dropdown'))
    .or(page.getByTestId('button-view-week'))
    .or(page.getByTestId('tab-calendar'))
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});

  const sessionStorageItems = await page.evaluate(() => {
    const items: Array<{ name: string; value: string }> = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) items.push({ name: key, value: sessionStorage.getItem(key) || '' });
    }
    return items;
  });

  const storageState = await context.storageState();
  const authDir = path.resolve(process.cwd(), 'playwright', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  const storageStatePath = path.join(authDir, 'business-user.json');

  // Ensure hospogo_test_user is in localStorage (Playwright restores this; AuthContext falls back to localStorage)
  const userJson = JSON.stringify(E2E_VENUE_OWNER);
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
    sessionStorage: sessionStorageItems.length > 0 ? sessionStorageItems : [{ name: 'hospogo_test_user', value: userJson }, { name: 'E2E_MODE', value: 'true' }],
  };
  fs.writeFileSync(storageStatePath, JSON.stringify(enhancedState, null, 2));
  await browser.close();
  return storageStatePath;
}

/** Playwright setup project entry - creates business-user.json for business-e2e tests */
test('create business session state', async () => {
  await runBusinessAuthSetup();
});
