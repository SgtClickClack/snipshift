import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/loading/loading-spinner';
import { ApplicationCard, Application } from '@/components/professional/ApplicationCard';
import { FileText, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useApplicationsData, ApplicationStatusFilter } from './useApplicationsData';

/**
 * ApplicationsView Component
 * 
 * Main view for professionals to view, filter, and manage their job applications.
 * Features:
 * - Status Filter/Tab Bar (Pending, Confirmed, Rejected/Archived)
 * - Application List with Loading and Empty states
 * - Individual Application Cards
 * 
 * @component
 */
export default function ApplicationsView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'rejected'>('pending');

  // Map active tab to API status filter
  // 'confirmed' in UI maps to 'confirmed' in API (which maps to 'accepted' in DB)
  const statusFilter: ApplicationStatusFilter = activeTab === 'pending' || activeTab === 'confirmed' || activeTab === 'rejected' 
    ? activeTab 
    : undefined;

  // Fetch filtered applications for the current tab
  const { applications: filteredApplications, isLoading, error, refetch: refetchFiltered } = useApplicationsData(statusFilter);

  // Fetch all applications (no filter) to get counts for all tabs
  const { applications: allApplications, refetch: refetchAll } = useApplicationsData(undefined);

  // Calculate status counts from all applications
  const statusCounts = useMemo(() => {
    if (!allApplications) return { pending: 0, confirmed: 0, rejected: 0 };
    
    return {
      pending: allApplications.filter(app => app.status === 'pending').length,
      confirmed: allApplications.filter(app => app.status === 'accepted').length,
      rejected: allApplications.filter(app => app.status === 'rejected').length,
    };
  }, [allApplications]);

  const handleViewDetails = (jobId: string) => {
    // TODO: Navigate to job details page
    navigate(`/jobs/${jobId}`);
  };

  const handleMessage = (application: Application) => {
    // TODO: Navigate to messaging with business
    if (application.businessId) {
      navigate(`/messages?businessId=${application.businessId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="applications-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Title */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" data-testid="applications-title">My Applications</h1>
          <p className="text-muted-foreground mt-2">
            View and manage the status of shifts you have applied for
          </p>
        </header>

        {/* Status Filter/Tab Bar */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'pending' | 'confirmed' | 'rejected')}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({statusCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="confirmed" data-testid="tab-confirmed">
              Confirmed ({statusCounts.confirmed})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected/Archived ({statusCounts.rejected})
            </TabsTrigger>
          </TabsList>

          {/* Application List Area */}
          <TabsContent value="pending" className="mt-0">
            {isLoading ? (
              // Loading State
              <Card>
                <CardContent className="p-12">
                  <LoadingSpinner size="lg" />
                  <p className="text-center text-muted-foreground mt-4">
                    Loading your applications...
                  </p>
                </CardContent>
              </Card>
            ) : error ? (
              // Error State
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-destructive/10 rounded-full p-4 mb-4">
                      <FileText className="h-12 w-12 text-destructive" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Error loading applications
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      {error.message || 'An error occurred while fetching your applications. Please try again later.'}
                    </p>
                    <Button onClick={() => { refetchFiltered(); refetchAll(); }}>
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : filteredApplications.length === 0 ? (
              // Empty State
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-muted rounded-full p-4 mb-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No pending applications
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      You have not applied for any shifts yet. Start browsing available shifts to find your next opportunity.
                    </p>
                    <Button onClick={() => navigate('/job-feed')}>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Browse Available Shifts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Application List
              <div className="space-y-4">
                {filteredApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onViewDetails={handleViewDetails}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-0">
            {isLoading ? (
              <Card>
                <CardContent className="p-12">
                  <LoadingSpinner size="lg" />
                  <p className="text-center text-muted-foreground mt-4">
                    Loading your applications...
                  </p>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-destructive/10 rounded-full p-4 mb-4">
                      <FileText className="h-12 w-12 text-destructive" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Error loading applications
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      {error.message || 'An error occurred while fetching your applications. Please try again later.'}
                    </p>
                    <Button onClick={() => { refetchFiltered(); refetchAll(); }}>
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-muted rounded-full p-4 mb-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No confirmed applications
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Your confirmed shifts will appear here once applications are accepted.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onViewDetails={handleViewDetails}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-0">
            {isLoading ? (
              <Card>
                <CardContent className="p-12">
                  <LoadingSpinner size="lg" />
                  <p className="text-center text-muted-foreground mt-4">
                    Loading your applications...
                  </p>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-destructive/10 rounded-full p-4 mb-4">
                      <FileText className="h-12 w-12 text-destructive" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Error loading applications
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      {error.message || 'An error occurred while fetching your applications. Please try again later.'}
                    </p>
                    <Button onClick={() => { refetchFiltered(); refetchAll(); }}>
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="bg-muted rounded-full p-4 mb-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No rejected or archived applications
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Rejected or archived applications will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onViewDetails={handleViewDetails}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

