describe('AuthGuard Redirect Test', () => {
  it('should redirect authenticated users from homepage to their dashboard', () => {
    // Simulate authenticated user by setting localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('currentUser', JSON.stringify({
        id: 'test-user-id',
        email: 'user@example.com',
        roles: ['professional'],
        currentRole: 'professional',
        displayName: 'Test User'
      }));
    });

    // Visit homepage - should redirect to professional dashboard
    cy.visit('/');
    
    // Should be redirected to professional dashboard
    cy.location('pathname').should('eq', '/professional-dashboard');
    cy.get('[data-testid="professional-dashboard"]').should('be.visible');
  });

  it('should redirect authenticated users from login page to their dashboard', () => {
    // Simulate authenticated user by setting localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('currentUser', JSON.stringify({
        id: 'test-user-id',
        email: 'user@example.com',
        roles: ['professional'],
        currentRole: 'professional',
        displayName: 'Test User'
      }));
    });

    // Visit login page - should redirect to professional dashboard
    cy.visit('/login');
    
    // Should be redirected to professional dashboard
    cy.location('pathname').should('eq', '/professional-dashboard');
    cy.get('[data-testid="professional-dashboard"]').should('be.visible');
  });

  it('should allow unauthenticated users to access homepage', () => {
    // Clear any existing auth state
    cy.clearLocalStorage();
    
    // Visit homepage - should stay on homepage
    cy.visit('/');
    
    // Should remain on homepage
    cy.location('pathname').should('eq', '/');
    cy.get('[data-testid="landing-page"]').should('be.visible');
  });
});
