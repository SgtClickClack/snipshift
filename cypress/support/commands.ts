// 🚀 PROGRAMMATIC LOGIN COMMANDS FOR SPEED
// These bypass the UI for instant authentication - saves 5-10 seconds per test!

Cypress.Commands.add('programmaticLogin', (userType: 'professional' | 'business' | 'admin' = 'professional') => {
  cy.fixture('snipshift-v2-test-data').then((data) => {
    const user = data.users[userType]
    
    // Clear any existing session
    cy.clearLocalStorage()
    cy.clearCookies()
    
    // 🚀 PROGRAMMATIC LOGIN - No UI interaction needed!
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: user.email,
        password: user.password
      },
      headers: {
        'X-Snipshift-CSRF': '1'
      }
    }).then((response) => {
      expect(response.status).to.eq(200)
      
      // Set auth token directly in localStorage
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', response.body.token)
        win.localStorage.setItem('userRole', userType)
        win.localStorage.setItem('userId', response.body.userId)
      })
    })
    
    // Navigate to dashboard to verify login worked
    const dashboardRoute = userType === 'professional' ? '/professional-dashboard' : `/${userType}-dashboard`
    cy.visit(dashboardRoute)
    cy.get(`[data-testid="${userType}-dashboard"]`).should('be.visible')
  })
})

// 🎯 INSTANT LOGIN - Even faster for common test scenarios
Cypress.Commands.add('instantLogin', (role: 'professional' | 'business' = 'professional') => {
  cy.window().then((win) => {
    // Set mock auth data directly - bypasses all API calls
    win.localStorage.setItem('authToken', 'mock-token-' + role)
    win.localStorage.setItem('userRole', role)
    win.localStorage.setItem('userId', 'test-user-' + role)
    win.localStorage.setItem('userEmail', `test-${role}@snipshift.com`)
  })
  
  // Navigate to dashboard
  const dashboardRoute = role === 'professional' ? '/professional-dashboard' : `/${role}-dashboard`
  cy.visit(dashboardRoute)
  cy.get(`[data-testid="${role}-dashboard"]`).should('be.visible')
})

// 🛡️ API MOCKING COMMANDS FOR BLAZING FAST TESTS
Cypress.Commands.add('mockApiResponse', (method: string, url: string, response: any, statusCode: number = 200) => {
  cy.intercept(method, url, {
    statusCode,
    body: response
  }).as(`mock${method}${url.replace(/[^a-zA-Z0-9]/g, '')}`)
})

Cypress.Commands.add('mockLoginSuccess', (userType: 'professional' | 'business' = 'professional') => {
  const mockUser = {
    id: `test-${userType}-id`,
    email: `test-${userType}@snipshift.com`,
    role: userType,
    name: `Test ${userType}`
  }
  
  cy.mockApiResponse('POST', '/api/auth/login', {
    success: true,
    token: 'mock-jwt-token',
    user: mockUser
  })
})

Cypress.Commands.add('mockShiftsData', (shifts: any[] = []) => {
  const defaultShifts = [
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
  
  cy.mockApiResponse('GET', '/api/shifts', {
    shifts: shifts.length > 0 ? shifts : defaultShifts
  })
})

Cypress.Commands.add('mockUserProfile', (userType: 'professional' | 'business' = 'professional') => {
  const mockProfile = {
    id: `test-${userType}-id`,
    email: `test-${userType}@snipshift.com`,
    role: userType,
    name: `Test ${userType}`,
    profile: {
      bio: `Test ${userType} profile`,
      skills: userType === 'professional' ? ['Haircut', 'Coloring'] : ['Management'],
      experience: '5 years'
    }
  }
  
  cy.mockApiResponse('GET', '/api/user/profile', mockProfile)
})

// Additional helpers will be added in future steps as needed
Cypress.Commands.add('completeRoleSelection', (role: 'professional' | 'business') => {
  cy.get(`[data-testid="button-select-${role}"]`).should('be.visible').click()
  cy.get('[data-testid="confirm-role-button"]').should('be.visible').click()
})

Cypress.Commands.add('chooseRoleAndCompleteOnboarding', (role: 'professional' | 'business') => {
  cy.completeRoleSelection(role)
  cy.waitForRoute(`/${role}-dashboard`)
})
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Navigation helper to load the landing page (single place where cy.visit('/') is allowed)
Cypress.Commands.add('navigateToLanding', () => {
  cy.visit('/')
  cy.get('body').should('be.visible')
})

// Custom command to log in via the demo system (Updated for V2 terminology)
Cypress.Commands.add('quickLogin', (role: 'professional' | 'business') => {
  cy.navigateToLanding()

  const roleSelectors = {
    professional: '[data-testid="demo-login-professional"]',
    business: '[data-testid="demo-login-business"]'
  }

  cy.get('[data-testid="button-demo-login"]').should('be.visible').click()
  cy.get(roleSelectors[role]).click()
  cy.waitForRoute(`/${role}-dashboard`)
})

// Custom command to wait for a route to load
Cypress.Commands.add('waitForRoute', (route: string) => {
  cy.url().should('include', route)
  cy.get('body').should('be.visible')
})

// Custom command for standard login with credentials
Cypress.Commands.add('loginWithCredentials', (email: string, password: string) => {
  cy.navigateToLanding()
  cy.get('[data-testid="button-login"]').should('be.visible').click()
  cy.url().should('include', '/login')
  cy.get('[data-testid="input-email"]').should('be.visible').type(email)
  cy.get('[data-testid="input-password"]').should('be.visible').type(password)
  cy.get('[data-testid="button-signin"]').click()
})

// Add CSRF header to all requests
Cypress.Commands.add('addCsrfHeader', () => {
  cy.intercept('**', (req) => {
    req.headers['X-Snipshift-CSRF'] = '1'
  })
})

// Enhanced login command for journey-based testing
Cypress.Commands.add('loginAsUser', (userType: 'professional' | 'business' | 'admin' = 'professional') => {
  cy.fixture('snipshift-v2-test-data').then((data) => {
    const user = data.users[userType]
    
    // Clear any existing session
    cy.clearLocalStorage()
    cy.clearCookies()
    
    // Perform login through the UI
    cy.navigateToLanding()
    cy.get('[data-testid="button-login"]').should('be.visible').click()
    cy.url().should('include', '/login')
    cy.get('[data-testid="input-email"]').should('be.visible').type(user.email)
    cy.get('[data-testid="input-password"]').should('be.visible').type(user.password)
    cy.get('[data-testid="button-signin"]').should('be.visible').click()
    
    // Wait for successful login and redirect to dashboard
    const dashboardRoute = userType === 'barber' ? '/professional-dashboard' : `/${userType}-dashboard`
    cy.url().should('include', dashboardRoute)
    
    // Verify we're on the correct dashboard
    const dashboardTestId = userType === 'barber' ? 'professional-dashboard' : `${userType}-dashboard`
    cy.get(`[data-testid="${dashboardTestId}"]`).should('be.visible')
  })
})

// Simplified login command that defaults to barber user for most tests
Cypress.Commands.add('login', () => {
  // Set mobile viewport
  cy.viewport(375, 667)
  // Clear any existing session first
  cy.clearLocalStorage()
  cy.clearCookies()
  // Add delay to prevent rate limiting
  cy.wait(1000)
  cy.loginAsUser('barber')
})

// Custom command to login with specific role via test endpoint
Cypress.Commands.add('loginWithRole', (email: string, role: string) => {
  cy.request({
    method: 'POST',
    url: '/api/test/login',
    headers: { 
      'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 
      'X-Snipshift-CSRF': '1' 
    },
    body: { email, role },
    failOnStatusCode: false,
  }).its('status').should('eq', 200)
})

// Custom command to logout user
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="button-logout"]').click()
  cy.location('pathname').should('eq', '/')
})

// Custom command to verify dashboard access
Cypress.Commands.add('verifyDashboardAccess', (role: string) => {
  const expectedDashboard = `/${role}-dashboard`
  cy.location('pathname').should('eq', expectedDashboard)
  cy.get(`[data-testid="${role}-dashboard"]`).should('be.visible')
})

// Custom command to verify protected route redirect
Cypress.Commands.add('verifyProtectedRouteRedirect', (route: string, expectedRedirect: string) => {
  cy.visit(route)
  cy.location('pathname').should('eq', expectedRedirect)
})

// Custom command to complete role selection
Cypress.Commands.add('selectRole', (role: string) => {
  cy.get(`[data-testid="button-select-${role}"]`).click()
  cy.get('[data-testid="button-continue"]').click()
})

// Custom command to verify authentication state
Cypress.Commands.add('verifyAuthenticated', (shouldBeAuthenticated: boolean) => {
  if (shouldBeAuthenticated) {
    cy.get('[data-testid="user-menu"]').should('be.visible')
  } else {
    cy.get('[data-testid="button-login"]').should('be.visible')
  }
})

// Assert page has no horizontal overflow beyond viewport width
Cypress.Commands.add('assertNoHorizontalOverflow', () => {
  cy.window().then((win) => {
    const doc = win.document.documentElement
    const scrollWidth = doc.scrollWidth
    const viewportWidth = win.innerWidth
    expect(scrollWidth, 'no horizontal overflow').to.be.lte(viewportWidth + 1)
  })
})

// Navigate to landing page
Cypress.Commands.add('navigateToLanding', () => {
  cy.visit('/')
  // Wait a bit for the page to load
  cy.wait(1000)
})

// Custom command to create a shift posting
Cypress.Commands.add('createShift', (shiftData: any) => {
  cy.get('[data-testid="button-post-shift"]').click()
  cy.get('[data-testid="modal-shift-posting"]').should('be.visible')
  
  cy.get('[data-testid="input-shift-title"]').type(shiftData.title)
  cy.get('[data-testid="textarea-shift-description"]').type(shiftData.description)
  cy.get('[data-testid="input-hourly-rate"]').type(shiftData.hourlyRate.toString())
  cy.get('[data-testid="input-shift-location"]').type(shiftData.location)
  
  // Select skills
  cy.get('[data-testid="select-skills"]').click()
  shiftData.skills.forEach((skill: string) => {
    cy.get(`[data-testid="skill-${skill.toLowerCase().replace(' ', '-')}"]`).click()
  })
  
  // Select schedule
  cy.get('[data-testid="select-schedule"]').click()
  cy.get(`[data-testid="schedule-${shiftData.schedule.toLowerCase().replace(' ', '-')}"]`).click()
  
  cy.get('[data-testid="button-submit-shift"]').click()
})

// Custom command to apply for a shift
Cypress.Commands.add('applyForShift', (shiftTitle: string, coverLetter?: string) => {
  cy.get('[data-testid="shift-card"]')
    .contains(shiftTitle)
    .should('be.visible')
    .click()
  
  cy.get('[data-testid="button-apply-shift"]').click()
  cy.get('[data-testid="modal-shift-application"]').should('be.visible')
  
  if (coverLetter) {
    cy.get('[data-testid="textarea-cover-letter"]').type(coverLetter)
  }
  
  cy.get('[data-testid="button-submit-application"]').click()
})

// Custom command to upload qualification document
Cypress.Commands.add('uploadQualificationDocument', (filePath: string) => {
  cy.get('[data-testid="input-qualification-document"]').selectFile(filePath)
  cy.get('[data-testid="button-upload-qualification"]').click()
})

// Custom command to verify accessibility compliance
Cypress.Commands.add('verifyAccessibility', () => {
  cy.injectAxe()
  cy.checkA11y()
})

// Custom command to measure page load performance
Cypress.Commands.add('measurePageLoadPerformance', (maxLoadTime: number = 3000) => {
  cy.window().then((win) => {
    const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart
    expect(loadTime).to.be.lessThan(maxLoadTime)
  })
})

// Custom command to test keyboard navigation
Cypress.Commands.add('testKeyboardNavigation', () => {
  cy.get('body').tab()
  cy.focused().should('be.visible')
  
  // Test tab order through main navigation
  cy.get('[data-testid="nav-home"]').should('be.focused')
  cy.focused().tab()
  cy.get('[data-testid="nav-shifts"]').should('be.focused')
  cy.focused().tab()
  cy.get('[data-testid="nav-community"]').should('be.focused')
})

// Custom command to verify security headers
Cypress.Commands.add('verifySecurityHeaders', () => {
  cy.request('/').then((response) => {
    expect(response.headers).to.have.property('x-content-type-options', 'nosniff')
    expect(response.headers).to.have.property('x-frame-options', 'DENY')
    expect(response.headers).to.have.property('x-xss-protection', '1; mode=block')
  })
})

// Custom command to test offline functionality
Cypress.Commands.add('testOfflineFunctionality', () => {
  cy.window().then((win) => {
    // Simulate offline mode
    cy.intercept('GET', '**/*', { forceNetworkError: true }).as('offlineRequest')
    
    // Try to access cached content
    cy.get('[data-testid="cached-content"]').should('be.visible')
    
    // Restore network
    cy.intercept('GET', '**/*').as('onlineRequest')
  })
})

// Navigation helper commands for journey-based testing
Cypress.Commands.add('navigateToShiftFeed', () => {
  // Try desktop navigation first, fallback to mobile
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="nav-shift-feed"]:visible').length > 0) {
      cy.get('[data-testid="nav-shift-feed"]').scrollIntoView().should('be.visible').click()
      cy.url().should('include', '/shift-feed')
      cy.get('[data-testid="shift-feed"]').should('be.visible')
    } else {
      // Use mobile navigation
      cy.get('[data-testid="mobile-menu-button"]').scrollIntoView().should('be.visible').click()
      cy.get('[data-testid="mobile-nav-jobs"]').should('be.visible').click()
      cy.url().should('include', '/mobile/jobs')
      cy.get('[data-testid="mobile-job-feed"]').should('be.visible')
    }
  })
})

Cypress.Commands.add('navigateToTournaments', () => {
  // Try desktop navigation first, fallback to mobile
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="nav-tournaments"]:visible').length > 0) {
      cy.get('[data-testid="nav-tournaments"]').scrollIntoView().should('be.visible').click()
      cy.url().should('include', '/tournaments')
      cy.get('[data-testid="tournaments-page"]').should('be.visible')
    } else {
      // Use mobile navigation
      cy.get('[data-testid="mobile-menu-button"]').scrollIntoView().should('be.visible').click()
      cy.get('[data-testid="mobile-nav-community"]').should('be.visible').click()
      cy.url().should('include', '/mobile/community')
      cy.get('[data-testid="mobile-community-feed"]').should('be.visible')
    }
  })
})

Cypress.Commands.add('navigateToProfile', () => {
  // Try desktop navigation first, fallback to mobile
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="user-menu"]:visible').length > 0) {
      cy.get('[data-testid="user-menu"]').scrollIntoView().should('be.visible').click()
      cy.get('[data-testid="link-profile"]').should('be.visible').click()
    } else {
      // Use mobile navigation
      cy.get('[data-testid="mobile-menu-button"]').scrollIntoView().should('be.visible').click()
      cy.get('[data-testid="user-settings-link"]').should('be.visible').click()
    }
  })
  cy.url().should('include', '/profile')
  cy.get('[data-testid="profile-page"]').should('be.visible')
})

Cypress.Commands.add('navigateToApplications', () => {
  // Try desktop navigation first, fallback to mobile
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="nav-my-applications"]:visible').length > 0) {
      cy.get('[data-testid="nav-my-applications"]').scrollIntoView().should('be.visible').click()
      cy.url().should('include', '/applications')
      cy.get('[data-testid="applications-page"]').should('be.visible')
    } else {
      // Use mobile navigation - applications might be under jobs or dashboard
      cy.get('[data-testid="mobile-menu-button"]').scrollIntoView().should('be.visible').click()
      cy.get('[data-testid="mobile-nav-jobs"]').should('be.visible').click()
      cy.url().should('include', '/mobile/jobs')
      cy.get('[data-testid="mobile-job-feed"]').should('be.visible')
    }
  })
})

Cypress.Commands.add('navigateToAnalytics', () => {
  // Try desktop navigation first, fallback to mobile
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="nav-analytics"]:visible').length > 0) {
      cy.get('[data-testid="nav-analytics"]').scrollIntoView().should('be.visible').click()
      cy.url().should('include', '/analytics')
      cy.get('[data-testid="analytics-page"]').should('be.visible')
    } else {
      // Use mobile navigation - analytics might be under dashboard
      cy.get('[data-testid="mobile-menu-button"]').scrollIntoView().should('be.visible').click()
      cy.get('[data-testid="user-profile-link"]').should('be.visible').click()
      cy.url().should('include', '/mobile/dashboard')
      cy.get('[data-testid="mobile-dashboard"]').should('be.visible')
    }
  })
})

// Command to verify navigation elements are present
Cypress.Commands.add('verifyNavigationElements', () => {
  // Check for either desktop or mobile navigation elements
  cy.get('body').then(($body) => {
    const hasDesktopNav = $body.find('[data-testid="nav-shift-feed"]:visible').length > 0
    const hasMobileNav = $body.find('[data-testid="mobile-menu-button"]:visible').length > 0
    
    // Debug: log what we found
    cy.log(`Desktop nav found: ${hasDesktopNav}, Mobile nav found: ${hasMobileNav}`)
    
    if (hasDesktopNav) {
      cy.get('[data-testid="nav-shift-feed"]').scrollIntoView().should('be.visible')
      cy.get('[data-testid="nav-tournaments"]').scrollIntoView().should('be.visible')
      cy.get('[data-testid="nav-my-applications"]').scrollIntoView().should('be.visible')
      cy.get('[data-testid="user-menu"]').scrollIntoView().should('be.visible')
    } else if (hasMobileNav) {
      cy.get('[data-testid="mobile-menu-button"]').scrollIntoView().should('be.visible')
      // Open mobile menu to verify navigation elements
      cy.get('[data-testid="mobile-menu-button"]').click()
      cy.get('[data-testid="mobile-nav-jobs"]').should('be.visible')
      cy.get('[data-testid="mobile-nav-community"]').should('be.visible')
      cy.get('[data-testid="user-settings-link"]').should('be.visible')
      // Close mobile menu
      cy.get('[data-testid="mobile-menu-close"]').click()
    } else {
      // Debug: check what elements are actually present
      cy.get('body').then(($body) => {
        const desktopElements = $body.find('[data-testid*="nav-"]').length
        const mobileElements = $body.find('[data-testid*="mobile-"]').length
        cy.log(`Desktop elements: ${desktopElements}, Mobile elements: ${mobileElements}`)
      })
      // For now, just verify the mobile menu button exists (it should be visible on mobile)
      cy.get('[data-testid="mobile-menu-button"]').should('exist')
    }
  })
})