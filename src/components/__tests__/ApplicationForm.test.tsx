/**
 * ApplicationForm Component Tests
 * 
 * Tests form validation, submission, error handling, and parent callbacks
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApplicationForm from '../ApplicationForm';
import { apiRequest } from '../../lib/apiRequest';

// Mock the apiRequest module
jest.mock('../../lib/apiRequest');
const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('ApplicationForm', () => {
  let queryClient: QueryClient;
  const mockJobId = 'job-123';
  const mockOnApplicationSuccess = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
    mockOnApplicationSuccess.mockClear();
  });

  const renderApplicationForm = (props = {}) => {
    const defaultProps = {
      jobId: mockJobId,
      onApplicationSuccess: mockOnApplicationSuccess,
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ApplicationForm {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      renderApplicationForm();

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toHaveTextContent('All fields are required.');
      });
    });

    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toHaveTextContent('All fields are required.');
      });
    });

    it('should show error when cover letter is empty', async () => {
      const user = userEvent.setup();
      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toHaveTextContent('All fields are required.');
      });
    });

    it('should clear error when form is resubmitted with valid data', async () => {
      const user = userEvent.setup();
      renderApplicationForm();

      // First submit with empty fields
      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toBeInTheDocument();
      });

      // Fill all fields and submit again
      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'I am interested in this position.');

      mockApiRequest.mockResolvedValueOnce({ message: 'Application submitted successfully!' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByTestId('application-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Successful Submission', () => {
    it('should successfully submit application and call success callback', async () => {
      const user = userEvent.setup();
      const mockResponse = { message: 'Application submitted successfully!' };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'I am interested in this position.');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(`/api/jobs/${mockJobId}/apply`, {
          method: 'POST',
          body: {
            name: 'John Doe',
            email: 'john@example.com',
            coverLetter: 'I am interested in this position.',
          },
        });
      });

      await waitFor(() => {
        expect(mockOnApplicationSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should submit application with correct job ID', async () => {
      const user = userEvent.setup();
      const customJobId = 'custom-job-456';
      mockApiRequest.mockResolvedValueOnce({ message: 'Application submitted successfully!' });

      renderApplicationForm({ jobId: customJobId });

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(`/api/jobs/${customJobId}/apply`, expect.any(Object));
      });
    });
  });

  describe('Error Handling', () => {
    it('should display API error message', async () => {
      const user = userEvent.setup();
      const error = new Error('Failed to submit application');
      mockApiRequest.mockRejectedValueOnce(error);

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toHaveTextContent('Failed to submit application');
      });

      expect(mockOnApplicationSuccess).not.toHaveBeenCalled();
    });

    it('should display generic error message when error has no message', async () => {
      const user = userEvent.setup();
      const error = new Error();
      mockApiRequest.mockRejectedValueOnce(error);

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toHaveTextContent('Failed to submit application.');
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      const error = new Error('Network request failed');
      mockApiRequest.mockRejectedValueOnce(error);

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toHaveTextContent('Network request failed');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockReturnValueOnce(promise);

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Submitting...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      await act(async () => {
        resolvePromise!({ message: 'Application submitted successfully!' });
      });
    });

    it('should disable submit button during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockReturnValueOnce(promise);

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      await act(async () => {
        resolvePromise!({ message: 'Application submitted successfully!' });
      });
    });
  });

  describe('Parent Notification', () => {
    it('should call onApplicationSuccess callback on successful submission', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValueOnce({ message: 'Application submitted successfully!' });

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnApplicationSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onApplicationSuccess callback on error', async () => {
      const user = userEvent.setup();
      const error = new Error('API Error');
      mockApiRequest.mockRejectedValueOnce(error);

      renderApplicationForm();

      await user.type(screen.getByTestId('apply-name-input'), 'John Doe');
      await user.type(screen.getByTestId('apply-email-input'), 'john@example.com');
      await user.type(screen.getByTestId('apply-cover-letter-textarea'), 'Cover letter text');

      const submitButton = screen.getByTestId('submit-application');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('application-error')).toBeInTheDocument();
      });

      expect(mockOnApplicationSuccess).not.toHaveBeenCalled();
    });
  });
});

