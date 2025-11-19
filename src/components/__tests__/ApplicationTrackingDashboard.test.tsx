/**
 * ApplicationTrackingDashboard Component Tests
 * 
 * TDD: Integration tests for the Application Tracking Dashboard component
 * Tests data fetching, filtering, status updates, and error handling
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApplicationTrackingDashboard from '../ApplicationTrackingDashboard';
import {
  getApplicationsByBusiness,
  updateApplicationStatus,
  Application,
} from '../../services/api/applicationService';

// Mock the application service module
jest.mock('../../services/api/applicationService');

const mockGetApplicationsByBusiness = getApplicationsByBusiness as jest.MockedFunction<
  typeof getApplicationsByBusiness
>;
const mockUpdateApplicationStatus = updateApplicationStatus as jest.MockedFunction<
  typeof updateApplicationStatus
>;

describe('ApplicationTrackingDashboard', () => {
  let queryClient: QueryClient;

  const mockApplications: Application[] = [
    {
      id: 'app-1',
      jobId: 'job-1',
      name: 'John Doe',
      email: 'john@example.com',
      coverLetter: 'I am interested in this position',
      jobTitle: 'Software Developer',
      jobPayRate: '35.00',
      status: 'pending',
      appliedDate: '2025-11-17T10:00:00.000Z',
      respondedDate: null,
      respondedAt: null,
    },
    {
      id: 'app-2',
      jobId: 'job-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      coverLetter: 'I have extensive experience',
      jobTitle: 'Marketing Manager',
      jobPayRate: '40.00',
      status: 'accepted',
      appliedDate: '2025-11-17T11:00:00.000Z',
      respondedDate: '2025-11-17T12:00:00.000Z',
      respondedAt: '2025-11-17T12:00:00.000Z',
    },
    {
      id: 'app-3',
      jobId: 'job-1',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      coverLetter: 'I am a great fit',
      jobTitle: 'Software Developer',
      jobPayRate: '35.00',
      status: 'rejected',
      appliedDate: '2025-11-17T09:00:00.000Z',
      respondedDate: '2025-11-17T10:30:00.000Z',
      respondedAt: '2025-11-17T10:30:00.000Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ApplicationTrackingDashboard />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading spinner or skeleton upon initial fetch', async () => {
      let resolvePromise: (value: Application[]) => void;
      const promise = new Promise<Application[]>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetApplicationsByBusiness.mockReturnValueOnce(promise);

      renderDashboard();

      // Should show loading state
      expect(screen.getByTestId('applications-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Resolve the promise
      await act(async () => {
        resolvePromise(mockApplications);
      });
    });
  });

  describe('Success State', () => {
    it('should render a list of applications correctly', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('applications-list')).toBeInTheDocument();
      });

      // Check that applications are rendered
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should display application details correctly', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Check application details
      expect(screen.getAllByText('Software Developer').length).toBeGreaterThan(0);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText(/I am interested/i)).toBeInTheDocument();
    });

    it('should display application status badges', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        // Check for status badges (not options in dropdowns)
        const statusBadges = screen.getAllByText(/pending|accepted|rejected/i);
        // Should have at least one of each status badge
        const badgeTexts = statusBadges.map(el => el.textContent?.toLowerCase() || '');
        expect(badgeTexts.some(t => t.includes('pending'))).toBe(true);
        expect(badgeTexts.some(t => t.includes('accepted'))).toBe(true);
        expect(badgeTexts.some(t => t.includes('rejected'))).toBe(true);
      });
    });

    it('should display empty state when no applications exist', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce([]);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('empty-applications')).toBeInTheDocument();
        expect(screen.getByText(/no applications/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should display user-friendly error message on fetch failure', async () => {
      const error = new Error('Failed to fetch applications');
      mockGetApplicationsByBusiness.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('applications-error')).toBeInTheDocument();
        expect(screen.getByText(/error loading applications/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      const error = new Error('Network request failed');
      mockGetApplicationsByBusiness.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('applications-error')).toBeInTheDocument();
      });
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = new Error('Unauthorized');
      mockGetApplicationsByBusiness.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('applications-error')).toBeInTheDocument();
      });
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = new Error('Internal server error');
      mockGetApplicationsByBusiness.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('applications-error')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    it('should display filter controls', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-filter')).toBeInTheDocument();
      });
    });

    it('should call service with status filter when filter changes', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-filter')).toBeInTheDocument();
      });

      const filterSelect = screen.getByTestId('status-filter');
      await userEvent.selectOptions(filterSelect, 'accepted');

      await waitFor(() => {
        // React Query calls the function on filter change, so check the last call
        const calls = mockGetApplicationsByBusiness.mock.calls;
        expect(calls[calls.length - 1]).toEqual(['accepted', undefined]);
      });
    });

    it('should filter applications by pending status', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-filter')).toBeInTheDocument();
      });

      const filterSelect = screen.getByTestId('status-filter');
      await userEvent.selectOptions(filterSelect, 'pending');

      await waitFor(() => {
        // React Query calls the function on filter change, so check the last call
        const calls = mockGetApplicationsByBusiness.mock.calls;
        expect(calls[calls.length - 1]).toEqual(['pending', undefined]);
      });
    });

    it('should filter applications by rejected status', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-filter')).toBeInTheDocument();
      });

      const filterSelect = screen.getByTestId('status-filter');
      await userEvent.selectOptions(filterSelect, 'rejected');

      await waitFor(() => {
        // React Query calls the function on filter change, so check the last call
        const calls = mockGetApplicationsByBusiness.mock.calls;
        expect(calls[calls.length - 1]).toEqual(['rejected', undefined]);
      });
    });

    it('should show all applications when filter is set to "All"', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-filter')).toBeInTheDocument();
      });

      const filterSelect = screen.getByTestId('status-filter');
      await userEvent.selectOptions(filterSelect, 'All');

      await waitFor(() => {
        // React Query calls the function on filter change, so check the last call
        const calls = mockGetApplicationsByBusiness.mock.calls;
        expect(calls[calls.length - 1]).toEqual([undefined, undefined]);
      });
    });
  });

  describe('Status Update Flow', () => {
    it('should display status update controls for each application', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce([mockApplications[0]]);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('application-card-app-1')).toBeInTheDocument();
      });

      expect(screen.getByTestId('status-update-app-1')).toBeInTheDocument();
    });

    it('should call updateApplicationStatus when status is changed', async () => {
      const updatedApp = {
        ...mockApplications[0],
        status: 'accepted' as const,
        respondedAt: '2025-11-17T13:00:00.000Z',
      };

      mockGetApplicationsByBusiness.mockResolvedValueOnce([mockApplications[0]]);
      mockUpdateApplicationStatus.mockResolvedValueOnce(updatedApp);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-update-app-1')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('status-update-app-1');
      await userEvent.selectOptions(statusSelect, 'accepted');

      await waitFor(() => {
        expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-1', 'accepted');
      });
    });

    it('should handle status update to rejected', async () => {
      const updatedApp = {
        ...mockApplications[0],
        status: 'rejected' as const,
        respondedAt: '2025-11-17T13:00:00.000Z',
      };

      mockGetApplicationsByBusiness.mockResolvedValueOnce([mockApplications[0]]);
      mockUpdateApplicationStatus.mockResolvedValueOnce(updatedApp);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-update-app-1')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('status-update-app-1');
      await userEvent.selectOptions(statusSelect, 'rejected');

      await waitFor(() => {
        expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-1', 'rejected');
      });
    });

    it('should handle status update to pending', async () => {
      const updatedApp = {
        ...mockApplications[1],
        status: 'pending' as const,
        respondedAt: null,
      };

      mockGetApplicationsByBusiness.mockResolvedValueOnce([mockApplications[1]]);
      mockUpdateApplicationStatus.mockResolvedValueOnce(updatedApp);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-update-app-2')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('status-update-app-2');
      await userEvent.selectOptions(statusSelect, 'pending');

      await waitFor(() => {
        expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-2', 'pending');
      });
    });

    it('should disable status update controls while mutation is pending', async () => {
      let resolveUpdate: (value: Application) => void;
      const updatePromise = new Promise<Application>((resolve) => {
        resolveUpdate = resolve;
      });

      mockGetApplicationsByBusiness.mockResolvedValueOnce([mockApplications[0]]);
      mockUpdateApplicationStatus.mockReturnValueOnce(updatePromise);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-update-app-1')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('status-update-app-1');
      await userEvent.selectOptions(statusSelect, 'accepted');

      await waitFor(() => {
        expect(statusSelect).toBeDisabled();
      });

      await act(async () => {
        resolveUpdate({
          ...mockApplications[0],
          status: 'accepted',
          respondedAt: '2025-11-17T13:00:00.000Z',
        });
      });
    });

    it('should handle status update errors gracefully', async () => {
      const error = new Error('Failed to update status');
      mockGetApplicationsByBusiness.mockResolvedValueOnce([mockApplications[0]]);
      mockUpdateApplicationStatus.mockRejectedValueOnce(error);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('status-update-app-1')).toBeInTheDocument();
      });

      const statusSelect = screen.getByTestId('status-update-app-1');
      await userEvent.selectOptions(statusSelect, 'accepted');

      await waitFor(() => {
        expect(mockUpdateApplicationStatus).toHaveBeenCalled();
      });

      // Error should be handled (component should still be functional)
      expect(screen.getByTestId('applications-list')).toBeInTheDocument();
    });
  });

  describe('Table Display', () => {
    it('should render applications in a table structure', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('applications-table')).toBeInTheDocument();
      });
    });

    it('should display table headers', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Applicant')).toBeInTheDocument();
        expect(screen.getByText('Job')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Applied Date')).toBeInTheDocument();
      });
    });

    it('should render each application as a table row', async () => {
      mockGetApplicationsByBusiness.mockResolvedValueOnce(mockApplications);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('application-row-app-1')).toBeInTheDocument();
        expect(screen.getByTestId('application-row-app-2')).toBeInTheDocument();
        expect(screen.getByTestId('application-row-app-3')).toBeInTheDocument();
      });
    });
  });
});

