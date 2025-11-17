describe('Public Job View Flow', () => {
  beforeEach(() => {
    // Create a job and store its response in an alias
    cy.request('POST', 'http://localhost:5000/api/jobs', {
      title: 'Public Test Job',
      payRate: '75',
      description: 'A job visible to the public.',
    }).as('createdJob'); // Store response in @createdJob

    cy.visit('/');
  });

  it('should display posted jobs on the public job board', () => {
    // 2. Look for a container for the public job list
    cy.get('[data-testid="public-job-list"]', { timeout: 10000 })
      .should('be.visible');

    // 3. Assert the job created in the hook is visible
    cy.get('[data-testid="public-job-list"]')
      .should('contain', 'Public Test Job');
    cy.get('[data-testid="public-job-list"]')
      .should('contain', '75');
  });

  it('should allow a user to click a job to view its details', function () {
    // Wait for the alias to be available and access it
    cy.get('@createdJob').then((response: any) => {
      const jobId = response.body.id;

      // 1. Find the specific job card by finding the link with the correct href
      // We'll find the link directly using the job ID
      cy.get(`[data-testid="view-details-link"]`)
        .filter((index, element) => {
          const link = Cypress.$(element).closest('a');
          return link.attr('href') === `/jobs/${jobId}`;
        })
        .first()
        .click();

      // 2. Assert navigation to the new page URL
      cy.url().should('include', `/jobs/${jobId}`);

      // 3. Assert the new page shows the details
      cy.get('[data-testid="job-detail-page"]', { timeout: 10000 })
        .should('be.visible');

      cy.get('[data-testid="job-detail-page"]')
        .should('contain', 'Public Test Job');
      // Check for the full description
      cy.get('[data-testid="job-detail-page"]')
        .should('contain', 'A job visible to the public.');
    });
  });

  it('should allow a user to apply for a job', function () {
    // Access the job ID from the alias
    cy.get('@createdJob').then((response: any) => {
      const jobId = response.body.id;

      // 1. Navigate to the job detail page
      cy.visit(`/jobs/${jobId}`);
      cy.get('[data-testid="job-detail-page"]', { timeout: 10000 })
        .should('be.visible');

      // 2. Find and click the "Apply Now" button (This will fail)
      cy.get('[data-testid="apply-now-button"]').click();

      // 3. The application form should appear
      cy.get('[data-testid="application-form"]', { timeout: 10000 })
        .should('be.visible');

      // 4. Fill out the form
      cy.get('[data-testid="apply-name-input"]')
        .type('Test Applicant');
      cy.get('[data-testid="apply-email-input"]')
        .type('test@example.com');
      cy.get('[data-testid="apply-cover-letter-textarea"]')
        .type('I am the best candidate for this role.');

      // 5. Submit the application
      cy.get('[data-testid="submit-application"]').click();

      // 6. Look for a success message
      cy.get('[data-testid="application-success-message"]', { timeout: 10000 })
        .should('be.visible')
        .should('contain', 'Application submitted successfully!');
        
      // 7. The form should disappear
      cy.get('[data-testid="application-form"]').should('not.exist');
    });
  });
});

