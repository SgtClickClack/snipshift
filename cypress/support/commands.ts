/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with session management
       * @example cy.loginWithSession('user@example.com', 'password', 'hub')
       */
      loginWithSession(email: string, password: string, role: string): Chainable<void>;
      /**
       * Custom command to login programmatically for tests
       * @example cy.login()
       */
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginWithSession', (email: string, password: string, role: string) => {
  // Map hub to business for legacy compatibility
  const mappedRole = role === 'hub' ? 'business' : role;
  
  cy.session(
    `login-${email}-${mappedRole}`,
    () => {
      cy.request({
        method: 'POST',
        url: '/api/login',
        body: { email, password },
        headers: {
          'Content-Type': 'application/json',
          'X-Snipshift-CSRF': '1',
        },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 200 && response.body) {
          // Store user data in localStorage for session validation
          cy.window().then((win) => {
            win.localStorage.setItem('currentUser', JSON.stringify(response.body));
          });
        } else {
          throw new Error(`Login failed: ${response.status} ${JSON.stringify(response.body)}`);
        }
      });
    },
    {
      validate: () => {
        cy.window().then((win) => {
          const currentUser = win.localStorage.getItem('currentUser');
          if (!currentUser) {
            throw new Error('Session validation failed: no user in localStorage');
          }
        });
      },
    }
  );
  
  // Ensure we're authenticated before proceeding
  cy.window().then((win) => {
    const currentUser = win.localStorage.getItem('currentUser');
    if (!currentUser) {
      throw new Error('Failed to establish session');
    }
  });
});

Cypress.Commands.add('login', () => {
  cy.log('Logging in programmatically');
  
  // Make the login request first (before visiting any page)
  cy.request('POST', 'http://localhost:5000/api/login', {
    email: 'business@example.com',
    password: 'password123',
  }).then((response) => {
    // Set the token in localStorage before visiting any page
    const token = response.body.token;
    expect(token).to.exist;
    
    // Visit the base URL, set the token, then reload to ensure AuthContext picks it up
    cy.visit('/').then(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('snipshift_auth_token', token);
        // Verify it was set
        expect(win.localStorage.getItem('snipshift_auth_token')).to.equal(token);
        // Reload the page so AuthContext re-initializes with the token
        win.location.reload();
      });
    });
    // Wait for the page to reload
    cy.url().should('include', '/');
  });
});

export {};

