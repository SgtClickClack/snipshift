import ProfessionalDashboard from '../../client/src/pages/professional-dashboard';

describe('ProfessionalDashboard Component', () => {
  it('should render the dashboard', () => {
    cy.mount(<ProfessionalDashboard />);
    cy.get('[data-testid="professional-dashboard"]').should('be.visible');
  });
});
