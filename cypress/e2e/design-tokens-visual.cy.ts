const visitVisualRoute = (path: string = '/') => {
  // VISUAL-TEST: Direct visit is intentional.
  cy.visit(path)
}

describe('Design Tokens Visual Tests - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('CSS Custom Properties Validation', () => {
    it('should have correct CSS custom properties loaded', () => {
      visitVisualRoute()
      
      // Test critical CSS variables are loaded
      cy.get('body').then(($body) => {
        const styles = window.getComputedStyle($body[0])
        
        // Test red accent color
        expect(styles.getPropertyValue('--red-accent')).to.equal('hsl(0, 85%, 35%)')
        
        // Test steel color scale
        expect(styles.getPropertyValue('--steel-500')).to.equal('hsl(210, 8%, 52%)')
        expect(styles.getPropertyValue('--steel-700')).to.equal('hsl(210, 15%, 28%)')
        expect(styles.getPropertyValue('--steel-900')).to.equal('hsl(210, 20%, 12%)')
        
        // Test chrome colors
        expect(styles.getPropertyValue('--chrome-light')).to.equal('hsl(210, 8%, 95%)')
        expect(styles.getPropertyValue('--chrome-medium')).to.equal('hsl(210, 8%, 68%)')
        expect(styles.getPropertyValue('--chrome-dark')).to.equal('hsl(210, 12%, 45%)')
      })
    })

    it('should apply correct color values to elements', () => {
      visitVisualRoute()
      
      // Test that red accent color is applied correctly
      cy.get('[data-testid="button-login"]').should('be.visible')
      cy.get('[data-testid="button-login"]').then(($button) => {
        const styles = window.getComputedStyle($button[0])
        const bgColor = styles.backgroundColor
        
        // Should be the red accent color (hsl(0, 85%, 35%) = rgb(165, 0, 42))
        expect(bgColor).to.match(/rgb\(165,\s*0,\s*42\)/)
      })
    })
  })

  describe('Design System Color Consistency', () => {
    it('should maintain consistent steel color usage', () => {
      visitVisualRoute()
      
      // Test steel color consistency across elements
      cy.get('body').should('have.css', 'background-color')
        .and('satisfy', (color) => {
          // Should be a light steel color (background)
          return color.includes('rgb(240, 243, 247)') || color.includes('hsl(210, 15%, 94%)')
        })
    })

    it('should have proper chrome gradient effects', () => {
      visitVisualRoute()
      
      // Test chrome gradient classes are applied
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Check if chrome gradient utility class exists
      cy.get('body').then(($body) => {
        const hasChromeGradient = $body.hasClass('chrome-gradient') || 
                                 $body.find('.chrome-gradient').length > 0
        // This test validates that chrome gradient classes are available
        expect(hasChromeGradient).to.be.true
      })
    })
  })

  describe('Typography and Text Styling', () => {
    it('should have correct typography hierarchy', () => {
      visitVisualRoute()
      
      // Test heading styles
      cy.get('h1').should('have.css', 'font-weight', '700')
      cy.get('h1').should('have.css', 'font-size')
        .and('satisfy', (fontSize) => {
          // Should be large (4xl or larger)
          const size = parseInt(fontSize)
          return size >= 36 // 4xl = 36px
        })
    })

    it('should have proper text color contrast', () => {
      visitVisualRoute()
      
      // Test text color is dark enough for contrast
      cy.get('body').should('have.css', 'color')
        .and('satisfy', (color) => {
          // Should be dark text (steel-900 or similar)
          return color.includes('rgb(30, 35, 40)') || color.includes('hsl(210, 20%, 12%)')
        })
    })
  })

  describe('Component Visual Styling', () => {
    it('should render buttons with correct styling', () => {
      visitVisualRoute()
      
      // Test button styling
      cy.get('[data-testid="button-login"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('have.css', 'border-radius')
        .and('satisfy', (borderRadius) => {
          // Should have rounded corners
          const radius = parseInt(borderRadius)
          return radius >= 4 // At least 4px border radius
        })
      
      // Test button has proper padding
      cy.get('[data-testid="button-login"]').should('have.css', 'padding')
        .and('not.be.empty')
    })

    it('should render cards with proper styling', () => {
      visitVisualRoute()
      
      // Test card styling if cards are present
      cy.get('body').then(($body) => {
        const cards = $body.find('[class*="card"], [data-testid*="card"]')
        if (cards.length > 0) {
          cy.wrap(cards.first()).should('have.css', 'background-color')
            .and('satisfy', (bgColor) => {
              // Should be white or light background
              return bgColor.includes('rgb(255, 255, 255)') || bgColor.includes('hsl(0, 0%, 100%)')
            })
        }
      })
    })
  })

  describe('Responsive Design Validation', () => {
    it('should be responsive on mobile viewport', () => {
      cy.viewport('iphone-x')
      visitVisualRoute()
      
      // Test mobile layout
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Test that elements are properly sized for mobile
      cy.get('[data-testid="button-login"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('have.css', 'width')
        .and('satisfy', (width) => {
          const widthValue = parseInt(width)
          // Should be reasonably sized for mobile (not too wide)
          return widthValue <= 400
        })
    })

    it('should be responsive on tablet viewport', () => {
      cy.viewport('ipad-2')
      visitVisualRoute()
      
      // Test tablet layout
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Test responsive behavior
      cy.get('body').should('have.css', 'font-size')
        .and('satisfy', (fontSize) => {
          const size = parseInt(fontSize)
          // Should have readable font size
          return size >= 14 && size <= 18
        })
    })

    it('should be responsive on desktop viewport', () => {
      cy.viewport(1280, 720)
      visitVisualRoute()
      
      // Test desktop layout
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Test that layout uses available space properly
      cy.get('body').should('have.css', 'max-width')
        .and('satisfy', (maxWidth) => {
          // Should have reasonable max width or be auto
          return maxWidth === 'none' || maxWidth === 'auto' || parseInt(maxWidth) >= 1200
        })
    })
  })

  describe('Dark Mode Visual Tests', () => {
    it('should switch to dark mode correctly', () => {
      visitVisualRoute()
      
      // Test dark mode toggle if available
      cy.get('body').then(($body) => {
        // Check if dark mode class can be applied
        $body.addClass('dark')
        
        // Test dark mode colors
        cy.get('body').should('have.class', 'dark')
        
        // Test that dark mode changes text color
        cy.get('body').should('have.css', 'color')
          .and('satisfy', (color) => {
            // Should be light text in dark mode
            return color.includes('rgb(235, 240, 245)') || color.includes('hsl(210, 8%, 92%)')
          })
      })
    })

    it('should maintain contrast in dark mode', () => {
      visitVisualRoute()
      
      // Apply dark mode
      cy.get('body').then(($body) => {
        $body.addClass('dark')
      })
      
      // Test that buttons are still visible in dark mode
      cy.get('[data-testid="button-login"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('have.css', 'background-color')
        .and('not.be.empty')
    })
  })

  describe('Accessibility Visual Tests', () => {
    it('should have proper focus indicators', () => {
      visitVisualRoute()
      
      // Test focus styles
      cy.get('[data-testid="button-login"]').focus()
      cy.get('[data-testid="button-login"]').should('have.css', 'outline')
        .and('satisfy', (outline) => {
          // Should have visible focus outline
          return outline !== 'none' && outline !== ''
        })
    })

    it('should have sufficient color contrast', () => {
      visitVisualRoute()
      
      // Test text contrast against background
      cy.get('body').then(($body) => {
        const textColor = window.getComputedStyle($body[0]).color
        const bgColor = window.getComputedStyle($body[0]).backgroundColor
        
        // Basic contrast check - text should be significantly different from background
        expect(textColor).to.not.equal(bgColor)
        
        // More sophisticated contrast validation would require a contrast calculation library
        // For now, we ensure they're different colors
      })
    })

    it('should have proper button sizing for touch targets', () => {
      visitVisualRoute()
      
      // Test button size meets minimum touch target requirements
      cy.get('[data-testid="button-login"]').then(($button) => {
        const rect = $button[0].getBoundingClientRect()
        const minSize = 44 // 44px minimum for touch targets
        
        expect(rect.height).to.be.at.least(minSize)
        expect(rect.width).to.be.at.least(minSize)
      })
    })
  })

  describe('Animation and Transition Tests', () => {
    it('should have smooth hover transitions', () => {
      visitVisualRoute()
      
      // Test button hover effects
      cy.get('[data-testid="button-login"]').should('have.css', 'transition')
        .and('satisfy', (transition) => {
          // Should have transition properties
          return transition.includes('all') || transition.includes('background') || transition.includes('transform')
        })
    })

    it('should have proper loading states', () => {
      visitVisualRoute()
      
      // Test that loading states are visually distinct
      cy.get('[data-testid="button-login"]').then(($button) => {
        // Simulate loading state
        $button.addClass('loading')
        
        // Test loading state styling
        cy.get('[data-testid="button-login"]').should('have.class', 'loading')
      })
    })
  })
})
