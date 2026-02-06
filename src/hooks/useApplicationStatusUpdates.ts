/**
 * useApplicationStatusUpdates Hook
 * 
 * Custom hook for fetching application status update history
 */

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export type StatusUpdateType = 
  | 'Submitted' 
  | 'Viewed' 
  | 'Shortlisted' 
  | 'Needs Info' 
  | 'Under Review' 
  | 'Accepted' 
  | 'Rejected';

export interface ApplicationStatusUpdate {
  id: string;
  timestamp: string;
  statusType: StatusUpdateType;
  message?: string;
}

export interface UseApplicationStatusUpdatesResult {
  updates: ApplicationStatusUpdate[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch application status updates
 * 
 * @param applicationId - The ID of the application to fetch updates for
 * @returns Object containing updates array, loading state, error state, and refetch function
 */
export function useApplicationStatusUpdates(applicationId: string | null): UseApplicationStatusUpdatesResult {
  const { data, isLoading, error, refetch } = useQuery<ApplicationStatusUpdate[]>({
    queryKey: ['/api/professional/applications', applicationId, 'updates'],
    queryFn: async () => {
      if (!applicationId) {
        throw new Error('Application ID is required');
      }
      const response = await apiRequest('GET', `/api/professional/applications/${applicationId}/updates`);
      return response.json();
    },
    enabled: !!applicationId, // Only fetch when applicationId is provided
  });

  return {
    updates: data || [],
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch();
    },
  };
}
