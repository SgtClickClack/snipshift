const visitVisualRoute = (path: string = '/') => {
  // VISUAL-TEST: Direct visit is intentional.
  cy.visit(path)
}

describe('Responsive Visual Tests - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Mobile Responsiveness', () => {
    it('should be fully functional on mobile devices', () => {
      cy.viewport('iphone-x')
      visitVisualRoute()
      
      // Test mobile layout
      cy.get('[data-testid="landing-page"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('be.visible')
      
      // Test mobile navigation
      cy.get('[data-testid="button-login"]').click()
      cy.get('[data-testid="login-form"]').should('be.visible')
      
      // Test mobile form usability
      cy.get('[data-testid="input-email"]').should('be.visible')
      cy.get('[data-testid="input-password"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('be.visible')
    })

    it('should have proper mobile touch targets', () => {
      cy.viewport('iphone-x')
      visitVisualRoute()
      
      // Test button size on mobile
      cy.get('[data-testid="button-login"]').then(($button) => {
        const rect = $button[0].getBoundingClientRect()
        const minSize = 44 // 44px minimum for touch targets
        
        expect(rect.height).to.be.at.least(minSize)
        expect(rect.width).to.be.at.least(minSize)
      })
    })

    it('should have readable text on mobile', () => {
      cy.viewport('iphone-x')
      visitVisualRoute()
      
      // Test text readability
      cy.get('body').should('have.css', 'font-size')
        .and('satisfy', (fontSize) => {
          const size = parseInt(fontSize)
          // Should be at least 16px on mobile to prevent zoom
          return size >= 16
        })
    })

    it('should have proper mobile spacing', () => {
      cy.viewport('iphone-x')
      visitVisualRoute()
      
      // Test mobile spacing
      cy.get('[data-testid="landing-page"]').should('have.css', 'padding')
        .and('satisfy', (padding) => {
          const paddingValue = parseInt(padding)
          // Should have adequate padding on mobile
          return paddingValue >= 16
        })
    })
  })

  describe('Tablet Responsiveness', () => {
    it('should adapt to tablet viewport', () => {
      cy.viewport('ipad-2')
      visitVisualRoute()
      
      // Test tablet layout
      cy.get('[data-testid="landing-page"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('be.visible')
      
      // Test tablet navigation
      cy.get('[data-testid="button-login"]').click()
      cy.get('[data-testid="login-form"]').should('be.visible')
    })

    it('should have proper tablet grid layout', () => {
      cy.viewport('ipad-2')
      visitVisualRoute()
      
      // Test grid responsiveness
      cy.get('body').then(($body) => {
        const gridElements = $body.find('[class*="grid"]')
        if (gridElements.length > 0) {
          cy.wrap(gridElements.first()).should('have.css', 'display', 'grid')
        }
      })
    })

    it('should maintain aspect ratios on tablet', () => {
      cy.viewport('ipad-2')
      visitVisualRoute()
      
      // Test image and card aspect ratios
      cy.get('body').then(($body) => {
        const images = $body.find('img')
        if (images.length > 0) {
          cy.wrap(images.first()).should('have.css', 'object-fit')
            .and('satisfy', (objectFit) => {
              // Should maintain aspect ratio
              return objectFit === 'contain' || objectFit === 'cover'
            })
        }
      })
    })
  })

  describe('Desktop Responsiveness', () => {
    it('should utilize desktop screen space effectively', () => {
      cy.viewport(1920, 1080)
      visitVisualRoute()
      
      // Test desktop layout
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Test that content doesn't stretch too wide
      cy.get('body').should('have.css', 'max-width')
        .and('satisfy', (maxWidth) => {
          // Should have reasonable max width
          return maxWidth === 'none' || parseInt(maxWidth) >= 1200
        })
    })

    it('should have proper desktop navigation', () => {
      cy.viewport(1280, 720)
      visitVisualRoute()
      
      // Test desktop navigation
      cy.get('nav, [data-testid*="nav"]').should('be.visible')
      
      // Test navigation links are properly spaced
      cy.get('nav a, [data-testid*="nav"]').then(($links) => {
        if ($links.length > 1) {
          cy.wrap($links.first()).should('have.css', 'margin-right')
            .and('satisfy', (marginRight) => {
              const margin = parseInt(marginRight)
              return margin >= 8
            })
        }
      })
    })

    it('should have proper desktop typography', () => {
      cy.viewport(1280, 720)
      visitVisualRoute()
      
      // Test desktop typography
      cy.get('h1').should('have.css', 'font-size')
        .and('satisfy', (fontSize) => {
          const size = parseInt(fontSize)
          // Should be appropriately large on desktop
          return size >= 48
        })
    })
  })

  describe('Breakpoint Transitions', () => {
    it('should transition smoothly between breakpoints', () => {
      // Test mobile to tablet transition
      cy.viewport('iphone-x')
      visitVisualRoute()
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      cy.viewport('ipad-2')
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      cy.viewport(1280, 720)
      cy.get('[data-testid="landing-page"]').should('be.visible')
    })

    it('should maintain functionality across breakpoints', () => {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 }
      ]
      
      viewports.forEach(viewport => {
        cy.viewport(viewport.width, viewport.height)
        visitVisualRoute()
        
        // Test core functionality at each breakpoint
        cy.get('[data-testid="landing-page"]').should('be.visible')
        cy.get('[data-testid="button-login"]').should('be.visible')
        cy.get('[data-testid="button-login"]').should('not.be.disabled')
      })
    })
  })

  describe('Orientation Changes', () => {
    it('should handle portrait orientation', () => {
      cy.viewport(375, 667) // Portrait mobile
      visitVisualRoute()
      
      cy.get('[data-testid="landing-page"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('be.visible')
    })

    it('should handle landscape orientation', () => {
      cy.viewport(667, 375) // Landscape mobile
      visitVisualRoute()
      
      cy.get('[data-testid="landing-page"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('be.visible')
    })

    it('should adapt layout for orientation changes', () => {
      // Start in portrait
      cy.viewport(375, 667)
      visitVisualRoute()
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Switch to landscape
      cy.viewport(667, 375)
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Switch back to portrait
      cy.viewport(375, 667)
      cy.get('[data-testid="landing-page"]').should('be.visible')
    })
  })

  describe('Content Overflow Handling', () => {
    it('should handle content overflow on small screens', () => {
      cy.viewport(320, 568) // Very small screen
      visitVisualRoute()
      
      // Test that content doesn't overflow
      cy.get('[data-testid="landing-page"]').should('be.visible')
      cy.get('body').should('have.css', 'overflow-x', 'hidden')
    })

    it('should have proper scrolling behavior', () => {
      cy.viewport('iphone-x')
      visitVisualRoute()
      
      // Test scroll behavior
      cy.get('body').should('have.css', 'overflow-y', 'auto')
        .or('have.css', 'overflow-y', 'scroll')
    })

    it('should maintain content hierarchy on all screen sizes', () => {
      const viewports = [
        { width: 320, height: 568 },
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1280, height: 720 }
      ]
      
      viewports.forEach(viewport => {
        cy.viewport(viewport.width, viewport.height)
        visitVisualRoute()
        
        // Test that important content is always visible
        cy.get('[data-testid="landing-page"]').should('be.visible')
        cy.get('[data-testid="button-login"]').should('be.visible')
      })
    })
  })

  describe('Performance on Different Screen Sizes', () => {
    it('should load quickly on mobile', () => {
      cy.viewport('iphone-x')
      
      const startTime = Date.now()
      visitVisualRoute()
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      cy.then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(3000) // Should load within 3 seconds
      })
    })

    it('should render smoothly on tablet', () => {
      cy.viewport('ipad-2')
      
      const startTime = Date.now()
      visitVisualRoute()
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      cy.then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(2000) // Should load within 2 seconds
      })
    })

    it('should have optimal performance on desktop', () => {
      cy.viewport(1920, 1080)
      
      const startTime = Date.now()
      visitVisualRoute()
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      cy.then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(1500) // Should load within 1.5 seconds
      })
    })
  })
})
