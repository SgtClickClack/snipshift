/**
 * BusinessDashboard Unit Tests
 * 
 * TDD: Testing job deletion functionality
 * These tests verify that job deletion works correctly and handles errors properly.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import BusinessDashboard from '../BusinessDashboard';
import { apiRequest } from '../../lib/apiRequest';
import { Job } from '../../types';

// Mock the apiRequest module
jest.mock('../../lib/apiRequest');

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('BusinessDashboard - Job Deletion', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <BusinessDashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  const mockJobs: Job[] = [
    {
      id: 'job-1',
      title: 'Test Job 1',
      payRate: '50',
      description: 'Test description 1',
      date: '2025-12-25',
      startTime: '09:00',
      endTime: '17:00',
    },
    {
      id: 'job-2',
      title: 'Test Job 2',
      payRate: '75',
      description: 'Test description 2',
      date: '2025-12-26',
      startTime: '10:00',
      endTime: '18:00',
    },
  ];

  describe('Successful deletion', () => {
    it('should delete a job when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      
      // Mock successful fetch of jobs
      mockApiRequest.mockResolvedValueOnce(mockJobs);
      
      // Mock successful deletion (204 No Content)
      mockApiRequest.mockResolvedValueOnce(null);
      
      // Mock refetch after deletion
      mockApiRequest.mockResolvedValueOnce([mockJobs[1]]);

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      renderDashboard();

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Find and click delete button for first job
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      await user.click(deleteButtons[0]);

      // Verify confirm was called
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this job?');

      // Verify delete API was called
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs/job-1', { method: 'DELETE' });
      });
    });

    it('should not delete a job when user cancels confirmation', async () => {
      const user = userEvent.setup();
      
      // Mock successful fetch of jobs
      mockApiRequest.mockResolvedValueOnce(mockJobs);

      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false);

      renderDashboard();

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      await user.click(deleteButtons[0]);

      // Verify confirm was called
      expect(window.confirm).toHaveBeenCalled();

      // Verify delete API was NOT called
      expect(mockApiRequest).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should show "Deleting..." state while deletion is in progress', async () => {
      const user = userEvent.setup();
      
      // Mock successful fetch of jobs
      mockApiRequest.mockResolvedValueOnce(mockJobs);
      
      // Mock deletion that takes time (promise that doesn't resolve immediately)
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockApiRequest.mockReturnValueOnce(deletePromise);

      window.confirm = jest.fn(() => true);

      renderDashboard();

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      await user.click(deleteButtons[0]);

      // Verify button shows "Deleting..." state
      await waitFor(() => {
        const deletingButton = screen.getByText('Deleting...');
        expect(deletingButton).toBeInTheDocument();
        expect(deletingButton).toBeDisabled();
      });

      // Resolve the deletion
      resolveDelete!();
    });
  });

  describe('Error handling', () => {
    it('should handle deletion error when job is not found (404)', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock successful fetch of jobs
      mockApiRequest.mockResolvedValueOnce(mockJobs);
      
      // Mock deletion error (404 Not Found)
      const notFoundError = new Error('Job not found');
      mockApiRequest.mockRejectedValueOnce(notFoundError);

      window.confirm = jest.fn(() => true);

      renderDashboard();

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      await user.click(deleteButtons[0]);

      // Wait for error to be handled
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs/job-1', { method: 'DELETE' });
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle network error during deletion', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock successful fetch of jobs
      mockApiRequest.mockResolvedValueOnce(mockJobs);
      
      // Mock network error
      const networkError = new Error('Network request failed');
      mockApiRequest.mockRejectedValueOnce(networkError);

      window.confirm = jest.fn(() => true);

      renderDashboard();

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      await user.click(deleteButtons[0]);

      // Wait for error to be handled
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs/job-1', { method: 'DELETE' });
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle server error during deletion (500)', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock successful fetch of jobs
      mockApiRequest.mockResolvedValueOnce(mockJobs);
      
      // Mock server error
      const serverError = new Error('Internal server error');
      mockApiRequest.mockRejectedValueOnce(serverError);

      window.confirm = jest.fn(() => true);

      renderDashboard();

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      await user.click(deleteButtons[0]);

      // Wait for error to be handled
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs/job-1', { method: 'DELETE' });
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('UI feedback', () => {
    it('should disable delete button while deletion is in progress', async () => {
      const user = userEvent.setup();
      
      // Mock successful fetch of jobs
      mockApiRequest.mockResolvedValueOnce(mockJobs);
      
      // Mock deletion that takes time
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockApiRequest.mockReturnValueOnce(deletePromise);

      window.confirm = jest.fn(() => true);

      renderDashboard();

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      const firstDeleteButton = deleteButtons[0];
      await user.click(firstDeleteButton);

      // Verify button is disabled
      await waitFor(() => {
        expect(firstDeleteButton).toBeDisabled();
      });

      // Resolve the deletion
      resolveDelete!();
    });

    it('should show "No jobs posted yet" when all jobs are deleted', async () => {
      const user = userEvent.setup();
      
      // Mock single job
      const singleJob = [mockJobs[0]];
      mockApiRequest.mockResolvedValueOnce(singleJob);
      
      // Mock successful deletion
      mockApiRequest.mockResolvedValueOnce(null);
      
      // Mock empty jobs list after deletion
      mockApiRequest.mockResolvedValueOnce([]);

      window.confirm = jest.fn(() => true);

      renderDashboard();

      // Wait for job to load
      await waitFor(() => {
        expect(screen.getByText('Test Job 1')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTestId('delete-job-button');
      await user.click(deleteButtons[0]);

      // Wait for "no jobs" message to appear
      await waitFor(() => {
        expect(screen.getByTestId('no-jobs')).toBeInTheDocument();
        expect(screen.getByText('No jobs posted yet.')).toBeInTheDocument();
      });
    });
  });
});

