import { test, expect } from '@playwright/test';
import { Client } from 'pg';

/**
 * Registration Roles E2E (HospoGo)
 *
 * Registers three users (hub, venue, professional) via POST /api/register,
 * verifies 200/201 for hub and venue (normalization bypasses Postgres enum error),
 * and uses a direct DB query to verify hub/venue are stored as 'business'.
 */

const API_BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

function uniqueEmail(role: string): string {
  return `e2e_test_reg_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}@test.local`;
}

test.describe('Registration roles (hub, venue, professional)', () => {
  test('hub and venue return 200/201; hub/venue stored as business in DB', async ({
    request,
  }) => {
    const emails = {
      hub: uniqueEmail('hub'),
      venue: uniqueEmail('venue'),
      professional: uniqueEmail('pro'),
    };

    // 1) Register hub
    const resHub = await request.post(`${API_BASE}/api/register`, {
      data: {
        email: emails.hub,
        name: 'Hub User',
        password: 'Password1!',
        role: 'hub',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(
      [200, 201],
      `hub registration should succeed; got ${resHub.status()} ${await resHub.text()}`
    ).toContain(resHub.status());

    // 2) Register venue
    const resVenue = await request.post(`${API_BASE}/api/register`, {
      data: {
        email: emails.venue,
        name: 'Venue User',
        password: 'Password1!',
        role: 'venue',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(
      [200, 201],
      `venue registration should succeed; got ${resVenue.status()} ${await resVenue.text()}`
    ).toContain(resVenue.status());

    // 3) Register professional
    const resPro = await request.post(`${API_BASE}/api/register`, {
      data: {
        email: emails.professional,
        name: 'Pro User',
        password: 'Password1!',
        role: 'professional',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(
      [200, 201],
      `professional registration should succeed; got ${resPro.status()} ${await resPro.text()}`
    ).toContain(resPro.status());

    // 4) Direct DB check: hub and venue must be stored as 'business'
    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.E2E_DATABASE_URL ||
      'postgresql://postgres:test@localhost:5433/hospogo_test';

    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
    } catch (e) {
      test.skip(
        true,
        `DB not available for role verification (set DATABASE_URL or E2E_DATABASE_URL): ${(e as Error).message}`
      );
      return;
    }

    try {
      const r = await client.query<{ email: string; role: string }>(
        'SELECT email, role FROM users WHERE email = ANY($1)',
        [[emails.hub, emails.venue]]
      );

      const byEmail = Object.fromEntries(r.rows.map((row) => [row.email, row.role]));

      expect(
        byEmail[emails.hub],
        `hub user "${emails.hub}" should be stored with role 'business' in DB`
      ).toBe('business');
      expect(
        byEmail[emails.venue],
        `venue user "${emails.venue}" should be stored with role 'business' in DB`
      ).toBe('business');
    } finally {
      await client.end();
    }
  });
});
