/**
 * BusinessDashboard Unit Tests
 * 
 * TDD: Testing job deletion functionality
 * These tests verify that job deletion works correctly and handles errors properly.
 */

import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiRequest } from '../../lib/apiRequest';
import {
  renderDashboard,
  renderDashboardWithJobs,
  waitForJobsToLoad,
  setupConfirmMock,
  deleteFirstJob,
  mockJobs,
} from './helpers';

// Mock the apiRequest module
jest.mock('../../lib/apiRequest');

// Mock the ApplicationTrackingDashboard component
jest.mock('../../components/ApplicationTrackingDashboard', () => {
  return function MockApplicationTrackingDashboard() {
    return <div data-testid="application-tracking-dashboard">Application Tracking Dashboard</div>;
  };
});

// Mock the application service
jest.mock('../../services/api/applicationService', () => ({
  getApplicationsByBusiness: jest.fn(),
  updateApplicationStatus: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('BusinessDashboard - Job Deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful deletion', () => {
    it('should delete a job when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValueOnce(null); // Deletion success
      mockApiRequest.mockResolvedValueOnce([mockJobs[1]]); // Refetch after deletion
      const confirmMock = setupConfirmMock(true);

      renderDashboardWithJobs(mockJobs, mockApiRequest);
      await deleteFirstJob(user, confirmMock);

      expect(confirmMock).toHaveBeenCalledWith('Are you sure you want to delete this job?');
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs/job-1', { method: 'DELETE' });
      });
    });

    it('should not delete a job when user cancels confirmation', async () => {
      const user = userEvent.setup();
      const confirmMock = setupConfirmMock(false);

      renderDashboardWithJobs(mockJobs, mockApiRequest);
      await deleteFirstJob(user, confirmMock);

      expect(confirmMock).toHaveBeenCalled();
      expect(mockApiRequest).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should show "Deleting..." state while deletion is in progress', async () => {
      const user = userEvent.setup();
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockApiRequest.mockReturnValueOnce(deletePromise);
      setupConfirmMock(true);

      renderDashboardWithJobs(mockJobs, mockApiRequest);
      await deleteFirstJob(user, setupConfirmMock(true));

      await waitFor(() => {
        const deletingButton = screen.getByText('Deleting...');
        expect(deletingButton).toBeInTheDocument();
        expect(deletingButton).toBeDisabled();
      });

      await act(async () => {
        resolveDelete!();
      });
    });
  });

  describe('Error handling', () => {
    const testErrorHandling = async (error: Error) => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiRequest.mockRejectedValueOnce(error);
      const confirmMock = setupConfirmMock(true);

      renderDashboardWithJobs(mockJobs, mockApiRequest);
      await deleteFirstJob(user, confirmMock);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/jobs/job-1', { method: 'DELETE' });
      });

      consoleErrorSpy.mockRestore();
    };

    it('should handle deletion error when job is not found (404)', async () => {
      await testErrorHandling(new Error('Job not found'));
    });

    it('should handle network error during deletion', async () => {
      await testErrorHandling(new Error('Network request failed'));
    });

    it('should handle server error during deletion (500)', async () => {
      await testErrorHandling(new Error('Internal server error'));
    });
  });

  describe('UI feedback', () => {
    it('should disable delete button while deletion is in progress', async () => {
      const user = userEvent.setup();
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockApiRequest.mockReturnValueOnce(deletePromise);
      setupConfirmMock(true);

      renderDashboardWithJobs(mockJobs, mockApiRequest);
      await waitForJobsToLoad();

      const deleteButtons = screen.getAllByTestId('delete-job-button');
      const firstDeleteButton = deleteButtons[0];
      await user.click(firstDeleteButton);

      await waitFor(() => {
        expect(firstDeleteButton).toBeDisabled();
      });

      await act(async () => {
        resolveDelete!();
      });
    });

    it('should show "No jobs posted yet" when all jobs are deleted', async () => {
      const user = userEvent.setup();
      const singleJob = [mockJobs[0]];
      mockApiRequest.mockResolvedValueOnce(null); // Deletion success
      mockApiRequest.mockResolvedValueOnce([]); // Empty list after deletion
      setupConfirmMock(true);

      renderDashboardWithJobs(singleJob, mockApiRequest);
      await deleteFirstJob(user, setupConfirmMock(true));

      await waitFor(() => {
        expect(screen.getByTestId('no-jobs')).toBeInTheDocument();
        expect(screen.getByText('No jobs posted yet.')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render tab navigation buttons', () => {
      renderDashboard();
      
      expect(screen.getByTestId('dashboard-tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-jobs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-applications')).toBeInTheDocument();
    });

    it('should default to Job Management tab', () => {
      renderDashboard();
      
      expect(screen.getByTestId('jobs-tab-content')).toBeInTheDocument();
      expect(screen.queryByTestId('applications-tab-content')).not.toBeInTheDocument();
    });

    it('should switch to Application Tracking tab when clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();
      
      // Initially, jobs tab should be visible
      expect(screen.getByTestId('jobs-tab-content')).toBeInTheDocument();
      
      // Click the applications tab
      const applicationsTab = screen.getByTestId('tab-applications');
      await user.click(applicationsTab);
      
      // Applications tab content should be visible
      await waitFor(() => {
        expect(screen.getByTestId('applications-tab-content')).toBeInTheDocument();
        expect(screen.getByTestId('application-tracking-dashboard')).toBeInTheDocument();
      });
      
      // Jobs tab content should be hidden
      expect(screen.queryByTestId('jobs-tab-content')).not.toBeInTheDocument();
    });

    it('should switch back to Job Management tab when clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();
      
      // Switch to applications tab first
      const applicationsTab = screen.getByTestId('tab-applications');
      await user.click(applicationsTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('applications-tab-content')).toBeInTheDocument();
      });
      
      // Switch back to jobs tab
      const jobsTab = screen.getByTestId('tab-jobs');
      await user.click(jobsTab);
      
      // Jobs tab content should be visible again
      await waitFor(() => {
        expect(screen.getByTestId('jobs-tab-content')).toBeInTheDocument();
      });
      
      // Applications tab content should be hidden
      expect(screen.queryByTestId('applications-tab-content')).not.toBeInTheDocument();
    });
  });
});

