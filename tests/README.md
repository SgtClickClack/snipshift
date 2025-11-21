# E2E Testing with Playwright

This directory contains End-to-End (E2E) tests for SnipShift using Playwright.

## Setup

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

## Running Tests

### Run all tests:
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive):
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser):
```bash
npm run test:e2e:headed
```

### Debug tests:
```bash
npm run test:e2e:debug
```

## Test Configuration

Tests are configured in `playwright.config.ts`:
- **Base URL**: `http://localhost:3002` (dev server) or set via `PLAYWRIGHT_BASE_URL` env var
- **Browser**: Chromium (can be extended to Firefox/WebKit)
- **Auto-start dev server**: Yes (via `webServer` config)

## Environment Variables

For tests that require authentication, set these environment variables:

- `TEST_EMAIL`: Test user email (default: `test@example.com`)
- `TEST_PASSWORD`: Test user password (default: `testpassword123`)
- `PLAYWRIGHT_BASE_URL`: Base URL for tests (default: `http://localhost:3002`)

### Local Testing

Create a `.env.test` file (not committed to git):
```env
TEST_EMAIL=your-test-email@example.com
TEST_PASSWORD=your-test-password
PLAYWRIGHT_BASE_URL=http://localhost:3002
```

### CI/CD

Set these as GitHub Secrets:
- `TEST_EMAIL`
- `TEST_PASSWORD`
- `PLAYWRIGHT_BASE_URL` (optional, defaults to localhost)

## Critical Path Tests

The `core-flow.spec.ts` file contains critical path tests:

1. **Test A: Authentication Flow**
   - Navigate to login page
   - Enter credentials
   - Verify dashboard/home page loads

2. **Test B: Public Job Feed**
   - Navigate to `/jobs`
   - Verify job cards render

3. **Test C: Navigation - Post Job**
   - Click "Post a Job" button
   - Verify redirect to post job page or auth wall

4. **Test D: Navigation Structure**
   - Verify main navigation elements are present

## Test Data

**Note**: Tests currently use placeholder credentials. You'll need to:
1. Create test users in your Firebase project, OR
2. Update tests to use mock authentication, OR
3. Configure test credentials via environment variables

## Troubleshooting

### Tests fail with "Navigation timeout"
- Ensure the dev server is running on port 3002
- Check that the API server is running on port 5000
- Verify Firebase configuration is correct

### Tests fail with "Element not found"
- Check that test IDs (`data-testid`) are present in components
- Verify the page structure matches test expectations
- Run tests in headed mode to see what's happening

### Authentication tests fail
- Verify test credentials are correct
- Check Firebase auth configuration
- Ensure test users exist in Firebase

## Adding New Tests

1. Create a new `.spec.ts` file in the `tests/` directory
2. Import `test` and `expect` from `@playwright/test`
3. Write test cases following the existing pattern
4. Use `data-testid` attributes in components for reliable selectors

Example:
```typescript
import { test, expect } from '@playwright/test';

test('my new test', async ({ page }) => {
  await page.goto('/my-page');
  await expect(page.getByTestId('my-element')).toBeVisible();
});
```

