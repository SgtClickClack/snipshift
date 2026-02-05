import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

const DISMISSAL_KEY = 'hospogo_stripe_banner_dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * StripeConnectBanner - Displays a dismissible banner for venue users
 * who have not completed their Stripe Connect onboarding.
 */
export function StripeConnectBanner() {
  const { user, isSystemReady, isLoading: isAuthLoading, hasFirebaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal state
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime < DISMISSAL_DURATION_MS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISSAL_KEY);
      }
    }
  }, []);

  // Check for onboarding completion callback
  useEffect(() => {
    const onboardingStatus = searchParams.get('onboarding');
    if (onboardingStatus === 'complete') {
      toast({
        title: "Stripe Setup Complete!",
        description: "Your Stripe Connect account has been verified successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['stripe-connect-account-status', user?.id] });
      // Clean up URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('onboarding');
      setSearchParams(newParams, { replace: true });
    } else if (onboardingStatus === 'refresh') {
      toast({
        title: "Setup Incomplete",
        description: "Please complete all required steps to finish setting up your Stripe account.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['stripe-connect-account-status', user?.id] });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('onboarding');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, toast, queryClient, user?.id, setSearchParams]);

  // Fetch Stripe Connect account status
  const { data: accountStatus, isLoading } = useQuery({
    queryKey: ['stripe-connect-account-status', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stripe-connect/account/status');
      if (res.status === 404) {
        return { hasAccount: false, onboardingComplete: false, chargesEnabled: false };
      }
      return res.json();
    },
    enabled: !!user?.id && isSystemReady && hasFirebaseUser && !isAuthLoading && (user.currentRole === 'hub' || user.currentRole === 'business'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const connectStripeMutation = useMutation({
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

  // Don't show if:
  // - User is not a hub/business
  // - Still loading
  // - Stripe Connect is complete
  // - Banner was dismissed
  const isHubOrBusiness = user?.currentRole === 'hub' || user?.currentRole === 'business';
  const hasStripeAccount = accountStatus?.hasAccount || false;
  const isStripeComplete = accountStatus?.onboardingComplete && accountStatus?.chargesEnabled;
  
  if (!isHubOrBusiness || isLoading || isStripeComplete || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  const handleConnectStripe = () => {
    connectStripeMutation.mutate();
  };

  return (
    <div 
      className="w-full max-w-full bg-gradient-to-r from-orange-600/15 via-orange-500/10 to-amber-600/15 border border-orange-500/40 rounded-lg p-4 mb-6"
      role="alert"
      data-testid="stripe-connect-banner"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
          <div className="shrink-0">
            <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-orange-500/25 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-orange-100 mb-1 break-words">
            {hasStripeAccount ? 'Stripe Setup Incomplete' : 'Connect with Stripe'}
          </h3>
          <p className="text-sm text-orange-200/90 mb-3 break-words">
            {hasStripeAccount 
              ? 'Please complete your Stripe Connect verification to start receiving payments securely.'
              : 'Connect your Stripe account to enable secure payment processing and identity verification for your venue.'}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleConnectStripe}
              size="sm"
              disabled={connectStripeMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white border-orange-400/30"
            >
              {connectStripeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {hasStripeAccount ? 'Complete Setup' : 'Connect with Stripe'}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-orange-200 hover:text-orange-100 hover:bg-orange-500/20"
              data-testid="button-dismiss-stripe-banner"
            >
              Remind me later
            </Button>
          </div>
        </div>
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-full hover:bg-orange-500/25 transition-colors self-start md:self-center"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4 md:h-5 md:w-5 text-orange-300" />
        </button>
      </div>
    </div>
  );
}

export default StripeConnectBanner;
