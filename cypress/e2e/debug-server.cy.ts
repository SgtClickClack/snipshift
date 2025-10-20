describe('Debug Server Response', () => {
  it('should check what the server is actually serving', () => {
    cy.request('/').then((response) => {
      cy.log('Response status:', response.status)
      cy.log('Response headers:', response.headers)
      cy.log('Response body length:', response.body.length)
      cy.log('Response body preview:', response.body.substring(0, 500))
      
      // Check if it contains React root
      expect(response.body).to.include('id="root"')
      
      // Check if it contains our landing page testid
      expect(response.body).to.include('data-testid="landing-page"')
    })
  })
})