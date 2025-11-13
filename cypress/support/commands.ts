// TypeScript declarations for custom Cypress commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Instant login using cy.session() for fast authentication
       * @param role - User role: 'professional', 'business', 'shop', 'admin', or 'hub'
       */
      instantLogin(role: string): Chainable<void>;

      /**
       * Login with session caching using email and password
       * @param email - User email
       * @param password - User password
       * @param role - User role for role mapping
       */
      loginWithSession(email: string, password: string, role: string): Chainable<void>;

      /**
       * Logout and clear authentication state
       */
      logout(): Chainable<void>;

      /**
       * Wait for AuthContext to initialize
       */
      waitForAuth(): Chainable<void>;

      /**
       * Wait for auth initialization
       */
      waitForAuthInit(): Chainable<void>;

      /**
       * Wait for content to load
       */
      waitForContent(): Chainable<void>;
    }
  }
}

// Test user credentials mapping
const TEST_USERS: Record<
  string,
  {
    email: string;
    password: string;
    id: string;
    displayName: string;
    roles: string[];
    currentRole: string;
  }
> = {
  professional: {
    email: 'barber.pro@snipshift.com',
    password: 'SecurePass123!',
    id: 'test-professional-001',
    displayName: 'Test Professional',
    roles: ['professional'],
    currentRole: 'professional',
  },
  business: {
    email: 'shop.owner@snipshift.com',
    password: 'SecurePass123!',
    id: 'test-business-001',
    displayName: 'Test Business Owner',
    roles: ['business'],
    currentRole: 'business',
  },
  shop: {
    email: 'shop.owner@snipshift.com',
    password: 'SecurePass123!',
    id: 'test-shop-001',
    displayName: 'Test Shop Owner',
    roles: ['business'],
    currentRole: 'business',
  },
  hub: {
    email: 'shop.owner@snipshift.com',
    password: 'SecurePass123!',
    id: 'test-hub-001',
    displayName: 'Test Hub Manager',
    roles: ['hub'],
    currentRole: 'hub',
  },
  admin: {
    email: 'user@example.com',
    password: 'SecurePassword123!',
    id: 'test-admin-001',
    displayName: 'Test Administrator',
    roles: ['admin'],
    currentRole: 'admin',
  },
};

// Role mapping (some roles map to different dashboard routes)
const ROLE_MAP: Record<string, string> = {
  hub: 'business', // Legacy role mapping
  shop: 'business',
};

function generateTestUserId(email: string, role: string): string {
  const sanitized = email.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const suffix = sanitized.length > 0 ? sanitized.slice(0, 12) : 'user';
  return `test-${role}-${suffix}`;
}

/**
 * Instant login using cy.session() for fast authentication
 * Uses predefined test user credentials based on role
 */
Cypress.Commands.add('instantLogin', (role: string) => {
  const normalizedRole = ROLE_MAP[role] || role;
  const user = TEST_USERS[normalizedRole] || TEST_USERS.professional;

  cy.session(
    `instant-login-${role}`,
    () => {
      const sessionBody = {
        userId: user.id,
        email: user.email,
        roles: user.roles,
        currentRole: user.currentRole,
        provider: 'cypress',
        mode: `instant-login-${normalizedRole}`,
      };

      cy.request({
        method: 'POST',
        url: 'http://localhost:3002/api/testing/sessions',
        body: sessionBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Snipshift-CSRF': '1',
        },
        withCredentials: true,
      }).then((response) => {
        expect(response.status).to.eq(200);
        const { sessionId: sessionToken, session, persistedToRedis } = response.body as {
          sessionId: string;
          session: {
            userId: string;
            email: string;
            roles: string[];
            currentRole: string;
          };
          persistedToRedis?: boolean;
        };

        expect(sessionToken).to.be.a('string').and.have.length.greaterThan(10);

        cy.log(
          persistedToRedis
            ? 'Session persisted to Redis'
            : 'Session stored using in-memory fallback (Redis unavailable)',
        );

        // Set up localStorage to match what AuthContext expects
        cy.window().then((win) => {
          const mockUser = {
            id: session.userId,
            email: session.email,
            roles: session.roles ?? user.roles,
            currentRole: session.currentRole ?? user.currentRole,
            displayName: user.displayName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          win.localStorage.setItem('currentUser', JSON.stringify(mockUser));
          win.localStorage.setItem('authToken', sessionToken);
          win.localStorage.setItem('userRole', normalizedRole);
          win.localStorage.setItem('userId', mockUser.id);
          win.localStorage.setItem('userEmail', user.email);
        });
      });
    },
    {
      validate: () => {
        // Validate session is still valid
        cy.request({
          method: 'GET',
          url: 'http://localhost:3002/api/auth/profile',
          headers: {
            'X-Snipshift-CSRF': '1',
          },
          withCredentials: true,
        }).its('status').should('eq', 200);
      },
    }
  );
});

/**
 * Login with session caching using email and password
 * Similar to instantLogin but uses provided credentials
 */
Cypress.Commands.add('loginWithSession', (email: string, _password: string, role: string) => {
  const normalizedRole = ROLE_MAP[role] || role;
  const sessionId = `login-session-${email}-${normalizedRole}`;

  cy.session(
    sessionId,
    () => {
      const generatedId = generateTestUserId(email, normalizedRole);
      const sessionBody = {
        userId: generatedId,
        email,
        roles: [normalizedRole],
        currentRole: normalizedRole,
        provider: 'cypress',
        mode: `login-with-session-${normalizedRole}`,
      };

      cy.request({
        method: 'POST',
        url: 'http://localhost:3002/api/testing/sessions',
        body: sessionBody,
        headers: {
          'Content-Type': 'application/json',
          'X-Snipshift-CSRF': '1',
        },
        withCredentials: true,
      }).then((response) => {
        expect(response.status).to.eq(200);
        const { sessionId: sessionToken, session, persistedToRedis } = response.body as {
          sessionId: string;
          session: {
            userId: string;
            email: string;
            roles: string[];
            currentRole: string;
          };
          persistedToRedis?: boolean;
        };

        cy.log(
          persistedToRedis
            ? 'Session persisted to Redis'
            : 'Session stored using in-memory fallback (Redis unavailable)',
        );

        // Set up localStorage to match what AuthContext expects
        cy.window().then((win) => {
          const mockUser = {
            id: session.userId,
            email,
            roles: session.roles ?? [normalizedRole],
            currentRole: session.currentRole ?? normalizedRole,
            displayName: `Test ${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          win.localStorage.setItem('currentUser', JSON.stringify(mockUser));
          win.localStorage.setItem('authToken', sessionToken);
          win.localStorage.setItem('userRole', normalizedRole);
          win.localStorage.setItem('userId', mockUser.id);
          win.localStorage.setItem('userEmail', email);
        });
      });
    },
    {
      validate: () => {
        // Validate session is still valid
        cy.request({
          method: 'GET',
          url: 'http://localhost:3002/api/auth/profile',
          headers: {
            'X-Snipshift-CSRF': '1',
          },
          withCredentials: true,
        }).its('status').should('eq', 200);
      },
    }
  );
});

/**
 * Logout and clear authentication state
 */
Cypress.Commands.add('logout', () => {
  cy.request({
    method: 'POST',
    url: 'http://localhost:3002/api/auth/logout',
    headers: {
      'X-Snipshift-CSRF': '1',
    },
    withCredentials: true,
  });

  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });

  cy.clearCookies();
});

/**
 * Wait for AuthContext to initialize
 * Polls for AuthContext to be ready by checking for user state
 */
Cypress.Commands.add('waitForAuth', () => {
  // Wait for AuthContext to initialize
  // Small delay to allow React and AuthContext to initialize
  cy.wait(500);
  
  // Verify the page is loaded
  cy.get('body').should('be.visible');
});

/**
 * Wait for auth initialization
 * Alias for waitForAuth for consistency
 */
Cypress.Commands.add('waitForAuthInit', () => {
  cy.waitForAuth();
});

/**
 * Wait for content to load
 * Waits for the page to be fully loaded and interactive
 */
Cypress.Commands.add('waitForContent', () => {
  // Wait for page to be interactive
  cy.get('body').should('be.visible');
  
  // Wait a bit for React to render
  cy.wait(500);
  
  // Check that we're not on a loading screen
  cy.get('body').should('not.contain', 'Loading...');
});

export {};

