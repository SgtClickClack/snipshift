import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicantCard } from '@/components/venues/ApplicantCard';
import { ApplicationActions } from '@/components/venues/ApplicationActions';
import { Inbox, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';

interface Worker {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
}

interface Shift {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  location: string | null;
  status: string;
}

interface ShiftApplication {
  id: string;
  shiftId: string;
  workerId: string;
  venueId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  createdAt: string;
  updatedAt: string;
  worker: Worker | null;
  shift: Shift | null;
}

/**
 * VenueApplicationsPage - Dashboard for venue owners to manage shift applications
 */
export default function VenueApplicationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Fetch applications
  const { data: applications = [], isLoading } = useQuery<ShiftApplication[]>({
    queryKey: ['venue-applications'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/venues/me/applications');
      if (!res.ok) {
        throw new Error('Failed to fetch applications');
      }
      return res.json();
    },
    enabled: !!user,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Accept application mutation
  const acceptMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await apiRequest('PATCH', `/api/shifts/applications/${applicationId}`, {
        status: 'accepted',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to accept application' }));
        throw new Error(error.message || 'Failed to accept application');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Accepted',
        description: 'The worker has been assigned to the shift.',
      });
      queryClient.invalidateQueries({ queryKey: ['venue-applications'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Accept',
        description: error.message || 'Failed to accept application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Reject application mutation
  const rejectMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await apiRequest('PATCH', `/api/shifts/applications/${applicationId}`, {
        status: 'rejected',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to reject application' }));
        throw new Error(error.message || 'Failed to reject application');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Rejected',
        description: 'The worker has been notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['venue-applications'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Reject',
        description: error.message || 'Failed to reject application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleViewProfile = (workerId: string) => {
    navigate(`/profile/${workerId}`);
  };

  const pendingApplications = applications.filter((app) => app.status === 'pending');
  const acceptedApplications = applications.filter((app) => app.status === 'accepted');
  const rejectedApplications = applications.filter((app) => app.status === 'rejected');

  if (isLoading) {
    return (
      <>
        <SEO title="Applications | Venue Dashboard" />
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Shift Applications | Venue Dashboard" />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Shift Applications</h1>
            <p className="text-muted-foreground">
              Review and manage applications from workers for your shifts
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{pendingApplications.length}</p>
                  </div>
                  <Inbox className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Accepted</p>
                    <p className="text-2xl font-bold">{acceptedApplications.length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold">{rejectedApplications.length}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingApplications.length})
              </TabsTrigger>
              <TabsTrigger value="accepted">
                Accepted ({acceptedApplications.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedApplications.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({applications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-6">
              {pendingApplications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending applications</p>
                  </CardContent>
                </Card>
              ) : (
                pendingApplications.map((application) => (
                  <div key={application.id} className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <ApplicantCard
                              application={application}
                              onViewProfile={handleViewProfile}
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <ApplicationActions
                              applicationId={application.id}
                              status={application.status}
                              onAccept={acceptMutation.mutateAsync}
                              onReject={rejectMutation.mutateAsync}
                              isProcessing={
                                acceptMutation.isPending || rejectMutation.isPending
                              }
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="accepted" className="space-y-4 mt-6">
              {acceptedApplications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No accepted applications</p>
                  </CardContent>
                </Card>
              ) : (
                acceptedApplications.map((application) => (
                  <ApplicantCard
                    key={application.id}
                    application={application}
                    onViewProfile={handleViewProfile}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4 mt-6">
              {rejectedApplications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No rejected applications</p>
                  </CardContent>
                </Card>
              ) : (
                rejectedApplications.map((application) => (
                  <ApplicantCard
                    key={application.id}
                    application={application}
                    onViewProfile={handleViewProfile}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4 mt-6">
              {applications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No applications yet</p>
                  </CardContent>
                </Card>
              ) : (
                applications.map((application) => (
                  <div key={application.id} className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <ApplicantCard
                              application={application}
                              onViewProfile={handleViewProfile}
                            />
                          </div>
                          {application.status === 'pending' && (
                            <div className="flex-shrink-0">
                              <ApplicationActions
                                applicationId={application.id}
                                status={application.status}
                                onAccept={acceptMutation.mutateAsync}
                                onReject={rejectMutation.mutateAsync}
                                isProcessing={
                                  acceptMutation.isPending || rejectMutation.isPending
                                }
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
