# Test User Setup Instructions

## Manual Setup (Recommended)

To ensure E2E tests can run, create a test user in Firebase:

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Navigate to**: Authentication > Users
3. **Add User**:
   - Email: `test@hospogo.com`
   - Password: `password123`
   - Email verification: Not required for testing

## Alternative: Use Firebase Admin SDK

If you have Firebase Admin configured, you can run:

```bash
node scripts/create-test-user.js
```

## Test Credentials

- **Email**: `test@hospogo.com`
- **Password**: `password123`

These credentials are used by the E2E tests in `tests/core-flow.spec.ts`.

## Environment Variables

Set these in your `.env` file or CI/CD secrets:

```env
TEST_EMAIL=test@hospogo.com
TEST_PASSWORD=password123
```

