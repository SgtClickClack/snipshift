import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { checkInShift, requestSubstitute, clockOutShift, getWaitlistStatus, reportLateArrival, acceptBackupShift, fetchMyApplications } from '@/lib/api/professional';
import { fetchShiftDetails, createApplication } from '@/lib/api/shared';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { usePusher } from '@/contexts/PusherContext';
import { MapPin, Clock, DollarSign, ArrowLeft, CheckCircle2, Heart, Building2, Users, FileText, Navigation, UserX, LogOut, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CameraCapture } from '@/components/shifts/CameraCapture';
import { WaitlistButton } from '@/components/shifts/WaitlistButton';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { ReportButton } from '@/components/report/report-button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { calculateDistance } from '@/lib/google-maps';
import { SEO } from "@/components/seo/SEO";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { logger } from '@/lib/logger';

export default function ShiftDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [applicationState, setApplicationState] = useState<'idle' | 'applying' | 'applied'>('idle');
  const [isSaved, setIsSaved] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [showSubstituteDialog, setShowSubstituteDialog] = useState(false);
  const [showClockOutCamera, setShowClockOutCamera] = useState(false);
  const [showLateArrivalDialog, setShowLateArrivalDialog] = useState(false);

  // TODO: Saved shifts feature - Currently using local state only
  const toggleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: !isSaved ? "Shift Saved" : "Shift Removed from Saved",
      description: !isSaved ? "This shift has been added to your saved shifts." : "This shift has been removed from your saved shifts.",
    });
  };

  const checkInMutation = useMutation({
    mutationFn: ({ shiftId, latitude, longitude }: { shiftId: string; latitude: number; longitude: number }) =>
      checkInShift(shiftId, latitude, longitude),
    onSuccess: (data) => {
      setIsCheckingIn(false);
      setCheckInError(null);
      toast({
        title: 'Checked In Successfully!',
        description: `You checked in ${data.distance.toFixed(0)}m from the venue.`,
      });
      // Invalidate shift details to update UI
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
    },
    onError: (error: any) => {
      setIsCheckingIn(false);
      const errorMessage = error.message || '';
      
      // Check for geofence failure
      if (errorMessage.includes('TOO_FAR_FROM_VENUE') || errorMessage.includes('must be at the venue')) {
        const distanceMatch = errorMessage.match(/(\d+)\s*m/);
        const distance = distanceMatch ? distanceMatch[1] : 'unknown';
        setCheckInError(`You must be at the venue to check in. You are ${distance}m away (maximum 200m).`);
      } else {
        setCheckInError(errorMessage || 'Failed to check in. Please try again.');
      }
      
      toast({
        title: 'Check-in Failed',
        description: errorMessage || 'Failed to check in. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const substituteMutation = useMutation({
    mutationFn: (shiftId: string) => requestSubstitute(shiftId),
    onSuccess: (data) => {
      setShowSubstituteDialog(false);
      toast({
        title: 'Substitution Requested',
        description: `Your request has been submitted. ${data.notifiedWorkers} workers have been notified.`,
      });
      // Invalidate shift details to update UI
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to request substitution. Please try again.';
      toast({
        title: 'Request Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ shiftId, proofImage }: { shiftId: string; proofImage: File }) =>
      clockOutShift(shiftId, proofImage),
    onSuccess: (data) => {
      setShowClockOutCamera(false);
      toast({
        title: 'Clocked Out Successfully',
        description: data.message || 'Your shift is pending venue owner review.',
      });
      // Invalidate shift details to update UI
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to clock out. Please try again.';
      toast({
        title: 'Clock Out Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleClockOutCapture = (file: File) => {
    if (!id) return;
    clockOutMutation.mutate({ shiftId: id, proofImage: file });
  };

  const lateArrivalMutation = useMutation({
    mutationFn: ({ shiftId, etaMinutes }: { shiftId: string; etaMinutes: number }) =>
      reportLateArrival(shiftId, etaMinutes),
    onSuccess: (data) => {
      setShowLateArrivalDialog(false);
      toast({
        title: 'Late Arrival Reported',
        description: `Venue owner has been notified. Expected arrival: ${new Date(data.expectedArrivalTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`,
      });
      // Invalidate shift details to update UI
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to report late arrival. Please try again.';
      toast({
        title: 'Report Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleLateArrival = (etaMinutes: number) => {
    if (!id) return;
    lateArrivalMutation.mutate({ shiftId: id, etaMinutes });
  };

  const acceptBackupMutation = useMutation({
    mutationFn: (shiftId: string) => acceptBackupShift(shiftId),
    onSuccess: (data) => {
      toast({
        title: '✅ Backup Shift Accepted!',
        description: `You've been assigned to "${data.shift?.title || 'this shift'}". The original worker has been cancelled.`,
      });
      // Invalidate shift details to update UI
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
      // Navigate to check-in or shift details
      navigate(`/shifts/${id}`);
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to accept backup shift. It may have already been taken.';
      toast({
        title: 'Accept Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleAcceptBackup = () => {
    if (!id) return;
    if (confirm('Accept this backup shift? You will be immediately assigned and the original worker will be cancelled with late-cancel penalties. This action cannot be undone.')) {
      acceptBackupMutation.mutate(id);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !id || !shift) {
      return;
    }

    // RELIABILITY: Check for offline status before attempting check-in
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        title: 'No Internet Connection',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      });
      setCheckInError('No Internet Connection. Please check your connection and try again.');
      return;
    }

    // Check if user is assigned to this shift
    if (shift.assigneeId !== user.id) {
      toast({
        title: 'Not Assigned',
        description: 'You are not assigned to this shift.',
        variant: 'destructive',
      });
      return;
    }

    // Check if already checked in
    if ((shift as any).attendanceStatus === 'checked_in') {
      toast({
        title: 'Already Checked In',
        description: 'You have already checked in to this shift.',
      });
      return;
    }

    // Check if shift has coordinates
    const shiftLat = shift.lat ? (typeof shift.lat === 'string' ? parseFloat(shift.lat) : shift.lat) : null;
    const shiftLng = shift.lng ? (typeof shift.lng === 'string' ? parseFloat(shift.lng) : shift.lng) : null;

    if (!shiftLat || !shiftLng || isNaN(shiftLat) || isNaN(shiftLng)) {
      toast({
        title: 'Location Unavailable',
        description: 'Venue location is not available. Cannot check in.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingIn(true);
    setCheckInError(null);

    // Request GPS coordinates
    if (!navigator.geolocation) {
      setIsCheckingIn(false);
      toast({
        title: 'Location Unavailable',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Calculate distance using Haversine formula (client-side validation)
        const distance = calculateDistance(
          { lat: userLat, lng: userLng },
          { lat: shiftLat, lng: shiftLng }
        );

        // Convert to meters
        const distanceMeters = distance * 1000;

        // Check if within 200m radius
        if (distanceMeters > 200) {
          setIsCheckingIn(false);
          setCheckInError(`You must be at the venue to check in. You are ${Math.round(distanceMeters)}m away (maximum 200m).`);
          toast({
            title: 'Too Far From Venue',
            description: `You are ${Math.round(distanceMeters)}m away. Please move within 200m of the venue to check in.`,
            variant: 'destructive',
          });
          return;
        }

        // Proceed with check-in API call
        checkInMutation.mutate({
          shiftId: id,
          latitude: userLat,
          longitude: userLng,
        });
      },
      () => {
        setIsCheckingIn(false);
        setCheckInError('Failed to get your location. Please enable location services and try again.');
        toast({
          title: 'Location Error',
          description: 'Could not get your location. Please enable location services.',
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const { data: shift, isLoading, error } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => fetchShiftDetails(id!),
    enabled: !!id,
    retry: false // Don't retry on 404s
  });

  // ELITE AUDIT SPRINT PART 5 - TASK 2: Real-Time State Reconciliation
  // Listen for Pusher shift status updates and force refresh if shift is currently viewed
  const { onShiftStatusUpdate } = usePusher();
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = onShiftStatusUpdate((update) => {
      // If this update is for the shift we're currently viewing, force a refresh
      if (update.shiftId === id) {
        logger.debug('SHIFT_DETAILS', `Received Pusher update for current shift ${id}, forcing refresh`);
        // Force stale-while-revalidate refresh
        queryClient.invalidateQueries({ queryKey: ['shift', id] });
      }
    });

    return unsubscribe;
  }, [id, onShiftStatusUpdate, queryClient]);

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

  // Check waitlist status for backup acceptance
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isBackupRequest = urlParams.get('backup') === 'true';
  const { data: waitlistStatus } = useQuery({
    queryKey: ['waitlist-status', id],
    queryFn: () => getWaitlistStatus(id!),
    enabled: !!user && !!id && !!shift && isBackupRequest && !!(shift as any)?.backupRequestedAt && !(shift as any)?.backupWorkerId,
    staleTime: 10 * 1000, // Cache for 10 seconds
  });

  // Check for waitlist conversion (when user accepts from waitlist)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instantAccept = urlParams.get('instantAccept') === 'true';
    
    if (instantAccept && shift && user && shift.assigneeId === user.id) {
      // User was on waitlist and successfully accepted the shift
      toast({
        title: '🎉 Waitlist Conversion!',
        description: `Congratulations! You've been moved from the waitlist and assigned to "${shift.title}".`,
        duration: 5000,
      });
      
        // Clean up URL parameter
        urlParams.delete('instantAccept');
        const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
    }
  }, [shift, user, toast]);

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

    // Only enforce RSA if the shift explicitly requires it.
    if (shift?.rsaRequired) {
      const hasRsaCertificate = !!user.rsaCertificateUrl;
      const rsaExpiryDate = user.rsaExpiry ? new Date(user.rsaExpiry) : null;
      const isRsaExpiryValid = rsaExpiryDate ? !isNaN(rsaExpiryDate.getTime()) : true;
      const isRsaExpired =
        rsaExpiryDate && isRsaExpiryValid
          ? rsaExpiryDate.getTime() < new Date().setHours(0, 0, 0, 0)
          : false;

      if (!hasRsaCertificate || isRsaExpired) {
        toast({
          title: 'RSA certificate required',
          description: isRsaExpired
            ? 'Your RSA certificate appears to be expired. Please upload a current RSA certificate to apply for this shift.'
            : 'Upload your RSA certificate to apply for this shift.',
          variant: 'destructive',
        });
        navigate('/settings');
        return;
      }
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
      coverLetter: `I am interested in applying for the ${shift?.title} shift at ${shift?.shopName || 'this venue'}.`,
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
        name: shift.shopName || 'HospoGo',
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
        name: 'HospoGo',
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
  const hourlyRateNumber = (() => {
    const n = Number.parseFloat(String(shift.hourlyRate ?? shift.rate ?? ''));
    return Number.isFinite(n) ? n : null;
  })();
  const durationHours = (() => {
    if (typeof shift.shiftLengthHours === 'number' && Number.isFinite(shift.shiftLengthHours)) {
      return shift.shiftLengthHours;
    }
    if (!shift.startTime || !shift.endTime) return null;
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours > 0 ? Math.round(hours * 100) / 100 : null;
  })();
  const estimatedTotal = hourlyRateNumber != null && durationHours != null ? hourlyRateNumber * durationHours : null;

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
        <div className="max-w-4xl mx-auto px-4 py-6 w-full">
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
                {shift?.role && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <Users className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">
                      Role: <span className="text-foreground font-medium">{shift.role}</span>
                    </span>
                  </div>
                )}
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
                {durationHours != null && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">
                      Duration: <span className="text-foreground font-medium">{durationHours}</span> hours
                    </span>
                  </div>
                )}
                {estimatedTotal != null && (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <DollarSign className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">
                      Estimated total: <span className="text-foreground font-medium">${estimatedTotal.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground ml-1">(Hourly Rate × Duration)</span>
                    </span>
                  </div>
                )}
                {shift?.rsaRequired ? (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-success" />
                    <span className="break-words overflow-hidden">
                      RSA required
                    </span>
                  </div>
                ) : null}
                {shift?.expectedPax != null ? (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                    <Users className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">
                      Expected pax: <span className="text-foreground font-medium">{shift.expectedPax}</span>
                    </span>
                  </div>
                ) : null}
                {shift?.uniformRequirements ? (
                  <div className="flex items-start gap-2 text-muted-foreground min-w-0 md:col-span-2">
                    <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words overflow-hidden">
                      Uniform: <span className="text-foreground font-medium">{shift.uniformRequirements}</span>
                    </span>
                  </div>
                ) : null}
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

          {/* Venue Section */}
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
                  Connect with {shift.shopName} to learn more about the venue and the shift environment.
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
                      interactive={false}
                      centerLocation={{ lat: Number(shift.lat), lng: Number(shift.lng) }}
                      radius={50}
                      searchLocation={shift.location || ''}
                    />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check-in or Apply Button - Sticky on mobile, prominent on desktop */}
          <div className="sticky bottom-0 bg-background border-t border-border p-4 -mx-4 md:static md:border-0 md:p-0 md:mt-6 overflow-x-hidden" data-testid="shift-apply-container">
            <Card className="bg-card rounded-lg border border-border shadow-sm md:shadow-lg">
              <CardContent className="p-6">
                {/* Show Check-in/Clock-out buttons if user is assigned to this shift */}
                {user && shift?.assigneeId === user.id ? (
                  (shift as any).attendanceStatus === 'checked_in' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-success">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Checked In</span>
                        {(shift as any).actualStartTime && (
                          <span className="text-sm text-muted-foreground ml-2">
                            at {new Date((shift as any).actualStartTime).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {/* Clock Out button - only show if shift is not already pending completion */}
                      {shift?.status !== 'pending_completion' && shift?.status !== 'completed' && (
                        <Button
                          onClick={() => setShowClockOutCamera(true)}
                          disabled={clockOutMutation.isPending}
                          variant="outline"
                          className="w-full text-lg py-6"
                          size="lg"
                          data-testid="button-clock-out"
                        >
                          {clockOutMutation.isPending ? (
                            <>
                              <Navigation className="h-5 w-5 mr-2 animate-spin" />
                              Clocking Out...
                            </>
                          ) : (
                            <>
                              <LogOut className="h-5 w-5 mr-2" />
                              Clock Out
                            </>
                          )}
                        </Button>
                      )}
                      {/* Show status if shift is pending completion */}
                      {shift?.status === 'pending_completion' && (
                        <div className="text-center text-sm text-muted-foreground p-3 bg-muted rounded-md">
                          Shift completed. Waiting for venue owner review.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        onClick={handleCheckIn}
                        disabled={isCheckingIn}
                        className="w-full text-lg py-6 min-h-[44px] min-w-[44px] touch-manipulation"
                        size="lg"
                        data-testid="button-check-in"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {isCheckingIn ? (
                          <>
                            <Navigation className="h-5 w-5 mr-2 animate-spin" />
                            Checking In...
                          </>
                        ) : (
                          <>
                            <Navigation className="h-5 w-5 mr-2" />
                            Check In
                          </>
                        )}
                      </Button>
                      {checkInError && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                          {checkInError}
                        </div>
                      )}
                      {/* Running Late button - only show 15 minutes before shift start */}
                      {shift && (() => {
                        const shiftStart = new Date(shift.startTime);
                        const now = new Date();
                        const minutesUntilStart = (shiftStart.getTime() - now.getTime()) / (1000 * 60);
                        const canShowLateButton = minutesUntilStart <= 15 && minutesUntilStart >= -30;
                        const lateSignalSent = (shift as any).lateArrivalSignalSent;
                        
                        return canShowLateButton && !lateSignalSent ? (
                          <Button
                            onClick={() => setShowLateArrivalDialog(true)}
                            disabled={lateArrivalMutation.isPending}
                            variant="outline"
                            className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                            data-testid="button-running-late"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {lateArrivalMutation.isPending ? 'Sending...' : 'Running Late?'}
                          </Button>
                        ) : null;
                      })()}
                      {/* Request Substitute button - only show if shift is at least 24 hours away */}
                      {shift && (() => {
                        const shiftStart = new Date(shift.startTime);
                        const now = new Date();
                        const hoursUntilStart = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);
                        const canRequestSubstitute = hoursUntilStart >= 24;
                        
                        return canRequestSubstitute ? (
                          <Button
                            onClick={() => setShowSubstituteDialog(true)}
                            disabled={substituteMutation.isPending}
                            variant="outline"
                            className="w-full"
                            data-testid="button-request-substitute"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            {substituteMutation.isPending ? 'Requesting...' : 'Request Substitute'}
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  )
                ) : applicationState === 'applied' ? (
                  <div className="flex items-center justify-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Application Sent</span>
                  </div>
                ) : (user && (shift?.employerId === user.id)) ? (
                  <div className="text-center text-muted-foreground">
                    <p className="font-medium">This is your shift listing</p>
                    <p className="text-sm mt-1">View applications in your dashboard</p>
                  </div>
                ) : shift?.status === 'filled' || shift?.status === 'confirmed' ? (
                  <div className="space-y-3">
                    {/* Backup Acceptance Button - Show if backup requested and user is on waitlist */}
                    {isBackupRequest && (shift as any).backupRequestedAt && !(shift as any).backupWorkerId && waitlistStatus?.isOnWaitlist && (
                      <Button
                        onClick={handleAcceptBackup}
                        disabled={acceptBackupMutation.isPending}
                        className="w-full text-lg py-6 bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                        data-testid="button-accept-backup"
                      >
                        {acceptBackupMutation.isPending ? (
                          <>
                            <Navigation className="h-5 w-5 mr-2 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Accept Backup Shift - Immediate Start! 🚨
                          </>
                        )}
                      </Button>
                    )}
                    <WaitlistButton 
                      shiftId={shift.id} 
                      shiftStatus={shift.status}
                      className="w-full text-lg py-6"
                    />
                    {shift?.waitlistCount != null && shift.waitlistCount > 0 && (
                      <p className="text-sm text-center text-muted-foreground">
                        {shift.waitlistCount} {shift.waitlistCount === 1 ? 'person' : 'people'} on waitlist
                      </p>
                    )}
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

      {/* Late Arrival ETA Dialog */}
      <AlertDialog open={showLateArrivalDialog} onOpenChange={setShowLateArrivalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Running Late?</AlertDialogTitle>
            <AlertDialogDescription>
              Select your estimated arrival time. The venue owner will be notified immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <Button
              onClick={() => handleLateArrival(5)}
              disabled={lateArrivalMutation.isPending}
              variant="outline"
              className="w-full justify-start"
            >
              <Clock className="h-4 w-4 mr-2" />
              5 minutes
            </Button>
            <Button
              onClick={() => handleLateArrival(10)}
              disabled={lateArrivalMutation.isPending}
              variant="outline"
              className="w-full justify-start"
            >
              <Clock className="h-4 w-4 mr-2" />
              10 minutes
            </Button>
            <Button
              onClick={() => handleLateArrival(15)}
              disabled={lateArrivalMutation.isPending}
              variant="outline"
              className="w-full justify-start"
            >
              <Clock className="h-4 w-4 mr-2" />
              15+ minutes
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lateArrivalMutation.isPending}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Substitution Request Dialog */}
      <AlertDialog open={showSubstituteDialog} onOpenChange={setShowSubstituteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Substitute?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to request a substitute for "{shift?.title}"? 
              The shift will be reopened and recommended workers will be notified. 
              Once a substitute is found and approved by the venue owner, you will be released from this shift.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={substituteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => id && substituteMutation.mutate(id)}
              disabled={substituteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {substituteMutation.isPending ? 'Requesting...' : 'Request Substitute'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clock Out Camera Dialog */}
      <AlertDialog open={showClockOutCamera} onOpenChange={setShowClockOutCamera}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Clock Out - Proof Photo Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please capture a photo as proof of shift completion. This photo will be reviewed by the venue owner before your payout is processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <CameraCapture
              onCapture={handleClockOutCapture}
              onCancel={() => setShowClockOutCamera(false)}
            />
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
}

