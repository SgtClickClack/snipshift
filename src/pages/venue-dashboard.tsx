import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { useSearchParams, useNavigate } from "react-router-dom";
import Confetti from 'react-confetti';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemoMode, DEMO_USER, DEMO_JOBS, DEMO_APPLICATIONS, DEMO_STATS, DEMO_SHIFT_APPLICATIONS } from "@/lib/demo-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { isBusinessRole } from "@/lib/roles";
import { useXeroStatus, useXeroSyncLogs } from "@/hooks/useXeroStatus";
import { Plus, Calendar, DollarSign, Users, MessageSquare, MoreVertical, Loader2, Trash2, LayoutDashboard, Briefcase, User, CheckCircle2, XCircle, Star, CheckCircle, BarChart3, Image as ImageIcon, AlertCircle, AlertTriangle, ArrowRight, ShieldCheck, Settings } from "lucide-react";
import ProfessionalCalendar from "@/components/calendar/professional-calendar";
import CreateShiftModal from "@/components/calendar/create-shift-modal";
import { TutorialTrigger } from "@/components/onboarding/tutorial-overlay";
import { CompleteSetupBanner } from "@/components/onboarding/CompleteSetupBanner";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import { StripeConnectBanner } from "@/components/payments/StripeConnectBanner";
import { DashboardStatsSkeleton, ApplicantCardSkeleton, ShiftListSkeleton } from "@/components/loading/skeleton-loaders";
import { VenueStatusCard } from "@/components/venues/VenueStatusCard";
import { VenueAnalyticsDashboard } from "@/components/venues/VenueAnalyticsDashboard";
import { SEO } from "@/components/seo/SEO";
import { EmptyState } from "@/components/ui/empty-state";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProfileHeader from "@/components/profile/profile-header";
import { format } from "date-fns";
import { formatDateSafe, toISOStringSafe, toDateSafe } from "@/utils/date-formatter";
import { createShift, fetchShopShifts, updateShiftStatus, decideApplication, getShiftApplications, updateApplicationStatus, ShiftApplication, requestBackupFromWaitlist } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { ApplicationCard, Application } from "@/components/applications/ApplicationCard";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ActiveView = 'overview' | 'jobs' | 'applications' | 'profile' | 'calendar' | 'shift-applications' | 'analytics';

/** In-flow skeleton only: no fixed position, no z-index overlay, no pointer-events: none or overflow: hidden — so scroll works and nothing persists after unmount. */
const VenueDashboardSkeleton = () => (
  <div className="min-h-screen bg-background p-4 md:p-6 overflow-auto" data-testid="venue-dashboard-skeleton">
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="h-16 bg-muted animate-pulse rounded-lg" />
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export default function VenueDashboard() {
  const { user, isLoading: isAuthLoading, isSystemReady, isVenueMissing } = useAuth();
  const navigate = useNavigate();
  // CRITICAL: Strictly check for business-related roles only - prevent professional users from accessing
  // isBusinessRole returns true for 'business', 'venue', 'hub', 'brand' and false for 'professional'
  const hasValidRole = isBusinessRole(user?.currentRole);
  // Derived from isOnboarded (single source of truth in AuthContext)
  const hasCompletedOnboarding = user?.isOnboarded === true;

  // DEMO MODE: Bypass all loading states and render dashboard immediately with mock data
  const demoMode = isDemoMode();
  if (demoMode) {
    return <VenueDashboardContent demoMode={true} />;
  }

  // PERFORMANCE: Show skeleton only until system is ready AND we can verify role
  // isSystemReady = Firebase + user profile + venue check complete
  // This ensures we don't block on non-existent isRoleLoading flag
  if (isAuthLoading || !isSystemReady) {
    return <VenueDashboardSkeleton />;
  }

  // User loaded but wrong role - brief skeleton while redirect happens
  if (!hasValidRole) {
    return <VenueDashboardSkeleton />;
  }

  // User is onboarded but venue record is missing (404) — stay on hub to complete setup
  if (user && isVenueMissing) {
    navigate('/onboarding/hub', { replace: true });
    return <VenueDashboardSkeleton />;
  }

  // User has valid role but has not completed onboarding: redirect to onboarding
  // so we never render a null/blank screen (handles hasCompletedOnboarding: false)
  if (user && !hasCompletedOnboarding) {
    navigate('/onboarding', { replace: true });
    return <VenueDashboardSkeleton />;
  }

  return <VenueDashboardContent demoMode={false} />;
}

// Xero Logo SVG Component
const XeroLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.379l-2.526-2.526 2.526-2.526a.75.75 0 10-1.06-1.06L14.308 10.79l-2.527-2.526a.75.75 0 00-1.06 1.06l2.526 2.527-2.526 2.526a.75.75 0 101.06 1.06l2.527-2.526 2.526 2.526a.75.75 0 101.06-1.06zM9.692 13.293l-2.526-2.526a.75.75 0 00-1.06 1.06l2.526 2.527-2.526 2.526a.75.75 0 101.06 1.06l2.526-2.526 2.526 2.526a.75.75 0 101.06-1.06l-2.526-2.526 2.526-2.527a.75.75 0 10-1.06-1.06l-2.526 2.526z" />
  </svg>
);

function VenueDashboardContent({ demoMode = false }: { demoMode?: boolean }) {
  const { user: authUser, refreshUser } = useAuth();
  const { toast } = useToast();
  
  // Xero integration status
  const { isConnected: isXeroConnected, tenantName: xeroTenantName, payrollReadiness } = useXeroStatus();
  const { logs: recentXeroSyncLogs } = useXeroSyncLogs(3);
  
  // DEMO MODE: Use demo user data when real user is not available
  const user = demoMode ? (DEMO_USER as any) : authUser;
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get('view') as ActiveView) || 'overview';
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'filled' | 'completed'>('all');
  
  const setActiveView = (view: ActiveView) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', view);
      return newParams;
    });
  };

  const [showForm, setShowForm] = useState(false);
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [selectedDateForShift, setSelectedDateForShift] = useState<Date | undefined>();
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [isCandidatesDialogOpen, setIsCandidatesDialogOpen] = useState(false);
  const [shiftToComplete, setShiftToComplete] = useState<{ id: string; proofImageUrl?: string } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: { city: "", state: "", address: "" },
    payRate: "",
    schedule: "",
    requirements: "",
    date: "",
    startTime: "",
    skillsRequired: ""
  });

  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    location: "",
    avatarUrl: "",
    bannerUrl: ""
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Setup complete confetti celebration
  const [showSetupConfetti, setShowSetupConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Handle setup=complete confetti trigger
  useEffect(() => {
    const setupComplete = searchParams.get('setup');
    if (setupComplete === 'complete') {
      setShowSetupConfetti(true);
      // Remove the query param to prevent repeat triggers
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('setup');
        return newParams;
      });
      // Auto-dismiss confetti after 5 seconds
      const timer = setTimeout(() => setShowSetupConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);
  
  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user && !isEditingProfile) {
      // Only sync from user when not editing to avoid overwriting local changes
      setProfileData({
        displayName: user.displayName || "",
        bio: user.bio || "",
        location: user.location || "",
        avatarUrl: user.avatarUrl || user.profileImageURL || user.profileImage || "",
        bannerUrl: user.bannerUrl || user.bannerImage || ""
      });
    }
  }, [user, isEditingProfile]);

  // Sync bannerUrl when user.bannerUrl changes (e.g., after a refetch or upload)
  // This runs even when editing to ensure the preview updates
  useEffect(() => {
    if (user?.bannerUrl) {
      const extractedBannerUrl = typeof user.bannerUrl === 'string' 
        ? user.bannerUrl 
        : (user.bannerUrl as any)?.bannerUrl || (user.bannerUrl as any)?.url || null;
      
      if (extractedBannerUrl && extractedBannerUrl !== profileData.bannerUrl) {
        setProfileData(prev => ({ ...prev, bannerUrl: extractedBannerUrl }));
      }
    }
  }, [user?.bannerUrl]);

  // Sync avatarUrl when user.avatarUrl changes (e.g., after a refetch or upload)
  // This runs even when editing to ensure the preview updates
  useEffect(() => {
    if (user) {
      const avatarUrl = user.avatarUrl || user.profileImageURL || user.profileImage || '';
      if (avatarUrl && avatarUrl !== profileData.avatarUrl) {
        setProfileData(prev => ({ ...prev, avatarUrl }));
      }
    }
  }, [user?.avatarUrl, user?.profileImageURL, user?.profileImage]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      // IMPORTANT: Only send URL fields if they contain valid URLs
      // This prevents accidental overwrites when the form has stale/empty values
      const cleanedData = {
        ...data,
        avatarUrl: data.avatarUrl && data.avatarUrl.startsWith('http') ? data.avatarUrl : undefined,
        bannerUrl: data.bannerUrl && data.bannerUrl.startsWith('http') ? data.bannerUrl : undefined,
      };
      const res = await apiRequest("PUT", "/api/me", cleanedData);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Profile updated successfully",
        description: "Your shop profile information has been updated."
      });
      await refreshUser();
      setIsEditingProfile(false);
    },
    onError: (error) => {
      // console.error("Failed to update profile:", error);
      toast({
        title: "Update Failed",
        description: "Could not update profile information",
        variant: "destructive"
      });
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  // Data integrity: detect "ghost dashboard" — onboarded but no venue record (404 from /api/venues/me)
  const { data: venueMe, isLoading: isLoadingVenue, isFetched: isVenueFetched } = useQuery({
    queryKey: ['venue-status', user?.id],
    queryFn: async () => {
      if (demoMode) return {};
      try {
        const res = await apiRequest('GET', '/api/venues/me');
        return res.ok ? res.json() : null;
      } catch (err) {
        if (err instanceof Error && err.message.includes('404:')) return null;
        throw err;
      }
    },
    enabled: !demoMode && !!user?.id,
    staleTime: 2 * 60 * 1000,
    retry: (_, error) => !(error instanceof Error && error.message.includes('404:')),
    throwOnError: false,
  });
  const isProfileIncomplete = !demoMode && isVenueFetched && !isLoadingVenue && (venueMe === null || venueMe === undefined);

  // Stripe Connect status: used to hide Venue Status card when Stripe is missing (reduces orange wall of warnings)
  const { data: stripeAccountStatus } = useQuery({
    queryKey: ['stripe-connect-account-status', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe-connect/account/status');
      if (res.status === 404) {
        return { hasAccount: false, onboardingComplete: false, chargesEnabled: false };
      }
      return res.json();
    },
    enabled: !demoMode && !!user?.id && (user.currentRole === 'hub' || user.currentRole === 'business'),
    staleTime: 5 * 60 * 1000,
  });
  const isStripeComplete = stripeAccountStatus?.onboardingComplete && stripeAccountStatus?.chargesEnabled;

  const { data: applications = [], isLoading: isLoadingApplications, refetch: refetchApplications } = useQuery({
    queryKey: ['/api/applications'],
    queryFn: async () => {
      // DEMO MODE: Return demo applications immediately
      if (demoMode) {
        return DEMO_APPLICATIONS;
      }
      const res = await apiRequest("GET", "/api/applications");
      return res.json();
    },
    enabled: demoMode || activeView === 'applications',
    staleTime: demoMode ? Infinity : undefined,
  });

  // Filter to show only pending applications by default
  const pendingApplications = useMemo(() => {
    return (applications || []).filter((app: Application) => app.status === 'pending');
  }, [applications]);

  // Application decision mutation
  const [processingApplicationId, setProcessingApplicationId] = useState<string | null>(null);
  const decideMutation = useMutation({
    mutationFn: ({ applicationId, decision }: { applicationId: string; decision: 'APPROVED' | 'DECLINED' }) =>
      decideApplication(applicationId, decision),
    onMutate: async ({ applicationId }) => {
      setProcessingApplicationId(applicationId);
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.decision === 'APPROVED' ? 'Application Approved' : 'Application Declined',
        description: data.message,
      });
      // Refetch applications to update the list
      refetchApplications();
      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to process application',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setProcessingApplicationId(null);
    },
  });

  const handleApprove = (applicationId: string) => {
    decideMutation.mutate({ applicationId, decision: 'APPROVED' });
  };

  const handleDecline = (applicationId: string) => {
    decideMutation.mutate({ applicationId, decision: 'DECLINED' });
  };

  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ['shop-shifts', user?.id],
    queryFn: () => {
      // DEMO MODE: Return demo jobs immediately
      if (demoMode) {
        return Promise.resolve(DEMO_JOBS);
      }
      return fetchShopShifts(user!.id);
    },
    enabled: demoMode || !!user?.id,
    staleTime: demoMode ? Infinity : undefined,
    // DOPAMINE SYNC: 5s refresh for investor demo - live calendar updates on mobile Accept All
    refetchInterval: 5000,
  });

  // Memoize bookings transformation to prevent unnecessary Calendar re-renders
  const calendarBookings = useMemo(() => {
    return (jobs || []).map((job) => {
      // Map job/shift to booking format expected by calendar
      const bookingData: any = {
        id: job.id,
        status: job.status === 'draft' ? 'draft' : 
                job.status === 'invited' ? 'invited' :
                job.status === 'open' ? 'pending' : 
                job.status === 'filled' ? 'confirmed' : 'completed',
        appliedAt: job.createdAt ? toISOStringSafe(job.createdAt) : new Date().toISOString(),
      };
      
      // Add job or shift based on type
      // Ghost Shift fix: Ensure title has proper fallback even if job.title is null/undefined/empty
      const safeTitle = job?.title || 
                       (job as any)?.shift?.title || 
                       (job as any)?.job?.title || 
                       "Untitled Shift";
      
      if (job._type === 'shift') {
        bookingData.shift = {
          id: job.id,
          title: safeTitle,
          date: job.date,
          startTime: job.startTime,
          endTime: job.endTime,
          status: job.status,
          hourlyRate: job.payRate,
          location: typeof job.location === 'string' ? job.location : job.location?.address || '',
          assignedStaff: (job as any).assignedStaff || null,
        };
      } else {
        bookingData.job = {
          id: job.id,
          title: safeTitle,
          date: job.date,
          startTime: job.startTime,
          endTime: job.endTime,
          status: job.status,
          payRate: job.payRate,
          address: typeof job.location === 'string' ? job.location : job.location?.address || '',
          description: job.description || '',
          assignedStaff: (job as any).assignedStaff || null,
        };
      }
      
      return bookingData;
    });
  }, [jobs]);

  // Memoize onCreateShift callback to prevent unnecessary re-renders
  const handleCreateShift = useCallback(() => {
    setShowCreateShiftModal(true);
  }, []);

  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      // Transform data for Shift API compatibility
      // Construct ISO timestamps for start and end
      const dateStr = jobData.date;
      const startTimeStr = jobData.startTime;
      
      let startTimeISO = new Date().toISOString();
      let endTimeISO = new Date().toISOString();

      if (dateStr && startTimeStr) {
        const start = toDateSafe(`${dateStr}T${startTimeStr}`);
        if (start) {
          startTimeISO = start.toISOString();
          // Default to 8 hour shift
          const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);
          endTimeISO = end.toISOString();
        }
      }

      const payload = {
        title: jobData.title,
        description: jobData.description,
        hourlyRate: jobData.payRate,
        startTime: startTimeISO,
        endTime: endTimeISO,
        location: [jobData.location.address, jobData.location.city, jobData.location.state].filter(Boolean).join(', '),
        status: 'open',
        // Legacy/Additional fields if needed by backend wrapper, 
        // but createShift in api.ts handles the raw request
      };

      return createShift(payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift posted successfully!"
      });
      // Invalidate shop shifts for this user
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      // Also invalidate general jobs lists to refresh the feed
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setFormData({
        title: "",
        description: "",
        location: { city: "", state: "", address: "" },
        payRate: "",
        schedule: "",
        requirements: "",
        date: "",
        startTime: "",
        skillsRequired: ""
      });
      setShowForm(false);
    },
    onError: (error) => {
      // console.error("Failed to post shift:", error);
      toast({
        title: "Error", 
        description: "Failed to post shift. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for creating shifts (including recurring)
  const createShiftMutation = useMutation({
    mutationFn: async ({ shiftData, recurringShifts }: { shiftData: any; recurringShifts?: any[] }) => {
      if (recurringShifts && recurringShifts.length > 0) {
        // Create all recurring shifts
        const promises = (recurringShifts || []).map((shift) => {
          const payload: any = {
            role: shift.role,
            title: shift.title,
            description: shift.description || shift.requirements || '',
            hourlyRate: shift.hourlyRate,
            startTime: shift.startTime.toISOString(),
            endTime: shift.endTime.toISOString(),
            location: shift.location || '',
            uniformRequirements: shift.uniformRequirements,
            rsaRequired: !!shift.rsaRequired,
            expectedPax: shift.expectedPax,
            capacity: Math.max(1, shift.capacity ?? 1),
            status: shift.status || 'open',
          };
          // Add recurring metadata if present
          if (shift.recurringSeriesId) {
            payload.recurringSeriesId = shift.recurringSeriesId;
          }
          if (shift.isRecurring !== undefined) {
            payload.isRecurring = shift.isRecurring;
          }
          if (shift.recurringIndex !== undefined) {
            payload.recurringIndex = shift.recurringIndex;
          }
          return createShift(payload);
        });
        return Promise.all(promises);
      } else {
        // Single shift
        const payload = {
          role: shiftData.role,
          title: shiftData.title,
          description: shiftData.description || shiftData.requirements || '',
          hourlyRate: shiftData.hourlyRate,
          startTime: shiftData.startTime.toISOString(),
          endTime: shiftData.endTime.toISOString(),
          location: shiftData.location || '',
          uniformRequirements: shiftData.uniformRequirements,
          rsaRequired: !!shiftData.rsaRequired,
          expectedPax: shiftData.expectedPax,
          capacity: Math.max(1, shiftData.capacity ?? 1),
          status: shiftData.status || 'open',
        };
        return [await createShift(payload)];
      }
    },
    onSuccess: (results) => {
      const count = results.length;
      toast({
        title: "Success",
        description: count > 1 
          ? `${count} recurring shifts created successfully!`
          : "Shift created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setShowCreateShiftModal(false);
      setSelectedDateForShift(undefined);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Something went wrong. Give it another shot or reach out to us at info@hospogo.com.",
        variant: "destructive"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, type }: { id: string; status: 'open' | 'filled' | 'completed'; type: 'shift' | 'job' }) => {
      // Dashboard can show a mixed list (jobs + shifts). Route to the correct API.
      if (type === 'shift') {
        return updateShiftStatus(id, status);
      }
      return updateJobStatus(id, status);
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Status has been updated successfully."
      });
      // Mixed surfaces can be backed by both the unified shop listing and jobs queries.
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive"
      });
    }
  });

  const completeShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await apiRequest('PATCH', `/api/shifts/${shiftId}/complete`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to complete shift' }));
        throw new Error(error.message || 'Failed to complete shift');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Shift Completed",
        description: `Payout of $${(data.payout?.amountCents / 100).toFixed(2)} has been processed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete shift.",
        variant: "destructive"
      });
    }
  });

  const requestBackupMutation = useMutation({
    mutationFn: (shiftId: string) => requestBackupFromWaitlist(shiftId),
    onSuccess: (data) => {
      toast({
        title: 'Backup Requested',
        description: data.message || `Notified ${data.notifiedWorkers} waitlisted worker(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Request Failed',
        description: error?.message || 'Failed to request backup',
        variant: 'destructive',
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'shift' | 'job' }) => {
      const endpoint = type === 'shift' ? `/api/shifts/${id}` : `/api/jobs/${id}`;
      const res = await apiRequest("DELETE", endpoint);
      // Jobs endpoint returns 204 No Content, shifts returns JSON
      if (res.status === 204) {
        return { success: true, type };
      }
      return { ...res.json(), type };
    },
    onSuccess: (data) => {
      // Always invalidate shop shifts
      queryClient.invalidateQueries({ queryKey: ['shop-shifts', user?.id] });
      // If deleting a job, also invalidate jobs lists
      if (data?.type === 'job') {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      }
      toast({
        title: "Deleted",
        description: "The item has been removed and all applications have been cancelled.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Could not delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = format(new Date(), 'yyyy-MM-dd');
    if (formData.date && formData.date < today) {
      toast({
        title: 'Invalid date',
        description: 'Please select a date from today onwards.',
        variant: 'destructive',
      });
      return;
    }
    createJobMutation.mutate(formData);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'post-job':
        // Switch to the 'jobs' view first
        setActiveView('jobs');
        setStatusFilter('all');
        // Then open the form
        setShowForm(true);
        break;
      case 'view-applications':
        setActiveView('applications');
        break;
      case 'manage-jobs':
        setActiveView('jobs');
        setStatusFilter('all');
        break;
      case 'open-messages':
        // Messages is a separate page in the app router
        window.location.href = '/messages';
        break;
      case 'profile-settings':
        setActiveView('profile');
        break;
      default:
        break;
    }
  };

  const handleStatClick = (action: string) => {
    switch (action) {
      case 'jobs':
        setActiveView('jobs');
        setStatusFilter('open');
        break;
      case 'applications':
        setActiveView('applications');
        break;
      case 'messages':
        window.location.href = '/messages';
        break;
      case 'hires':
        setActiveView('jobs');
        break;
      default:
        break;
    }
  };

  const { data: dashboardStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // DEMO MODE: Return demo stats immediately
      if (demoMode) {
        return DEMO_STATS;
      }
      const res = await apiRequest("GET", "/api/analytics/dashboard");
      return res.json();
    },
    enabled: demoMode || !!user,
    staleTime: demoMode ? Infinity : undefined,
  });

  // Fetch shift message unread count (only when venue exists — avoids 500 for new venues)
  const venueId = venueMe && typeof venueMe === 'object' && 'id' in venueMe ? (venueMe as { id: string }).id : undefined;
  const { data: shiftMessageUnreadData } = useQuery({
    queryKey: ['shift-messages-unread-count', venueId],
    queryFn: async () => {
      // DEMO MODE: Return demo unread count immediately
      if (demoMode) {
        return { unreadCount: 3 };
      }
      try {
        const res = await apiRequest("GET", "/api/shifts/messages/unread-count");
        if (!res.ok) return { unreadCount: 0 };
        return res.json();
      } catch {
        return { unreadCount: 0 };
      }
    },
    enabled: demoMode || (!!user && !!venueId),
    // DOPAMINE SYNC: 5s refresh for investor demo - calendar stats update in real-time
    refetchInterval: 5000,
    staleTime: demoMode ? Infinity : undefined,
    retry: false,
    fallbackData: { unreadCount: 0 },
    throwOnError: false,
  });

  // Use API data for stats, but prefer local jobs calculation for consistency with the list view
  const openJobsCount = jobs.filter(job => job.status === 'open').length;
  
  const stats = {
    ...(dashboardStats?.summary || {}),
    openJobs: openJobsCount, // Override with local calculation
    totalApplications: pendingApplications.length,
    unreadMessages: (dashboardStats?.summary?.unreadMessages ?? 0) + (shiftMessageUnreadData?.unreadCount ?? 0), // Include shift messages
    monthlyHires: dashboardStats?.summary?.monthlyHires ?? 0
  };

  // DEMO MODE: Skip role check
  if (!demoMode && (!user || !isBusinessRole(user.currentRole))) {
    return <div>Access denied</div>;
  }

  // While venue is loading (data integrity check), show skeleton to avoid flashing dashboard then Profile Incomplete
  if (!demoMode && !!user?.id && isLoadingVenue) {
    return <VenueDashboardSkeleton />;
  }

  // Data integrity: show "Profile Incomplete" when venue fetch returned 404 (no venue record)
  if (isProfileIncomplete) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden flex items-center justify-center p-4">
        <SEO title="Profile Incomplete | Business Dashboard" />
        <Card className="max-w-md w-full border-2 border-amber-500/50 bg-card">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4">
                <AlertTriangle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-center text-xl">Profile Incomplete</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Your venue profile hasn&apos;t been set up yet. Finish setup to access your dashboard and post shifts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button
              onClick={() => navigate('/onboarding/hub', { replace: true })}
              className="w-full"
              size="lg"
              data-testid="button-finish-setup"
            >
              Finish Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" data-testid="venue-dashboard-loaded">
      {/* PERFORMANCE: Route signal for E2E - confirms dashboard-specific content is ready */}
      <div data-testid="route-loaded-signal" aria-hidden="true" style={{ display: 'none' }} />
      <SEO title="Business Dashboard" />
      
      {/* Setup Complete Confetti Celebration */}
      {showSetupConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.3}
          colors={['#BAFF39', '#84cc16', '#22c55e', '#10b981', '#ffffff', '#fbbf24']}
          confettiSource={{ x: windowSize.width / 2, y: windowSize.height / 3, w: 0, h: 0 }}
        />
      )}
      
      {/* Banner/Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          bannerImage={user?.bannerUrl || user?.bannerImage}
          profileImage={user?.avatarUrl || user?.photoURL || user?.profileImageURL || user?.profileImage}
          title={user?.displayName || "Business Dashboard"}
          subtitle={user?.email}
          editable={isEditingProfile}
          onBannerUpload={(url) => {
            // DashboardHeader already calls API and saves to DB
            // Update local state for immediate UI update (including Profile Settings preview)
            setProfileData(prev => ({ ...prev, bannerUrl: url }));
            // Refresh user in background without blocking
            refreshUser().catch(err => console.error('Failed to refresh user:', err));
          }}
          onLogoUpload={(url) => {
            // DashboardHeader already calls API and saves to DB
            // Update local state for immediate UI update (including Profile Settings preview)
            setProfileData(prev => ({ ...prev, avatarUrl: url }));
            // Refresh user in background without blocking
            refreshUser().catch(err => console.error('Failed to refresh user:', err));
          }}
        />
      </div>

      {/* Dashboard Header */}
      <div className="bg-card/95 backdrop-blur-sm shadow-lg border-b-2 border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tighter text-foreground" style={{ fontFamily: 'Urbanist, sans-serif' }}>Logistics Engine</h1>
                {/* Xero Status Pill - High visibility for investor demo */}
                {isXeroConnected && (
                  <Badge 
                    className="flex items-center gap-1.5 px-3 py-1 border-2 border-[#BAFF39] bg-[#BAFF39]/10 text-[#BAFF39] font-semibold shadow-[0_0_10px_rgba(186,255,57,0.3)] hover:shadow-[0_0_15px_rgba(186,255,57,0.4)] transition-shadow"
                    data-testid="xero-status-pill"
                  >
                    <XeroLogo className="h-3.5 w-3.5" />
                    <span className="text-xs">Connected to Xero</span>
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{user.displayName || user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TutorialTrigger />
              {/* Xero Quick Link Button */}
              {isXeroConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#BAFF39]/50 text-[#BAFF39] hover:bg-[#BAFF39]/10 hover:border-[#BAFF39]"
                  onClick={() => navigate('/settings?category=integrations')}
                  data-testid="button-xero-quick-link"
                >
                  <XeroLogo className="mr-1.5 h-4 w-4" />
                  Xero Sync
                </Button>
              )}
              <Button 
                id="messages-btn"
                onClick={() => handleQuickAction('open-messages')}
                className="bg-gradient-to-r from-steel-700 to-steel-800 hover:from-steel-800 hover:to-steel-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-open-messages"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button 
                id="post-job-btn"
                onClick={() => handleQuickAction('post-job')}
                variant="accent"
                className="shadow-neon-realistic"
                data-testid="button-post-job"
              >
                <Plus className="mr-2 h-4 w-4" />
                Post New Job
              </Button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex justify-between md:justify-start md:space-x-8 pb-2 md:pb-0 mt-4 overflow-x-hidden">
            <button
              onClick={() => setActiveView('overview')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-overview"
            >
              <LayoutDashboard className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Overview</span>
            </button>
            <button
              onClick={() => setActiveView('jobs')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'jobs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-jobs"
            >
              <Briefcase className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Jobs</span>
              <span className="hidden md:inline text-muted-foreground">({jobs.length})</span>
            </button>
            <button
              onClick={() => setActiveView('applications')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'applications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-applications"
            >
              <Users className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Applications</span>
              <span className="hidden md:inline text-muted-foreground">({stats.totalApplications})</span>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'calendar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-calendar"
            >
              <Calendar className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Calendar</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'analytics'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-analytics"
            >
              <BarChart3 className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Analytics</span>
            </button>
            <button
              id="profile-tab-trigger"
              onClick={() => setActiveView('profile')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-300'
              }`}
              data-testid="tab-profile"
            >
              <User className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Profile</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-pt-20">
        {/* Subscription and Stripe banners: vertical stack with gap so they don't overlap on small screens */}
        <div className="flex flex-col gap-4">
          {/* Onboarding Incomplete Banner - Shows when hub user has no active subscription */}
          <CompleteSetupBanner />

          {/* Stripe Connect Incomplete Banner */}
          <StripeConnectBanner />
        </div>

        {/* Venue Status Card: hide when Stripe Connection is missing (can't be verified until connected) */}
        {isStripeComplete && <VenueStatusCard />}

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Dashboard Stats */}
            {isLoadingStats ? (
              <DashboardStatsSkeleton />
            ) : (
              <DashboardStats role="hub" stats={stats} onStatClick={handleStatClick} />
            )}
            
            {/* Payroll Readiness Widget - High visibility for Lucas during investor demo */}
            {isXeroConnected && payrollReadiness && (
              <Card 
                className="group relative overflow-hidden bg-gradient-to-r from-[#BAFF39]/5 to-transparent border-2 border-[#BAFF39]/30 shadow-[0_0_20px_rgba(186,255,57,0.1)] hover:shadow-[0_0_30px_rgba(186,255,57,0.2)] transition-all duration-300 cursor-pointer"
                onClick={() => navigate('/settings?category=integrations')}
                data-testid="payroll-readiness-widget"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#BAFF39] via-[#BAFF39]/50 to-transparent" />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl p-3 bg-[#BAFF39] border border-[#BAFF39] shadow-neon-realistic">
                        <ShieldCheck className="h-6 w-6 text-black" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">Payroll Readiness</h3>
                          <Badge className="bg-[#BAFF39]/20 text-[#BAFF39] border-[#BAFF39]/30 text-xs">
                            <XeroLogo className="h-3 w-3 mr-1" />
                            Xero
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payrollReadiness.approvedShifts} of {payrollReadiness.completedShifts} completed shifts approved for sync
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="text-4xl font-bold text-[#BAFF39] drop-shadow-[0_0_10px_rgba(186,255,57,0.5)]">
                          {payrollReadiness.percentage}%
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">Ready</p>
                      </div>
                      {payrollReadiness.pendingApproval > 0 && (
                        <div className="text-center border-l border-border/50 pl-6">
                          <span className="text-2xl font-semibold text-amber-500">
                            {payrollReadiness.pendingApproval}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">Pending</p>
                        </div>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[#BAFF39] hover:text-[#BAFF39] hover:bg-[#BAFF39]/10"
                      >
                        Ready to Sync
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="bg-card rounded-lg border border-border shadow-sm">
              <CardHeader className="bg-card border-b border-border">
                <CardTitle className="text-foreground">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Xero Sync Logs - High visibility for investor demo */}
                  {isXeroConnected && recentXeroSyncLogs.length > 0 && recentXeroSyncLogs.map((log) => (
                    <div 
                      key={`xero-${log.id}`}
                      className="flex items-center justify-between p-3 bg-[#BAFF39]/5 border border-[#BAFF39]/20 rounded-lg cursor-pointer hover:bg-[#BAFF39]/10 transition-colors"
                      onClick={() => navigate('/settings?category=integrations')}
                      data-testid={`xero-sync-log-${log.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full p-2 bg-[#BAFF39]/20">
                          <ShieldCheck className="h-4 w-4 text-[#BAFF39]" />
                        </div>
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            Payroll Synced to Xero
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                log.status === 'success' 
                                  ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                                  : log.status === 'partial'
                                  ? 'bg-[#BAFF39]/20 text-[#BAFF39] border-[#BAFF39]/30'
                                  : 'bg-red-500/20 text-red-500 border-red-500/30'
                              }`}
                            >
                              {log.status === 'success' ? 'Success' : log.status === 'partial' ? 'Partial' : 'Failed'}
                            </Badge>
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Period ending {formatDateSafe(log.dateRange.end, "MMM d, yyyy")} • {log.totalHours.toFixed(1)} hours
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateSafe(log.syncedAt, "MMM d")}
                      </span>
                    </div>
                  ))}
                  
                  {/* Regular Job Activity */}
                  {(jobs || []).slice(0, 3).map((job) => (
                    <div 
                      key={job.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <div>
                        <h4 className="font-medium">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.applicants?.length || 0} applications • Posted {formatDateSafe(job.createdAt, "MMM d")}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-steel-100 text-steel-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                  {jobs.length === 0 && !isXeroConnected && (
                    <p className="text-muted-foreground text-center py-4">
                      No recent activity. Post your first job to get started!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Jobs Tab */}
        {activeView === 'jobs' && (
          <div>
            {!showForm && (
              <div className="mb-6 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button 
                    variant={statusFilter === 'open' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('open')}
                    size="sm"
                    className={statusFilter === 'open' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Open
                  </Button>
                  <Button 
                    variant={statusFilter === 'filled' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('filled')}
                    size="sm"
                  >
                    Filled
                  </Button>
                  <Button 
                    variant={statusFilter === 'completed' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('completed')}
                    size="sm"
                  >
                    Completed
                  </Button>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-blue-700"
                  data-testid="button-show-job-form"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Post New Job
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
              {/* Post Job Form */}
              {showForm && (
                <div className="lg:col-span-1">
                  <Card className="bg-card rounded-lg border border-border shadow-sm">
                    <CardHeader className="border-b border-border">
                      <div className="flex justify-between items-center">
                        <CardTitle>Post a New Job</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowForm(false)}
                          data-testid="button-close-job-form"
                        >
                          ✕
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="title">Job Title</Label>
                          <Input
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Weekend Staff Needed"
                            data-testid="input-job-title"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the role and requirements..."
                            data-testid="input-job-description"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="date">Date</Label>
                            <Input
                              id="date"
                              type="date"
                              required
                              value={formData.date}
                              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                              min={format(new Date(), 'yyyy-MM-dd')}
                              data-testid="input-job-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input
                              id="startTime"
                              type="time"
                              required
                              value={formData.startTime}
                              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                              data-testid="input-job-start-time"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="skills">Skills Required (comma-separated)</Label>
                          <Input
                            id="skills"
                            value={formData.skillsRequired}
                            onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
                            placeholder="e.g., Hair cutting, Beard trimming, Color"
                            data-testid="input-job-skills"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="payRate">Pay Rate</Label>
                            <Input
                              id="payRate"
                              type="number"
                              step="0.01"
                              required
                              value={formData.payRate}
                              onChange={(e) => setFormData({ ...formData, payRate: e.target.value })}
                              placeholder="0.00"
                              data-testid="input-job-pay"
                            />
                          </div>
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              required
                              value={formData.location.city}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                location: { ...formData.location, city: e.target.value }
                              })}
                              placeholder="City"
                              data-testid="input-job-city"
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createJobMutation.isPending}
                          data-testid="button-submit-job"
                        >
                          {createJobMutation.isPending ? "Posting..." : "Post Job"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Posted Jobs List */}
              <div className={showForm ? "lg:col-span-2" : "lg:col-span-3"}>
                <Card className="bg-card rounded-lg border border-border shadow-sm">
                  <CardHeader className="border-b border-border">
                    <CardTitle>Your Posted Jobs {statusFilter !== 'all' && <span className="text-sm font-normal text-muted-foreground capitalize">({statusFilter})</span>}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isLoading ? (
                      <ShiftListSkeleton count={3} />
                    ) : jobs.filter(job => statusFilter === 'all' || job.status === statusFilter).length === 0 ? (
                      <EmptyState
                        icon={Briefcase}
                        title={statusFilter === 'all' ? "The Engine is Idling" : `No ${statusFilter} shifts found`}
                        description={statusFilter === 'all' 
                          ? "Your venue is ready for action. Post your first shift to ignite the roster and connect with verified professionals in your area."
                          : `No ${statusFilter} shifts match your current filter. Try adjusting filters or create a new shift.`}
                        action={statusFilter === 'all' ? {
                          label: "Post Your First Shift",
                          onClick: () => setShowForm(true),
                          variant: "default",
                          className: "bg-[#BAFF39] hover:bg-[#BAFF39]/90 text-black font-semibold shadow-[0_0_15px_rgba(186,255,57,0.3)]"
                        } : undefined}
                      />
                    ) : (
                      <div className="space-y-4">
                        {(jobs || []).filter(job => statusFilter === 'all' || job.status === statusFilter).map((job) => {
                          const jobType = (job as any)._type || 'job';
                          const isShift = jobType === 'shift';
                          // Check ownership: shifts use employerId, jobs use businessId
                          const isOwner = isShift 
                            ? (job as any).employerId === user?.id
                            : (job as any).businessId === user?.id;
                          return (
                          <Card key={job.id} className="border border-border" data-testid={`card-job-${job.id}`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 
                                  className="font-semibold text-foreground hover:text-primary cursor-pointer transition-colors" 
                                  data-testid={`text-job-title-${job.id}`}
                                  onClick={() => navigate(isShift ? `/shifts/${job.id}` : `/jobs/${job.id}`)}
                                >
                                  {job.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" data-testid={`status-badge-trigger-${job.id}`}>
                                        <span 
                                          className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
                                            job.status === 'open' ? 'bg-success text-white' : 
                                            job.status === 'filled' ? 'bg-blue-500 text-white' :
                                            'bg-muted text-muted-foreground'
                                          }`}
                                          data-testid={`status-job-${job.id}`}
                                        >
                                          {job.status}
                                        </span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'open', type: jobType as 'shift' | 'job' })}>
                                        Mark as Open
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'filled', type: jobType as 'shift' | 'job' })}>
                                        Mark as Filled
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'completed', type: jobType as 'shift' | 'job' })}>
                                        Mark as Completed
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  {isOwner && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          disabled={deleteItemMutation.isPending && deleteItemMutation.variables?.id === job.id}
                                        >
                                          {deleteItemMutation.isPending && deleteItemMutation.variables?.id === job.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will remove the {isShift ? 'shift' : 'job'} and cancel all applications. This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteItemMutation.mutate({ id: job.id, type: jobType as 'shift' | 'job' })}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </div>
                              <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-date-${job.id}`}>
                                    {formatDateSafe(job.date, "EEE, MMM d, yyyy", 'Date TBD')}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <DollarSign className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-pay-${job.id}`}>
                                    ${job.payRate}/hr
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <Users className="mr-2 h-4 w-4 text-primary" />
                                  <span data-testid={`text-job-applicants-${job.id}`}>
                                    {job.applicationCount || 0} applicants
                                  </span>
                                </div>
                              </div>
                              {isShift && (job.applicationCount || 0) > 0 && (
                                <div className="mb-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedShiftId(job.id);
                                      setIsCandidatesDialogOpen(true);
                                    }}
                                    className="w-full"
                                  >
                                    <Users className="mr-2 h-4 w-4" />
                                    View Candidates
                                  </Button>
                                </div>
                              )}
                              {/* Late Arrival ETA Alert - Show when worker has reported being late */}
                              {isShift && isOwner && (job as any).lateArrivalSignalSent && (job as any).lateArrivalEtaMinutes && (() => {
                                const etaMinutes = (job as any).lateArrivalEtaMinutes;
                                const etaSetAt = (job as any).lateArrivalEtaSetAt;
                                const shiftStart = job.startTime ? new Date(job.startTime) : null;
                                const expectedArrival = shiftStart ? new Date(shiftStart.getTime() + etaMinutes * 60 * 1000) : null;
                                
                                return (
                                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/50 rounded-md">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                          Worker Running Late
                                        </p>
                                        <p className="text-sm text-amber-800 dark:text-amber-200">
                                          Expected arrival: {expectedArrival ? expectedArrival.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'TBD'} ({etaMinutes} min delay)
                                        </p>
                                        {etaSetAt && (
                                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                            Reported {new Date(etaSetAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                              {/* Find Backup Button - Show when worker is >5 min late without check-in */}
                              {isShift && isOwner && (job.status === 'filled' || job.status === 'confirmed') && job.assigneeId && (() => {
                                const shiftStart = job.startTime ? new Date(job.startTime) : null;
                                const now = new Date();
                                const attendanceStatus = (job as any).attendanceStatus;
                                const backupRequested = (job as any).backupRequestedAt;
                                const backupAssigned = (job as any).backupWorkerId;
                                
                                if (!shiftStart) return null;
                                
                                const minutesLate = (now.getTime() - shiftStart.getTime()) / (1000 * 60);
                                const isCheckedIn = attendanceStatus === 'checked_in';
                                const isLate = minutesLate > 5;
                                const canRequestBackup = isLate && !isCheckedIn && !backupRequested && !backupAssigned;
                                
                                if (!canRequestBackup) return null;
                                
                                return (
                                  <div className="mt-3">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm('Request backup from waitlist? This will notify the top 3 waitlisted workers. Once a backup accepts, the original worker will be cancelled with late-cancel penalties.')) {
                                          requestBackupMutation.mutate(job.id);
                                        }
                                      }}
                                      disabled={requestBackupMutation.isPending}
                                      className="w-full"
                                    >
                                      {requestBackupMutation.isPending ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Requesting...
                                        </>
                                      ) : (
                                        <>
                                          <Users className="mr-2 h-4 w-4" />
                                          Find Backup ({Math.round(minutesLate)} min late)
                                        </>
                                      )}
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-1 text-center">
                                      Worker is {Math.round(minutesLate)} minutes late without check-in
                                    </p>
                                  </div>
                                );
                              })()}
                              {/* Backup Requested Status */}
                              {isShift && isOwner && (job as any).backupRequestedAt && !(job as any).backupWorkerId && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-500/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <p className="text-sm text-blue-900 dark:text-blue-100">
                                      Backup requested - Waiting for waitlisted worker to accept
                                    </p>
                                  </div>
                                </div>
                              )}
                              {/* Backup Assigned Status */}
                              {isShift && isOwner && (job as any).backupWorkerId && (
                                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-500/50 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <p className="text-sm text-green-900 dark:text-green-100">
                                      Backup worker assigned - Original worker cancelled
                                    </p>
                                  </div>
                                </div>
                              )}
                              {/* Complete Shift Button - Only show for filled/confirmed shifts after end time */}
                              {isShift && isOwner && (job.status === 'filled' || job.status === 'confirmed' || job.status === 'pending_completion') && job.assigneeId && (() => {
                                try {
                                  const endTime = job.endTime ? new Date(job.endTime) : null;
                                  const now = new Date();
                                  const canComplete = endTime && now >= endTime && job.status !== 'completed';
                                  const isPendingCompletion = job.status === 'pending_completion';
                                  return canComplete || isPendingCompletion ? (
                                    <div className="mt-3">
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                          // Show proof photo if available, otherwise complete directly
                                          if ((job as any).proofImageUrl) {
                                            setShiftToComplete({ id: job.id, proofImageUrl: (job as any).proofImageUrl });
                                          } else {
                                            completeShiftMutation.mutate(job.id);
                                          }
                                        }}
                                        disabled={completeShiftMutation.isPending}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        {completeShiftMutation.isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Completing...
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            {isPendingCompletion ? 'Review & Complete' : 'Complete Shift'}
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  ) : null;
                                } catch {
                                  return null;
                                }
                              })()}
                              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-job-description-${job.id}`}>
                                {job.description}
                              </p>
                              {job.skillsRequired && job.skillsRequired.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {(job.skillsRequired || []).map((skill: any, index: number) => (
                                    <span 
                                      key={`${skill}-${index}`}
                                      className="bg-primary/10 text-primary px-2 py-1 rounded text-xs"
                                      data-testid={`tag-skill-${job.id}-${index}`}
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {/* Applications Tab */}
        {activeView === 'applications' && (
          <div className="space-y-6">
            <Card className="bg-card rounded-lg border border-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle>Job Applications</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingApplications ? (
                   <ApplicantCardSkeleton count={3} />
                ) : applications.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="The Talent Pipeline is Clear"
                    description="Your roster awaits its first candidate. Once you post shifts, verified professionals will start applying. Your A-Team is just a click away."
                    action={{
                      label: "Post a Shift to Attract Talent",
                      onClick: () => setActiveView('jobs'),
                      variant: "default",
                      className: "bg-[#BAFF39] hover:bg-[#BAFF39]/90 text-black font-semibold shadow-[0_0_15px_rgba(186,255,57,0.3)]"
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                     {(applications || []).map((app: any) => (
                        <div key={app.id} className="border rounded-lg p-4 hover:bg-muted transition-colors">
                           <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                 <h3 className="font-medium text-lg break-words overflow-hidden">{app.name}</h3>
                                 <p className="text-sm text-muted-foreground break-all">{app.email}</p>
                                 <div className="mt-2 text-sm text-muted-foreground">
                                    Applying for: <span className="font-medium text-foreground break-words">{app.job?.title || app.shift?.title || 'Unknown Position'}</span>
                                 </div>
                                 {(!app.job && !app.shift) && (
                                   <p className="text-xs text-amber-600 mt-1">Warning: Original job/shift may have been deleted</p>
                                 )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  app.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                  app.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                  'bg-muted text-foreground'
                                }`}>
                                   {app.status}
                                </span>
                              </div>
                           </div>
                           {app.coverLetter && (
                              <div className="mt-4 text-sm bg-card p-3 rounded border text-muted-foreground italic break-words overflow-hidden">
                                 "{app.coverLetter}"
                              </div>
                           )}
                           <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between items-center">
                              <span>Applied on {new Date(app.appliedAt).toLocaleDateString()}</span>
                              {/* Future: Add Accept/Reject buttons here */}
                           </div>
                        </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Calendar Tab */}
        {activeView === 'calendar' && (
          <div id="calendar-view">
            <div className="flex justify-end mb-4">
              <Button
                onClick={handleCreateShift}
                data-testid="button-create-shift"
                variant="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Shift
              </Button>
            </div>
            <ProfessionalCalendar
              bookings={calendarBookings}
              isLoading={isLoading}
              mode="business"
              onCreateShift={handleCreateShift}
              onDateSelect={(date) => {
                setSelectedDateForShift(date);
                setShowCreateShiftModal(true);
              }}
            />
          </div>
        )}
        
        {/* Profile Tab */}
        {activeView === 'profile' && (
          <div className="max-w-4xl">
            <Card className="bg-card rounded-lg border border-border shadow-sm">
              <CardContent className="p-0">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Profile Header with Banner and Avatar */}
                  <div className="relative overflow-visible z-0">
                    {/* Debug: Show what data we have */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-red-500 mb-2 p-2 bg-red-50 rounded">
                        DEBUG: profileData.bannerUrl = {profileData.bannerUrl ? 'Has Image' : 'Empty'} | 
                        URL: {profileData.bannerUrl ? profileData.bannerUrl.substring(0, 50) + '...' : 'null'}
                      </div>
                    )}
                    <ProfileHeader
                      key={`profile-header-${profileData.bannerUrl || 'no-banner'}-${profileData.avatarUrl || 'no-avatar'}`}
                      bannerUrl={profileData.bannerUrl}
                      avatarUrl={profileData.avatarUrl}
                      displayName={profileData.displayName || user?.displayName || 'Business'}
                      editable={isEditingProfile}
                      onBannerUpload={isEditingProfile ? (url) => {
                        // ProfileHeader already calls API and saves to DB
                        // Just update local state for immediate UI update
                        setProfileData(prev => ({ ...prev, bannerUrl: url }));
                        // Refresh user in background without blocking
                        refreshUser().catch(err => console.error('Failed to refresh user:', err));
                      } : undefined}
                      onAvatarUpload={isEditingProfile ? (url) => {
                        // ProfileHeader already calls API and saves to DB
                        // Just update local state for immediate UI update
                        setProfileData(prev => ({ ...prev, avatarUrl: url }));
                        // Refresh user in background without blocking
                        refreshUser().catch(err => console.error('Failed to refresh user:', err));
                      } : undefined}
                    />
                  </div>
                  
                  {/* Title and Edit Button - positioned below banner with padding for avatar */}
                  <div className="px-4 md:px-6 pt-12 md:pt-20 lg:pt-24 pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Settings
                      </CardTitle>
                      <div className="flex gap-2">
                        {!isEditingProfile ? (
                          <Button type="button" onClick={() => setIsEditingProfile(true)} variant="outline" data-testid="button-edit-profile">
                            Edit Profile
                          </Button>
                        ) : (
                          <>
                            <Button type="button" onClick={() => setIsEditingProfile(false)} variant="outline" data-testid="button-cancel-edit">
                              Cancel
                            </Button>
                            <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                              {updateProfileMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Form fields */}
                  <div className="px-6 pb-6 mb-20 md:mb-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                          placeholder="Enter your business name"
                          disabled={!isEditingProfile}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio / Description</Label>
                        <Textarea
                          id="bio"
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          placeholder="Tell us about your business..."
                          rows={4}
                          disabled={!isEditingProfile}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          placeholder="e.g., New York, NY"
                          disabled={!isEditingProfile}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeView === 'analytics' && (
          <div className="space-y-6">
            <Suspense fallback={<DashboardStatsSkeleton />}>
              <VenueAnalyticsDashboard />
            </Suspense>
          </div>
        )}
      </div>

      {/* Create Shift Modal */}
      <CreateShiftModal
        isOpen={showCreateShiftModal}
        onClose={() => {
          setShowCreateShiftModal(false);
          setSelectedDateForShift(undefined);
        }}
        onSubmit={(shiftData, recurringShifts) => {
          createShiftMutation.mutate({ shiftData, recurringShifts });
        }}
        initialDate={selectedDateForShift}
        isLoading={createShiftMutation.isPending}
        existingShifts={jobs?.map((job) => {
          const startTime = job.startTime || job.date;
          const startDate = toDateSafe(startTime);
          const endTime = job.endTime || (startDate 
            ? toISOStringSafe(new Date(startDate.getTime() + 8 * 60 * 60 * 1000))
            : new Date().toISOString());
          
          return {
            id: job.id,
            startTime: startTime || new Date().toISOString(),
            endTime: endTime,
          };
        }) || []}
      />

      {/* Candidates Dialog */}
      {selectedShiftId && (
        <CandidatesDialog
          shiftId={selectedShiftId}
          isOpen={isCandidatesDialogOpen}
          onClose={() => {
            setIsCandidatesDialogOpen(false);
            setSelectedShiftId(null);
          }}
        />
      )}

      {/* Shift Completion Modal with Proof Photo */}
      <Dialog open={!!shiftToComplete} onOpenChange={(open) => !open && setShiftToComplete(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Shift Completion</DialogTitle>
            <DialogDescription>
              Please review the proof photo before completing the shift and processing the payout.
            </DialogDescription>
          </DialogHeader>
          {shiftToComplete?.proofImageUrl && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-2 border-border bg-muted">
                <img
                  src={shiftToComplete.proofImageUrl}
                  alt="Shift completion proof"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Worker has provided this photo as proof of shift completion.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShiftToComplete(null)}
              disabled={completeShiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (shiftToComplete) {
                  completeShiftMutation.mutate(shiftToComplete.id);
                  setShiftToComplete(null);
                }
              }}
              disabled={completeShiftMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {completeShiftMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Candidates Dialog Component
function CandidatesDialog({ 
  shiftId, 
  isOpen, 
  onClose 
}: { 
  shiftId: string | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const demoMode = isDemoMode();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['shift-applications', shiftId],
    queryFn: () => {
      // DEMO MODE: Return demo shift applications
      if (demoMode) {
        return Promise.resolve(DEMO_SHIFT_APPLICATIONS.filter(app => app.shiftId === shiftId));
      }
      return getShiftApplications(shiftId!);
    },
    enabled: (demoMode || !!shiftId) && isOpen,
    staleTime: demoMode ? Infinity : undefined,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: 'accepted' | 'rejected' }) =>
      updateApplicationStatus(applicationId, status),
    onSuccess: (_, variables) => {
      toast({
        title: 'Application status updated',
        description: variables.status === 'accepted' 
          ? 'The candidate has been accepted and notified.' 
          : 'The candidate has been rejected and notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['shift-applications', shiftId] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleAccept = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'accepted' });
  };

  const handleReject = (applicationId: string) => {
    updateStatusMutation.mutate({ applicationId, status: 'rejected' });
  };

  const handleMessage = async (application: ShiftApplication) => {
    if (!application.userId) {
      toast({
        title: 'Error',
        description: 'Unable to message candidate. User information not available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await apiRequest('POST', '/api/conversations', {
        participant2Id: application.userId,
        shiftId: shiftId,
      });
      const data = await res.json();
      navigate(`/messages?conversation=${data.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getApplicationStatusBadge(status: ShiftApplication['status']) {
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
            Accepted
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Candidates</DialogTitle>
          <DialogDescription>
            Review and manage applications for this shift
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading candidates...</div>
        ) : !applications || applications.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No applicants yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(applications || []).map((application) => (
              <Card key={application.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {application.applicant?.avatarUrl ? (
                        <OptimizedImage
                          src={application.applicant.avatarUrl}
                          alt={application.applicant.displayName}
                          fallbackType="user"
                          className="w-12 h-12 rounded-full object-cover"
                          containerClassName="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1">
                          {application.applicant?.displayName || application.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-1">{application.email}</p>
                        {application.applicant?.rating !== null && application.applicant?.rating !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{application.applicant.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Applied {formatDate(application.appliedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {getApplicationStatusBadge(application.status)}
                    </div>
                  </div>

                  {application.coverLetter && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words bg-muted p-3 rounded border border-border">
                        {application.coverLetter}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {application.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleAccept(application.id)}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept
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
                        onClick={() => handleMessage(application)}
                        variant="outline"
                        size="sm"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
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
  );
}