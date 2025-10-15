import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5000',
    env: {
      E2E_TEST: '1'
    },
    // Skip server verification for testing
    viewportWidth: 375,
    viewportHeight: 667,
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // 🚀 SPEED OPTIMIZATIONS FOR LOCAL DEVELOPMENT
    video: false, // Already disabled - good!
    screenshotOnRunFailure: true,
    
    // ⚡ FASTER TIMEOUTS FOR LOCAL DEVELOPMENT
    // These are shorter for faster feedback during development
    defaultCommandTimeout: 10000, // Reduced from 30000
    requestTimeout: 10000,        // Reduced from 30000  
    responseTimeout: 10000,       // Reduced from 30000
    pageLoadTimeout: 30000,       // Reduced from 60000
    
    // 🔄 RETRY CONFIGURATION
    retries: {
      runMode: 2,    // Keep retries for CI
      openMode: 0,   // No retries in interactive mode for faster feedback
    },
    
    // 🎯 EXPERIMENTAL FEATURES FOR SPEED
    // experimentalStudio: true, // Removed in Cypress 15.4.0 - Studio is now available for all users
    
    setupNodeEvents(on, config) {
      // implement node event listeners here
      
      // 🚀 ADDITIONAL SPEED OPTIMIZATIONS
      on('task', {
        log(message) {
          console.log(message)
          return null
        }
      })
    },
  },
  
  // 🧩 COMPONENT TESTING CONFIGURATION
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
    viewportWidth: 375,
    viewportHeight: 667,
  },
})