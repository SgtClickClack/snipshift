/**
 * Application Service
 * 
 * Service functions for managing job applications in the Application Tracking Dashboard.
 * Provides functions for fetching applications and updating application status.
 */

import { apiRequest } from '../../lib/apiRequest';

/**
 * Application interface matching the API response
 */
export interface Application {
  id: string;
  jobId: string;
  name?: string;
  email?: string;
  coverLetter?: string;
  jobTitle?: string;
  jobPayRate?: string;
  jobLocation?: string;
  jobDescription?: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedDate: string;
  respondedDate: string | null;
  respondedAt: string | null;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Fetches applications submitted for the current business user's jobs.
 * 
 * @param statusFilter - Optional status filter ('pending', 'accepted', 'rejected')
 * @param pagination - Optional pagination options (page and limit)
 * @returns Promise resolving to an array of applications
 * @throws Error if the API request fails
 */
export async function getApplicationsByBusiness(
  statusFilter?: string,
  pagination?: PaginationOptions
): Promise<Application[]> {
  const queryParams: string[] = [];

  if (statusFilter) {
    queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
  }

  if (pagination) {
    const offset = (pagination.page - 1) * pagination.limit;
    queryParams.push(`offset=${offset}`);
    queryParams.push(`limit=${pagination.limit}`);
  }

  // Build query string if we have params
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  const endpoint = `/api/applications${queryString}`;

  // For now, we'll use the existing endpoint structure
  // In the future, this can be extended to filter by businessId when backend supports it
  return apiRequest<Application[]>(endpoint);
}

/**
 * Updates an application's status.
 * 
 * @param applicationId - The ID of the application to update
 * @param newStatus - The new status ('pending', 'accepted', 'rejected')
 * @returns Promise resolving to the updated application
 * @throws Error if the API request fails
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: 'pending' | 'accepted' | 'rejected'
): Promise<Application> {
  return apiRequest<Application>(`/api/applications/${applicationId}/status`, {
    method: 'PUT',
    body: { status: newStatus },
  });
}

