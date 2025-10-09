describe('Debug Server Connection', () => {
  it('should connect to the server and check page content', () => {
    // Visit the root page
    cy.visit('/')
    
    // Take a screenshot to see what's on the page
    cy.screenshot('homepage-debug')
    
    // Check if we can see the page title
    cy.title().then((title) => {
      cy.log('Page title:', title)
    })
    
    // Check if there are any elements on the page
    cy.get('body').should('be.visible')
    
    // Log all elements with data-testid attributes
    cy.get('[data-testid]').then(($elements) => {
      cy.log(`Found ${$elements.length} elements with data-testid`)
      $elements.each((index, element) => {
        cy.log(`Element ${index}: ${element.getAttribute('data-testid')}`)
      })
    })
    
    // Check if login page exists
    cy.visit('/login')
    cy.screenshot('login-page-debug')
    
    // Check for login form elements
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="input-email"]').length > 0) {
        cy.log('Login form found with data-testid selectors')
      } else if ($body.find('input[type="email"]').length > 0) {
        cy.log('Login form found with standard email input')
      } else {
        cy.log('No login form found')
      }
    })
  })
})
