import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Loader2, ExternalLink, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isDemoMode, DEMO_VENUE } from '@/lib/demo-data';

interface VenueData {
  id: string;
  userId: string;
  venueName: string;
  status: 'pending' | 'active';
  createdAt: string;
  updatedAt: string;
}

/**
 * VenueStatusCard - Displays venue activation status and onboarding CTA
 * Shows "Verified" badge when active, "Action Required" when pending
 * 
 * DEMO MODE: When isDemoMode() returns true, returns hardcoded DEMO_VENUE
 * data immediately without making API calls.
 */
export function VenueStatusCard() {
  const { user, isSystemReady, isLoading: isAuthLoading, hasFirebaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // DEMO MODE: Return demo venue data immediately
  const demoMode = isDemoMode();
  const canFetchVenue = !!user?.id && isSystemReady && hasFirebaseUser && !isAuthLoading;

  // Check for onboarding completion callback
  React.useEffect(() => {
    const onboardingStatus = searchParams.get('onboarding');
    if (onboardingStatus === 'complete') {
      toast({
        title: "Stripe Setup Complete!",
        description: "Your venue is now live on the marketplace.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['venue-status', user?.id] });
      // Clean up URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('onboarding');
      setSearchParams(newParams, { replace: true });
    } else if (onboardingStatus === 'refresh') {
      toast({
        title: "Setup Incomplete",
        description: "Please complete all required steps to activate your venue.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['venue-status', user?.id] });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('onboarding');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, toast, queryClient, user?.id, setSearchParams]);

  // Fetch venue status (DEMO MODE: return hardcoded data immediately)
  const { data: venue, isLoading, error } = useQuery<VenueData | null>({
    queryKey: ['venue-status', user?.id],
    queryFn: async () => {
      // DEMO MODE BYPASS: Return demo venue data immediately
      if (demoMode) {
        return DEMO_VENUE as VenueData;
      }
      
      try {
        const res = await apiRequest('GET', '/api/venues/me');
        return res.json();
      } catch (err) {
        // Handle 404 gracefully - it's expected when user doesn't have a venue
        if (err instanceof Error && err.message.includes('404:')) {
          return null;
        }
        // Re-throw other errors
        throw err;
      }
    },
    enabled: demoMode || (canFetchVenue && !!user?.roles?.includes('venue_owner') && (user.currentRole === 'hub' || user.currentRole === 'business')),
    staleTime: demoMode ? Infinity : 2 * 60 * 1000, // Demo mode: never refetch
    refetchInterval: demoMode ? false : 30 * 1000, // Demo mode: no refetch
    retry: (failureCount, error) => {
      // Don't retry in demo mode or on 404 errors
      if (demoMode) return false;
      if (error instanceof Error && error.message.includes('404:')) {
        return false;
      }
      return false; // Don't retry other errors either
    },
    throwOnError: false, // Don't throw on 404 - it's expected
  });

  // Create Stripe account link mutation
  const createAccountLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/create-account-link');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create account link');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.accountLink) {
        // Redirect to Stripe onboarding
        window.location.href = data.accountLink;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to connect with Stripe. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Don't show if user is not a venue owner or if no venue exists
  const isHubOrBusiness = user?.currentRole === 'hub' || user?.currentRole === 'business';
  
  if (!isHubOrBusiness) {
    return null;
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state or no venue
  if (error || !venue) {
    return null; // Don't show card if there's an error or no venue
  }

  const isActive = venue.status === 'active';

  return (
    <Card className={`bg-card border-border ${isActive ? 'border-green-500/30' : 'border-amber-500/30'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isActive ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            Venue Status
          </span>
          <Badge
            variant={isActive ? 'default' : 'outline'}
            className={
              isActive
                ? 'bg-green-500 text-white border-green-600'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            }
          >
            {isActive ? 'Verified' : 'Action Required'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isActive ? (
            <>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Live on Marketplace</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your venue "{venue.venueName}" is verified and active. You can now receive payments and manage shifts.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Onboarding Required</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete your Stripe Connect onboarding to activate your venue and start receiving payments.
              </p>
              <Button
                onClick={() => createAccountLinkMutation.mutate()}
                disabled={createAccountLinkMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {createAccountLinkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Complete Stripe Onboarding
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default VenueStatusCard;
