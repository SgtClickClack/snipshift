import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Job } from '../types';
import { apiRequest } from '../lib/apiRequest';
import ApplicationTrackingDashboard from '../components/ApplicationTrackingDashboard';

type TabView = 'jobs' | 'applications';

export default function BusinessDashboard() {
  const queryClient = useQueryClient();
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('jobs');

  const { data: jobs, isLoading, error } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: () => apiRequest<Job[]>('/api/jobs'),
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest<void>(`/api/jobs/${jobId}`, { method: 'DELETE' }),
    onSuccess: () => {
      // Clear any previous deletion errors
      setDeletionError(null);
      // Invalidate and refetch jobs query after successful deletion
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error: Error) => {
      // Handle deletion errors and provide user feedback
      setDeletionError(error.message || 'Failed to delete job. Please try again.');
      console.error('Job deletion failed:', error);
    },
  });

  const handleDelete = (jobId: string) => {
    // Clear any previous errors
    setDeletionError(null);
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
              <Link to={`/jobs/${job.id}/applications`} data-testid="button-view-applications">
                View Applications
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

      {/* Tab Navigation */}
      <div data-testid="dashboard-tabs" style={{ marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          data-testid="tab-jobs"
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: 'none',
            background: activeTab === 'jobs' ? '#007bff' : 'transparent',
            color: activeTab === 'jobs' ? 'white' : '#007bff',
            cursor: 'pointer',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            fontWeight: activeTab === 'jobs' ? 'bold' : 'normal',
          }}
        >
          Job Management
        </button>
        <button
          data-testid="tab-applications"
          onClick={() => setActiveTab('applications')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'applications' ? '#007bff' : 'transparent',
            color: activeTab === 'applications' ? 'white' : '#007bff',
            cursor: 'pointer',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            fontWeight: activeTab === 'applications' ? 'bold' : 'normal',
          }}
        >
          Application Tracking
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'jobs' && (
        <div data-testid="jobs-tab-content">
          <Link to="/create-job" data-testid="button-post-job">
            Post a Job
          </Link>
          {deletionError && (
            <div data-testid="deletion-error" style={{ color: 'red', margin: '10px 0' }}>
              {deletionError}
            </div>
          )}
          <div data-testid="job-list-container">
            {renderJobList()}
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div data-testid="applications-tab-content">
          <ApplicationTrackingDashboard />
        </div>
      )}
    </div>
  );
}

