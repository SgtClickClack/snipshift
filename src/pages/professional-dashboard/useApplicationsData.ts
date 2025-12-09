/**
 * useApplicationsData Hook
 * 
 * Custom hook for fetching professional applications data from the API
 * Manages applications data, loading state, and error state with status filtering
 */

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Application } from '@/components/professional/ApplicationCard';

export type ApplicationStatusFilter = 'pending' | 'confirmed' | 'rejected' | undefined;

export interface UseApplicationsDataResult {
  applications: Application[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch professional applications data
 * 
 * @param statusFilter - Optional status filter ('pending', 'confirmed', 'rejected')
 *   - 'confirmed' maps to 'accepted' in the API
 *   - If undefined, returns all applications
 * @returns Object containing applications array, loading state, error state, and refetch function
 */
export function useApplicationsData(statusFilter?: ApplicationStatusFilter): UseApplicationsDataResult {
  // Build query parameters
  const queryParams = new URLSearchParams();
  
  if (statusFilter) {
    queryParams.append('status', statusFilter);
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/professional/applications${queryString ? `?${queryString}` : ''}`;

  // Use React Query to fetch data
  const { data, isLoading, error, refetch } = useQuery<Application[]>({
    queryKey: ['/api/professional/applications', statusFilter],
    queryFn: async () => {
      const response = await apiRequest('GET', endpoint);
      return response.json();
    },
  });

  return {
    applications: data || [],
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch();
    },
  };
}

