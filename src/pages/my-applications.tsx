import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchMyApplications, createConversation } from '@/lib/api';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, DollarSign, Briefcase, MessageSquare, Eye, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type ApplicationStatus = 
  | 'pending' 
  | 'shortlisted' 
  | 'interviewing' 
  | 'rejected' 
  | 'withdrawn' 
  | 'expired';

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  shopName: string;
  shopAvatar?: string;
  jobPayRate: string;
  jobLocation?: string;
  jobDescription?: string;
  jobDate?: string;
  jobStartTime?: string;
  jobEndTime?: string;
  jobHours?: number;
  jobStatus?: 'open' | 'filled' | 'closed' | 'completed';
  status: ApplicationStatus;
  appliedDate: string;
  respondedDate?: string | null;
  businessId?: string;
}

function getStatusBadge(status: ApplicationStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          Waiting for review
        </Badge>
      );
    case 'shortlisted':
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          Salon is interested
        </Badge>
      );
    case 'interviewing':
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          Interviewing
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-muted text-muted-foreground border-border">
          Application unsuccessful
        </Badge>
      );
    case 'withdrawn':
      return (
        <Badge className="bg-muted text-muted-foreground border-border">
          Withdrawn
        </Badge>
      );
    case 'expired':
      return (
        <Badge className="bg-muted text-muted-foreground border-border">
          Expired
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

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ['my-applications'],
    queryFn: fetchMyApplications,
  });

  // Separate applications into active and past
  const { activeApplications, pastApplications } = useMemo(() => {
    if (!applications) return { activeApplications: [], pastApplications: [] };

    const active: Application[] = [];
    const past: Application[] = [];

    applications.forEach((app) => {
      if (app.status === 'pending' || app.status === 'shortlisted' || app.status === 'interviewing') {
        active.push(app as Application);
      } else {
        past.push(app as Application);
      }
    });

    return { activeApplications: active, pastApplications: past };
  }, [applications]);

  const handleWithdraw = async (applicationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement withdraw API call
    toast({
      title: 'Application Withdrawn',
      description: 'Your application has been withdrawn successfully.',
    });
  };

  const handleMessageSalon = async (application: Application, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!application.businessId) {
      toast({
        title: 'Error',
        description: 'Unable to message salon. Business information not available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const conversation = await createConversation({
        participant2Id: application.businessId,
        jobId: application.jobId,
      });
      navigate(`/messages?conversation=${conversation.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/jobs/${jobId}`);
  };

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-destructive mb-2">Error Loading Applications</h2>
            <p className="text-muted-foreground mb-4">Please try again later.</p>
            <Button onClick={() => navigate('/job-feed')}>
              Find Shifts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentApplications = activeTab === 'active' ? activeApplications : pastApplications;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground mt-1">Track the status of your job applications</p>
        </header>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'past')} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Active ({activeApplications.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
            {activeApplications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground mb-6">
                    <div className="bg-card p-4 rounded-full shadow-sm border border-border mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-bold text-foreground mb-2">No active applications</p>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                      You haven't applied for any jobs yet. Start browsing available shifts and apply to find your next opportunity.
                    </p>
                  </div>
                  <Button onClick={() => navigate('/job-feed')} size="lg">
                    <Search className="h-4 w-4 mr-2" />
                    Find Shifts
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onViewDetails={handleViewDetails}
                    onMessageSalon={handleMessageSalon}
                    onWithdraw={handleWithdraw}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            {pastApplications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <div className="bg-card p-4 rounded-full shadow-sm border border-border mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-bold text-foreground mb-2">No past applications</p>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Your past applications will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onViewDetails={handleViewDetails}
                    onMessageSalon={handleMessageSalon}
                    onWithdraw={handleWithdraw}
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

interface ApplicationCardProps {
  application: Application;
  onViewDetails: (jobId: string, e: React.MouseEvent) => void;
  onMessageSalon: (application: Application, e: React.MouseEvent) => void;
  onWithdraw: (applicationId: string, e: React.MouseEvent) => void;
}

function ApplicationCard({ application, onViewDetails, onMessageSalon, onWithdraw }: ApplicationCardProps) {
  const isActive = application.status === 'pending' || application.status === 'shortlisted' || application.status === 'interviewing';
  const canWithdraw = application.status === 'pending';
  const canMessage = application.status === 'shortlisted' || application.status === 'interviewing';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Salon Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={application.shopAvatar} alt={application.shopName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(application.shopName)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Application Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                  {application.jobTitle}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">{application.shopName}</p>
                <p className="text-xs text-muted-foreground">
                  Applied {formatRelativeDate(application.appliedDate)}
                </p>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(application.status)}
              </div>
            </div>

            {/* Rate & Hours */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              {application.jobPayRate && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold text-foreground">{application.jobPayRate}</span>
                </div>
              )}
              {application.jobHours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{application.jobHours} hours</span>
                </div>
              )}
              {application.jobLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{application.jobLocation}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => onViewDetails(application.jobId, e)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              {canMessage && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => onMessageSalon(application, e)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Salon
                </Button>
              )}
              {canWithdraw && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => onWithdraw(application.id, e)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
