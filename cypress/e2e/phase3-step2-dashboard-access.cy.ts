describe('Phase 3 - Step 2: Verify Post-Login Redirect and Dashboard Access', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should redirect to dashboard after successful login and verify dashboard elements', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      // First, register the user if they don't exist
      cy.navigateToLanding()
      cy.get('[data-testid="link-signup"]').should('be.visible').click()
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      cy.get('[data-testid="input-display-name"]').type(testUser.displayName)
      cy.get('[data-testid="select-role"]').click()
      cy.get('[data-testid="option-barber"]').click()
      cy.get('[data-testid="button-signup"]').click()
      
      // Handle potential duplicate user error or success
      cy.url().then((url) => {
        if (url.includes('/role-selection')) {
          // Registration successful, complete role selection
          cy.completeRoleSelection('professional')
        } else if (url.includes('/login')) {
          // User already exists, proceed with login
          cy.get('[data-testid="input-email"]').type(testUser.email)
          cy.get('[data-testid="input-password"]').type(testUser.password)
          cy.get('[data-testid="button-signin"]').click()
        }
      })
      
      // Perform login if not already logged in
      cy.url().then((url) => {
        if (url.includes('/login')) {
          cy.get('[data-testid="input-email"]').type(testUser.email)
          cy.get('[data-testid="input-password"]').type(testUser.password)
          cy.get('[data-testid="button-signin"]').click()
        }
      })
      
      // Step 2a: Immediately after login form submission, verify redirect
      // Check if we're redirected to role-selection or directly to dashboard
      cy.url().then((url) => {
        if (url.includes('/role-selection')) {
          // Complete role selection to reach dashboard
          cy.completeRoleSelection('professional')
        }
        // If already on dashboard, continue with verification
      })
      
      // Step 2b: Verify that key dashboard elements are visible
      cy.url().should('include', '/professional-dashboard')
      cy.get('[data-testid="professional-dashboard"]').should('be.visible')
      
      // Verify main navigation bar or welcome message is visible
      cy.get('[data-testid="user-menu"]').should('be.visible')
    })
  })
})
