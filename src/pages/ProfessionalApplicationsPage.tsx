import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { formatDate } from '../utils/date-utils';

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  jobPayRate: string;
  jobLocation: string;
  jobDescription: string;
  status: string;
  appliedDate: string;
  respondedDate: string | null;
  respondedAt: string | null;
}

export default function ProfessionalApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const queryClient = useQueryClient();
  
  const { data: applications, isLoading, error } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: () => apiRequest<Application[]>('/api/applications'),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  };

  if (isLoading) {
    return <div data-testid="applications-loading">Loading applications...</div>;
  }

  if (error) {
    return <div data-testid="applications-error">Error loading applications</div>;
  }

  if (!applications || applications.length === 0) {
    return <div data-testid="empty-applications">No applications yet.</div>;
  }

  // Filter applications based on selected status
  const filteredApplications = statusFilter === 'All'
    ? applications
    : applications.filter((app) => app.status === statusFilter);

  return (
    <div>
      {/* Filter Buttons */}
      <div>
        <button
          data-testid="filter-status-All"
          onClick={() => setStatusFilter('All')}
        >
          All
        </button>
        <button
          data-testid="filter-status-Pending"
          onClick={() => setStatusFilter('Pending')}
        >
          Pending
        </button>
        <button
          data-testid="filter-status-Accepted"
          onClick={() => setStatusFilter('Accepted')}
        >
          Accepted
        </button>
        <button
          data-testid="filter-status-Rejected"
          onClick={() => setStatusFilter('Rejected')}
        >
          Rejected
        </button>
        <button
          data-testid="refresh-applications"
          onClick={handleRefresh}
        >
          Refresh
        </button>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div data-testid="empty-filtered-applications">No applications found.</div>
      ) : (
        <div data-testid="applications-list">
          {filteredApplications.map((application) => (
            <div key={application.id} data-testid={`application-card-${application.id}`}>
              <h2>{application.jobTitle}</h2>
              <p>${application.jobPayRate} / hour</p>
              <p>{application.jobLocation}</p>
              {application.respondedAt && (
                <p>Reviewed on: {formatDate(application.respondedAt)}</p>
              )}
              <div data-testid={`application-status-${application.id}`}>
                Status: {application.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

