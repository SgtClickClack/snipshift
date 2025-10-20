describe('Debug Landing Page', () => {
  it('should debug what elements are on the landing page', () => {
    cy.visit('/')
    cy.waitForAuthInit()
    
    // Log what's actually on the page
    cy.get('body').then(($body) => {
      cy.log('Body HTML:', $body.html().substring(0, 1000))
    })
    
    // Check for any links
    cy.get('a').then(($links) => {
      cy.log('Found links:', $links.length)
      $links.each((index, link) => {
        cy.log(`Link ${index}:`, link.href, link.textContent)
      })
    })
    
    // Check for any elements with data-testid
    cy.get('[data-testid]').then(($elements) => {
      cy.log('Found elements with data-testid:', $elements.length)
      $elements.each((index, element) => {
        cy.log(`Element ${index}:`, element.getAttribute('data-testid'), element.tagName)
      })
    })
    
    // Check if the landing page testid exists
    cy.get('[data-testid="landing-page"]').should('exist')
    
    // Check if there are any buttons
    cy.get('button').then(($buttons) => {
      cy.log('Found buttons:', $buttons.length)
      $buttons.each((index, button) => {
        cy.log(`Button ${index}:`, button.textContent, button.getAttribute('data-testid'))
      })
    })
  })
})

