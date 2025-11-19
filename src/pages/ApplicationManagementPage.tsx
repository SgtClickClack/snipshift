import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface Applicant {
  id: string;
  name: string;
  email: string;
  coverLetter: string;
  status?: string;
}

export default function ApplicationManagementPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();

  const { data: applicants, isLoading, error } = useQuery<Applicant[]>({
    queryKey: ['jobApplications', jobId],
    queryFn: () => apiRequest<Applicant[]>(`/api/jobs/${jobId}/applications`),
    enabled: !!jobId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: string }) =>
      apiRequest(`/api/applications/${applicationId}/status`, {
        method: 'PUT',
        body: { status },
      }),
    onMutate: async ({ applicationId, status }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['jobApplications', jobId] });

      // Snapshot the previous value
      const previousApplicants = queryClient.getQueryData<Applicant[]>(['jobApplications', jobId]);

      // Optimistically update to the new value
      if (previousApplicants) {
        queryClient.setQueryData<Applicant[]>(['jobApplications', jobId], (old) =>
          old?.map((applicant) =>
            applicant.id === applicationId ? { ...applicant, status } : applicant
          )
        );
      }

      // Return a context object with the snapshotted value
      return { previousApplicants };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousApplicants) {
        queryClient.setQueryData(['jobApplications', jobId], context.previousApplicants);
      }
    },
    // Note: We don't invalidate on success because we're using optimistic updates
    // The optimistic update already reflects the new state
  });

  const handleAccept = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'Accepted' });
  };

  const handleReject = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'Rejected' });
  };

  if (isLoading) {
    return <div data-testid="applicant-list">Loading applications...</div>;
  }

  if (error) {
    return <div data-testid="applicant-list">Error loading applications</div>;
  }

  if (!applicants || applicants.length === 0) {
    return <div data-testid="applicant-list">No applications yet.</div>;
  }

  return (
    <div data-testid="applicant-list">
      {applicants.map((applicant, index) => (
        <div key={applicant.id} data-testid={`applicant-card-${index + 1}`}>
          <div data-testid={`applicant-name-${index + 1}`}>{applicant.name}</div>
          <p data-testid={`applicant-status-${index + 1}`}>Status: {applicant.status || 'Pending'}</p>
          <p>Cover Letter:</p>
          <p>{applicant.coverLetter}</p>
          <button
            data-testid={`button-accept-app-${index + 1}`}
            onClick={() => handleAccept(applicant.id)}
            disabled={updateStatusMutation.isPending}
          >
            Accept
          </button>
          <button
            data-testid={`button-reject-app-${index + 1}`}
            onClick={() => handleReject(applicant.id)}
            disabled={updateStatusMutation.isPending}
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}

