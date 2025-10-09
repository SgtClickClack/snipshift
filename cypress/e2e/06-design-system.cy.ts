describe('Design System and UI Components', () => {
  beforeEach(() => {
    // Start from homepage and navigate to design showcase
    cy.visit('/')
    cy.get('[data-testid="button-login"]').click()
    cy.get('[data-testid="input-email"]').type('test-admin@snipshift.com')
    cy.get('[data-testid="input-password"]').type('TestPass123!')
    cy.get('[data-testid="button-login"]').click()
    
    // Navigate to design showcase from admin dashboard
    cy.get('[data-testid="admin-dashboard"]').should('be.visible')
    cy.get('[data-testid="nav-design-showcase"]').click()
  })

  it('should display all chrome button variants', () => {
    // Check chrome button variants are rendered
    cy.get('[data-testid="chrome-button"]').should('be.visible')
    cy.get('[data-testid="accent-button"]').should('be.visible')
    cy.get('[data-testid="charcoal-button"]').should('be.visible')
    cy.get('[data-testid="steel-button"]').should('be.visible')
    
    // Test button interactions
    cy.get('[data-testid="chrome-button"]').trigger('mouseover')
    cy.get('[data-testid="chrome-button"]').should('have.class', 'hover:-translate-y-0.5')
  })

  it('should display chrome cards with proper styling', () => {
    // Check different card types
    cy.get('[data-testid="card-chrome"]').should('be.visible')
    cy.get('[data-testid="card-floating"]').should('be.visible')
    cy.get('[data-testid="card-mirror"]').should('be.visible')
    
    // Verify chrome styling classes are applied
    cy.get('[data-testid="card-chrome"]').should('have.class', 'card-chrome')
    cy.get('[data-testid="card-floating"]').should('have.class', 'card-floating')
    cy.get('[data-testid="card-mirror"]').should('have.class', 'charcoal-mirror')
  })

  it('should display proper form styling', () => {
    // Check chrome form elements
    cy.get('[data-testid="input-chrome"]').should('be.visible')
    cy.get('[data-testid="textarea-chrome"]').should('be.visible')
    
    // Test form interactions
    cy.get('[data-testid="input-chrome"]').focus()
    cy.get('[data-testid="input-chrome"]').should('have.class', 'focus:ring-red-accent')
    
    // Type in form fields
    cy.get('[data-testid="input-chrome"]').type('Test input')
    cy.get('[data-testid="textarea-chrome"]').type('Test textarea content')
  })

  it('should display chrome icons with proper styling', () => {
    // Check icon styling
    cy.get('[data-testid="icon-steel"]').should('be.visible')
    cy.get('[data-testid="icon-accent"]').should('be.visible')
    
    // Test icon hover effects
    cy.get('[data-testid="icon-steel"]').trigger('mouseover')
    cy.get('[data-testid="icon-accent"]').trigger('mouseover')
  })

  it('should display badges with chrome styling', () => {
    // Check badge variants
    cy.get('[data-testid="badge-accent"]').should('be.visible')
    cy.get('[data-testid="badge-steel"]').should('be.visible')
    
    // Verify badge styling
    cy.get('[data-testid="badge-accent"]').should('have.class', 'badge-accent')
    cy.get('[data-testid="badge-steel"]').should('have.class', 'badge-steel')
  })

  it('should display notification components with chrome styling', () => {
    // Check notification styling
    cy.get('[data-testid="notification-chrome"]').should('be.visible')
    cy.get('[data-testid="notification-chrome"]').should('have.class', 'notification-chrome')
    
    // Check notification content
    cy.get('[data-testid="notification-chrome"]').within(() => {
      cy.get('[data-testid="notification-icon"]').should('be.visible')
      cy.get('[data-testid="notification-title"]').should('be.visible')
      cy.get('[data-testid="notification-content"]').should('be.visible')
    })
  })

  it('should display typography with chrome styling', () => {
    // Check typography variants
    cy.get('[data-testid="heading-chrome"]').should('be.visible')
    cy.get('[data-testid="text-steel-gradient"]').should('be.visible')
    cy.get('[data-testid="text-accent-gradient"]').should('be.visible')
    cy.get('[data-testid="text-charcoal"]').should('be.visible')
    cy.get('[data-testid="text-refined-red"]').should('be.visible')
    
    // Verify typography classes
    cy.get('[data-testid="heading-chrome"]').should('have.class', 'heading-chrome')
    cy.get('[data-testid="text-steel-gradient"]').should('have.class', 'text-steel-gradient')
    cy.get('[data-testid="text-accent-gradient"]').should('have.class', 'text-accent-gradient')
  })

  it('should maintain design consistency across components', () => {
    // Check color consistency
    cy.get('[data-testid="accent-button"]')
      .should('have.css', 'background-color')
      .and('match', /rgb\(165, 0, 42\)/) // Red accent color
    
    // Check steel color consistency
    cy.get('[data-testid="steel-button"]')
      .should('have.css', 'background-image')
      .and('include', 'gradient')
    
    // Check border radius consistency
    cy.get('[data-testid="card-chrome"]')
      .should('have.css', 'border-radius', '12px')
  })

  it('should be responsive across different screen sizes', () => {
    // Test mobile view
    cy.viewport('iphone-x')
    cy.get('[data-testid="design-showcase"]').should('be.visible')
    cy.get('[data-testid="button-grid"]').should('have.class', 'grid-cols-1')
    
    // Test tablet view
    cy.viewport('ipad-2')
    cy.get('[data-testid="button-grid"]').should('have.class', 'md:grid-cols-2')
    
    // Test desktop view
    cy.viewport(1280, 720)
    cy.get('[data-testid="button-grid"]').should('have.class', 'lg:grid-cols-4')
  })

  it('should have proper accessibility attributes', () => {
    // Check button accessibility
    cy.get('[data-testid="chrome-button"]')
      .should('have.attr', 'type', 'button')
      .and('be.enabled')
    
    // Check form accessibility
    cy.get('[data-testid="input-chrome"]')
      .should('have.attr', 'type', 'text')
      .and('not.have.attr', 'aria-invalid')
    
    // Check heading hierarchy
    cy.get('h1').should('exist')
    cy.get('h2').should('exist')
    
    // Check color contrast (basic check)
    cy.get('[data-testid="text-charcoal"]')
      .should('have.css', 'color')
      .and('not.equal', 'rgb(255, 255, 255)') // Not white on white
  })
})