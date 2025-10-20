describe('Login Page Debug Test', () => {
  it('should be able to access login page directly', () => {
    cy.visit('/login')
    cy.waitForAuth()
    
    // Check if we can find basic elements
    cy.get('body').should('be.visible')
    cy.get('[data-testid="login-form"]').should('be.visible')
    cy.get('[data-testid="input-email"]').should('be.visible')
    cy.get('[data-testid="input-password"]').should('be.visible')
    cy.get('[data-testid="button-signin"]').should('be.visible')
  })
})
