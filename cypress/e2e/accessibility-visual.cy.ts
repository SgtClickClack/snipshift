describe('Accessibility Visual Tests - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Color Contrast Validation', () => {
    it('should have sufficient color contrast for text', () => {
      cy.visit('/')
      
      // Test main text contrast
      cy.get('body').then(($body) => {
        const textColor = window.getComputedStyle($body[0]).color
        const bgColor = window.getComputedStyle($body[0]).backgroundColor
        
        // Basic contrast validation - colors should be significantly different
        expect(textColor).to.not.equal(bgColor)
        
        // Test that text is dark and background is light (or vice versa)
        const textRgb = textColor.match(/\d+/g)
        const bgRgb = bgColor.match(/\d+/g)
        
        if (textRgb && bgRgb) {
          const textBrightness = (parseInt(textRgb[0]) + parseInt(textRgb[1]) + parseInt(textRgb[2])) / 3
          const bgBrightness = (parseInt(bgRgb[0]) + parseInt(bgRgb[1]) + parseInt(bgRgb[2])) / 3
          
          // Should have significant brightness difference for contrast
          expect(Math.abs(textBrightness - bgBrightness)).to.be.greaterThan(100)
        }
      })
    })

    it('should have proper button contrast', () => {
      cy.visit('/')
      
      // Test button text contrast
      cy.get('[data-testid="button-login"]').then(($button) => {
        const textColor = window.getComputedStyle($button[0]).color
        const bgColor = window.getComputedStyle($button[0]).backgroundColor
        
        // Button text and background should have good contrast
        expect(textColor).to.not.equal(bgColor)
        
        // Test that button text is light on dark background (or vice versa)
        const textRgb = textColor.match(/\d+/g)
        const bgRgb = bgColor.match(/\d+/g)
        
        if (textRgb && bgRgb) {
          const textBrightness = (parseInt(textRgb[0]) + parseInt(textRgb[1]) + parseInt(textRgb[2])) / 3
          const bgBrightness = (parseInt(bgRgb[0]) + parseInt(bgRgb[1]) + parseInt(bgRgb[2])) / 3
          
          // Should have significant contrast
          expect(Math.abs(textBrightness - bgBrightness)).to.be.greaterThan(120)
        }
      })
    })

    it('should maintain contrast in dark mode', () => {
      cy.visit('/')
      
      // Apply dark mode
      cy.get('body').then(($body) => {
        $body.addClass('dark')
      })
      
      // Test dark mode contrast
      cy.get('body').then(($body) => {
        const textColor = window.getComputedStyle($body[0]).color
        const bgColor = window.getComputedStyle($body[0]).backgroundColor
        
        // Should still have good contrast in dark mode
        expect(textColor).to.not.equal(bgColor)
      })
    })
  })

  describe('Focus Indicators', () => {
    it('should have visible focus indicators on interactive elements', () => {
      cy.visit('/')
      
      // Test button focus
      cy.get('[data-testid="button-login"]').focus()
      cy.get('[data-testid="button-login"]').should('have.css', 'outline')
        .and('satisfy', (outline) => {
          // Should have visible focus outline
          return outline !== 'none' && outline !== '' && outline !== '0px'
        })
    })

    it('should have proper focus ring styling', () => {
      cy.visit('/login')
      
      // Test input focus
      cy.get('[data-testid="input-email"]').focus()
      cy.get('[data-testid="input-email"]').should('have.css', 'outline')
        .and('satisfy', (outline) => {
          // Should have visible focus outline
          return outline !== 'none' && outline !== ''
        })
    })

    it('should have consistent focus styling across elements', () => {
      cy.visit('/')
      
      // Test multiple interactive elements
      const interactiveElements = [
        '[data-testid="button-login"]',
        'a',
        'button'
      ]
      
      interactiveElements.forEach(selector => {
        cy.get('body').then(($body) => {
          const elements = $body.find(selector)
          if (elements.length > 0) {
            cy.wrap(elements.first()).focus()
            cy.wrap(elements.first()).should('have.css', 'outline')
              .and('satisfy', (outline) => {
                return outline !== 'none' && outline !== ''
              })
          }
        })
      })
    })
  })

  describe('Touch Target Sizing', () => {
    it('should have minimum touch target sizes for buttons', () => {
      cy.visit('/')
      
      // Test button size meets WCAG guidelines (44px minimum)
      cy.get('[data-testid="button-login"]').then(($button) => {
        const rect = $button[0].getBoundingClientRect()
        const minSize = 44 // 44px minimum for touch targets
        
        expect(rect.height).to.be.at.least(minSize)
        expect(rect.width).to.be.at.least(minSize)
      })
    })

    it('should have proper spacing between interactive elements', () => {
      cy.visit('/')
      
      // Test spacing between buttons
      cy.get('body').then(($body) => {
        const buttons = $body.find('button')
        if (buttons.length > 1) {
          const firstButton = buttons[0]
          const secondButton = buttons[1]
          
          const firstRect = firstButton.getBoundingClientRect()
          const secondRect = secondButton.getBoundingClientRect()
          
          // Should have adequate spacing (at least 8px)
          const spacing = Math.abs(secondRect.top - firstRect.bottom)
          expect(spacing).to.be.at.least(8)
        }
      })
    })
  })

  describe('Text Readability', () => {
    it('should have readable font sizes', () => {
      cy.visit('/')
      
      // Test body text size
      cy.get('body').should('have.css', 'font-size')
        .and('satisfy', (fontSize) => {
          const size = parseInt(fontSize)
          // Should be at least 14px for readability
          return size >= 14
        })
    })

    it('should have proper line height for readability', () => {
      cy.visit('/')
      
      // Test line height
      cy.get('body').should('have.css', 'line-height')
        .and('satisfy', (lineHeight) => {
          const height = parseFloat(lineHeight)
          // Should be at least 1.4 for good readability
          return height >= 1.4
        })
    })

    it('should have sufficient text spacing', () => {
      cy.visit('/')
      
      // Test paragraph spacing
      cy.get('body').then(($body) => {
        const paragraphs = $body.find('p')
        if (paragraphs.length > 1) {
          cy.wrap(paragraphs.first()).should('have.css', 'margin-bottom')
            .and('satisfy', (marginBottom) => {
              const margin = parseInt(marginBottom)
              // Should have adequate spacing between paragraphs
              return margin >= 8
            })
        }
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should be navigable with keyboard', () => {
      cy.visit('/')
      
      // Test tab navigation
      cy.get('body').tab()
      cy.focused().should('exist')
      
      // Test that focus moves to next element
      cy.focused().tab()
      cy.focused().should('exist')
    })

    it('should have logical tab order', () => {
      cy.visit('/login')
      
      // Test tab order through form
      cy.get('[data-testid="input-email"]').focus()
      cy.focused().should('have.attr', 'data-testid', 'input-email')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'input-password')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'button-login')
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels', () => {
      cy.visit('/')
      
      // Test that interactive elements have accessible names
      cy.get('[data-testid="button-login"]').should('have.attr', 'aria-label')
        .or('contain.text')
        .or('have.attr', 'title')
    })

    it('should have proper heading structure', () => {
      cy.visit('/')
      
      // Test heading hierarchy
      cy.get('h1').should('exist')
      
      // Test that headings have content
      cy.get('h1').should('not.be.empty')
    })

    it('should have proper form labels', () => {
      cy.visit('/login')
      
      // Test form labels
      cy.get('[data-testid="input-email"]').should('have.attr', 'aria-label')
        .or('have.attr', 'aria-labelledby')
        .or('have.attr', 'placeholder')
    })
  })

  describe('Motion and Animation Accessibility', () => {
    it('should respect reduced motion preferences', () => {
      cy.visit('/')
      
      // Test that animations can be disabled
      cy.get('body').then(($body) => {
        $body.addClass('reduce-motion')
        
        // Test that animations are reduced
        cy.get('[data-testid="button-login"]').should('have.css', 'animation')
          .and('satisfy', (animation) => {
            // Should have reduced or no animation
            return animation === 'none' || animation.includes('0s')
          })
      })
    })

    it('should not have flashing content', () => {
      cy.visit('/')
      
      // Test that no elements have rapid flashing animations
      cy.get('body').then(($body) => {
        const animatedElements = $body.find('[style*="animation"], [class*="animate"]')
        
        animatedElements.each((index, element) => {
          const animation = window.getComputedStyle(element).animation
          if (animation && animation !== 'none') {
            // Check animation duration - should not be too fast (flashing)
            const duration = animation.match(/(\d+(?:\.\d+)?)s/)
            if (duration) {
              const durationValue = parseFloat(duration[1])
              expect(durationValue).to.be.greaterThan(0.1) // Should not flash faster than 0.1s
            }
          }
        })
      })
    })
  })

  describe('Color Independence', () => {
    it('should not rely solely on color to convey information', () => {
      cy.visit('/')
      
      // Test that interactive elements have other indicators besides color
      cy.get('[data-testid="button-login"]').should('have.css', 'border')
        .or('have.css', 'outline')
        .or('contain.text')
    })

    it('should have proper error state indicators', () => {
      cy.visit('/login')
      
      // Test error states have multiple indicators
      cy.get('[data-testid="input-email"]').then(($input) => {
        $input.addClass('error')
        
        cy.get('[data-testid="input-email"]').should('have.class', 'error')
        cy.get('[data-testid="input-email"]').should('have.css', 'border-color')
          .and('satisfy', (borderColor) => {
            // Should have visual error indicator
            return borderColor.includes('rgb(239, 68, 68)') || borderColor.includes('red')
          })
      })
    })
  })
})
