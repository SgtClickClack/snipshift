import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5000',
    env: {
      E2E_TEST: '1'
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // 🚀 PERFORMANCE OPTIMIZATIONS
    video: false,
    screenshotOnRunFailure: true,
    
    // ⚡ OPTIMIZED TIMEOUTS FOR RELIABILITY
    defaultCommandTimeout: 15000, // Increased for stability
    requestTimeout: 15000,       
    responseTimeout: 15000,       
    pageLoadTimeout: 30000,       
    
    // 🔄 RETRY CONFIGURATION FOR FLAKY TESTS
    retries: {
      runMode: 3,    // More retries for CI
      openMode: 1,   // One retry in interactive mode
    },
    
    // 🎯 EXPERIMENTAL FEATURES
    experimentalStudio: true,
    
    setupNodeEvents(on, config) {
      // 🚀 ADDITIONAL OPTIMIZATIONS
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        
        // Task to clear localStorage and sessionStorage
        clearStorage() {
          return cy.clearLocalStorage().then(() => {
            return cy.clearCookies()
          })
        },
        
        // Task to wait for network idle
        waitForNetworkIdle() {
          return cy.window().then((win) => {
            return new Promise((resolve) => {
              let timeoutId: NodeJS.Timeout
              const checkIdle = () => {
                if (win.performance && win.performance.getEntriesByType) {
                  const requests = win.performance.getEntriesByType('resource')
                  const recentRequests = requests.filter(req => 
                    Date.now() - req.startTime < 1000
                  )
                  if (recentRequests.length === 0) {
                    clearTimeout(timeoutId)
                    resolve(null)
                  } else {
                    timeoutId = setTimeout(checkIdle, 100)
                  }
                } else {
                  resolve(null)
                }
              }
              checkIdle()
            })
          })
        }
      })
      
      // 🎯 IMPROVED ERROR HANDLING
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          launchOptions.args.push('--disable-web-security')
          launchOptions.args.push('--disable-features=VizDisplayCompositor')
          launchOptions.args.push('--disable-background-timer-throttling')
          launchOptions.args.push('--disable-renderer-backgrounding')
          launchOptions.args.push('--disable-backgrounding-occluded-windows')
        }
        return launchOptions
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
    viewportWidth: 1280,
    viewportHeight: 720,
  },
})
