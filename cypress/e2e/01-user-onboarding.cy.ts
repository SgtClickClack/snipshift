describe('User Onboarding Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should navigate to signup page from homepage', () => {
    cy.get('[data-testid="link-signup"]').click()
    cy.url().should('include', '/signup')
    cy.get('[data-testid="heading-signup"]').should('contain', 'Create Account')
  })

  it('should display all role options in signup form', () => {
    cy.visit('/signup')
    
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
      
      cy.visit('/signup')
      
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
      
      cy.visit('/signup')
      
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
    cy.visit('/signup')
    
    // Try to submit empty form
    cy.get('[data-testid="button-signup"]').click()
    
    // Should display validation errors
    cy.get('[data-testid="error-email"]').should('be.visible')
    cy.get('[data-testid="error-password"]').should('be.visible')
    cy.get('[data-testid="error-display-name"]').should('be.visible')
    cy.get('[data-testid="error-role"]').should('be.visible')
  })

  it('should allow user to switch between login and signup', () => {
    cy.visit('/login')
    cy.get('[data-testid="link-signup"]').click()
    cy.url().should('include', '/signup')
    
    cy.get('[data-testid="link-login"]').click()
    cy.url().should('include', '/login')
  })
})