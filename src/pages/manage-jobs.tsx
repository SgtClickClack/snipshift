import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchMyJobs, fetchJobApplications, updateApplicationStatus, updateJobStatus, MyJob, JobApplication } from '@/lib/api';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Clock, DollarSign, Users, Briefcase, CheckCircle2, XCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusBadge(status: MyJob['status']) {
  switch (status) {
    case 'open':
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Open
        </Badge>
      );
    case 'filled':
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          Filled
        </Badge>
      );
    case 'closed':
      return (
        <Badge className="bg-steel-50 text-steel-700 border-steel-200">
          Closed
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-purple-50 text-purple-700 border-purple-200">
          Completed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getApplicationStatusBadge(status: JobApplication['status']) {
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
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ManageJobsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: fetchMyJobs,
  });

  const { data: applications, isLoading: isLoadingApplications } = useQuery({
    queryKey: ['job-applications', selectedJobId],
    queryFn: () => fetchJobApplications(selectedJobId!),
    enabled: !!selectedJobId && isDialogOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: 'accepted' | 'rejected' }) =>
      updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      toast({
        title: 'Application status updated',
        description: 'The candidate has been notified.',
      });
      // Refresh applications and jobs list
      queryClient.invalidateQueries({ queryKey: ['job-applications', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const completeJobMutation = useMutation({
    mutationFn: (jobId: string) => updateJobStatus(jobId, 'completed'),
    onSuccess: () => {
      toast({
        title: 'Job marked as completed',
        description: 'Both parties have been notified to leave reviews.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to mark job as completed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleViewApplicants = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDialogOpen(true);
  };

  const handleApprove = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'accepted' });
  };

  const handleReject = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'rejected' });
  };

  const handleMarkCompleted = (jobId: string) => {
    if (window.confirm('Are you sure you want to mark this job as completed? This will notify both parties to leave reviews.')) {
      completeJobMutation.mutate(jobId);
    }
  };

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="card-chrome max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Jobs</h2>
            <p className="text-neutral-600 mb-4">Please try again later.</p>
            <Button onClick={() => navigate('/post-job')} variant="steel">
              Post a Job
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobsList = jobs || [];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-steel-900">My Listings</h1>
            <p className="text-steel-600 mt-1">Manage your job postings and review applicants</p>
          </div>
          <Button onClick={() => navigate('/post-job')} variant="steel">
            Post a Job
          </Button>
        </header>

        {jobsList.length === 0 ? (
          <Card className="card-chrome">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-16 w-16 mx-auto text-steel-400 mb-4" />
              <h2 className="text-xl font-bold text-steel-900 mb-2">No job listings yet</h2>
              <p className="text-steel-600 mb-6">Create your first job posting to start receiving applications.</p>
              <Button onClick={() => navigate('/post-job')} variant="steel">
                Post a Job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobsList.map((job) => (
              <Card key={job.id} className="card-chrome">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-steel-900 mb-1">
                            {job.title}
                          </h3>
                          {job.shopName && (
                            <p className="text-steel-600 mb-2">{job.shopName}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(job.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-steel-600 mb-4">
                        {job.date && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>{formatDate(job.date)}</span>
                            {job.startTime && job.endTime && (
                              <span className="text-steel-500">
                                • {job.startTime} - {job.endTime}
                              </span>
                            )}
                          </div>
                        )}
                        {job.payRate && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="font-semibold text-emerald-600">{job.payRate}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 flex-shrink-0" />
                          <span>
                            {job.applicationCount} {job.applicationCount === 1 ? 'applicant' : 'applicants'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(job.status === 'open' || job.status === 'filled') && (
                        <Button
                          onClick={() => handleMarkCompleted(job.id)}
                          disabled={completeJobMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Completed
                        </Button>
                      )}
                      <Button
                        onClick={() => handleViewApplicants(job.id)}
                        variant="steel"
                      >
                        View Applicants
                      </Button>
                      {job.status === 'completed' && (
                        <Button
                          onClick={() => navigate(`/review?jobId=${job.id}`)}
                          variant="steel"
                        >
                          Leave Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Applicants Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Applicants</DialogTitle>
              <DialogDescription>
                Review and manage applications for this job posting
              </DialogDescription>
            </DialogHeader>

            {isLoadingApplications ? (
              <div className="py-8 text-center text-steel-600">Loading applicants...</div>
            ) : !applications || applications.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-steel-400 mb-2" />
                <p className="text-steel-600">No applicants yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id} className="card-chrome">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-steel-900 mb-1">
                            {application.name}
                          </h4>
                          <p className="text-sm text-steel-600 mb-2">{application.email}</p>
                          <div className="flex items-center gap-2 text-xs text-steel-500">
                            <Clock className="h-3 w-3" />
                            <span>Applied {formatDate(application.appliedAt)}</span>
                          </div>
                        </div>
                        <div>
                          {getApplicationStatusBadge(application.status)}
                        </div>
                      </div>

                      {application.coverLetter && (
                        <div className="mb-4 overflow-hidden">
                          <p className="text-sm text-steel-700 whitespace-pre-wrap break-words bg-steel-50 p-3 rounded border border-steel-200">
                            {application.coverLetter}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        {application.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleApprove(application.id)}
                              disabled={updateStatusMutation.isPending}
                              variant="success"
                              size="sm"
                              className="flex-1"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(application.id)}
                              disabled={updateStatusMutation.isPending}
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        {application.userId && (
                          <Button
                            onClick={async () => {
                              try {
                                const res = await apiRequest('POST', '/api/conversations', {
                                  participant2Id: application.userId,
                                  jobId: selectedJobId,
                                });
                                const data = await res.json();
                                navigate(`/messages?conversation=${data.id}`);
                                setIsDialogOpen(false);
                              } catch (error) {
                                console.error('Failed to create conversation:', error);
                              }
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Candidate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

