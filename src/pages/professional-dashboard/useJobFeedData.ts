/**
 * useJobFeedData Hook
 * 
 * Custom hook for fetching job feed data from the API
 * Manages jobs data, loading state, and error state
 */

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { JobCardData } from './JobCard';

export interface JobFeedFilters {
  location?: string;
  minPayRate?: number;
  maxPayRate?: number;
  startDate?: string;
  endDate?: string;
  jobType?: 'bartender' | 'waiter' | 'chef' | 'barista' | 'other';
  limit?: number;
  offset?: number;
}

export interface UseJobFeedDataResult {
  jobs: JobCardData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch job feed data
 * 
 * @param filters - Optional filters for the job feed query
 * @returns Object containing jobs array, loading state, error state, and refetch function
 */
export function useJobFeedData(filters: JobFeedFilters = {}): UseJobFeedDataResult {
  // Build query parameters from filters
  const queryParams = new URLSearchParams();
  
  if (filters.location) {
    queryParams.append('location', filters.location);
  }
  if (filters.minPayRate !== undefined) {
    queryParams.append('minPayRate', filters.minPayRate.toString());
  }
  if (filters.maxPayRate !== undefined) {
    queryParams.append('maxPayRate', filters.maxPayRate.toString());
  }
  if (filters.startDate) {
    queryParams.append('startDate', filters.startDate);
  }
  if (filters.endDate) {
    queryParams.append('endDate', filters.endDate);
  }
  if (filters.jobType) {
    queryParams.append('jobType', filters.jobType);
  }
  if (filters.limit !== undefined) {
    queryParams.append('limit', filters.limit.toString());
  }
  if (filters.offset !== undefined) {
    queryParams.append('offset', filters.offset.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/professional/jobs${queryString ? `?${queryString}` : ''}`;

  // Use React Query to fetch data
  const { data, isLoading, error, refetch } = useQuery<JobCardData[]>({
    queryKey: ['/api/professional/jobs', filters],
    queryFn: async () => {
      const response = await apiRequest('GET', endpoint);
      return response.json();
    },
  });

  return {
    jobs: data || [],
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch();
    },
  };
}

