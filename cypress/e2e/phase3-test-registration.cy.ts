describe('Phase 3 - Test User Registration', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should register a new user successfully', () => {
    cy.navigateToLanding()
    cy.get('[data-testid="link-signup"]').should('be.visible').click()
    
    // Use a unique email to avoid conflicts
    const uniqueEmail = `test-${Date.now()}@snipshift.com`
    
    cy.get('[data-testid="input-email"]').type(uniqueEmail)
    cy.get('[data-testid="input-password"]').type('SecurePass123!')
    cy.get('[data-testid="input-display-name"]').type('Test User')
    cy.get('[data-testid="select-role"]').select('barber')
    cy.get('[data-testid="button-signup"]').click()
    
    // Should redirect to role selection or show success
    cy.url().should('satisfy', (url) => {
      return url.includes('/role-selection') || url.includes('/login')
    })
  })
})
