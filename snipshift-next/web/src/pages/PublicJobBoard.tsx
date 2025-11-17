import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { Job } from '../types';
import PublicJobCard from '../components/PublicJobCard';

export default function PublicJobBoard() {
  const {
    data: jobs,
    isLoading,
    error,
  } = useQuery<Job[]>({
    queryKey: ['publicJobs'], // Use a different key from business dashboard
    queryFn: () => apiRequest<Job[]>('/api/jobs'),
  });

  if (isLoading) {
    return <div data-testid="loading-jobs">Loading jobs...</div>;
  }

  if (error) {
    return <div data-testid="error-jobs">Error: {error.message}</div>;
  }

  if (!jobs || jobs.length === 0) {
    return <div data-testid="no-jobs">No jobs available right now.</div>;
  }

  return (
    <div>
      <h1>Public Job Board</h1>
      {/* This is the test-id the test is looking for */}
      <div data-testid="public-job-list">
        {jobs.map((job) => (
          <PublicJobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

