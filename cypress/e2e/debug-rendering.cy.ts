describe('Debug Rendering - SnipShift', () => {
  beforeEach(() => {
    // Ignore Vite React plugin errors temporarily
    cy.on('uncaught:exception', (err, runnable) => {
      if (err.message.includes('@vitejs/plugin-react can\'t detect preamble')) {
        return false
      }
      return true
    })
    
    cy.logout()
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should render the application root', () => {
    cy.visit('/')
    cy.get('#root').should('be.visible')
  })
})
