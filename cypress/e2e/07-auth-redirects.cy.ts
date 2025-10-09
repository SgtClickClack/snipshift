describe('Auth redirects', () => {
  it('login -> role-selection -> dashboard', () => {
    // Programmatic login via test endpoint
    cy.request({
      method: 'POST',
      url: '/api/test/login',
      headers: { 'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 'X-Snipshift-CSRF': '1' },
      // Force role-selection by logging in with a neutral/client role first
      body: { email: 'e2e@snipshift.test', role: 'client' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200)
      const user = res.body || {}
      // Seed client-side auth so AuthGuard recognizes authenticated state
      cy.window().then((win) => {
        win.localStorage.setItem('currentUser', JSON.stringify({
          id: user.id || 'e2e-user',
          email: user.email || 'e2e@snipshift.test',
          password: 'password123',
          roles: Array.isArray(user.roles) ? user.roles : ['client'],
          currentRole: user.currentRole ?? 'client',
          provider: 'email',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          displayName: user.displayName || 'E2E User'
        }))
      })
    });

    // Navigate to home page
    cy.visit('/');
    cy.get('[data-testid="button-login"]').click();
    cy.get('[data-testid="input-email"]').type('e2e@snipshift.test');
    cy.get('[data-testid="input-password"]').type('password123');
    cy.get('[data-testid="button-login"]').click();
    
    // Should be redirected to role selection
    cy.location('pathname', { timeout: 10000 }).should('eq', '/role-selection');

    // Select professional role and continue
    cy.get('[data-testid="button-select-professional"]').click();
    cy.get('[data-testid="button-continue"]').click();

    // Land on professional dashboard
    cy.location('pathname', { timeout: 10000 }).should('eq', '/professional-dashboard');
  });
});


