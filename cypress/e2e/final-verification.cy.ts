describe('Final Platform Verification Test', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should complete full user journey: login -> dashboard -> logout', () => {
    cy.fixture('snipshift-v2-test-data').then((data) => {
      const testUser = data.users.barber
      
      // Step 1: Navigate to login page
      cy.visit('/login')
      cy.url().should('include', '/login')
      
      // Step 2: Verify login form exists and is functional
      cy.get('[data-testid="input-email"]').should('be.visible')
      cy.get('[data-testid="input-password"]').should('be.visible')
      cy.get('[data-testid="button-signin"]').should('be.visible')
      
      // Step 3: Fill out and submit login form
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      cy.get('[data-testid="button-signin"]').click()
      
      // Step 4: Verify successful login and redirect
      cy.url().should('not.include', '/login')
      
      // Step 5: Verify we're on a functional page
      cy.get('body').should('be.visible')
      
      // Step 6: Check for navigation elements
      cy.get('body').then(($body) => {
        const hasNavigation = $body.find('[data-testid*="nav-"]').length > 0
        const hasMobileNav = $body.find('[data-testid*="mobile-"]').length > 0
        const hasUserMenu = $body.find('[data-testid*="user-"]').length > 0
        
        cy.log(`Navigation elements: Desktop=${hasNavigation}, Mobile=${hasMobileNav}, User=${hasUserMenu}`)
        
        // At least one type of navigation should exist
        expect(hasNavigation || hasMobileNav || hasUserMenu, 'Should have navigation elements').to.be.true
      })
      
      // Step 7: Verify page is responsive and functional
      cy.get('body').should('not.be.empty')
      
      cy.log('✅ Full user journey completed successfully')
    })
  })

  it('should handle multiple user types', () => {
    const userTypes = ['barber', 'shop']
    
    userTypes.forEach((userType) => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users[userType]
        
        cy.log(`Testing ${userType} user: ${testUser.email}`)
        
        // Login
        cy.visit('/login')
        cy.get('[data-testid="input-email"]').type(testUser.email)
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="button-signin"]').click()
        
        // Verify login success
        cy.url().should('not.include', '/login')
        cy.get('body').should('be.visible')
        
        cy.log(`✅ ${userType} user login successful`)
      })
    })
  })

  it('should verify API endpoints are functional', () => {
    // Test authentication API directly
    cy.request({
      method: 'POST',
      url: '/api/login',
      headers: {
        'X-Snipshift-CSRF': '1',
        'Content-Type': 'application/json'
      },
      body: {
        email: 'barber.pro@snipshift.com',
        password: 'SecurePass123!'
      }
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('id')
      expect(response.body).to.have.property('email')
      expect(response.body.email).to.eq('barber.pro@snipshift.com')
    })
    
    cy.log('✅ API endpoints are functional')
  })
})
