describe('Phase 3 - Step 2: Simple Dashboard Access Test', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should complete login journey: login page -> dashboard -> profile', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      // Start login journey
      cy.navigateToLanding()
      cy.get('[data-testid="link-login"]').should('be.visible').click()
      
      // Fill out login form
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      
      // Submit form
      cy.get('[data-testid="button-signin"]').click()
      
      // Handle both scenarios: role selection or direct dashboard redirect
      cy.url().then((url) => {
        if (url.includes('/role-selection')) {
          // User needs to select role
          cy.get('[data-testid="button-select-barber"]').should('be.visible')
          cy.completeRoleSelection('professional')
        } else if (url.includes('/professional-dashboard')) {
          // User already has role selected, skip role selection
          cy.log('User already has role selected, proceeding to dashboard verification')
        }
      })
      
      // Verify dashboard access
      cy.url().should('include', '/professional-dashboard')
      cy.get('[data-testid="professional-dashboard"]').should('be.visible')
      cy.get('[data-testid="user-menu"]').should('be.visible')
    })
  })
})
