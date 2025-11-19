import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { Job } from '../types';
import ApplicationForm from '../components/ApplicationForm';

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  
  // State for the application form
  type FormState = 'idle' | 'applying' | 'success';
  const [formState, setFormState] = useState<FormState>('idle');

  const {
    data: job,
    isLoading,
    error,
  } = useQuery<Job>({
    queryKey: ['job', jobId], // Unique query key for this job
    queryFn: () => apiRequest<Job>(`/api/jobs/${jobId}`),
    enabled: !!jobId, // Only run query if jobId is present
  });

  if (isLoading) {
    return <div data-testid="loading-job">Loading...</div>;
  }

  if (error) {
    return <div data-testid="error-job">Error: {error.message}</div>;
  }

  if (!job) {
    return <div data-testid="not-found">Job not found.</div>;
  }


  return (
    <div>
      <Link to="/">&larr; Back to Job List</Link>

      <article data-testid="job-detail-page" style={{ marginTop: '20px' }}>
        <h1>{job.title}</h1>
        <h2>Pay Rate: ${job.payRate} / hour</h2>
        <p>{job.description}</p>
      </article>

      <hr style={{ margin: '20px 0' }} />

      {/* --- IMPLEMENTATION START --- */}
      
      {/* 1. Success Message */}
      {formState === 'success' && (
        <div data-testid="application-success-message" style={{ color: 'green', fontWeight: 'bold' }}>
          Application submitted successfully!
        </div>
      )}

      {/* 2. Show "Apply" button or the Form */}
      {formState === 'idle' && (
        <button
          data-testid="apply-now-button"
          onClick={() => setFormState('applying')}
        >
          Apply Now
        </button>
      )}

      {formState === 'applying' && (
        <ApplicationForm
          jobId={job.id}
          onApplicationSuccess={() => setFormState('success')}
        />
      )}
      
      {/* --- IMPLEMENTATION END --- */}
    </div>
  );
}

