import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobDetails, applyToJob, ApplicationData } from '@/lib/api';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Clock, DollarSign, ArrowLeft, CheckCircle2, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { ReportButton } from '@/components/report/report-button';

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [applicationState, setApplicationState] = useState<'idle' | 'applying' | 'applied'>('idle');

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJobDetails(id!),
    enabled: !!id,
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
    };

    applyMutation.mutate(applicationData);
  };

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="card-chrome max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Job Not Found</h2>
            <p className="text-neutral-600 mb-4">The job you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/jobs')} className="steel-button">
              Back to Job Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requirements = job.requirements || [];
  const hasLocation = job.lat && job.lng;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/jobs')}
          className="mb-4 text-steel-600 hover:text-steel-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>

        {/* Header Section */}
        <Card className="card-chrome mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-steel-900">{job.title}</h1>
                  {user && (
                    <ReportButton jobId={job.id} variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </ReportButton>
                  )}
                </div>
                {job.shopName && (
                  <p className="text-xl text-steel-600 mb-4">{job.shopName}</p>
                )}
                <div className="flex items-center gap-2 text-lg font-semibold text-emerald-600">
                  <DollarSign className="h-5 w-5" />
                  <span>{job.rate || job.payRate || 'Rate TBD'}</span>
                </div>
              </div>
            </div>

            {/* Key Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-steel-200">
              {job.location && (
                <div className="flex items-start gap-2 text-steel-600">
                  <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>{job.location}</span>
                </div>
              )}
              {(job.date || job.startTime || job.endTime) && (
                <div className="flex items-start gap-2 text-steel-600">
                  <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
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
        {job.description && (
          <Card className="card-chrome mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-steel-900 mb-4">Description</h2>
              <p className="text-steel-700 whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Requirements Section */}
        {requirements.length > 0 && (
          <Card className="card-chrome mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-steel-900 mb-4">Requirements</h2>
              <ul className="list-disc list-inside space-y-2 text-steel-700">
                {requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Map Section */}
        {hasLocation && (
          <Card className="card-chrome mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-steel-900 mb-4">Location</h2>
              <div className="h-64 rounded-lg overflow-hidden border border-steel-200">
                <GoogleMapView
                  jobs={[job]}
                  onJobSelect={() => {}}
                  selectedJob={job}
                  centerLocation={{ lat: job.lat!, lng: job.lng! }}
                  radius={50}
                  searchLocation={job.location || ''}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apply Button - Sticky on mobile, prominent on desktop */}
        <div className="sticky bottom-0 bg-neutral-50 border-t border-steel-200 p-4 -mx-4 md:static md:border-0 md:p-0 md:mt-6">
          <Card className="card-chrome md:shadow-lg">
            <CardContent className="p-6">
              {applicationState === 'applied' ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Application Submitted Successfully!</span>
                </div>
              ) : (
                <Button
                  onClick={handleApply}
                  disabled={applicationState === 'applying'}
                  className="w-full steel-button text-lg py-6"
                  size="lg"
                >
                  {applicationState === 'applying' ? 'Applying...' : 'Apply Now'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

