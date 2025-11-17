// snipshift/snipshift-next/web/e2e/authFlow.cy.ts

describe('Authentication Flow', () => {
  it('should redirect unauthenticated users from the dashboard to the login page', () => {
    // 1. Visit the protected route
    cy.visit('/business-dashboard');

    // 2. Assert redirection to the login page
    cy.url().should('include', '/login');

    // 3. Assert the login form is visible
    cy.get('[data-testid="login-form"]').should('be.visible');
    cy.get('[data-testid="login-email-input"]').should('be.visible');
    cy.get('[data-testid="login-password-input"]').should('be.visible');
  });
});

