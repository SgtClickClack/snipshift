import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Job } from '../types';
import { apiRequest } from '../lib/apiRequest';
import JobForm from '../components/JobForm';

export default function EditJobPage() {
  const { jobId } = useParams<{ jobId: string }>();

  // Fetch the job data
  const { data: job, isLoading, error: fetchError } = useQuery<Job>({
    queryKey: ['job', jobId],
    queryFn: () => apiRequest<Job>(`/api/jobs/${jobId}`),
    enabled: !!jobId,
  });

  if (isLoading) {
    return <div>Loading job...</div>;
  }

  if (fetchError || !job) {
    return <div>Error loading job or job not found</div>;
  }

  return (
    <div>
      <h1>Edit Job</h1>
      <div data-testid="edit-job-form">
        <JobForm
          initialData={job}
          submitButtonText="Update Job"
          submitButtonTestId="edit-job-submit"
        />
      </div>
    </div>
  );
}

