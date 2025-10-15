describe('Test Single Login', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should login with existing email and password credentials', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      cy.navigateToLanding()
      cy.get('[data-testid="button-login"]').should('be.visible').click()
      cy.url().should('include', '/login')
      
      // Fill out login form
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      
      // Submit form
      cy.get('[data-testid="button-signin"]').click()
      
      // Should redirect to role selection
      cy.url().should('include', '/role-selection')
      cy.get('[data-testid="button-select-professional"]').should('be.visible')
    })
  })
})
