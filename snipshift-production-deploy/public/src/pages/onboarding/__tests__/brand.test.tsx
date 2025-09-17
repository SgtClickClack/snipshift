import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BrandOnboarding from '../onboarding/brand';

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

describe('BrandOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).currentStepData = {};
  });

  it('renders the onboarding form with correct title', () => {
    renderWithRouter(<BrandOnboarding />);

    expect(screen.getByText('Brand & Trainer Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Set up your profile to connect with the barbering community')).toBeInTheDocument();
  });

  it('shows the first step (Brand Information) by default', () => {
    renderWithRouter(<BrandOnboarding />);

    expect(screen.getByText('Brand Information')).toBeInTheDocument();
    expect(screen.getByText('Tell us about your company')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('renders all required form fields in brand info step', () => {
    renderWithRouter(<BrandOnboarding />);

    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
  });

  it('validates required fields before allowing next step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Should stay on step 1 because validation fails
    expect(screen.getByText('Brand Information')).toBeInTheDocument();
  });

  it('allows navigation to next step when required fields are filled', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Fill required fields
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    // Set validation data
    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Business Type')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });
  });

  it('shows business type selection in business type step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Navigate to business type step
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('What type of business are you?')).toBeInTheDocument();
      expect(screen.getByLabelText('Product Brand')).toBeInTheDocument();
      expect(screen.getByLabelText('Education/Training')).toBeInTheDocument();
      expect(screen.getByLabelText('Both Product Brand and Education/Training')).toBeInTheDocument();
    });
  });

  it('allows selecting business type and requires description', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Navigate to business type step
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      const productBrandCheckbox = screen.getByLabelText('Product Brand');
      await user.click(productBrandCheckbox);
      expect(productBrandCheckbox).toBeChecked();

      // Fill description
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Content & Products')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });
  });

  it('shows product categories selection in content products step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Navigate to content products step
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Brand'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Product Categories')).toBeInTheDocument();
      expect(screen.getByLabelText('Hair Care Products')).toBeInTheDocument();
      expect(screen.getByLabelText('Styling Tools')).toBeInTheDocument();
      expect(screen.getByLabelText('Barber Tools')).toBeInTheDocument();
      expect(screen.getByLabelText('Beard Care')).toBeInTheDocument();
    });
  });

  it('allows selecting multiple product categories', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Navigate to content products step
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Brand'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      const hairCareCheckbox = screen.getByLabelText('Hair Care Products');
      const stylingToolsCheckbox = screen.getByLabelText('Styling Tools');

      await user.click(hairCareCheckbox);
      await user.click(stylingToolsCheckbox);

      expect(hairCareCheckbox).toBeChecked();
      expect(stylingToolsCheckbox).toBeChecked();
    });
  });

  it('shows social media links in content products step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Navigate to content products step
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Brand'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Social Media Links')).toBeInTheDocument();
      expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/facebook/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/youtube/i)).toBeInTheDocument();
    });
  });

  it('shows partnership goals step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Navigate to partnership goals step
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Brand'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Hair Care Products'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals',
      productCategories: ['Hair Care Products']
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Partnership Goals')).toBeInTheDocument();
      expect(screen.getByText('What are you looking to achieve with SnipShift partnerships?')).toBeInTheDocument();
      expect(screen.getByLabelText('Product Trials')).toBeInTheDocument();
      expect(screen.getByLabelText('Brand Ambassadors')).toBeInTheDocument();
      expect(screen.getByLabelText('Event Sponsorship')).toBeInTheDocument();
    });
  });

  it('shows target audience selection', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrandOnboarding />);

    // Navigate to partnership goals step
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Brand'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Hair Care Products'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals',
      productCategories: ['Hair Care Products']
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Target Audience')).toBeInTheDocument();
      expect(screen.getByText('Who do you want to reach and collaborate with?')).toBeInTheDocument();
      expect(screen.getByLabelText('Professional Barbers')).toBeInTheDocument();
      expect(screen.getByLabelText('Barbershop Owners')).toBeInTheDocument();
      expect(screen.getByLabelText('Hair Stylists')).toBeInTheDocument();
    });
  });

  it('completes onboarding and redirects to brand dashboard', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    const mockNavigate = require('react-router-dom').useNavigate();
    const mockToast = require('../../hooks/use-toast').useToast().toast;

    renderWithRouter(<BrandOnboarding />);

    // Complete all steps
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Brand'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Hair Care Products'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals',
      productCategories: ['Hair Care Products']
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Trials'));
      await user.click(screen.getByLabelText('Professional Barbers'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals',
      productCategories: ['Hair Care Products'],
      goals: ['Product Trials'],
      targetAudience: ['Professional Barbers']
    };

    await user.click(screen.getByText('Complete Setup'));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        'PATCH',
        '/api/users/test-user-id/profile',
        expect.objectContaining({
          profileType: 'brand',
          data: expect.stringContaining('Test Brand')
        })
      );

      expect(mockNavigate).toHaveBeenCalledWith('/brand-dashboard');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Onboarding Complete!',
        description: 'Your brand profile has been created successfully.',
      });
    });
  });

  it('determines trainer role for education/training business types', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    const mockNavigate = require('react-router-dom').useNavigate();

    renderWithRouter(<BrandOnboarding />);

    // Complete onboarding with education/training business type
    await user.type(screen.getByLabelText(/company name/i), 'Test Training');
    await user.type(screen.getByLabelText(/contact name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email address/i), 'jane@testtraining.com');
    await user.type(screen.getByLabelText(/location/i), 'Melbourne, VIC');

    (window as any).currentStepData = {
      companyName: 'Test Training',
      contactName: 'Jane Doe',
      email: 'jane@testtraining.com',
      location: 'Melbourne, VIC'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Education/Training'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We provide professional barbering education');
    });

    (window as any).currentStepData = {
      companyName: 'Test Training',
      contactName: 'Jane Doe',
      email: 'jane@testtraining.com',
      location: 'Melbourne, VIC',
      businessType: 'Education/Training',
      description: 'We provide professional barbering education'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Educational Content'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Training',
      contactName: 'Jane Doe',
      email: 'jane@testtraining.com',
      location: 'Melbourne, VIC',
      businessType: 'Education/Training',
      description: 'We provide professional barbering education',
      productCategories: ['Educational Content']
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Educational Partnerships'));
      await user.click(screen.getByLabelText('Students/Trainees'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Training',
      contactName: 'Jane Doe',
      email: 'jane@testtraining.com',
      location: 'Melbourne, VIC',
      businessType: 'Education/Training',
      description: 'We provide professional barbering education',
      productCategories: ['Educational Content'],
      goals: ['Educational Partnerships'],
      targetAudience: ['Students/Trainees']
    };

    await user.click(screen.getByText('Complete Setup'));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        'PATCH',
        '/api/users/test-user-id/profile',
        expect.objectContaining({
          profileType: 'trainer',
          data: expect.stringContaining('Test Training')
        })
      );

      expect(mockNavigate).toHaveBeenCalledWith('/trainer-dashboard');
    });
  });

  it('shows cancel button and allows cancellation', async () => {
    const user = userEvent.setup();
    const mockNavigate = require('react-router-dom').useNavigate();
    
    renderWithRouter(<BrandOnboarding />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/role-selection');
  });

  it('shows progress correctly throughout the flow', () => {
    renderWithRouter(<BrandOnboarding />);

    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('25% Complete')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockApiRequest = require('../../lib/queryClient').apiRequest;
    const mockToast = require('../../hooks/use-toast').useToast().toast;
    
    // Mock API error
    mockApiRequest.mockRejectedValueOnce(new Error('API Error'));

    renderWithRouter(<BrandOnboarding />);

    // Complete onboarding
    await user.type(screen.getByLabelText(/company name/i), 'Test Brand');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@testbrand.com');
    await user.type(screen.getByLabelText(/location/i), 'Sydney, NSW');

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Brand'));
      const descriptionTextarea = screen.getByLabelText(/business description/i);
      await user.type(descriptionTextarea, 'We create amazing hair products for professionals');
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals'
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Hair Care Products'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals',
      productCategories: ['Hair Care Products']
    };

    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      await user.click(screen.getByLabelText('Product Trials'));
      await user.click(screen.getByLabelText('Professional Barbers'));
    });

    (window as any).currentStepData = {
      companyName: 'Test Brand',
      contactName: 'John Doe',
      email: 'john@testbrand.com',
      location: 'Sydney, NSW',
      businessType: 'Product Brand',
      description: 'We create amazing hair products for professionals',
      productCategories: ['Hair Care Products'],
      goals: ['Product Trials'],
      targetAudience: ['Professional Barbers']
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
