/**
 * ApplicationTrackingDashboard Component
 * 
 * Displays and manages job applications for the business user.
 * Provides filtering by status and status update functionality.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApplicationsByBusiness,
  updateApplicationStatus,
  Application,
} from '../services/api/applicationService';
import { formatDate } from '../utils/date-utils';

type StatusFilter = 'All' | 'pending' | 'accepted' | 'rejected';

export default function ApplicationTrackingDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  // Fetch applications with optional status filter
  const {
    data: applications,
    isLoading,
    error,
  } = useQuery<Application[]>({
    queryKey: ['applications', statusFilter === 'All' ? undefined : statusFilter],
    queryFn: () =>
      getApplicationsByBusiness(statusFilter === 'All' ? undefined : statusFilter),
  });

  // Mutation for updating application status
  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: 'pending' | 'accepted' | 'rejected' }) =>
      updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      // Invalidate and refetch applications after status update
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error: Error) => {
      console.error('Failed to update application status:', error);
      // Error handling is done at the UI level
    },
  });

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilter = event.target.value as StatusFilter;
    setStatusFilter(newFilter);
  };

  const handleStatusUpdate = (applicationId: string, newStatus: 'pending' | 'accepted' | 'rejected') => {
    updateStatusMutation.mutate({ applicationId, status: newStatus });
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="applications-loading">
        <p>Loading applications...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div data-testid="applications-error">
        <p>Error loading applications. Please try again later.</p>
      </div>
    );
  }

  // Empty state
  if (!applications || applications.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="status-filter-select">Filter by Status: </label>
          <select
            id="status-filter-select"
            data-testid="status-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="All">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div data-testid="empty-applications">
          <p>No applications found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Application Tracking Dashboard</h1>

      {/* Status Filter */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="status-filter-select">Filter by Status: </label>
        <select
          id="status-filter-select"
          data-testid="status-filter"
          value={statusFilter}
          onChange={handleStatusFilterChange}
        >
          <option value="All">All</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Applications Table */}
      <div data-testid="applications-list">
        <table data-testid="applications-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #ddd' }}>
                Applicant
              </th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #ddd' }}>
                Job
              </th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #ddd' }}>
                Status
              </th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #ddd' }}>
                Applied Date
              </th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #ddd' }}>
                Update Status
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr
                key={application.id}
                data-testid={`application-row-${application.id}`}
                style={{ borderBottom: '1px solid #ddd' }}
              >
                <td style={{ padding: '10px' }}>
                  <div data-testid={`application-card-${application.id}`}>
                    <div style={{ fontWeight: 'bold' }}>
                      {application.name || 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      {application.email || 'N/A'}
                    </div>
                    {application.coverLetter && (
                      <details style={{ marginTop: '5px' }}>
                        <summary style={{ cursor: 'pointer', fontSize: '0.9em' }}>
                          View Cover Letter
                        </summary>
                        <p style={{ marginTop: '5px', fontSize: '0.85em' }}>
                          {application.coverLetter}
                        </p>
                      </details>
                    )}
                  </div>
                </td>
                <td style={{ padding: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {application.jobTitle || 'N/A'}
                    </div>
                    {application.jobPayRate && (
                      <div style={{ fontSize: '0.9em', color: '#666' }}>
                        ${application.jobPayRate}/hr
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '10px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85em',
                      fontWeight: 'bold',
                      backgroundColor:
                        application.status === 'accepted'
                          ? '#d4edda'
                          : application.status === 'rejected'
                          ? '#f8d7da'
                          : '#fff3cd',
                      color:
                        application.status === 'accepted'
                          ? '#155724'
                          : application.status === 'rejected'
                          ? '#721c24'
                          : '#856404',
                    }}
                  >
                    {application.status || 'pending'}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  {application.appliedDate
                    ? formatDate(application.appliedDate)
                    : 'N/A'}
                </td>
                <td style={{ padding: '10px' }}>
                  <select
                    data-testid={`status-update-${application.id}`}
                    value={application.status || 'pending'}
                    onChange={(e) =>
                      handleStatusUpdate(
                        application.id,
                        e.target.value as 'pending' | 'accepted' | 'rejected'
                      )
                    }
                    disabled={updateStatusMutation.isPending}
                    style={{ padding: '5px', minWidth: '120px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

