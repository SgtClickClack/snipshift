/**
 * useWithdrawApplication Hook
 * 
 * Custom mutation hook for withdrawing a pending job application
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/useToast';

/**
 * Custom hook to withdraw a pending application
 * 
 * @returns Mutation object with mutate function and loading/error states
 */
export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await apiRequest('POST', `/api/professional/applications/${applicationId}/withdraw`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Withdrawn',
        description: 'Your application has been withdrawn successfully.',
      });
      
      // Invalidate applications queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/professional/applications'] });
      // Also invalidate the general applications endpoint if used elsewhere
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to withdraw application. Please try again.';
      toast({
        title: 'Withdrawal Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}
