import React from 'react'

// Simple Button component for demonstration
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  size?: 'small' | 'medium' | 'large'
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  size = 'medium'
}) => {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors'
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  }
  const sizeClasses = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  }
  
  return (
    <button
      data-testid="button"
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

describe('Button Component', () => {
  beforeEach(() => {
    // 🧩 COMPONENT TESTING SETUP - No app boot needed!
    cy.setupComponentMocks()
  })

  it('renders with default props', () => {
    // 🚀 MOUNT ONLY THE COMPONENT - Instant feedback!
    cy.mount(<Button>Click me</Button>)
    
    cy.get('[data-testid="button"]')
      .should('be.visible')
      .should('contain', 'Click me')
      .should('have.class', 'bg-blue-600') // primary variant
  })

  it('handles click events', () => {
    const onClickSpy = cy.stub().as('onClickSpy')
    
    cy.mount(<Button onClick={onClickSpy}>Click me</Button>)
    
    cy.get('[data-testid="button"]').click()
    cy.get('@onClickSpy').should('have.been.called')
  })

  it('renders different variants', () => {
    cy.mount(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
      </div>
    )
    
    cy.get('[data-testid="button"]').first()
      .should('have.class', 'bg-blue-600')
      .should('contain', 'Primary')
    
    cy.get('[data-testid="button"]').last()
      .should('have.class', 'bg-gray-200')
      .should('contain', 'Secondary')
  })

  it('renders different sizes', () => {
    cy.mount(
      <div>
        <Button size="small">Small</Button>
        <Button size="medium">Medium</Button>
        <Button size="large">Large</Button>
      </div>
    )
    
    cy.get('[data-testid="button"]').first()
      .should('have.class', 'px-2')
      .should('contain', 'Small')
    
    cy.get('[data-testid="button"]').eq(1)
      .should('have.class', 'px-4')
      .should('contain', 'Medium')
    
    cy.get('[data-testid="button"]').last()
      .should('have.class', 'px-6')
      .should('contain', 'Large')
  })

  it('handles disabled state', () => {
    cy.mount(<Button disabled>Disabled</Button>)
    
    cy.get('[data-testid="button"]')
      .should('be.disabled')
      .should('have.class', 'opacity-50')
      .should('contain', 'Disabled')
  })

  it('is accessible', () => {
    cy.mount(<Button>Accessible Button</Button>)
    
    // 🎯 ACCESSIBILITY TESTING - Much faster than E2E!
    cy.injectAxe()
    cy.checkA11y()
  })

  it('demonstrates speed comparison', () => {
    const startTime = Date.now()
    
    cy.mount(<Button>Test Button</Button>)
    cy.get('[data-testid="button"]').should('be.visible')
    
    cy.then(() => {
      const endTime = Date.now()
      const duration = endTime - startTime
      cy.log(`🧩 COMPONENT TEST: ${duration}ms`)
      
      // Component tests should be very fast
      expect(duration).to.be.lessThan(1000)
    })
  })
})

// 🚀 PERFORMANCE COMPARISON:
// 
// E2E Test (Slow 🐢):
// - Boot entire app: 5-10 seconds
// - Login user: 5-10 seconds
// - Navigate to page: 2-3 seconds
// - Find component: 1-2 seconds
// - Test component: 1-2 seconds
// - Total: 14-27 seconds
//
// Component Test (Fast 🚀):
// - Mount component: 0.1 seconds
// - Test component: 0.5 seconds
// - Total: 0.6 seconds
//
// 🎉 RESULT: 20-45x FASTER!
