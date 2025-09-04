# Snipshift E2E Routing and Authentication Test Suite

## Overview

This comprehensive E2E test suite validates the centralized routing and authentication system for Snipshift. The tests ensure that all user roles are correctly redirected to their respective dashboards and that protected routes are inaccessible to unauthenticated users.

## Test Files

### 1. `08-routing-authentication-system.cy.ts`
**Comprehensive Test Suite**
- Full coverage of all authentication flows
- Detailed assertions and error handling
- Performance and loading state validation
- Edge case handling

### 2. `09-routing-authentication-simplified.cy.ts`
**Simplified Test Suite**
- Uses custom Cypress commands for better maintainability
- Same coverage as comprehensive suite but more readable
- Recommended for regular testing

## Test Categories

### 1. Sign-Up and Role Selection Flow
- **New User Sign-Up**: Complete sign-up process with role selection
- **Role Selection**: Tests all user roles (hub, professional, brand, trainer)
- **Dashboard Redirect**: Verifies correct dashboard routing after role selection

### 2. Protected Routes (Unauthenticated User)
- **Route Protection**: Tests that unauthenticated users are redirected to login
- **Destination Preservation**: Verifies intended destination is preserved during login redirect
- **Comprehensive Route Coverage**: Tests all protected routes in the application

### 3. Role-Based Access Control
- **Dashboard Access**: Verifies users can access their own dashboard
- **Cross-Role Protection**: Ensures users cannot access other role dashboards
- **Admin Route Protection**: Tests admin-only route restrictions

### 4. Authentication State Management
- **Login/Signup Redirect**: Authenticated users are redirected away from auth pages
- **Role Assignment**: Handles users without role assignment
- **Session Management**: Validates authentication state persistence

### 5. Logout Flow
- **Proper Logout**: Verifies logout redirects to homepage
- **Session Clearing**: Ensures session data is properly cleared
- **Post-Logout Protection**: Confirms protected routes are inaccessible after logout

### 6. OAuth Authentication Flow
- **OAuth Callback**: Tests OAuth callback handling
- **Role Assignment**: Verifies role assignment after OAuth authentication

### 7. Error Handling and Edge Cases
- **Invalid Tokens**: Handles malformed authentication tokens
- **Network Errors**: Tests authentication failure scenarios
- **Malformed Data**: Validates handling of invalid role data

### 8. Performance and Loading States
- **Loading Indicators**: Verifies loading states during authentication
- **Slow Network**: Tests behavior under slow network conditions

## Custom Cypress Commands

### Authentication Commands
```typescript
cy.login(email: string, password: string)
cy.loginWithRole(email: string, role: string)
cy.logout()
```

### Verification Commands
```typescript
cy.verifyDashboardAccess(role: string)
cy.verifyProtectedRouteRedirect(route: string, expectedRedirect: string)
cy.verifyAuthenticated(shouldBeAuthenticated: boolean)
```

### Role Selection Commands
```typescript
cy.selectRole(role: string)
```

## Running the Tests

### Comprehensive Test Suite
```bash
npm run test:e2e:routing
```

### Simplified Test Suite
```bash
npm run test:e2e:routing-simple
```

### All E2E Tests
```bash
npm run test:e2e
```

## Test Data

The tests use predefined test users from `cypress/fixtures/users.json`:
- `test-hub@snipshift.com` - Hub Owner
- `test-pro@snipshift.com` - Professional
- `test-brand@snipshift.com` - Brand
- `test-trainer@snipshift.com` - Trainer

## Expected Routes

### Dashboard Routes
- Hub Owner: `/hub-dashboard`
- Professional: `/professional-dashboard`
- Brand: `/brand-dashboard`
- Trainer: `/trainer-dashboard`
- Admin: `/admin`

### Authentication Routes
- Login: `/login`
- Signup: `/signup`
- Role Selection: `/role-selection`
- OAuth Callback: `/oauth/callback`

### Public Routes
- Landing Page: `/`
- Home: `/home`
- Demo: `/demo`

## Test Coverage

### User Flows Covered
1. ✅ New user sign-up → role selection → dashboard
2. ✅ Login → role-based dashboard redirect
3. ✅ Protected route access for unauthenticated users
4. ✅ Cross-role dashboard access prevention
5. ✅ Admin route protection
6. ✅ Authentication state management
7. ✅ Logout flow and session clearing
8. ✅ OAuth authentication flow
9. ✅ Error handling and edge cases
10. ✅ Performance and loading states

### Routes Tested
- ✅ All dashboard routes
- ✅ All authentication routes
- ✅ All protected feature routes
- ✅ Public routes
- ✅ Error routes

## Maintenance

### Adding New Tests
1. Follow the existing test structure and naming conventions
2. Use custom Cypress commands when possible
3. Add appropriate data-testid attributes to new components
4. Update this documentation

### Updating Test Data
1. Modify `cypress/fixtures/users.json` for new test users
2. Update role mappings in `client/src/lib/roles.ts` if needed
3. Ensure test endpoints are available in the backend

### Troubleshooting
1. Check that all data-testid attributes are present in components
2. Verify test endpoints are working (`/api/test/login`, `/api/test/oauth-callback`)
3. Ensure authentication state is properly cleared between tests
4. Check network interceptors and timeouts for flaky tests

## Integration with CI/CD

These tests are designed to run in CI/CD pipelines:
- Headless browser execution
- Environment variable configuration
- Concurrent server startup and test execution
- Proper cleanup and error handling

## Performance Considerations

- Tests use lazy loading for dashboard components
- Network requests are intercepted for controlled testing
- Loading states are validated for better UX
- Timeouts are configured for slow network conditions
