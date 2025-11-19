/**
 * UserProfileDashboard Component Tests
 * 
 * TDD: Integration tests for the User Profile Dashboard component
 * Tests data fetching, form management, profile updates, and error handling
 */

import React from 'react';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import UserProfileDashboard from '../UserProfileDashboard';
import {
  getProfile,
  updateProfile,
  Profile,
} from '../../services/api/profileService';
import { renderWithClient, createFreshQueryClient } from '../../test-utils/queryClientWrapper';

// Mock the profile service module
jest.mock('../../services/api/profileService');

const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;
const mockUpdateProfile = updateProfile as jest.MockedFunction<typeof updateProfile>;

describe('UserProfileDashboard', () => {
  let queryClient: QueryClient;

  const mockProfile: Profile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'professional',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    // Create a fresh QueryClient instance before each test for complete isolation
    queryClient = createFreshQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear the QueryClient cache to ensure no state leaks between tests
    // Since we create a fresh client in beforeEach, this is mainly for cleanup
    queryClient.clear();
  });

  const renderDashboard = () => {
    return renderWithClient(<UserProfileDashboard />, undefined, queryClient);
  };

  describe('Loading State', () => {
    it('should display a skeleton or loading indicator upon initial fetch', async () => {
      let resolvePromise: (value: Profile) => void;
      const promise = new Promise<Profile>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetProfile.mockReturnValueOnce(promise);

      renderDashboard();

      // Should show loading state
      expect(screen.getByTestId('profile-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Resolve the promise
      await act(async () => {
        resolvePromise(mockProfile);
      });
    });
  });

  describe('Success Display', () => {
    it('should render the profile data correctly', async () => {
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-display')).toBeInTheDocument();
      });

      // Check that profile data is rendered
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    it('should correctly display the user_role', async () => {
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('user-role-display')).toBeInTheDocument();
      });

      expect(screen.getByText(/professional/i)).toBeInTheDocument();
    });

    it('should display role as non-editable', async () => {
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      renderDashboard();

      await waitFor(() => {
        const roleDisplay = screen.getByTestId('user-role-display');
        expect(roleDisplay).toBeInTheDocument();
        // Role should not be an input field
        expect(screen.queryByTestId('role-input')).not.toBeInTheDocument();
      });
    });

    it('should display all role types correctly', async () => {
      const roles: Array<'professional' | 'business' | 'admin' | 'trainer'> = [
        'professional',
        'business',
        'admin',
        'trainer',
      ];

      for (const role of roles) {
        const profileWithRole = { ...mockProfile, role };
        mockGetProfile.mockResolvedValueOnce(profileWithRole);

        const { unmount } = renderDashboard();

        await waitFor(() => {
          expect(screen.getByTestId('user-role-display')).toBeInTheDocument();
        });

        // Role is capitalized in display (e.g., "Professional", "Business")
        const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
        expect(screen.getByText(capitalizedRole)).toBeInTheDocument();
        
        // Clean up before next iteration
        unmount();
        queryClient.clear();
        jest.clearAllMocks();
      }
    });
  });

  describe('Fetch Error', () => {
    it('should display a user-friendly error message on profile retrieval failure', async () => {
      const error = new Error('Failed to fetch profile');
      mockGetProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
        expect(screen.getByText(/error loading profile/i)).toBeInTheDocument();
      });
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = new Error('Unauthorized');
      mockGetProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = new Error('Internal server error');
      mockGetProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      const error = new Error('Network request failed');
      mockGetProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should allow typing into the name field', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      expect(nameInput).toHaveValue('Updated Name');
    });

    it('should allow typing into the email field', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValueOnce(mockProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-email-input')).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId('profile-email-input');
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');

      expect(emailInput).toHaveValue('updated@example.com');
    });

    it('should call updateProfile service with correct data on form submission', async () => {
      const user = userEvent.setup();
      const updatedProfile: Profile = {
        ...mockProfile,
        name: 'Updated Name',
        email: 'updated@example.com',
        updatedAt: '2025-01-15T11:00:00.000Z',
      };

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockResolvedValueOnce(updatedProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const emailInput = screen.getByTestId('profile-email-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          name: 'Updated Name',
          email: 'updated@example.com',
        });
      });
    });

    it('should call updateProfile with only changed fields', async () => {
      const user = userEvent.setup();
      const updatedProfile: Profile = {
        ...mockProfile,
        name: 'Updated Name',
        updatedAt: '2025-01-15T11:00:00.000Z',
      };

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockResolvedValueOnce(updatedProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(submitButton);

      await waitFor(() => {
        // Should be called with only the changed field
        const calls = mockUpdateProfile.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]).toEqual({
          name: 'Updated Name',
        });
      });
    });
  });

  describe('Submission Feedback', () => {
    it('should display a success message after a successful update', async () => {
      const user = userEvent.setup();
      const updatedProfile: Profile = {
        ...mockProfile,
        name: 'Updated Name',
        updatedAt: '2025-01-15T11:00:00.000Z',
      };

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockResolvedValueOnce(updatedProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('profile-success-message')).toBeInTheDocument();
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should update the displayed profile data after successful submission', async () => {
      const user = userEvent.setup();
      const updatedProfile: Profile = {
        ...mockProfile,
        name: 'Updated Name',
        email: 'updated@example.com',
        updatedAt: '2025-01-15T11:00:00.000Z',
      };

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockResolvedValueOnce(updatedProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const emailInput = screen.getByTestId('profile-email-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');
      await user.click(submitButton);

      // Wait for mutation to complete and form fields to update
      await waitFor(() => {
        expect(screen.getByTestId('profile-success-message')).toBeInTheDocument();
      });

      // Form fields should be updated via onSuccess callback
      await waitFor(() => {
        expect(nameInput).toHaveValue('Updated Name');
        expect(emailInput).toHaveValue('updated@example.com');
      });
    });
  });

  describe('Submission Error', () => {
    it('should display an error message on form submission failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Failed to update profile');

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(submitButton);

      // Wait for mutation error to be processed
      await waitFor(
        () => {
          expect(screen.getByTestId('profile-update-error')).toBeInTheDocument();
          expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should handle 400 Validation error', async () => {
      const user = userEvent.setup();
      const error = new Error('Validation error: email must be valid');

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-email-input')).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId('profile-email-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      // Change email to trigger form submission
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      
      // Wait for state to update
      await waitFor(() => {
        expect(emailInput).toHaveValue('invalid-email');
      });

      // Submit the form
      const form = emailInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      } else {
        await user.click(submitButton);
      }

      // Wait for mutation to be called and error to be processed and displayed
      await waitFor(
        () => {
          expect(mockUpdateProfile).toHaveBeenCalledWith({
            email: 'invalid-email',
          });
          expect(screen.getByTestId('profile-update-error')).toBeInTheDocument();
          expect(screen.getByText(/validation error/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should handle 401 Unauthorized error on update', async () => {
      const user = userEvent.setup();
      const error = new Error('Unauthorized');

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('profile-update-error')).toBeInTheDocument();
      });
    });

    it('should handle 500 Internal Server Error on update', async () => {
      const user = userEvent.setup();
      const error = new Error('Internal server error');

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('profile-update-error')).toBeInTheDocument();
      });
    });

    it('should allow retrying after an error', async () => {
      const user = userEvent.setup();
      const error = new Error('Failed to update profile');
      const updatedProfile: Profile = {
        ...mockProfile,
        name: 'Updated Name',
        updatedAt: '2025-01-15T11:00:00.000Z',
      };

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockRejectedValueOnce(error);
      mockUpdateProfile.mockResolvedValueOnce(updatedProfile);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      // First attempt - fails
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      
      // Wait for state to update
      await waitFor(() => {
        expect(nameInput).toHaveValue('Updated Name');
      });

      // Submit the form
      const form = nameInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      } else {
        await user.click(submitButton);
      }

      // Wait for mutation to be called and error to appear
      await waitFor(
        () => {
          expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
          expect(mockUpdateProfile).toHaveBeenCalledWith({
            name: 'Updated Name',
          });
          const errorElement = screen.getByTestId('profile-update-error');
          expect(errorElement).toBeInTheDocument();
          expect(errorElement.textContent).toMatch(/failed to update profile/i);
        },
        { timeout: 5000 }
      );

      // Retry - form value is "Updated Name" but profile.name is still "Test User"
      // So it should detect the change and submit again
      const formForRetry = nameInput.closest('form');
      if (formForRetry) {
        fireEvent.submit(formForRetry);
      } else {
        await user.click(submitButton);
      }

      // Wait for mutation to be called again and success message to appear
      await waitFor(
        () => {
          expect(mockUpdateProfile).toHaveBeenCalledTimes(2);
          expect(screen.getByTestId('profile-success-message')).toBeInTheDocument();
          expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Loading State During Submission', () => {
    it('should disable submit button during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Profile) => void;
      const promise = new Promise<Profile>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockReturnValueOnce(promise);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      
      // Click submit and immediately check for disabled state
      const clickPromise = user.click(submitButton);
      
      // Wait a bit for the mutation to start
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      await clickPromise;

      await act(async () => {
        resolvePromise({
          ...mockProfile,
          name: 'Updated Name',
          updatedAt: '2025-01-15T11:00:00.000Z',
        });
      });
    });

    it('should show loading text on submit button during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Profile) => void;
      const promise = new Promise<Profile>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetProfile.mockResolvedValueOnce(mockProfile);
      mockUpdateProfile.mockReturnValueOnce(promise);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
      });

      const nameInput = screen.getByTestId('profile-name-input');
      const submitButton = screen.getByTestId('profile-submit-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      
      // Click submit button
      const clickPromise = user.click(submitButton);
      
      // Wait for loading state to appear
      await waitFor(() => {
        expect(screen.getByText(/updating/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      // Resolve the promise to complete the mutation
      await act(async () => {
        resolvePromise({
          ...mockProfile,
          name: 'Updated Name',
          updatedAt: '2025-01-15T11:00:00.000Z',
        });
      });

      await clickPromise;
    });
  });
});

