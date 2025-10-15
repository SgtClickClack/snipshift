import React from 'react'
import { ShiftCard } from './ShiftCard' // Adjust import path as needed

describe('ShiftCard Component', () => {
  beforeEach(() => {
    // 🚀 Setup mocks for blazing fast component testing
    cy.setupComponentMocks()
  })

  it('renders shift information correctly', () => {
    const shiftData = {
      id: '1',
      title: 'Haircut at Downtown Salon',
      description: 'Quick trim and style for busy professional',
      hourlyRate: 25,
      location: 'Downtown',
      skills: ['Haircut', 'Styling'],
      schedule: 'Flexible',
      postedBy: 'Salon Owner'
    }

    // 🧩 MOUNT ONLY THE COMPONENT - No full app boot needed!
    cy.mount(<ShiftCard shift={shiftData} onApply={() => {}} />)
    
    // Verify component renders correctly
    cy.get('[data-testid="shift-title"]').should('contain', 'Haircut at Downtown Salon')
    cy.get('[data-testid="shift-rate"]').should('contain', '$25/hour')
    cy.get('[data-testid="shift-location"]').should('contain', 'Downtown')
    cy.get('[data-testid="shift-skills"]').should('contain', 'Haircut, Styling')
  })

  it('handles apply button click', () => {
    const shiftData = {
      id: '1',
      title: 'Test Shift',
      description: 'Test description',
      hourlyRate: 20,
      location: 'Test Location',
      skills: ['Test Skill'],
      schedule: 'Test Schedule',
      postedBy: 'Test Owner'
    }

    const onApplySpy = cy.stub().as('onApplySpy')

    cy.mount(<ShiftCard shift={shiftData} onApply={onApplySpy} />)
    
    // Test button interaction
    cy.get('[data-testid="apply-button"]').click()
    cy.get('@onApplySpy').should('have.been.calledWith', shiftData.id)
  })

  it('displays loading state correctly', () => {
    cy.mount(<ShiftCard shift={null} onApply={() => {}} loading={true} />)
    
    cy.get('[data-testid="shift-loading"]').should('be.visible')
    cy.get('[data-testid="shift-title"]').should('not.exist')
  })

  it('handles different skill formats', () => {
    const shiftData = {
      id: '1',
      title: 'Test Shift',
      description: 'Test description',
      hourlyRate: 20,
      location: 'Test Location',
      skills: ['Haircut', 'Coloring', 'Styling', 'Beard Trim'],
      schedule: 'Test Schedule',
      postedBy: 'Test Owner'
    }

    cy.mount(<ShiftCard shift={shiftData} onApply={() => {}} />)
    
    // Verify skills are displayed properly
    cy.get('[data-testid="shift-skills"]').should('contain', 'Haircut, Coloring, Styling, Beard Trim')
  })

  it('is accessible', () => {
    const shiftData = {
      id: '1',
      title: 'Accessible Test Shift',
      description: 'Test description for accessibility',
      hourlyRate: 20,
      location: 'Test Location',
      skills: ['Test Skill'],
      schedule: 'Test Schedule',
      postedBy: 'Test Owner'
    }

    cy.mount(<ShiftCard shift={shiftData} onApply={() => {}} />)
    
    // 🎯 ACCESSIBILITY TESTING - Much faster than E2E!
    cy.injectAxe()
    cy.checkA11y()
  })
})

// 🚀 PERFORMANCE COMPARISON:
// E2E Test: Boots entire app → Login → Navigate → Find component → Test (30-60 seconds)
// Component Test: Mount component → Test (2-5 seconds)
// 
// That's 10-20x faster for the same test coverage!
