/**
 * Test Helpers for BusinessDashboard Tests
 * 
 * Common utilities to reduce duplication across test specs
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import BusinessDashboard from '../BusinessDashboard';
import { Job } from '../../types';

/**
 * Creates a QueryClient with test-friendly defaults
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
};

/**
 * Renders BusinessDashboard with necessary providers
 */
export const renderDashboard = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <BusinessDashboard />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Mock jobs data for testing
 */
export const mockJobs: Job[] = [
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

/**
 * Waits for jobs to load and be displayed
 */
export const waitForJobsToLoad = async (expectedJobTitle = 'Test Job 1') => {
  await waitFor(() => {
    expect(screen.getByText(expectedJobTitle)).toBeInTheDocument();
  });
};

/**
 * Sets up window.confirm mock and returns the mock function
 */
export const setupConfirmMock = (returnValue: boolean = true): jest.Mock => {
  const confirmMock = jest.fn(() => returnValue);
  window.confirm = confirmMock;
  return confirmMock;
};

/**
 * Common delete flow: wait for jobs, click delete button, handle confirmation
 */
export const deleteFirstJob = async (
  user: ReturnType<typeof userEvent.setup>,
  confirmMock: jest.Mock,
  jobTitle: string = 'Test Job 1'
) => {
  await waitForJobsToLoad(jobTitle);
  const deleteButtons = screen.getAllByTestId('delete-job-button');
  await act(async () => {
    await user.click(deleteButtons[0]);
  });
  return confirmMock;
};

/**
 * Sets up dashboard with jobs already loaded
 */
export const renderDashboardWithJobs = (
  jobs: Job[] = mockJobs,
  mockApiRequest: jest.MockedFunction<any>,
  queryClient?: QueryClient
) => {
  mockApiRequest.mockResolvedValueOnce(jobs);
  return renderDashboard(queryClient);
};

