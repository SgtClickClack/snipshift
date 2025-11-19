import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Job } from '../types';
import { apiRequest } from '../lib/apiRequest';
import { useAuth } from '../context/AuthContext';

interface JobFormProps {
  initialData?: Job;
  onSubmit?: (data: Omit<Job, 'id'>) => void; // Optional for backward compatibility
  isLoading?: boolean; // Optional for backward compatibility
  submitButtonText: string;
  submitButtonTestId: string;
}

export default function JobForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText,
  submitButtonTestId,
}: JobFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState('');
  const [payRate, setPayRate] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<{ field: string; message: string } | null>(null);

  // Check if user has insufficient credits (only disable if user exists and has credits <= 0)
  const hasInsufficientCredits = user ? (user.credits !== undefined && user.credits <= 0) : false;

  // Determine if we're in edit mode
  const isEditMode = !!initialData?.id;
  const jobId = initialData?.id;

  // Create mutation for new jobs
  const createMutation = useMutation({
    mutationFn: (newJob: Omit<Job, 'id'>) =>
      apiRequest<Job>('/api/jobs', {
        method: 'POST',
        body: newJob,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/business-dashboard');
    },
  });

  // Update mutation for editing jobs
  const updateMutation = useMutation({
    mutationFn: (updatedJob: Omit<Job, 'id'>) =>
      apiRequest<Job>(`/api/jobs/${jobId}`, {
        method: 'PUT',
        body: updatedJob,
      }),
    onSuccess: () => {
      // Invalidate the jobs query to force refetch and update the dashboard
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/business-dashboard');
    },
  });

  // Use the appropriate mutation's loading state
  const mutationLoading = isEditMode ? updateMutation.isPending : createMutation.isPending;
  const finalIsLoading = isLoading || mutationLoading;

  // Populate form fields when initialData is provided or changes
  useEffect(() => {
    if (initialData) {
      setJobTitle(initialData.title);
      setPayRate(String(initialData.payRate));
      setDescription(initialData.description || '');
      setDate(initialData.date || '');
      setStartTime(initialData.startTime || '');
      setEndTime(initialData.endTime || '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate job title
    if (!jobTitle) {
      setError({ field: 'title', message: 'Job title is required' });
      return;
    }

    // Validate pay rate
    if (!payRate || parseFloat(payRate) <= 0) {
      setError({ field: 'pay', message: 'Pay rate must be a positive number' });
      return;
    }

    // Validate job description
    if (!description) {
      setError({ field: 'description', message: 'Description is required' });
      return;
    }

    // Validate date
    if (!date) {
      setError({ field: 'date', message: 'Date is required' });
      return;
    }

    // Validate start time
    if (!startTime) {
      setError({ field: 'startTime', message: 'Start time is required' });
      return;
    }

    // Validate end time
    if (!endTime) {
      setError({ field: 'endTime', message: 'End time is required' });
      return;
    }

    // Validate time logic (end time must be after start time)
    if (startTime && endTime && startTime >= endTime) {
      setError({ field: 'timeLogic', message: 'End time must be after start time' });
      return;
    }

    // Clear any previous error if validation passes
    setError(null);

    // Prepare form data
    const formData = {
      title: jobTitle,
      payRate: payRate,
      description: description,
      date: date,
      startTime: startTime,
      endTime: endTime,
    };

    // If editing, use the update mutation
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      // If creating, use the create mutation
      createMutation.mutate(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="job-title">Job Title</label>
        <input
          id="job-title"
          data-testid="input-job-title"
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
        {error?.field === 'title' && (
          <p data-testid="error-message-job-title">{error.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="pay-rate">Pay Rate</label>
        <input
          id="pay-rate"
          data-testid="input-pay-rate"
          type="number"
          value={payRate}
          onChange={(e) => setPayRate(e.target.value)}
        />
        {error?.field === 'pay' && (
          <p data-testid="error-message-pay-rate">{error.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="job-description">Job Description</label>
        <textarea
          id="job-description"
          data-testid="textarea-job-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Job Description"
        />
        {error?.field === 'description' && (
          <p data-testid="error-message-job-description">{error.message}</p>
        )}
      </div>
      <div>
        <label>Date</label>
        <input
          data-testid="input-job-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {error?.field === 'date' && (
          <p data-testid="error-message-job-date">{error.message}</p>
        )}
      </div>
      <div>
        <label>Start Time</label>
        <input
          data-testid="input-start-time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        {error?.field === 'startTime' && (
          <p data-testid="error-message-start-time">{error.message}</p>
        )}
      </div>
      <div>
        <label>End Time</label>
        <input
          data-testid="input-end-time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        {error?.field === 'endTime' && (
          <p data-testid="error-message-end-time">{error.message}</p>
        )}
        {error?.field === 'timeLogic' && (
          <p data-testid="error-message-time-logic">{error.message}</p>
        )}
      </div>
      <button 
        type="submit" 
        data-testid={submitButtonTestId} 
        disabled={finalIsLoading || hasInsufficientCredits}
      >
        {finalIsLoading ? 'Submitting...' : submitButtonText}
      </button>
      {hasInsufficientCredits && (
        <p data-testid="error-insufficient-credits">
          You do not have enough credits to post a job.
        </p>
      )}
    </form>
  );
}

