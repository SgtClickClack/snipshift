import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RoleSelectionPage from '../../pages/role-selection';

// Mock the hooks and dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', roles: [] },
    setRolesAndCurrentRole: jest.fn(),
  }),
}));

jest.mock('../../lib/queryClient', () => ({
  apiRequest: jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ currentRole: 'professional' }),
  })),
}));

jest.mock('../../lib/roles', () => ({
  getDashboardRoute: jest.fn((role) => `/${role}-dashboard`),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('RoleSelectionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('renders all role options', () => {
    renderWithRouter(<RoleSelectionPage />);

    expect(screen.getByText('Welcome to Snipshift!')).toBeInTheDocument();
    expect(screen.getByText('Select one or more roles to personalize your experience.')).toBeInTheDocument();
    
    // Check all role cards are present
    expect(screen.getByText('Barber')).toBeInTheDocument();
    expect(screen.getByText('Barbers and stylists looking for work opportunities')).toBeInTheDocument();
    
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Barbershop owners posting jobs and managing staff')).toBeInTheDocument();
    
    expect(screen.getByText('Brand / Coach')).toBeInTheDocument();
    expect(screen.getByText('For product companies and educators to connect with professionals')).toBeInTheDocument();
  });

  it('allows selecting multiple roles', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    const hubCard = screen.getByTestId('button-select-hub');

    // Select professional role
    await user.click(professionalCard);
    expect(professionalCard).toHaveClass('ring-2', 'ring-red-accent');

    // Select hub role
    await user.click(hubCard);
    expect(hubCard).toHaveClass('ring-2', 'ring-red-accent');

    // Both should be selected
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('allows deselecting roles', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');

    // Select role
    await user.click(professionalCard);
    expect(professionalCard).toHaveClass('ring-2', 'ring-red-accent');

    // Deselect role
    await user.click(professionalCard);
    expect(professionalCard).not.toHaveClass('ring-2', 'ring-red-accent');
  });

  it('disables continue button when no roles are selected', () => {
    renderWithRouter(<RoleSelectionPage />);

    const continueButton = screen.getByTestId('button-continue');
    expect(continueButton).toBeDisabled();
  });

  it('enables continue button when roles are selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    await user.click(professionalCard);

    const continueButton = screen.getByTestId('button-continue');
    expect(continueButton).not.toBeDisabled();
  });

  it('shows correct button text for single role selection', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    await user.click(professionalCard);

    const continueButton = screen.getByTestId('button-continue');
    expect(continueButton).toHaveTextContent('Continue to Dashboard');
  });

  it('shows correct button text for multiple role selection', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    const hubCard = screen.getByTestId('button-select-hub');

    await user.click(professionalCard);
    await user.click(hubCard);

    const continueButton = screen.getByTestId('button-continue');
    expect(continueButton).toHaveTextContent('Continue with selected roles');
  });

  it('handles role selection and API calls', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    const mockNavigate = require('react-router-dom').useNavigate();
    
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    await user.click(professionalCard);

    const continueButton = screen.getByTestId('button-continue');
    await user.click(continueButton);

    // Should call API to add role
    expect(mockApiRequest).toHaveBeenCalledWith(
      'PATCH',
      '/api/users/test-user-id/roles',
      { action: 'add', role: 'professional' }
    );

    // Should call API to set current role
    expect(mockApiRequest).toHaveBeenCalledWith(
      'PATCH',
      '/api/users/test-user-id/current-role',
      { role: 'professional' }
    );
  });

  it('redirects to onboarding after role selection', async () => {
    const user = userEvent.setup();
    const mockNavigate = require('react-router-dom').useNavigate();
    
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    await user.click(professionalCard);

    const continueButton = screen.getByTestId('button-continue');
    await user.click(continueButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding/professional');
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    const mockToast = require('../../hooks/use-toast').useToast().toast;
    
    // Mock API error
    mockApiRequest.mockRejectedValueOnce(new Error('API Error'));

    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    await user.click(professionalCard);

    const continueButton = screen.getByTestId('button-continue');
    await user.click(continueButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to update your roles. Please try again.',
        variant: 'destructive',
      });
    });
  });

  it('shows loading state during API calls', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    
    // Mock slow API response
    mockApiRequest.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({ currentRole: 'professional' }),
      }), 100))
    );

    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    await user.click(professionalCard);

    const continueButton = screen.getByTestId('button-continue');
    await user.click(continueButton);

    // Should show loading state
    expect(continueButton).toHaveTextContent('Setting up your account...');
    expect(continueButton).toBeDisabled();
  });

  it('displays role icons correctly', () => {
    renderWithRouter(<RoleSelectionPage />);

    // Check that icons are rendered (they should be present as SVG elements)
    const professionalIcon = screen.getByTestId('button-select-professional').querySelector('svg');
    const hubIcon = screen.getByTestId('button-select-hub').querySelector('svg');
    const brandIcon = screen.getByTestId('button-select-brand').querySelector('svg');

    expect(professionalIcon).toBeInTheDocument();
    expect(hubIcon).toBeInTheDocument();
    expect(brandIcon).toBeInTheDocument();
  });

  it('applies correct styling to selected roles', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RoleSelectionPage />);

    const professionalCard = screen.getByTestId('button-select-professional');
    
    // Initially not selected
    expect(professionalCard).not.toHaveClass('ring-2', 'ring-red-accent');
    
    // After selection
    await user.click(professionalCard);
    expect(professionalCard).toHaveClass('ring-2', 'ring-red-accent', 'shadow-xl', 'scale-105');
  });
});
