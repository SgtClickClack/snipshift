describe('User Onboarding Flow', () => {
  const openSignup = () => {
    cy.get('[data-testid="link-signup"]').should('be.visible').click()
    cy.url().should('include', '/signup')
    cy.get('[data-testid="heading-signup"]').should('contain', 'Create Account')
  }

  beforeEach(() => {
    // Clear any existing authentication state
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.navigateToLanding()
  })

  it.only('should navigate to signup page from homepage', () => {
    // Basic page load check
    cy.get('body').should('exist')
    cy.url().should('include', '/')
    
    // Wait for page to load
    cy.wait(2000)
    
    // Check if we can find any elements at all
    cy.get('body').then(($body) => {
      cy.log('Body exists, content length:', $body.text().length)
    })
    
    // Try to find the signup link
    cy.get('[data-testid="link-signup"]').should('be.visible')
    cy.get('[data-testid="link-signup"]').click()
    cy.url().should('include', '/signup')
    cy.get('[data-testid="heading-signup"]').should('contain', 'Create Account')
  })

  it('should display all role options in signup form', () => {
    openSignup()

    // Check that all user roles are available
    cy.get('[data-testid="select-role"]').click()
    cy.get('[data-testid="option-hub"]').should('be.visible')
    cy.get('[data-testid="option-professional"]').should('be.visible')
    cy.get('[data-testid="option-trainer"]').should('be.visible')
    cy.get('[data-testid="option-brand"]').should('be.visible')
  })

  it('should successfully create a Professional account', () => {
    cy.fixture('users').then((users) => {
      const testUser = users.testUsers.professional
      
      openSignup()
      
      // Fill out signup form
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      cy.get('[data-testid="input-display-name"]').type(testUser.displayName)
      
      // Select role
      cy.get('[data-testid="select-role"]').click()
      cy.get('[data-testid="option-professional"]').click()
      
      // Submit form
      cy.get('[data-testid="button-signup"]').click()
      
      // Should redirect to professional dashboard
      cy.waitForRoute('/professional-dashboard')
      cy.get('[data-testid="heading-dashboard"]').should('contain', 'Professional Dashboard')
    })
  })

  it('should successfully create a Hub account', () => {
    cy.fixture('users').then((users) => {
      const testUser = users.testUsers.hub
      
      openSignup()
      
      // Fill out signup form
      cy.get('[data-testid="input-email"]').type(testUser.email)
      cy.get('[data-testid="input-password"]').type(testUser.password)
      cy.get('[data-testid="input-display-name"]').type(testUser.displayName)
      
      // Select role
      cy.get('[data-testid="select-role"]').click()
      cy.get('[data-testid="option-hub"]').click()
      
      // Submit form
      cy.get('[data-testid="button-signup"]').click()
      
      // Should redirect to hub dashboard
      cy.waitForRoute('/hub-dashboard')
      cy.get('[data-testid="heading-dashboard"]').should('contain', 'Hub Dashboard')
    })
  })

  it('should display validation errors for invalid input', () => {
    openSignup()
    
    // Try to submit empty form
    cy.get('[data-testid="button-signup"]').click()
    
    // Should display validation errors
    cy.get('[data-testid="error-email"]').should('be.visible')
    cy.get('[data-testid="error-password"]').should('be.visible')
    cy.get('[data-testid="error-display-name"]').should('be.visible')
    cy.get('[data-testid="error-role"]').should('be.visible')
  })

  it('should allow user to switch between login and signup', () => {
    openSignup()

    cy.get('[data-testid="link-login"]').should('be.visible').click()
    cy.url().should('include', '/login')

    cy.get('[data-testid="link-signup"]').should('be.visible').click()
    cy.url().should('include', '/signup')
  })
})