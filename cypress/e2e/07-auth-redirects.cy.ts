describe('Auth redirects', () => {
  it('login -> role-selection -> dashboard', () => {
    // Programmatic login via test endpoint
    cy.request({
      method: 'POST',
      url: '/api/test/login',
      headers: { 'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 'X-Snipshift-CSRF': '1' },
      body: { email: 'e2e@snipshift.test', role: 'professional' },
      failOnStatusCode: false,
    }).its('status').should('eq', 200);

    // Go to role selection
    cy.visit('/home');
    cy.location('pathname', { timeout: 10000 }).should('match', /\/home|\/role-selection/);

    // Select professional role and continue
    cy.get('[data-testid="button-select-professional"]').click();
    cy.get('[data-testid="button-continue"]').click();

    // Land on professional dashboard
    cy.location('pathname', { timeout: 10000 }).should('eq', '/professional-dashboard');
  });
});


