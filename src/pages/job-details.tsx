import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobDetails, applyToJob, ApplicationData } from '@/lib/api';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Clock, DollarSign, ArrowLeft, CheckCircle2, Flag, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { ReportButton } from '@/components/report/report-button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SEO } from "@/components/seo/SEO";

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [applicationState, setApplicationState] = useState<'idle' | 'applying' | 'applied'>('idle');
  const [isSaved, setIsSaved] = useState(false);

  const toggleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: !isSaved ? "Job Saved" : "Job Removed from Saved",
      description: !isSaved ? "This job has been added to your saved jobs." : "This job has been removed from your saved jobs.",
    });
  };

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJobDetails(id!),
    enabled: !!id,
    retry: false // Don't retry on 404s
  });

  const applyMutation = useMutation({
    mutationFn: (applicationData: ApplicationData) => applyToJob(id!, applicationData),
    onSuccess: () => {
      setApplicationState('applied');
      toast({
        title: 'Application submitted!',
        description: 'Your application has been sent successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Application failed',
        description: error.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
      setApplicationState('idle');
    },
  });

  const handleApply = () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to apply for this job.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    setApplicationState('applying');
    
    const applicationData: ApplicationData = {
      name: user.displayName || user.name || user.email || '',
      email: user.email || '',
      coverLetter: `I am interested in applying for the ${job?.title} position at ${job?.shopName || 'this location'}.`,
      type: job?.type || 'shift' // Pass the type to the application function
    };

    applyMutation.mutate(applicationData);
  };

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  // Guard clause: check if ID is missing or job fetch failed
  if (!id || error || !job) {
    // Silent error handling for production
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="job-not-found">
        <Card className="card-chrome max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-error mb-2">Job Not Found</h2>
            <p className="text-muted-foreground mb-4">The job you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/jobs')}>
              Back to Job Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requirements = Array.isArray(job.requirements) ? job.requirements : [];
  const hasLocation = typeof job.lat === 'number' && typeof job.lng === 'number';

  return (
    <ErrorBoundary>
      <SEO 
        title={job?.title || 'Job Details'} 
        description={job?.description}
        type="article"
      />
      <div className="min-h-screen bg-gray-50 overflow-x-hidden" data-testid="job-details-page">
        <div className="max-w-4xl mx-auto px-4 py-6 w-full max-w-full">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/jobs')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feed
          </Button>

          {/* Header Section */}
          <Card className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2 min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground break-words overflow-hidden flex-1 min-w-0">{job?.title}</h1>
                    {user && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={toggleSave}
                          data-testid="button-save-job"
                        >
                          <Heart className={`h-6 w-6 ${isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <ReportButton 
                          jobId={job?.id} 
                          variant="outline" 
                          size="sm" 
                          className="text-error border-error hover:bg-error/10"
                        />
                      </div>
                    )}
                  </div>
                  {job?.shopName && (
                    <p className="text-xl text-muted-foreground mb-4 break-words overflow-hidden">{job.shopName}</p>
                  )}
                  <div className="flex items-center gap-2 text-lg font-semibold text-success">
                    <DollarSign className="h-5 w-5" />
                    <span>{job?.rate || job?.payRate || 'Rate TBD'}</span>
                  </div>
                </div>
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                {job?.location && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">{job.location}</span>
                  </div>
                )}
                {(job?.date || job?.startTime || job?.endTime) && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="break-words overflow-hidden">
                      {job.date && <div>{job.date}</div>}
                      {job.startTime && job.endTime && (
                        <div className="text-sm">{job.startTime} - {job.endTime}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description Section */}
          {job?.description && (
            <Card className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Requirements Section */}
          {requirements.length > 0 && (
            <Card className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Requirements</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {requirements.map((req, index) => (
                    <li key={`${req.substring(0, 20)}-${index}`}>{req}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Map Section */}
          {hasLocation && (
            <Card className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Location</h2>
                <div className="h-64 rounded-lg overflow-hidden border border-border">
                  <ErrorBoundary>
                    <GoogleMapView
                      jobs={[job]}
                      onJobSelect={() => {}}
                      selectedJob={job}
                      centerLocation={{ lat: job.lat!, lng: job.lng! }}
                      radius={50}
                      searchLocation={job.location || ''}
                    />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Apply Button - Sticky on mobile, prominent on desktop */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-border p-4 -mx-4 md:static md:border-0 md:p-0 md:mt-6 overflow-x-hidden" data-testid="job-apply-container">
            <Card className="bg-white rounded-lg border border-gray-200 shadow-sm md:shadow-lg">
              <CardContent className="p-6">
                {applicationState === 'applied' ? (
                  <div className="flex items-center justify-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Application Submitted Successfully!</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleApply}
                    disabled={applicationState === 'applying'}
                    className="w-full text-lg py-6"
                    size="lg"
                    data-testid="button-apply"
                  >
                    {applicationState === 'applying' ? 'Applying...' : 'Apply Now'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
