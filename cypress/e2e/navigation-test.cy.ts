describe('Navigation and Routing Test', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should complete full authentication and navigation journey', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      // Step 1: Navigate to login page
      cy.visit('/login')
      cy.url().should('include', '/login')
      
      // Step 2: Fill out login form
      cy.get('[data-testid="input-email"]').should('be.visible').type(testUser.email)
      cy.get('[data-testid="input-password"]').should('be.visible').type(testUser.password)
      
      // Step 3: Submit login form
      cy.get('[data-testid="button-signin"]').should('be.visible').click()
      
      // Step 4: Verify successful login and redirect
      cy.url().should('not.include', '/login')
      
      // Step 5: Check if we're on a dashboard or role selection page
      cy.url().then((url) => {
        cy.log('Current URL after login:', url)
        
        // Should be on either role selection or dashboard
        const isOnRoleSelection = url.includes('/role-selection')
        const isOnDashboard = url.includes('/dashboard') || url.includes('/professional-dashboard')
        
        expect(isOnRoleSelection || isOnDashboard, 'Should be on role selection or dashboard').to.be.true
      })
      
      // Step 6: Verify page content loads
      cy.get('body').should('be.visible')
      
      // Step 7: Check for navigation elements
      cy.get('body').then(($body) => {
        const hasNavigation = $body.find('[data-testid*="nav-"]').length > 0
        const hasMobileNav = $body.find('[data-testid*="mobile-"]').length > 0
        
        cy.log(`Navigation elements found: Desktop=${hasNavigation}, Mobile=${hasMobileNav}`)
        
        // At least one type of navigation should exist
        expect(hasNavigation || hasMobileNav, 'Should have navigation elements').to.be.true
      })
    })
  })

  it('should handle role selection flow', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      // Login first
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      cy.get('[data-testid="button-signin"]').click()
      
      // Check if we're on role selection page
      cy.url().then((url) => {
        if (url.includes('/role-selection')) {
          cy.log('On role selection page, testing role selection')
          
          // Try to select professional role
          cy.get('body').then(($body) => {
            const roleButton = $body.find('[data-testid="button-select-professional"]')
            if (roleButton.length > 0) {
              cy.get('[data-testid="button-select-professional"]').click()
              cy.get('[data-testid="button-continue"]').click()
              
              // Should redirect to dashboard
              cy.url().should('include', '/professional-dashboard')
            }
          })
        } else {
          cy.log('Skipping role selection - already on dashboard')
        }
      })
    })
  })
})
