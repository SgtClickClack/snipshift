/** E2E venue owner - aligns with API auth bypass (api/_src/middleware/auth.ts) */
export const E2E_VENUE_OWNER = {
  id: '8eaee523-79a2-4077-8f5b-4b7fd4058ede',
  email: 'test-owner@example.com',
  name: 'Test Owner',
  roles: ['business'],
  currentRole: 'business',
  isOnboarded: true,
};

/** E2E professional user - aligns with API auth bypass (api/_src/middleware/auth.ts) */
export const E2E_PROFESSIONAL = {
  id: 'e2e00001-0001-4000-a001-000000000001',
  email: 'e2e-professional@hospogo.com',
  name: 'E2E Test Professional',
  roles: ['professional'],
  currentRole: 'professional',
  isOnboarded: true,
};
