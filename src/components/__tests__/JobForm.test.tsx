/**
 * JobForm Component Tests
 * 
 * Tests form validation, mutations, error handling, and credit gating
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import JobForm from '../JobForm';
import { apiRequest } from '../../lib/apiRequest';
import { AuthProvider } from '../../context/AuthContext';
import { Job } from '../../types';

// Mock the apiRequest module
jest.mock('../../lib/apiRequest');
const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('JobForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderJobForm = (props = {}) => {
    const defaultProps = {
      submitButtonText: 'Submit Job',
      submitButtonTestId: 'button-submit-job',
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <JobForm {...defaultProps} />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('Form Validation', () => {
    it('should show error when job title is empty', async () => {
      const user = userEvent.setup();
      renderJobForm();

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-job-title')).toHaveTextContent('Job title is required');
      });
    });

    it('should show error when pay rate is empty', async () => {
      const user = userEvent.setup();
      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-pay-rate')).toHaveTextContent('Pay rate must be a positive number');
      });
    });

    it('should show error when pay rate is zero or negative', async () => {
      const user = userEvent.setup();
      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '0');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '09:00');
      await user.type(screen.getByTestId('input-end-time'), '17:00');

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-pay-rate')).toHaveTextContent('Pay rate must be a positive number');
      });
    });

    it('should show error when description is empty', async () => {
      const user = userEvent.setup();
      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-job-description')).toHaveTextContent('Description is required');
      });
    });

    it('should show error when date is empty', async () => {
      const user = userEvent.setup();
      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-job-date')).toHaveTextContent('Date is required');
      });
    });

    it('should show error when start time is empty', async () => {
      const user = userEvent.setup();
      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-start-time')).toHaveTextContent('Start time is required');
      });
    });

    it('should show error when end time is empty', async () => {
      const user = userEvent.setup();
      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '09:00');
      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-end-time')).toHaveTextContent('End time is required');
      });
    });

    it('should show error when end time is before or equal to start time', async () => {
      const user = userEvent.setup();
      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '17:00');
      await user.type(screen.getByTestId('input-end-time'), '09:00');

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message-time-logic')).toHaveTextContent('End time must be after start time');
      });
    });
  });

  describe('Credit Gating', () => {
    it('should disable submit button when user has insufficient credits', () => {
      // Mock user with 0 credits
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', credits: 0 };
      
      // We need to mock useAuthStorage to return user with 0 credits
      jest.spyOn(require('../../hooks/useAuthStorage'), 'useAuthStorage').mockReturnValue({
        isAuthenticated: true,
        token: 'mock-token',
        user: mockUser,
        login: jest.fn(),
        logout: jest.fn(),
      });

      renderJobForm();

      const submitButton = screen.getByTestId('button-submit-job');
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('error-insufficient-credits')).toBeInTheDocument();
    });

    it('should enable submit button when user has sufficient credits', () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', credits: 10 };
      
      jest.spyOn(require('../../hooks/useAuthStorage'), 'useAuthStorage').mockReturnValue({
        isAuthenticated: true,
        token: 'mock-token',
        user: mockUser,
        login: jest.fn(),
        logout: jest.fn(),
      });

      renderJobForm();

      const submitButton = screen.getByTestId('button-submit-job');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Create Mode', () => {
    it('should successfully create a job and navigate to dashboard', async () => {
      const user = userEvent.setup();
      const mockJob: Job = {
        id: 'job-1',
        title: 'Test Job',
        payRate: 25,
        description: 'Test description',
        date: '2024-12-31',
        startTime: '09:00',
        endTime: '17:00',
      };

      mockApiRequest.mockResolvedValueOnce(mockJob);

      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '09:00');
      await user.type(screen.getByTestId('input-end-time'), '17:00');

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs', {
          method: 'POST',
          body: {
            title: 'Test Job',
            payRate: '25',
            description: 'Test description',
            date: '2024-12-31',
            startTime: '09:00',
            endTime: '17:00',
          },
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/business-dashboard');
      });
    });

    it('should handle API error during job creation', async () => {
      const user = userEvent.setup();
      const error = new Error('Failed to create job');
      mockApiRequest.mockRejectedValueOnce(error);

      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '09:00');
      await user.type(screen.getByTestId('input-end-time'), '17:00');

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      // Navigation should not occur on error
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: Job) => void;
      const promise = new Promise<Job>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockReturnValueOnce(promise);

      renderJobForm();

      await user.type(screen.getByTestId('input-job-title'), 'Test Job');
      await user.type(screen.getByTestId('input-pay-rate'), '25');
      await user.type(screen.getByTestId('textarea-job-description'), 'Test description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '09:00');
      await user.type(screen.getByTestId('input-end-time'), '17:00');

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Submitting...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      await act(async () => {
        resolvePromise!({
          id: 'job-1',
          title: 'Test Job',
          payRate: 25,
          description: 'Test description',
        });
      });
    });
  });

  describe('Edit Mode', () => {
    it('should populate form fields with initial data', () => {
      const initialJob: Job = {
        id: 'job-1',
        title: 'Existing Job',
        payRate: 30,
        description: 'Existing description',
        date: '2024-12-31',
        startTime: '10:00',
        endTime: '18:00',
      };

      renderJobForm({ initialData: initialJob });

      expect(screen.getByTestId('input-job-title')).toHaveValue('Existing Job');
      expect(screen.getByTestId('input-pay-rate')).toHaveValue('30');
      expect(screen.getByTestId('textarea-job-description')).toHaveValue('Existing description');
      expect(screen.getByTestId('input-job-date')).toHaveValue('2024-12-31');
      expect(screen.getByTestId('input-start-time')).toHaveValue('10:00');
      expect(screen.getByTestId('input-end-time')).toHaveValue('18:00');
    });

    it('should successfully update a job and navigate to dashboard', async () => {
      const user = userEvent.setup();
      const initialJob: Job = {
        id: 'job-1',
        title: 'Existing Job',
        payRate: 30,
        description: 'Existing description',
      };

      const updatedJob: Job = {
        ...initialJob,
        title: 'Updated Job',
        payRate: 35,
      };

      mockApiRequest.mockResolvedValueOnce(updatedJob);

      renderJobForm({ initialData: initialJob });

      const titleInput = screen.getByTestId('input-job-title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Job');

      const payRateInput = screen.getByTestId('input-pay-rate');
      await user.clear(payRateInput);
      await user.type(payRateInput, '35');

      await user.type(screen.getByTestId('textarea-job-description'), 'Updated description');
      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '09:00');
      await user.type(screen.getByTestId('input-end-time'), '17:00');

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs/job-1', {
          method: 'PUT',
          body: {
            title: 'Updated Job',
            payRate: '35',
            description: 'Updated description',
            date: '2024-12-31',
            startTime: '09:00',
            endTime: '17:00',
          },
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/business-dashboard');
      });
    });

    it('should handle API error during job update', async () => {
      const user = userEvent.setup();
      const initialJob: Job = {
        id: 'job-1',
        title: 'Existing Job',
        payRate: 30,
        description: 'Existing description',
      };

      const error = new Error('Failed to update job');
      mockApiRequest.mockRejectedValueOnce(error);

      renderJobForm({ initialData: initialJob });

      await user.type(screen.getByTestId('input-job-date'), '2024-12-31');
      await user.type(screen.getByTestId('input-start-time'), '09:00');
      await user.type(screen.getByTestId('input-end-time'), '17:00');

      const submitButton = screen.getByTestId('button-submit-job');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

