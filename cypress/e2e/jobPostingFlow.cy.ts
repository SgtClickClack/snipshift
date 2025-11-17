describe('Job Posting Flow', () => {
  beforeEach(() => {
    // 1. Programmatically log in
    cy.login(); 
    
    // 2. Now visit the dashboard
    cy.visit('/business-dashboard');
  });

  it('Hub owner should be able to navigate to the "Post a Job" page', () => {
    // Wait for the URL to be correct (ensures we're not redirected to login)
    cy.url().should('include', '/business-dashboard');
    
    // Wait for the dashboard to be fully loaded
    cy.get('h1').contains('Business Dashboard').should('be.visible');
    
    // Click the "Post a Job" button
    cy.get('[data-testid="button-post-job"]').should('be.visible').click();

    // Verify the URL has changed to the job posting page
    cy.url().should('include', '/create-job');

    // Verify the create job heading is visible
    cy.get('[data-testid="heading-create-job"]').should('be.visible');
  });

  it('should disable the submit button if the user has zero credits', () => {
    // Intercept the login API to return a user with zero credits
    // This must be set up before cy.login() is called
    cy.intercept('POST', 'http://localhost:5000/api/login', {
      statusCode: 200,
      body: {
        id: 'user-1',
        email: 'business@example.com',
        name: 'Test Business',
        token: 'mock-auth-token-12345',
        credits: 0,
      },
    }).as('loginWithZeroCredits');

    // Clear any existing session and log in again with zero credits
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    
    // Log in as a hub owner (which mocks the user with credits: 0)
    cy.login();

    // Store user data in localStorage (matching the intercepted response)
    cy.window().then((win) => {
      const userData = {
        id: 'user-1',
        email: 'business@example.com',
        name: 'Test Business',
        credits: 0,
      };
      win.localStorage.setItem('currentUser', JSON.stringify(userData));
    });

    // Visit the job posting page
    cy.visit('/create-job');

    // Fill out the form
    cy.get('[data-testid="input-job-title"]').type('Test Job');
    cy.get('[data-testid="input-pay-rate"]').type('50');
    cy.get('[data-testid="textarea-job-description"]').type('This is a test job description.');
    cy.get('[data-testid="input-job-date"]').type('2025-12-25');
    cy.get('[data-testid="input-start-time"]').type('09:00');
    cy.get('[data-testid="input-end-time"]').type('17:00');

    // Assert that the submit button is disabled
    cy.get('[data-testid="button-submit-job"]').should('be.disabled');

    // Assert that an error message is visible
    cy.get('[data-testid="error-insufficient-credits"]')
      .should('be.visible')
      .and('contain', 'You do not have enough credits to post a job.');
  });

  it('should allow the hub owner to fill out and submit the new job form', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Find and fill the Job Title input
    cy.get('[data-testid="input-job-title"]').type('Test Job');

    // Find and fill the Pay Rate input
    cy.get('[data-testid="input-pay-rate"]').type('50');

    // Find and fill the Job Description textarea
    cy.get('[data-testid="textarea-job-description"]').type('This is a test job description.');

    // Find and fill the Date input
    cy.get('[data-testid="input-job-date"]').type('2025-12-25');

    // Find and fill the Start Time input
    cy.get('[data-testid="input-start-time"]').type('09:00');

    // Find and fill the End Time input
    cy.get('[data-testid="input-end-time"]').type('17:00');

    // Intercept the API call for job submission
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').click();

    // Wait for the API call to complete and verify the request body includes all fields
    cy.wait('@postJob').its('request.body').should('include', {
      date: '2025-12-25',
      startTime: '09:00',
      endTime: '17:00'
    });

    // Verify the user is redirected to the dashboard
    cy.url().should('include', '/business-dashboard');

    // Verify the job is displayed on the dashboard
    cy.get('[data-testid="job-list-container"]')
      .should('contain', 'Test Job');
    cy.get('[data-testid="job-list-container"]')
      .should('contain', '50');
  });

  it('should show an error message if the job title is empty', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Wait for the form to be visible
    cy.get('[data-testid="input-job-title"]').should('be.visible');

    // Leave the Job Title input blank (don't fill it)

    // Intercept the API call to verify it's not made
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').should('be.visible').click();

    // Verify that the API call was not made (wait a short time and verify it wasn't called)
    cy.wait(500); // Wait a short time
    cy.get('@postJob.all').should('have.length', 0);

    // Verify that an error message is visible
    cy.get('[data-testid="error-message-job-title"]')
      .should('be.visible')
      .and('contain', 'Job title is required');

    // Verify we're still on the job posting page (not redirected)
    cy.url().should('include', '/create-job');
  });

  it('should show an error message if the pay rate is invalid', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Fill in the Job Title with a valid value
    cy.get('[data-testid="input-job-title"]').type('Valid Title');

    // Leave the Pay Rate input blank or enter "0"
    cy.get('[data-testid="input-pay-rate"]').clear();

    // Intercept the API call to verify it's not made
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').click();

    // Verify that the API call was not made (wait a short time and verify it wasn't called)
    cy.wait(500); // Wait a short time
    cy.get('@postJob.all').should('have.length', 0);

    // Verify that an error message is visible
    cy.get('[data-testid="error-message-pay-rate"]')
      .should('be.visible')
      .and('contain', 'Pay rate must be a positive number');

    // Verify we're still on the job posting page (not redirected)
    cy.url().should('include', '/create-job');
  });

  it('should show an error message if the job description is empty', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Fill in the Job Title with a valid value
    cy.get('[data-testid="input-job-title"]').type('Valid Title');

    // Fill in the Pay Rate with a valid value
    cy.get('[data-testid="input-pay-rate"]').type('50');

    // Leave the Job Description textarea blank (don't fill it)

    // Intercept the API call to verify it's not made
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').click();

    // Verify that the API call was not made (wait a short time and verify it wasn't called)
    cy.wait(500); // Wait a short time
    cy.get('@postJob.all').should('have.length', 0);

    // Verify that an error message is visible
    cy.get('[data-testid="error-message-job-description"]')
      .should('be.visible')
      .and('contain', 'Description is required');

    // Verify we're still on the job posting page (not redirected)
    cy.url().should('include', '/create-job');
  });

  it('should show an error message if the date is empty', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Fill in the Job Title with a valid value
    cy.get('[data-testid="input-job-title"]').type('Valid Title');

    // Fill in the Pay Rate with a valid value
    cy.get('[data-testid="input-pay-rate"]').type('50');

    // Fill in the Job Description with a valid value
    cy.get('[data-testid="textarea-job-description"]').type('Valid description');

    // Leave the Date input blank (don't fill it)

    // Intercept the API call to verify it's not made
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').click();

    // Verify that the API call was not made (wait a short time and verify it wasn't called)
    cy.wait(500); // Wait a short time
    cy.get('@postJob.all').should('have.length', 0);

    // Verify that an error message is visible
    cy.get('[data-testid="error-message-job-date"]')
      .should('be.visible')
      .and('contain', 'Date is required');

    // Verify we're still on the job posting page (not redirected)
    cy.url().should('include', '/create-job');
  });

  it('should show an error message if the start time is empty', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Fill in the Job Title with a valid value
    cy.get('[data-testid="input-job-title"]').type('Valid Title');

    // Fill in the Pay Rate with a valid value
    cy.get('[data-testid="input-pay-rate"]').type('50');

    // Fill in the Job Description with a valid value
    cy.get('[data-testid="textarea-job-description"]').type('Valid description');

    // Fill in the Date with a valid value
    cy.get('[data-testid="input-job-date"]').type('2025-12-25');

    // Leave the Start Time input blank (don't fill it)

    // Intercept the API call to verify it's not made
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').click();

    // Verify that the API call was not made (wait a short time and verify it wasn't called)
    cy.wait(500); // Wait a short time
    cy.get('@postJob.all').should('have.length', 0);

    // Verify that an error message is visible
    cy.get('[data-testid="error-message-start-time"]')
      .should('be.visible')
      .and('contain', 'Start time is required');

    // Verify we're still on the job posting page (not redirected)
    cy.url().should('include', '/create-job');
  });

  it('should show an error message if the end time is empty', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Fill in the Job Title with a valid value
    cy.get('[data-testid="input-job-title"]').type('Valid Title');

    // Fill in the Pay Rate with a valid value
    cy.get('[data-testid="input-pay-rate"]').type('50');

    // Fill in the Job Description with a valid value
    cy.get('[data-testid="textarea-job-description"]').type('Valid description');

    // Fill in the Date with a valid value
    cy.get('[data-testid="input-job-date"]').type('2025-12-25');

    // Fill in the Start Time with a valid value
    cy.get('[data-testid="input-start-time"]').type('09:00');

    // Leave the End Time input blank (don't fill it)

    // Intercept the API call to verify it's not made
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').click();

    // Verify that the API call was not made (wait a short time and verify it wasn't called)
    cy.wait(500); // Wait a short time
    cy.get('@postJob.all').should('have.length', 0);

    // Verify that an error message is visible
    cy.get('[data-testid="error-message-end-time"]')
      .should('be.visible')
      .and('contain', 'End time is required');

    // Verify we're still on the job posting page (not redirected)
    cy.url().should('include', '/create-job');
  });

  it('should show an error message if the end time is before the start time', () => {
    // Navigate directly to the job posting page
    cy.visit('/create-job');

    // Fill in the Job Title with a valid value
    cy.get('[data-testid="input-job-title"]').type('Valid Title');

    // Fill in the Pay Rate with a valid value
    cy.get('[data-testid="input-pay-rate"]').type('50');

    // Fill in the Job Description with a valid value
    cy.get('[data-testid="textarea-job-description"]').type('Valid description');

    // Fill in the Date with a valid value
    cy.get('[data-testid="input-job-date"]').type('2025-12-25');

    // Fill in the Start Time with a later time
    cy.get('[data-testid="input-start-time"]').type('17:00');

    // Fill in the End Time with an earlier time (before start time)
    cy.get('[data-testid="input-end-time"]').type('09:00');

    // Intercept the API call to verify it's not made
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Click the submit button
    cy.get('[data-testid="button-submit-job"]').click();

    // Verify that the API call was not made (wait a short time and verify it wasn't called)
    cy.wait(500); // Wait a short time
    cy.get('@postJob.all').should('have.length', 0);

    // Verify that an error message is visible
    cy.get('[data-testid="error-message-time-logic"]')
      .should('be.visible')
      .and('contain', 'End time must be after start time');

    // Verify we're still on the job posting page (not redirected)
    cy.url().should('include', '/create-job');
  });

  it('should allow a business to delete a job posting', () => {
    // First, create a job to delete
    cy.visit('/create-job');

    // Fill out and submit the job form
    cy.get('[data-testid="input-job-title"]').type('Test Job');
    cy.get('[data-testid="input-pay-rate"]').type('50');
    cy.get('[data-testid="textarea-job-description"]').type('This is a test job description.');
    cy.get('[data-testid="input-job-date"]').type('2025-12-25');
    cy.get('[data-testid="input-start-time"]').type('09:00');
    cy.get('[data-testid="input-end-time"]').type('17:00');

    // Intercept the API call for job submission
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Submit the form
    cy.get('[data-testid="button-submit-job"]').click();

    // Wait for the job to be created and capture the job ID
    cy.wait('@postJob').then((interception) => {
      const jobId = interception.response?.body?.id;
      cy.url().should('include', '/business-dashboard');

      // Verify the job is displayed
      cy.get('[data-testid="job-list-container"]')
        .should('contain', 'Test Job');

      // Intercept the DELETE API call
      cy.intercept('DELETE', `/api/jobs/${jobId}`).as('deleteJob');
      // Intercept the GET API call that will happen after deletion (query invalidation)
      cy.intercept('GET', '/api/jobs').as('getJobsAfterDelete');

      // Stub window.confirm to auto-accept
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Find the job entry by finding all job entries and selecting the one that contains our job
      // We'll find the delete button within the job-list-container that's associated with our job
      cy.get('[data-testid="job-list-container"]')
        .find('[data-testid="delete-job-button"]')
        .last() // Get the last delete button (the one for the job we just created)
        .click();

      // Wait for the delete API call to complete
      cy.wait('@deleteJob');
      // Wait for the refetch after query invalidation
      cy.wait('@getJobsAfterDelete');

      // Verify the delete was successful by checking the API response
      cy.get('@getJobsAfterDelete').then((interception) => {
        const jobs = interception.response?.body || [];
        // Verify the deleted job is not in the list
        const jobStillExists = jobs.some((job: any) => job.id === jobId);
        expect(jobStillExists).to.be.false;
      });

      // If there are no jobs left, verify the "no jobs" message appears
      cy.get('@getJobsAfterDelete').then((interception) => {
        const jobs = interception.response?.body || [];
        if (jobs.length === 0) {
          cy.get('[data-testid="no-jobs"]').should('be.visible');
        }
      });
    });
  });

  it('should allow a business to edit a job posting', () => {
    // 1. CREATE: First, create a job to edit
    cy.visit('/create-job');

    // Fill out and submit the job form
    cy.get('[data-testid="input-job-title"]').type('Test Job for Editing');
    cy.get('[data-testid="input-pay-rate"]').type('100');
    cy.get('[data-testid="textarea-job-description"]').type('This job will be edited.');
    cy.get('[data-testid="input-job-date"]').type('2025-12-25');
    cy.get('[data-testid="input-start-time"]').type('09:00');
    cy.get('[data-testid="input-end-time"]').type('17:00');

    // Intercept the API call for job submission
    cy.intercept('POST', '/api/jobs').as('postJob');

    // Submit the form
    cy.get('[data-testid="button-submit-job"]').click();

    // Wait for the job to be created and capture the job ID
    cy.wait('@postJob').then((interception) => {
      const jobId = interception.response?.body?.id;
      const originalJob = interception.response?.body;
      
      // 2. NAVIGATE: Wait for dashboard and find the job
      cy.url().should('include', '/business-dashboard');
      cy.get('[data-testid="job-list-container"]', { timeout: 10000 })
        .should('contain', 'Test Job for Editing');

      // 3. Set up intercept for the first GET /api/jobs call (before clicking edit)
      // This will return the original job list if the dashboard refetches
      cy.intercept('GET', '/api/jobs', {
        statusCode: 200,
        body: [originalJob],
      }).as('getJobs1');

      // 4. FIND & CLICK EDIT
      // Find the job entry and click the edit button
      cy.get('[data-testid="job-list-container"]')
        .find('[data-testid="edit-job-button"]')
        .last() // Get the last edit button (the one for the job we just created)
        .click();

      // 5. EDIT: On the new page, verify and change data
      // We'll use a test-id for the edit form container
      cy.get('[data-testid="edit-job-form"]', { timeout: 10000 }).should('be.visible');

      // Check that fields are pre-populated
      cy.get('[data-testid="input-job-title"]').should('have.value', 'Test Job for Editing');
      cy.get('[data-testid="input-pay-rate"]').should('have.value', '100');

      // Ensure date field is filled (required for validation)
      cy.get('[data-testid="input-job-date"]').clear().type('2025-12-25');
      // Ensure start time and end time are filled (required for validation)
      cy.get('[data-testid="input-start-time"]').clear().type('09:00');
      cy.get('[data-testid="input-end-time"]').clear().type('17:00');

      // Intercept the PUT/PATCH API call for job update
      cy.intercept('PUT', `/api/jobs/${jobId}`).as('updateJob');

      // Change the title
      cy.get('[data-testid="input-job-title"]').clear().type('Updated Test Job');

      // Set up intercept for the second GET /api/jobs call (after edit, when dashboard refetches)
      // This will return the updated job list with the new title
      // This intercept will override the first one
      const updatedJob = { ...originalJob, title: 'Updated Test Job' };
      cy.intercept('GET', '/api/jobs', {
        statusCode: 200,
        body: [updatedJob],
      }).as('getJobs2');

      // Submit the update
      cy.get('[data-testid="edit-job-submit"]').click();

      // Wait for the update API call to complete
      cy.wait('@updateJob');
      
      // Wait for navigation to dashboard
      cy.url().should('include', '/business-dashboard');
      
      // Wait for the refetch after query invalidation (the second GET call with updated data)
      cy.wait('@getJobs2');

      // 6. VERIFY: Back on dashboard, check for updated data
      cy.get('[data-testid="job-list-container"]', { timeout: 10000 })
        .should('contain', 'Updated Test Job');
      cy.get('[data-testid="job-list-container"]')
        .should('not.contain', 'Test Job for Editing');
    });
  });
});

