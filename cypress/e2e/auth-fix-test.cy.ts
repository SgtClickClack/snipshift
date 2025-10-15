describe('Authentication Fix Test', () => {
  it('should successfully login with test credentials', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      // Navigate to login page
      cy.visit('/login')
      
      // Fill out login form
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      
      // Submit form
      cy.get('[data-testid="button-signin"]').click()
      
      // Should redirect successfully (not get stuck on login page)
      cy.url().should('not.include', '/login')
    })
  })
})
