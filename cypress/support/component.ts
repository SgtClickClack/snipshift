// ***********************************************************
// Cypress Component Testing Support File
// This file is processed and loaded automatically before your component test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress for component testing.
// ***********************************************************

import './commands'

// Import component testing utilities
import { mount } from 'cypress/react18'

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', mount)

// Example: Import your app's CSS
// import '../../src/index.css'

// 🚀 COMPONENT TESTING UTILITIES

// Mock API responses for component tests
Cypress.Commands.add('mockComponentApi', (endpoint: string, response: any) => {
  cy.intercept('GET', endpoint, response).as(`mock${endpoint.replace(/[^a-zA-Z0-9]/g, '')}`)
})

// Mock user context for components that need authentication
Cypress.Commands.add('mockUserContext', (userType: 'professional' | 'business' = 'professional') => {
  const mockUser = {
    id: `test-${userType}-id`,
    email: `test-${userType}@snipshift.com`,
    role: userType,
    name: `Test ${userType}`
  }
  
  // Mock the user context API
  cy.mockComponentApi('/api/user/context', { user: mockUser })
})

// Mock common API endpoints for component testing
Cypress.Commands.add('setupComponentMocks', () => {
  // Mock shifts data
  cy.mockComponentApi('/api/shifts', {
    shifts: [
      {
        id: '1',
        title: 'Haircut at Downtown Salon',
        description: 'Quick trim and style',
        hourlyRate: 25,
        location: 'Downtown',
        skills: ['Haircut', 'Styling'],
        schedule: 'Flexible'
      }
    ]
  })
  
  // Mock user profile
  cy.mockComponentApi('/api/user/profile', {
    id: 'test-user-id',
    email: 'test@snipshift.com',
    role: 'professional',
    name: 'Test User',
    profile: {
      bio: 'Test profile',
      skills: ['Haircut', 'Coloring'],
      experience: '5 years'
    }
  })
})

// Add component testing specific commands to the global namespace
declare global {
  namespace Cypress {
    interface Chainable {
      mockComponentApi(endpoint: string, response: any): Chainable<void>
      mockUserContext(userType?: 'professional' | 'business'): Chainable<void>
      setupComponentMocks(): Chainable<void>
    }
  }
}
