// Visual Testing Support Functions

// Color contrast calculation helper
export function calculateContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g)
    if (!rgb) return 0
    
    const [r, g, b] = rgb.map(c => {
      const component = parseInt(c) / 255
      return component <= 0.03928 
        ? component / 12.92 
        : Math.pow((component + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

// Validate WCAG contrast ratio
export function validateWCAGContrast(contrastRatio: number, level: 'AA' | 'AAA' = 'AA'): boolean {
  if (level === 'AA') {
    return contrastRatio >= 4.5 // Normal text
  } else {
    return contrastRatio >= 7 // Enhanced text
  }
}

// Get computed style helper
export function getComputedStyleValue(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property)
}

// Check if element is visible in viewport
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

// Validate touch target size
export function validateTouchTarget(element: HTMLElement, minSize: number = 44): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width >= minSize && rect.height >= minSize
}

// Check if element has proper focus indicator
export function hasFocusIndicator(element: HTMLElement): boolean {
  const outline = window.getComputedStyle(element).outline
  const boxShadow = window.getComputedStyle(element).boxShadow
  
  return (
    outline !== 'none' && outline !== '' ||
    boxShadow !== 'none' && boxShadow !== ''
  )
}

// Validate responsive breakpoints
export function getCurrentBreakpoint(): string {
  const width = window.innerWidth
  
  if (width < 640) return 'mobile'
  if (width < 768) return 'small-tablet'
  if (width < 1024) return 'tablet'
  if (width < 1280) return 'desktop'
  return 'large-desktop'
}

// Check if animation respects reduced motion
export function respectsReducedMotion(element: HTMLElement): boolean {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  if (prefersReducedMotion) {
    const animation = window.getComputedStyle(element).animation
    const transition = window.getComputedStyle(element).transition
    
    return animation === 'none' && transition === 'none'
  }
  
  return true
}

// Validate text readability
export function validateTextReadability(element: HTMLElement): boolean {
  const fontSize = parseInt(window.getComputedStyle(element).fontSize)
  const lineHeight = parseFloat(window.getComputedStyle(element).lineHeight)
  
  return fontSize >= 14 && lineHeight >= 1.4
}

// Check if element has proper ARIA attributes
export function hasProperAriaAttributes(element: HTMLElement): boolean {
  const hasAriaLabel = element.hasAttribute('aria-label')
  const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
  const hasTextContent = element.textContent && element.textContent.trim().length > 0
  const hasTitle = element.hasAttribute('title')
  
  return hasAriaLabel || hasAriaLabelledBy || hasTextContent || hasTitle
}

// Validate color independence (not relying solely on color)
export function hasColorIndependence(element: HTMLElement): boolean {
  const hasBorder = window.getComputedStyle(element).border !== 'none'
  const hasOutline = window.getComputedStyle(element).outline !== 'none'
  const hasTextContent = element.textContent && element.textContent.trim().length > 0
  const hasIcon = element.querySelector('svg, [class*="icon"]') !== null
  
  return hasBorder || hasOutline || hasTextContent || hasIcon
}

// Custom Cypress commands for visual testing
declare global {
  namespace Cypress {
    interface Chainable {
      validateContrast(element: string, level?: 'AA' | 'AAA'): Chainable<void>
      validateTouchTarget(element: string, minSize?: number): Chainable<void>
      validateFocusIndicator(element: string): Chainable<void>
      validateResponsiveBreakpoint(breakpoint: string): Chainable<void>
      validateTextReadability(element: string): Chainable<void>
      validateAriaAttributes(element: string): Chainable<void>
      validateColorIndependence(element: string): Chainable<void>
    }
  }
}

// Custom Cypress commands implementation
Cypress.Commands.add('validateContrast', (element: string, level: 'AA' | 'AAA' = 'AA') => {
  cy.get(element).then(($el) => {
    const textColor = window.getComputedStyle($el[0]).color
    const bgColor = window.getComputedStyle($el[0]).backgroundColor
    
    const contrastRatio = calculateContrastRatio(textColor, bgColor)
    const isValid = validateWCAGContrast(contrastRatio, level)
    
    expect(isValid, `Contrast ratio ${contrastRatio.toFixed(2)} should meet WCAG ${level} standards`).to.be.true
  })
})

Cypress.Commands.add('validateTouchTarget', (element: string, minSize: number = 44) => {
  cy.get(element).then(($el) => {
    const isValid = validateTouchTarget($el[0], minSize)
    expect(isValid, `Element should have minimum ${minSize}px touch target`).to.be.true
  })
})

Cypress.Commands.add('validateFocusIndicator', (element: string) => {
  cy.get(element).focus().then(($el) => {
    const hasIndicator = hasFocusIndicator($el[0])
    expect(hasIndicator, 'Element should have visible focus indicator').to.be.true
  })
})

Cypress.Commands.add('validateResponsiveBreakpoint', (breakpoint: string) => {
  cy.window().then((win) => {
    const currentBreakpoint = getCurrentBreakpoint()
    expect(currentBreakpoint, `Should be in ${breakpoint} breakpoint`).to.equal(breakpoint)
  })
})

Cypress.Commands.add('validateTextReadability', (element: string) => {
  cy.get(element).then(($el) => {
    const isReadable = validateTextReadability($el[0])
    expect(isReadable, 'Text should be readable with proper font size and line height').to.be.true
  })
})

Cypress.Commands.add('validateAriaAttributes', (element: string) => {
  cy.get(element).then(($el) => {
    const hasAria = hasProperAriaAttributes($el[0])
    expect(hasAria, 'Element should have proper ARIA attributes or text content').to.be.true
  })
})

Cypress.Commands.add('validateColorIndependence', (element: string) => {
  cy.get(element).then(($el) => {
    const hasIndependence = hasColorIndependence($el[0])
    expect(hasIndependence, 'Element should not rely solely on color to convey information').to.be.true
  })
})
