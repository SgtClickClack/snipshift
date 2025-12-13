import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { fetchShiftDetails, createApplication, fetchMyApplications, ShiftDetails } from '@/lib/api';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Clock, DollarSign, ArrowLeft, CheckCircle2, Heart, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { ReportButton } from '@/components/report/report-button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SEO } from "@/components/seo/SEO";
import { OptimizedImage } from "@/components/ui/optimized-image";

export default function ShiftDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [applicationState, setApplicationState] = useState<'idle' | 'applying' | 'applied'>('idle');
  const [isSaved, setIsSaved] = useState(false);

  // TODO: Saved shifts feature - Currently using local state only
  const toggleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: !isSaved ? "Shift Saved" : "Shift Removed from Saved",
      description: !isSaved ? "This shift has been added to your saved shifts." : "This shift has been removed from your saved shifts.",
    });
  };

  const { data: shift, isLoading, error } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => fetchShiftDetails(id!),
    enabled: !!id,
    retry: false // Don't retry on 404s
  });

  // Check if user has already applied to this shift
  const { data: myApplications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: fetchMyApplications,
    enabled: !!user && !!id, // Only fetch if user is logged in and shift ID exists
  });

  // Set application state to 'applied' if user has already applied
  useEffect(() => {
    if (myApplications && id && user) {
      const hasApplied = myApplications.some(app => app.shiftId === id);
      if (hasApplied) {
        setApplicationState('applied');
      }
    }
  }, [myApplications, id, user]);

  const applyMutation = useMutation({
    mutationFn: (applicationData: { shiftId: string; coverLetter?: string }) => createApplication(applicationData),
    onSuccess: () => {
      setApplicationState('applied');
      toast({
        title: 'Application Sent!',
        description: 'Your application has been sent successfully.',
      });
      // Invalidate shift details to update button state
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
      // Invalidate my applications list to show new application immediately
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (error: any) => {
      // Check if this is a 409 error (already applied)
      const errorMessage = error.message || '';
      const is409Error = errorMessage.includes('409') || errorMessage.includes('already applied');
      
      if (is409Error) {
        // Treat 409 as success - user has already applied
        setApplicationState('applied');
        toast({
          title: 'Already Applied',
          description: 'You have already applied to this shift.',
          variant: 'default',
        });
        // Invalidate queries to ensure UI is in sync
        queryClient.invalidateQueries({ queryKey: ['shift', id] });
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
        description: 'Please log in to apply for this shift.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (!id) {
      toast({
        title: 'Error',
        description: 'Shift ID is missing.',
        variant: 'destructive',
      });
      return;
    }

    // Validate critical shift fields before submitting to the API
    const missingCritical =
      !shift?.hourlyRate || !shift?.startTime || !shift?.endTime || !shift?.location;

    if (missingCritical) {
      toast({
        title: 'Unable to apply',
        description: 'This shift is missing required details (rate, date/time, or location).',
        variant: 'destructive',
      });
      return;
    }

    setApplicationState('applying');
    
    const applicationData = {
      shiftId: id,
      coverLetter: `I am interested in applying for the ${shift?.title} shift at ${shift?.shopName || 'this location'}.`,
    };

    applyMutation.mutate(applicationData);
  };

  // Build JSON-LD JobPosting schema for Google for Jobs
  const jobPostingSchema = useMemo(() => {
    if (!shift) return null;

    // Parse salary from hourlyRate
    const parseSalary = (rate?: string): { value?: number; currency?: string } | undefined => {
      if (!rate) return undefined;
      
      // Extract numeric value and currency
      const numericMatch = String(rate).match(/[\d,]+\.?\d*/);
      if (!numericMatch) return undefined;
      
      const value = parseFloat(numericMatch[0].replace(/,/g, ''));
      if (isNaN(value)) return undefined;
      
      // Default to AUD for Australian site
      const currency = 'AUD';
      
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
      if (!shift.location) return undefined;

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

      if (shift.location) {
        location.address = {
          '@type': 'PostalAddress',
          addressCountry: 'AU',
        };

        // Try to parse location string
        const parts = shift.location.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          location.address.addressLocality = parts[0];
          location.address.addressRegion = parts[1];
        } else {
          location.address.addressLocality = shift.location;
        }
      }

      return location;
    };

    // Format dates for ISO 8601
    const formatDate = (dateStr?: string): string | undefined => {
      if (!dateStr) return undefined;
      
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // If parsing fails, return undefined
      }
      
      return undefined;
    };

    const salary = parseSalary(shift.hourlyRate);
    const jobLocation = parseLocation();
    const datePosted = formatDate(shift.startTime);
    const validThrough = formatDate(shift.endTime);

    const schema: any = {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: shift.title,
      description: shift.description || '',
      employmentType: 'CONTRACTOR',
      hiringOrganization: {
        '@type': 'Organization',
        name: shift.shopName || 'SnipShift',
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

    // Add shift identifier
    if (shift.id) {
      schema.identifier = {
        '@type': 'PropertyValue',
        name: 'SnipShift',
        value: shift.id,
      };
    }

    return schema;
  }, [shift]);

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  // Guard clause: check if ID is missing or shift fetch failed
  if (!id || error || !shift) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="shift-not-found">
        <Card className="card-chrome max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-error mb-2">Shift Not Found</h2>
            <p className="text-muted-foreground mb-4">The shift you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/jobs')}>
              Back to Job Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requirements = Array.isArray(shift.requirements) ? shift.requirements : (shift.description ? [shift.description] : []);
  const hasLocation = typeof shift.lat === 'number' && typeof shift.lng === 'number';

  // Format date and time for display
  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return {
        date: date.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: dateTimeStr, time: '' };
    }
  };

  const startDateTime = shift.startTime ? formatDateTime(shift.startTime) : null;
  const endDateTime = shift.endTime ? formatDateTime(shift.endTime) : null;

  return (
    <ErrorBoundary>
      <SEO 
        title={shift?.title || 'Shift Details'} 
        description={shift?.description}
        type="article"
      />
      {jobPostingSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(jobPostingSchema, null, 0)}
          </script>
        </Helmet>
      )}
      <div className="min-h-screen bg-background overflow-x-hidden" data-testid="shift-details-page">
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
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground break-words overflow-hidden flex-1 min-w-0">{shift?.title}</h1>
                    {user && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={toggleSave}
                          data-testid="button-save-shift"
                          aria-label={isSaved ? "Unsave shift" : "Save shift"}
                        >
                          <Heart className={`h-6 w-6 ${isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <ReportButton 
                          jobId={shift?.id} 
                          variant="outline" 
                          size="sm" 
                          className="text-error border-error hover:bg-error/10"
                        />
                      </div>
                    )}
                  </div>
                  {shift?.shopName && (
                    <div className="flex items-center gap-2 text-xl text-muted-foreground mb-4">
                      <Building2 className="h-5 w-5" />
                      <span className="break-words overflow-hidden">{shift.shopName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-lg font-semibold text-success">
                    <DollarSign className="h-5 w-5" />
                    <span>${shift?.hourlyRate || shift?.rate || 'Rate TBD'}/hr</span>
                  </div>
                </div>
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                {shift?.location && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">{shift.location}</span>
                  </div>
                )}
                {startDateTime && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="break-words overflow-hidden">
                      <div>{startDateTime.date}</div>
                      {startDateTime.time && endDateTime?.time && (
                        <div className="text-sm">
                          {startDateTime.time} - {endDateTime.time}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description Section */}
          {shift?.description && (
            <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">{shift.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Requirements Section */}
          {requirements.length > 0 && (
            <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Requirements</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {requirements.map((req, index) => (
                    <li key={`${String(req).substring(0, 20)}-${index}`}>{req}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Shop Bio Section */}
          {shift?.shopName && (
            <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">About {shift.shopName}</h2>
                {shift.shopAvatarUrl && (
                  <div className="mb-4">
                    <OptimizedImage
                      src={shift.shopAvatarUrl}
                      alt={shift.shopName}
                      fallbackType="user"
                      className="w-20 h-20 rounded-full object-cover"
                      containerClassName="rounded-full"
                    />
                  </div>
                )}
                <p className="text-muted-foreground">
                  Connect with {shift.shopName} to learn more about their business and work environment.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Map Section */}
          {hasLocation && (
            <Card className="bg-card rounded-lg border border-border shadow-sm mb-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Location</h2>
                <div className="h-64 rounded-lg overflow-hidden border border-border">
                  <ErrorBoundary>
                    <GoogleMapView
                      jobs={[{
                        id: shift.id,
                        title: shift.title,
                        location: shift.location || '',
                        lat: Number(shift.lat),
                        lng: Number(shift.lng),
                        rate: shift.hourlyRate,
                        date: shift.startTime,
                      }]}
                      onJobSelect={() => {}}
                      selectedJob={{
                        id: shift.id,
                        title: shift.title,
                        location: shift.location || '',
                        lat: Number(shift.lat),
                        lng: Number(shift.lng),
                        rate: shift.hourlyRate,
                        date: shift.startTime,
                      }}
                      centerLocation={{ lat: Number(shift.lat), lng: Number(shift.lng) }}
                      radius={50}
                      searchLocation={shift.location || ''}
                    />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Apply Button - Sticky on mobile, prominent on desktop */}
          <div className="sticky bottom-0 bg-background border-t border-border p-4 -mx-4 md:static md:border-0 md:p-0 md:mt-6 overflow-x-hidden" data-testid="shift-apply-container">
            <Card className="bg-card rounded-lg border border-border shadow-sm md:shadow-lg">
              <CardContent className="p-6">
                {applicationState === 'applied' ? (
                  <div className="flex items-center justify-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Application Sent</span>
                  </div>
                ) : (user && (shift?.employerId === user.id)) ? (
                  <div className="text-center text-muted-foreground">
                    <p className="font-medium">This is your shift listing</p>
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

