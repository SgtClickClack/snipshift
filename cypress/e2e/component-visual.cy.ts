const visitVisualRoute = (path: string = '/') => {
  // VISUAL-TEST: Direct visit is intentional.
  cy.visit(path)
}

describe('Component Visual Tests - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Button Component Visual Tests', () => {
    it('should render chrome button variants correctly', () => {
      visitVisualRoute()
      
      // Test chrome button styling
      cy.get('[data-testid="button-login"]').should('be.visible')
      cy.get('[data-testid="button-login"]').should('have.css', 'background-color')
        .and('satisfy', (bgColor) => {
          // Should be red accent color
          return bgColor.includes('rgb(165, 0, 42)') || bgColor.includes('hsl(0, 85%, 35%)')
        })
      
      // Test button has proper styling
      cy.get('[data-testid="button-login"]').should('have.css', 'border-radius')
        .and('satisfy', (borderRadius) => {
          const radius = parseInt(borderRadius)
          return radius >= 4 // Should have rounded corners
        })
    })

    it('should have proper button hover effects', () => {
      visitVisualRoute()
      
      // Test hover state
      cy.get('[data-testid="button-login"]').trigger('mouseover')
      cy.get('[data-testid="button-login"]').should('have.css', 'transform')
        .and('satisfy', (transform) => {
          // Should have hover transform effect
          return transform.includes('translateY') || transform.includes('scale')
        })
    })

    it('should render industrial button styling', () => {
      visitVisualRoute()
      
      // Test industrial button class if present
      cy.get('body').then(($body) => {
        const industrialButtons = $body.find('.industrial-button')
        if (industrialButtons.length > 0) {
          cy.wrap(industrialButtons.first()).should('have.css', 'background')
            .and('satisfy', (background) => {
              // Should have gradient background
              return background.includes('gradient') || background.includes('linear-gradient')
            })
        }
      })
    })
  })

  describe('Card Component Visual Tests', () => {
    it('should render chrome cards with proper styling', () => {
      visitVisualRoute()
      
      // Test chrome card styling
      cy.get('body').then(($body) => {
        const chromeCards = $body.find('.chrome-card')
        if (chromeCards.length > 0) {
          cy.wrap(chromeCards.first()).should('have.css', 'background')
            .and('satisfy', (background) => {
              // Should have gradient or solid background
              return background.includes('gradient') || background.includes('rgb(255, 255, 255)')
            })
          
          // Test border styling
          cy.wrap(chromeCards.first()).should('have.css', 'border')
            .and('satisfy', (border) => {
              return border !== 'none' && border !== '0px'
            })
        }
      })
    })

    it('should have proper card shadows', () => {
      visitVisualRoute()
      
      // Test card shadow effects
      cy.get('body').then(($body) => {
        const cards = $body.find('[class*="card"]')
        if (cards.length > 0) {
          cy.wrap(cards.first()).should('have.css', 'box-shadow')
            .and('satisfy', (boxShadow) => {
              // Should have shadow effect
              return boxShadow !== 'none' && boxShadow !== ''
            })
        }
      })
    })
  })

  describe('Navigation Component Visual Tests', () => {
    it('should render navbar with proper styling', () => {
      visitVisualRoute()
      
      // Test navbar styling
      cy.get('nav, [data-testid*="nav"]').should('be.visible')
      cy.get('nav, [data-testid*="nav"]').should('have.css', 'background-color')
        .and('satisfy', (bgColor) => {
          // Should have background color
          return bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent'
        })
    })

    it('should have proper navigation link styling', () => {
      visitVisualRoute()
      
      // Test navigation links
      cy.get('a, [data-testid*="nav"]').then(($links) => {
        if ($links.length > 0) {
          cy.wrap($links.first()).should('have.css', 'color')
            .and('satisfy', (color) => {
              // Should have visible text color
              return color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'
            })
        }
      })
    })
  })

  describe('Form Component Visual Tests', () => {
    it('should render input fields with proper styling', () => {
      visitVisualRoute('/login')
      
      // Test input field styling
      cy.get('[data-testid="input-email"]').should('be.visible')
      cy.get('[data-testid="input-email"]').should('have.css', 'border')
        .and('satisfy', (border) => {
          // Should have visible border
          return border !== 'none' && border !== '0px'
        })
      
      // Test input background
      cy.get('[data-testid="input-email"]').should('have.css', 'background-color')
        .and('satisfy', (bgColor) => {
          // Should have light background
          return bgColor.includes('rgb(255, 255, 255)') || bgColor.includes('hsl(210, 15%, 98%)')
        })
    })

    it('should have proper form validation styling', () => {
      visitVisualRoute('/login')
      
      // Test form container
      cy.get('[data-testid="login-form"]').should('be.visible')
      cy.get('[data-testid="login-form"]').should('have.css', 'padding')
        .and('satisfy', (padding) => {
          // Should have proper spacing
          return padding !== '0px'
        })
    })
  })

  describe('Dashboard Component Visual Tests', () => {
    it('should render dashboard with proper layout', () => {
      // Login first to access dashboard
      visitVisualRoute()
      cy.get('[data-testid="button-login"]').click()
      cy.get('[data-testid="input-email"]').type('user@example.com')
      cy.get('[data-testid="input-password"]').type('SecurePassword123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Test dashboard layout
      cy.get('[data-testid="professional-dashboard"]').should('be.visible')
      cy.get('[data-testid="professional-dashboard"]').should('have.css', 'min-height')
        .and('satisfy', (minHeight) => {
          // Should take full viewport height
          return minHeight === '100vh' || minHeight === '100%'
        })
    })

    it('should have proper dashboard card styling', () => {
      // Login and navigate to dashboard
      visitVisualRoute()
      cy.get('[data-testid="button-login"]').click()
      cy.get('[data-testid="input-email"]').type('user@example.com')
      cy.get('[data-testid="input-password"]').type('SecurePassword123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Test dashboard cards
      cy.get('[data-testid="professional-dashboard"]').within(() => {
        cy.get('[class*="card"]').then(($cards) => {
          if ($cards.length > 0) {
            cy.wrap($cards.first()).should('have.css', 'background-color')
              .and('satisfy', (bgColor) => {
                // Should have white or light background
                return bgColor.includes('rgb(255, 255, 255)') || bgColor.includes('hsl(0, 0%, 100%)')
              })
          }
        })
      })
    })
  })

  describe('Modal Component Visual Tests', () => {
    it('should render modals with proper overlay', () => {
      visitVisualRoute()
      
      // Test modal overlay if modals are present
      cy.get('body').then(($body) => {
        const modals = $body.find('[class*="modal"], [data-testid*="modal"]')
        if (modals.length > 0) {
          cy.wrap(modals.first()).should('have.css', 'position')
            .and('satisfy', (position) => {
              // Should be positioned for overlay
              return position === 'fixed' || position === 'absolute'
            })
        }
      })
    })

    it('should have proper modal backdrop', () => {
      visitVisualRoute()
      
      // Test modal backdrop styling
      cy.get('body').then(($body) => {
        const backdrops = $body.find('[class*="backdrop"], [class*="overlay"]')
        if (backdrops.length > 0) {
          cy.wrap(backdrops.first()).should('have.css', 'background-color')
            .and('satisfy', (bgColor) => {
              // Should have semi-transparent background
              return bgColor.includes('rgba') || bgColor.includes('hsla')
            })
        }
      })
    })
  })

  describe('Loading State Visual Tests', () => {
    it('should have proper loading indicators', () => {
      visitVisualRoute()
      
      // Test loading states
      cy.get('body').then(($body) => {
        const loadingElements = $body.find('[class*="loading"], [class*="spinner"]')
        if (loadingElements.length > 0) {
          cy.wrap(loadingElements.first()).should('have.css', 'animation')
            .and('satisfy', (animation) => {
              // Should have animation for loading
              return animation !== 'none' && animation !== ''
            })
        }
      })
    })

    it('should have proper disabled state styling', () => {
      visitVisualRoute()
      
      // Test disabled button styling
      cy.get('[data-testid="button-login"]').then(($button) => {
        $button.prop('disabled', true)
        cy.get('[data-testid="button-login"]').should('be.disabled')
        cy.get('[data-testid="button-login"]').should('have.css', 'opacity')
          .and('satisfy', (opacity) => {
            // Should be visually dimmed when disabled
            const opacityValue = parseFloat(opacity)
            return opacityValue < 1
          })
      })
    })
  })

  describe('Typography Component Visual Tests', () => {
    it('should have proper heading hierarchy', () => {
      visitVisualRoute()
      
      // Test heading sizes
      cy.get('h1').should('have.css', 'font-size')
        .and('satisfy', (fontSize) => {
          const size = parseInt(fontSize)
          return size >= 36 // Should be large
        })
      
      cy.get('h2').should('have.css', 'font-size')
        .and('satisfy', (fontSize) => {
          const size = parseInt(fontSize)
          return size >= 24 && size < 36 // Should be medium-large
        })
    })

    it('should have proper text color hierarchy', () => {
      visitVisualRoute()
      
      // Test text color consistency
      cy.get('body').should('have.css', 'color')
        .and('satisfy', (color) => {
          // Should be dark text
          return color.includes('rgb(30, 35, 40)') || color.includes('hsl(210, 20%, 12%)')
        })
    })
  })

  describe('Icon Component Visual Tests', () => {
    it('should render icons with proper sizing', () => {
      visitVisualRoute()
      
      // Test icon sizing
      cy.get('body').then(($body) => {
        const icons = $body.find('svg, [class*="icon"]')
        if (icons.length > 0) {
          cy.wrap(icons.first()).should('have.css', 'width')
            .and('satisfy', (width) => {
              const widthValue = parseInt(width)
              // Should be reasonably sized
              return widthValue >= 16 && widthValue <= 48
            })
        }
      })
    })

    it('should have proper icon colors', () => {
      visitVisualRoute()
      
      // Test icon colors
      cy.get('body').then(($body) => {
        const icons = $body.find('svg')
        if (icons.length > 0) {
          cy.wrap(icons.first()).should('have.css', 'color')
            .and('satisfy', (color) => {
              // Should have visible color
              return color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent'
            })
        }
      })
    })
  })
})
