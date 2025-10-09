import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ShopOnboarding from '../onboarding/shop';

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
    user: { id: 'test-user-id' },
  }),
}));

jest.mock('../../lib/queryClient', () => ({
  apiRequest: jest.fn(() => Promise.resolve()),
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

describe('ShopOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).currentStepData = {};
  });

  it('renders the onboarding form with correct title', () => {
    renderWithRouter(<ShopOnboarding />);

    expect(screen.getByText('Shop Owner Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Set up your barbershop profile to start hiring professionals')).toBeInTheDocument();
  });

  it('shows the first step (Shop Details) by default', () => {
    renderWithRouter(<ShopOnboarding />);

    expect(screen.getByText('Shop Details')).toBeInTheDocument();
    expect(screen.getByText('Tell us about your barbershop')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('renders all required form fields in shop details step', () => {
    renderWithRouter(<ShopOnboarding />);

    expect(screen.getByLabelText(/shop name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
  });

  it('validates required fields before allowing next step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Should stay on step 1 because validation fails
    expect(screen.getByText('Shop Details')).toBeInTheDocument();
  });

  it('allows navigation to next step when required fields are filled', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Fill required fields
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    // Set validation data
    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Shop Vibe & Details')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });
  });

  it('shows vibe selection in shop vibe step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Navigate to shop vibe step
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Shop Vibe & Atmosphere')).toBeInTheDocument();
      expect(screen.getByText('Modern')).toBeInTheDocument();
      expect(screen.getByText('High-end')).toBeInTheDocument();
      expect(screen.getByText('Busy')).toBeInTheDocument();
    });
  });

  it('allows selecting multiple vibe tags', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Navigate to shop vibe step
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      const modernCheckbox = screen.getByLabelText('Modern');
      const highEndCheckbox = screen.getByLabelText('High-end');

      // Select multiple vibe tags
      await user.click(modernCheckbox);
      await user.click(highEndCheckbox);

      expect(modernCheckbox).toBeChecked();
      expect(highEndCheckbox).toBeChecked();
    });
  });

  it('shows chair capacity selection', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Navigate to shop vibe step
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByLabelText(/chair capacity/i)).toBeInTheDocument();
      expect(screen.getByText('1-2 chairs')).toBeInTheDocument();
      expect(screen.getByText('3-4 chairs')).toBeInTheDocument();
      expect(screen.getByText('5-6 chairs')).toBeInTheDocument();
    });
  });

  it('shows verification step with ABN and file uploads', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Navigate to verification step
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      // Select vibe and capacity
      await user.click(screen.getByLabelText('Modern'));
      await user.click(screen.getByText('3-4 chairs'));
    });

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890',
      vibeTags: ['Modern'],
      chairCapacity: '3-4 chairs'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Verification')).toBeInTheDocument();
      expect(screen.getByLabelText(/abn number/i)).toBeInTheDocument();
      expect(screen.getByText('Business Insurance')).toBeInTheDocument();
      expect(screen.getByText('Shop Photos (Optional)')).toBeInTheDocument();
    });
  });

  it('validates ABN length in verification step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Navigate to verification step
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Modern'));
      await user.click(screen.getByText('3-4 chairs'));
    });

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890',
      vibeTags: ['Modern'],
      chairCapacity: '3-4 chairs'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      const abnInput = screen.getByLabelText(/abn number/i);
      expect(abnInput).toHaveAttribute('maxLength', '11');
    });
  });

  it('handles file uploads for insurance and photos', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Navigate to verification step
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Modern'));
      await user.click(screen.getByText('3-4 chairs'));
    });

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890',
      vibeTags: ['Modern'],
      chairCapacity: '3-4 chairs'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      const insuranceFileInput = screen.getByLabelText(/click to upload/i);
      expect(insuranceFileInput).toBeInTheDocument();
      expect(insuranceFileInput).toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png');

      const photoFileInput = screen.getByLabelText(/click to upload/i);
      expect(photoFileInput).toBeInTheDocument();
      expect(photoFileInput).toHaveAttribute('accept', 'image/*');
      expect(photoFileInput).toHaveAttribute('multiple');
    });
  });

  it('allows going back to previous steps', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ShopOnboarding />);

    // Fill first step and go to second
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Shop Vibe & Details')).toBeInTheDocument();
    });

    // Go back
    await user.click(screen.getByText('Previous'));

    await waitFor(() => {
      expect(screen.getByText('Shop Details')).toBeInTheDocument();
    });
  });

  it('shows cancel button and allows cancellation', async () => {
    const user = userEvent.setup();
    const mockNavigate = require('react-router-dom').useNavigate();
    
    renderWithRouter(<ShopOnboarding />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/role-selection');
  });

  it('completes onboarding and redirects to hub dashboard', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    const mockNavigate = require('react-router-dom').useNavigate();
    const mockToast = require('../../hooks/use-toast').useToast().toast;

    renderWithRouter(<ShopOnboarding />);

    // Complete all steps
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Modern'));
      await user.click(screen.getByText('3-4 chairs'));
    });

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890',
      vibeTags: ['Modern'],
      chairCapacity: '3-4 chairs'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.type(screen.getByLabelText(/abn number/i), '12345678901');
    });

    // Mock file upload
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/click to upload/i);
    await user.upload(fileInput, file);

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890',
      vibeTags: ['Modern'],
      chairCapacity: '3-4 chairs',
      abn: '12345678901',
      businessInsurance: file
    };

    await user.click(screen.getByText('Complete Setup'));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        'PATCH',
        '/api/users/test-user-id/profile',
        expect.objectContaining({
          profileType: 'hub',
          data: expect.stringContaining('Test Barbershop')
        })
      );

      expect(mockNavigate).toHaveBeenCalledWith('/hub-dashboard');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Onboarding Complete!',
        description: 'Your shop profile has been created successfully.',
      });
    });
  });

  it('shows progress correctly throughout the flow', () => {
    renderWithRouter(<ShopOnboarding />);

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('33% Complete')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    const mockToast = require('../../hooks/use-toast').useToast().toast;
    
    // Mock API error
    mockApiRequest.mockRejectedValueOnce(new Error('API Error'));

    renderWithRouter(<ShopOnboarding />);

    // Complete onboarding
    await user.type(screen.getByLabelText(/shop name/i), 'Test Barbershop');
    await user.type(screen.getByLabelText(/address/i), '123 Main St, Sydney, NSW');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Modern'));
      await user.click(screen.getByText('3-4 chairs'));
    });

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890',
      vibeTags: ['Modern'],
      chairCapacity: '3-4 chairs'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.type(screen.getByLabelText(/abn number/i), '12345678901');
    });

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/click to upload/i);
    await user.upload(fileInput, file);

    (window as any).currentStepData = {
      shopName: 'Test Barbershop',
      address: '123 Main St, Sydney, NSW',
      phone: '1234567890',
      vibeTags: ['Modern'],
      chairCapacity: '3-4 chairs',
      abn: '12345678901',
      businessInsurance: file
    };

    await user.click(screen.getByText('Complete Setup'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive',
      });
    });
  });
});
