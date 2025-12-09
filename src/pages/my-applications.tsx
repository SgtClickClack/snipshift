import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchMyApplications, createConversation, MyApplication } from '@/lib/api';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, Briefcase, Star } from 'lucide-react';

function getStatusBadge(status: MyApplication['status']) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          Pending
        </Badge>
      );
    case 'accepted':
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MyApplicationsPage() {
  const navigate = useNavigate();

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ['my-applications'],
    queryFn: fetchMyApplications,
  });

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="card-chrome max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Applications</h2>
            <p className="text-neutral-600 mb-4">Please try again later.</p>
            <Button onClick={() => navigate('/jobs')} className="steel-button">
              Find Shifts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const applicationsList = applications || [];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-steel-900">My Applications</h1>
          <p className="text-steel-600 mt-1">Track the status of your job applications</p>
        </header>

        {applicationsList.length === 0 ? (
          <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-16 w-16 mx-auto text-steel-400 mb-4" />
              <h2 className="text-xl font-bold text-steel-900 mb-2">You haven't applied for any jobs yet</h2>
              <p className="text-steel-600 mb-6">Start browsing available shifts and apply to find your next opportunity.</p>
              <Button onClick={() => navigate('/jobs')} className="steel-button">
                Find Shifts
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="space-y-4">
              {applicationsList.map((application) => (
                <Card
                  key={application.id}
                  className="card-chrome cursor-pointer transition-colors hover:border-primary"
                  onClick={() => {
                    if (application.jobId) {
                      navigate(`/jobs/${application.jobId}`);
                    } else {
                      // Handle orphaned application (job was deleted but application wasn't)
                      console.warn('Application has no jobId:', application.id);
                    }
                  }}
                >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-steel-900 mb-1">
                            {application.jobTitle || 'Unknown Position'}
                          </h3>
                          {application.shopName && (
                            <p className="text-steel-600 mb-3">{application.shopName}</p>
                          )}
                          {!application.jobId && (
                            <p className="text-xs text-amber-600 mt-1">⚠️ Original job may have been deleted</p>
                          )}
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(application.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-steel-600 mb-4">
                        {application.jobLocation && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span>{application.jobLocation}</span>
                          </div>
                        )}
                        {application.jobPayRate && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="font-semibold text-emerald-600">{application.jobPayRate}</span>
                          </div>
                        )}
                        {application.jobDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>{formatDate(application.jobDate)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>Applied {formatDate(application.appliedDate)}</span>
                        </div>
                      </div>

                      {application.respondedDate && (
                        <div className="text-xs text-steel-500 mt-2">
                          Response received: {formatDate(application.respondedDate)}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-steel-200 flex gap-2">
                        {application.status === 'accepted' && (
                          <Button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const conversation = await createConversation({
                                  participant2Id: application.businessId || '',
                                  jobId: application.jobId,
                                });
                                navigate(`/messages?conversation=${conversation.id}`);
                              } catch (error) {
                                console.error('Failed to create conversation:', error);
                              }
                            }}
                            className="steel-button"
                            variant="outline"
                            size="sm"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Employer
                          </Button>
                        )}
                        {application.status === 'accepted' && application.jobStatus === 'completed' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/review?jobId=${application.jobId}`);
                            }}
                            className="steel-button"
                            variant="outline"
                            size="sm"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Leave a Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

