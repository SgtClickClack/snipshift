import React from 'react';
import ShiftPostingModal from '@/components/shift-posting-modal';

describe('ShiftPostingModal Component', () => {
  it('should render shift posting modal when open', () => {
    cy.mount(<ShiftPostingModal isOpen={true} onClose={() => {}} />);
    
    // Check if modal is visible
    cy.get('[data-testid="modal-shift-posting"]').should('be.visible');
    
    // Check if form elements are present
    cy.get('[data-testid="input-shift-title"]').should('be.visible');
    cy.get('[data-testid="textarea-shift-description"]').should('be.visible');
    cy.get('[data-testid="input-hourly-rate"]').should('be.visible');
    cy.get('[data-testid="input-shift-location"]').should('be.visible');
    cy.get('[data-testid="input-shift-date"]').should('be.visible');
    cy.get('[data-testid="input-start-time"]').should('be.visible');
    cy.get('[data-testid="input-end-time"]').should('be.visible');
    
    // Check if buttons are present
    cy.get('[data-testid="button-close-modal"]').should('be.visible');
    cy.get('[data-testid="button-cancel-shift"]').should('be.visible');
    cy.get('[data-testid="button-submit-shift"]').should('be.visible');
  });

  it('should not render when closed', () => {
    cy.mount(<ShiftPostingModal isOpen={false} onClose={() => {}} />);
    
    // Modal should not be visible
    cy.get('[data-testid="modal-shift-posting"]').should('not.exist');
  });

  it('should allow filling out the form', () => {
    cy.mount(<ShiftPostingModal isOpen={true} onClose={() => {}} />);
    
    // Fill out the form
    cy.get('[data-testid="input-shift-title"]').type('Senior Barber - Weekend Shift');
    cy.get('[data-testid="textarea-shift-description"]').type('Looking for an experienced barber for weekend coverage');
    cy.get('[data-testid="input-hourly-rate"]').type('35');
    cy.get('[data-testid="input-shift-location"]').type('Sydney');
    cy.get('[data-testid="input-shift-state"]').type('NSW');
    cy.get('[data-testid="input-shift-postcode"]').type('2000');
    cy.get('[data-testid="input-shift-date"]').type('2025-01-15');
    cy.get('[data-testid="input-start-time"]').type('09:00');
    cy.get('[data-testid="input-end-time"]').type('17:00');
    
    // Verify form values
    cy.get('[data-testid="input-shift-title"]').should('have.value', 'Senior Barber - Weekend Shift');
    cy.get('[data-testid="input-hourly-rate"]').should('have.value', '35');
    cy.get('[data-testid="input-shift-location"]').should('have.value', 'Sydney');
  });

  it('should allow adding skills', () => {
    cy.mount(<ShiftPostingModal isOpen={true} onClose={() => {}} />);
    
    // Add a skill
    cy.get('[data-testid="input-new-skill"]').type('Hair Cutting');
    cy.get('[data-testid="button-add-skill"]').click();
    
    // Check if skill badge appears
    cy.get('[data-testid="skill-badge-hair-cutting"]').should('be.visible');
    
    // Add another skill
    cy.get('[data-testid="input-new-skill"]').type('Beard Trimming');
    cy.get('[data-testid="button-add-skill"]').click();
    
    // Check if second skill badge appears
    cy.get('[data-testid="skill-badge-beard-trimming"]').should('be.visible');
  });

  it('should close modal when close button is clicked', () => {
    const onCloseSpy = cy.stub();
    cy.mount(<ShiftPostingModal isOpen={true} onClose={onCloseSpy} />);
    
    // Click close button
    cy.get('[data-testid="button-close-modal"]').click();
    
    // Verify onClose was called
    cy.wrap(onCloseSpy).should('have.been.called');
  });

  it('should close modal when cancel button is clicked', () => {
    const onCloseSpy = cy.stub();
    cy.mount(<ShiftPostingModal isOpen={true} onClose={onCloseSpy} />);
    
    // Click cancel button
    cy.get('[data-testid="button-cancel-shift"]').click();
    
    // Verify onClose was called
    cy.wrap(onCloseSpy).should('have.been.called');
  });
});
