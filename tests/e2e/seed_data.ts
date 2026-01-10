import { Page, BrowserContext } from '@playwright/test';

/**
 * Seed Data Helper for Calendar Lifecycle E2E Tests
 *
 * Creates fresh test users and shop data to ensure deterministic test execution.
 * This avoids relying on production data which may be inconsistent or missing.
 */

// Test user configurations
export interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  currentRole: string;
  isOnboarded: boolean;
}

export const TEST_SHOP_OWNER: TestUser = {
  id: 'e2e-shop-owner-001',
  email: 'shop-owner-e2e@snipshift.com',
  name: 'E2E Shop Owner',
  roles: ['business'],
  currentRole: 'business',
  isOnboarded: true,
};

export const TEST_PROFESSIONAL: TestUser = {
  id: 'e2e-professional-001',
  email: 'professional-e2e@snipshift.com',
  name: 'E2E Test Barber',
  roles: ['professional'],
  currentRole: 'professional',
  isOnboarded: true,
};

export const TEST_MULTI_ROLE_USER: TestUser = {
  id: 'e2e-multi-role-001',
  email: 'multi-role-e2e@snipshift.com',
  name: 'E2E Multi-Role User',
  roles: ['professional', 'business'],
  currentRole: 'professional',
  isOnboarded: true,
};

// Shift status types
export type ShiftStatus = 'draft' | 'open' | 'confirmed' | 'pending' | 'invited' | 'filled' | 'completed' | 'cancelled';

// Test shift data
export interface TestShift {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  status: ShiftStatus;
  location?: string;
  employerId: string;
  assigneeId?: string | null;
}

// Helper to create Monday of the current week
export function startOfWeekMonday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const daysSinceMonday = (day + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to add hours to a date
export function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

// Helper to add days to a date
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Create default test shifts for the current week
export function createTestShifts(employerId: string): TestShift[] {
  const monday = startOfWeekMonday();

  return [
    {
      id: 'draft-shift-001',
      title: 'Draft Morning Shift',
      description: 'Unpublished draft shift for testing invite flow',
      startTime: addHours(addDays(monday, 0), 9).toISOString(),
      endTime: addHours(addDays(monday, 0), 13).toISOString(),
      hourlyRate: 45,
      status: 'draft',
      location: '123 Test Street',
      employerId,
    },
    {
      id: 'open-shift-001',
      title: 'Open Afternoon Shift',
      description: 'Published shift for marketplace testing',
      startTime: addHours(addDays(monday, 1), 14).toISOString(),
      endTime: addHours(addDays(monday, 1), 20).toISOString(),
      hourlyRate: 50,
      status: 'open',
      location: '456 Market Ave',
      employerId,
    },
    {
      id: 'confirmed-shift-001',
      title: 'Confirmed Wednesday Shift',
      description: 'Confirmed shift for cancellation testing',
      startTime: addHours(addDays(monday, 2), 10).toISOString(),
      endTime: addHours(addDays(monday, 2), 18).toISOString(),
      hourlyRate: 55,
      status: 'confirmed',
      location: '789 Barbershop Ln',
      employerId,
      assigneeId: TEST_PROFESSIONAL.id,
    },
    {
      id: 'invited-shift-001',
      title: 'Invited Thursday Shift',
      description: 'Pending invitation for accept/decline testing',
      startTime: addHours(addDays(monday, 3), 9).toISOString(),
      endTime: addHours(addDays(monday, 3), 17).toISOString(),
      hourlyRate: 48,
      status: 'invited',
      location: '321 Test Blvd',
      employerId,
      assigneeId: TEST_PROFESSIONAL.id,
    },
  ];
}

/**
 * Sets up a context with the specified test user via sessionStorage.
 * Works with the VITE_E2E=1 environment flag.
 */
export async function setupUserContext(
  context: BrowserContext,
  user: TestUser
): Promise<void> {
  await context.addInitScript((userData) => {
    sessionStorage.setItem(
      'hospogo_test_user',
      JSON.stringify(userData)
    );
    localStorage.setItem('E2E_MODE', 'true');
  }, user);
}

/**
 * Creates API route mocks for shift operations.
 * Maintains an in-memory shift state for deterministic testing.
 */
export async function setupShiftMocks(
  page: Page,
  initialShifts: TestShift[] = []
): Promise<{ shifts: TestShift[] }> {
  // Mutable shifts array for state tracking
  const shifts = [...initialShifts];

  // Mock: GET /api/shifts (with employer_id query param)
  await page.route('**/api/shifts?**employer_id=me**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(shifts),
    });
  });

  // Mock: GET /api/shifts (open shifts for marketplace)
  await page.route('**/api/shifts?**status=open**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const openShifts = shifts.filter((s) => s.status === 'open');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(openShifts),
    });
  });

  // Mock: POST /api/shifts (create new shift)
  await page.route('**/api/shifts', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = route.request().postDataJSON() as any;
    const newShift: TestShift = {
      id: `new-shift-${Date.now()}`,
      title: body.title || 'New Shift',
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      hourlyRate: Number(body.hourlyRate) || 45,
      status: body.status || 'draft',
      location: body.location,
      employerId: body.employerId || TEST_SHOP_OWNER.id,
      assigneeId: body.assigneeId || null,
    };
    shifts.push(newShift);
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(newShift),
    });
  });

  // Mock: POST /api/shifts/:id/invite (invite professionals)
  await page.route(/\/api\/shifts\/[^/]+\/invite$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const shiftId = url.pathname.split('/').slice(-2, -1)[0];
    const body = route.request().postDataJSON() as any;
    const professionalIds: string[] = body.professionalIds || [];

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Shift not found' }),
      });
      return;
    }

    // Update shift status to invited
    shift.status = 'invited';
    shift.assigneeId = professionalIds[0] || null;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, shift, invitedCount: professionalIds.length }),
    });
  });

  // Mock: POST /api/shifts/:id/accept (professional accepts shift)
  await page.route(/\/api\/shifts\/[^/]+\/accept$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const shiftId = url.pathname.split('/').slice(-2, -1)[0];

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Shift not found' }),
      });
      return;
    }

    // Update shift status to confirmed
    shift.status = 'confirmed';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: shift.id, status: 'confirmed' }),
    });
  });

  // Mock: POST /api/shifts/:id/decline (professional declines shift)
  await page.route(/\/api\/shifts\/[^/]+\/decline$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const shiftId = url.pathname.split('/').slice(-2, -1)[0];

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Shift not found' }),
      });
      return;
    }

    // Reset shift to draft when declined
    shift.status = 'draft';
    shift.assigneeId = null;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: shift.id, status: 'draft' }),
    });
  });

  // Mock: DELETE /api/shifts/:id (delete/cancel shift)
  await page.route(/\/api\/shifts\/[^/?]+$/, async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const shiftId = url.pathname.split('/').pop();

    const shiftIndex = shifts.findIndex((s) => s.id === shiftId);
    if (shiftIndex === -1) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Shift not found' }),
      });
      return;
    }

    // Remove shift from array
    const deletedShift = shifts.splice(shiftIndex, 1)[0];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, deleted: deletedShift }),
    });
  });

  // Mock: GET /api/shifts/offers/me (professional's pending shift offers)
  await page.route('**/api/shifts/offers/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const invitedShifts = shifts.filter((s) => s.status === 'invited');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(invitedShifts),
    });
  });

  // Mock: GET /api/shifts/invitations/pending
  await page.route('**/api/shifts/invitations/pending', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const invitedShifts = shifts.filter((s) => s.status === 'invited');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ invitations: invitedShifts }),
    });
  });

  // Mock: GET /api/professionals (available professionals list)
  await page.route('**/api/professionals**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: TEST_PROFESSIONAL.id,
          email: TEST_PROFESSIONAL.email,
          name: TEST_PROFESSIONAL.name,
          displayName: TEST_PROFESSIONAL.name,
          avatarUrl: null,
          skills: ['Haircut', 'Beard Trim', 'Shave'],
          rating: 4.8,
        },
      ]),
    });
  });

  // Mock: GET /api/applications (applications for shifts)
  await page.route('**/api/applications**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    // Return applications for open shifts
    const applications = shifts
      .filter((s) => s.status === 'open')
      .map((s) => ({
        id: `app-${s.id}`,
        shiftId: s.id,
        applicantId: TEST_PROFESSIONAL.id,
        applicantName: TEST_PROFESSIONAL.name,
        applicantEmail: TEST_PROFESSIONAL.email,
        message: 'I would like to work this shift.',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(applications),
    });
  });

  // Mock: POST /api/applications (apply to shift)
  await page.route('**/api/applications', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = route.request().postDataJSON() as any;
    const application = {
      id: `app-${Date.now()}`,
      shiftId: body.shiftId,
      jobId: body.jobId,
      applicantId: body.applicantId,
      message: body.message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(application),
    });
  });

  // Mock: POST /api/applications/:id/accept (shop accepts application)
  await page.route(/\/api\/applications\/[^/]+\/accept$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const pathParts = url.pathname.split('/');
    const applicationId = pathParts[pathParts.length - 2];
    
    // Find shift by application ID pattern
    const shiftId = applicationId.replace('app-', '');
    const shift = shifts.find((s) => s.id === shiftId);
    
    if (shift) {
      shift.status = 'confirmed';
      shift.assigneeId = TEST_PROFESSIONAL.id;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, shiftStatus: 'confirmed' }),
    });
  });

  // Mock other API endpoints that might be called
  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: TEST_SHOP_OWNER.id, role: 'business' }),
    });
  });

  await page.route('**/api/notifications', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/messaging/chats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  return { shifts };
}

/**
 * Waits for both frontend and API servers to be ready.
 */
export async function waitForServersReady(page: Page): Promise<void> {
  // Wait for API to be ready
  await Promise.race([
    page.request.get('http://localhost:5000/health').then(() => true).catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);

  // Wait for frontend to be ready
  await Promise.race([
    page.request.get('http://localhost:3000').then(() => true).catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);
}

/**
 * Helper to find shift status indicator colors/classes.
 */
export const SHIFT_STATUS_INDICATORS = {
  draft: { color: 'gray', label: 'Draft' },
  open: { color: 'blue', label: 'Open' },
  invited: { color: 'purple', label: 'Invited' },
  confirmed: { color: 'green', label: 'Confirmed' },
  pending: { color: 'yellow', label: 'Pending' },
  filled: { color: 'green', label: 'Filled' },
  completed: { color: 'slate', label: 'Completed' },
  cancelled: { color: 'red', label: 'Cancelled' },
} as const;

