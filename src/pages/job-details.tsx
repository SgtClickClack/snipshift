import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { fetchJobDetails, ApplicationData, applyToJob } from '@/lib/api/shared';
import { fetchMyApplications } from '@/lib/api/professional';
import type { Job } from '@shared/firebase-schema';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Clock, DollarSign, ArrowLeft, CheckCircle2, Heart } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
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

  // TODO: Saved jobs feature - Currently using local state only
  // When backend API is implemented, this should:
  // 1. Call API to save/unsave job
  // 2. Use useMutation with invalidateQueries for ['saved-jobs'] query key
  // 3. Load initial saved state from API/query
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

  // Check if user has already applied to this job
  const { data: myApplications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: fetchMyApplications,
    enabled: !!user && !!id, // Only fetch if user is logged in and job ID exists
  });

  // Set application state to 'applied' if user has already applied
  useEffect(() => {
    if (myApplications && id && user) {
      const hasApplied = myApplications.some(app => app.jobId === id);
      if (hasApplied) {
        setApplicationState('applied');
      }
    }
  }, [myApplications, id, user]);

  const applyMutation = useMutation({
    mutationFn: (applicationData: ApplicationData) => applyToJob(id!, applicationData),
    onSuccess: () => {
      setApplicationState('applied');
      toast({
        title: 'Application submitted!',
        description: 'Your application has been sent successfully.',
      });
      // Invalidate job details to update button state
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      // Invalidate my applications list to show new application immediately
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (error: any) => {
      // Check if this is a 409 error (already applied)
      const errorMessage = error.message || '';
      const is409Error = errorMessage.startsWith('409:');
      
      if (is409Error) {
        // Extract the message from the error
        let message = 'You have already applied for this job.';
        try {
          // Try to parse JSON message first
          const jsonMatch = errorMessage.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.message) {
              message = parsed.message;
            }
          } else {
            // If no JSON, try to extract plain text after "409: "
            const textMatch = errorMessage.match(/409:\s*(.+)/);
            if (textMatch && textMatch[1]) {
              message = textMatch[1].trim();
            }
          }
        } catch {
          // If parsing fails, use default message
        }
        
        // Treat 409 as success - user has already applied
        setApplicationState('applied');
        toast({
          title: 'Already Applied',
          description: message,
          variant: 'default',
        });
        // Invalidate queries to ensure UI is in sync
        queryClient.invalidateQueries({ queryKey: ['job', id] });
        queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      } else {
        // Handle other errors normally
        toast({
          title: 'Application failed',
          description: error.message || 'Failed to submit application. Please try again.',
          variant: 'destructive',
        });
        setApplicationState('idle');
      }
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

    // Validate critical job fields before submitting to the API
    const hasRate = !!(job?.payRate || (job as any)?.rate);
    const hasDate = !!(job?.date || (job as any)?.startTime);
    const hasLocation = !!job?.location || (!!(job as any)?.city && !!(job as any)?.state);

    if (!hasRate || !hasDate || !hasLocation) {
      toast({
        title: 'Unable to apply',
        description: 'This job is missing required details (rate, date, or location).',
        variant: 'destructive',
      });
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

  // Build JSON-LD JobPosting schema for Google for Jobs
  // Must be called before early returns to satisfy React Hooks rules
  const jobPostingSchema = useMemo(() => {
    if (!job) return null;

    // Parse salary from rate/payRate
    const parseSalary = (rate?: string): { value?: number; currency?: string } | undefined => {
      if (!rate) return undefined;
      
      // Extract numeric value and currency
      const numericMatch = rate.match(/[\d,]+\.?\d*/);
      if (!numericMatch) return undefined;
      
      const value = parseFloat(numericMatch[0].replace(/,/g, ''));
      if (isNaN(value)) return undefined;
      
      // Default to AUD for Australian site
      const currency = rate.includes('$') ? 'AUD' : 'AUD';
      
      return { value, currency };
    };

    // Parse location into structured format
    const parseLocation = (): {
      '@type': string;
      address?: {
        '@type': string;
        addressLocality?: string;
        addressRegion?: string;
        addressCountry?: string;
        streetAddress?: string;
      };
    } | undefined => {
      if (!job.location && !job.city && !job.state) return undefined;

      const location: {
        '@type': string;
        address?: {
          '@type': string;
          addressLocality?: string;
          addressRegion?: string;
          addressCountry?: string;
          streetAddress?: string;
        };
      } = {
        '@type': 'Place',
      };

      if (job.city || job.state || job.location) {
        location.address = {
          '@type': 'PostalAddress',
          addressCountry: 'AU', // Default to Australia
        };

        if (job.city) {
          location.address.addressLocality = job.city;
        }
        if (job.state) {
          location.address.addressRegion = job.state;
        }
        if (job.address) {
          location.address.streetAddress = job.address;
        }
        
        // If location is a string, try to parse it
        if (typeof job.location === 'string' && !job.city && !job.state) {
          const parts = job.location.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            location.address.addressLocality = parts[0];
            location.address.addressRegion = parts[1];
          } else {
            location.address.addressLocality = job.location;
          }
        }
      }

      return location;
    };

    // Format dates for ISO 8601
    const formatDate = (dateStr?: string): string | undefined => {
      if (!dateStr) return undefined;
      
      try {
        // If it's already in ISO format, return as is
        if (dateStr.includes('T') || dateStr.includes('Z')) {
          return new Date(dateStr).toISOString();
        }
        
        // Try to parse and format
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // If parsing fails, return undefined
      }
      
      return undefined;
    };

    // Calculate validThrough (30 days from job date or createdAt, or use job date)
    const calculateValidThrough = (): string | undefined => {
      const baseDate = job.date || job.startTime;
      if (!baseDate) return undefined;
      
      try {
        const date = new Date(baseDate);
        if (!isNaN(date.getTime())) {
          // Set validThrough to 30 days after the job date
          date.setDate(date.getDate() + 30);
          return date.toISOString();
        }
      } catch {
        // If parsing fails, return undefined
      }
      
      return undefined;
    };

    const rateValue = job.rate ?? job.payRate ?? job.hourlyRate;
    const salary = parseSalary(typeof rateValue === 'number' ? rateValue.toString() : rateValue);
    const jobLocation = parseLocation();
    const datePosted = formatDate(job.date || job.startTime);
    const validThrough = calculateValidThrough();

    const schema: any = {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description || '',
      employmentType: 'CONTRACTOR',
      hiringOrganization: {
        '@type': 'Organization',
        name: job.shopName || 'HospoGo',
      },
    };

    if (datePosted) {
      schema.datePosted = datePosted;
    }

    if (validThrough) {
      schema.validThrough = validThrough;
    }

    if (jobLocation) {
      schema.jobLocation = jobLocation;
    }

    if (salary && salary.value) {
      schema.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: salary.currency || 'AUD',
        value: {
          '@type': 'QuantitativeValue',
          value: salary.value,
          unitText: 'HOUR',
        },
      };
    }

    // Add job identifier
    if (job.id) {
      schema.identifier = {
        '@type': 'PropertyValue',
        name: 'HospoGo',
        value: job.id,
      };
    }

    return schema;
  }, [job]);

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
  const latValue = typeof job.lat === 'string' ? Number.parseFloat(job.lat) : job.lat;
  const lngValue = typeof job.lng === 'string' ? Number.parseFloat(job.lng) : job.lng;
  const hasLocation = typeof latValue === 'number' && !Number.isNaN(latValue) && typeof lngValue === 'number' && !Number.isNaN(lngValue);
  const jobLocationLabel = typeof job.location === 'string'
    ? job.location
    : job.location && typeof job.location === 'object'
      ? [job.location.city, job.location.state].filter(Boolean).join(', ')
      : '';
  const mapJob = hasLocation ? ({ ...job, lat: latValue, lng: lngValue } as Job) : null;

  return (
    <ErrorBoundary>
      <SEO 
        title={job?.title || 'Job Details'} 
        description={job?.description}
        type="article"
      />
      {jobPostingSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(jobPostingSchema, null, 0)}
          </script>
        </Helmet>
      )}
      <div className="min-h-screen bg-background overflow-x-hidden" data-testid="job-details-page">
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
          <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
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
                          aria-label={isSaved ? "Unsave job" : "Save job"}
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
                {jobLocationLabel && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">{jobLocationLabel}</span>
                  </div>
                )}
                {(job?.date || job?.startTime || job?.endTime) && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="break-words overflow-hidden">
                      {job.date && <div>{job.date}</div>}
                      {job.startTime && job.endTime && (
                        <div className="text-sm">
                          {job.startTime} - {job.endTime}
                          <span className="text-xs ml-1">(Job Location Time)</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description Section */}
          {job?.description && (
            <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Requirements Section */}
          {requirements.length > 0 && (
            <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Requirements</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {(requirements || []).map((req, index) => (
                    <li key={`${req.substring(0, 20)}-${index}`}>{req}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Map Section */}
          {hasLocation && mapJob && (
            <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Location</h2>
                <div className="h-64 rounded-lg overflow-hidden border border-border">
                  <ErrorBoundary>
                    <GoogleMapView
                      jobs={[mapJob]}
                      interactive={false}
                      centerLocation={{ lat: latValue!, lng: lngValue! }}
                      radius={50}
                      searchLocation={jobLocationLabel}
                    />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Apply Button - Sticky on mobile, prominent on desktop */}
          <div className="sticky bottom-0 bg-background border-t border-border p-4 -mx-4 md:static md:border-0 md:p-0 md:mt-6 overflow-x-hidden" data-testid="job-apply-container">
            <Card className="bg-card rounded-lg border border-border shadow-sm md:shadow-lg">
              <CardContent className="p-6">
                {applicationState === 'applied' ? (
                  <div className="flex items-center justify-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Application Submitted Successfully!</span>
                  </div>
                ) : (user && (job?.businessId === user.id || job?.hubId === user.id)) ? (
                  <div className="text-center text-muted-foreground">
                    <p className="font-medium">This is your job listing</p>
                    <p className="text-sm mt-1">View applications in your dashboard</p>
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
