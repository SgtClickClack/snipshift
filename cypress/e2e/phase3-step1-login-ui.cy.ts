describe('Phase 3 - Step 1: Test Frontend Login UI and Submission', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should successfully interact with login form and submit credentials', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      // Step 1: Visit the application's login page
      cy.navigateToLanding()
      cy.get('[data-testid="button-login"]').should('be.visible').click()
      cy.url().should('include', '/login')
      
      // Step 2: Use cy.get() with data-testid attributes to select email and password fields
      cy.get('[data-testid="input-email"]').should('be.visible')
      cy.get('[data-testid="input-password"]').should('be.visible')
      
      // Step 3: Use cy.type() to fill in credentials from test data fixture
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      
      // Step 4: Use cy.click() on the submit button to log in
      cy.get('[data-testid="button-signin"]').should('be.visible').click()
      
      // Verify the form submission was successful (should redirect or show success)
      cy.url().should('not.include', '/login')
    })
  })
})
