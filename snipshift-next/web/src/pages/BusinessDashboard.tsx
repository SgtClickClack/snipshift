import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Job } from '../types';
import { apiRequest } from '../lib/apiRequest';

export default function BusinessDashboard() {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading, error } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: () => apiRequest<Job[]>('/api/jobs'),
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest<void>(`/api/jobs/${jobId}`, { method: 'DELETE' }),
    onSuccess: () => {
      // Invalidate and refetch jobs query after successful deletion
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleDelete = (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      deleteMutation.mutate(jobId);
    }
  };

  // Render job list with proper state handling
  const renderJobList = () => {
    if (isLoading) {
      return <p>Loading jobs...</p>;
    }

    if (error) {
      return <p>Error loading jobs</p>;
    }

    if (!jobs || jobs.length === 0) {
      return <div data-testid="no-jobs">No jobs posted yet.</div>;
    }

    return (
      <>
        {jobs.map((job) => {
          const isDeleting = deleteMutation.isPending && deleteMutation.variables === job.id;

          return (
            <div key={job.id}>
              <p>{job.title}</p>
              <p>{job.payRate}</p>
              <Link to={`/edit-job/${job.id}`}>
                <button data-testid="edit-job-button">
                  Edit
                </button>
              </Link>
              <button
                data-testid="delete-job-button"
                onClick={() => handleDelete(job.id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div>
      <h1>Business Dashboard</h1>
      <Link to="/create-job" data-testid="button-post-job">
        Post a Job
      </Link>
      <div data-testid="job-list-container">
        {renderJobList()}
      </div>
    </div>
  );
}

