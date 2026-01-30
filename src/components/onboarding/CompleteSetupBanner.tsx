import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, X, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

const DISMISSAL_KEY = 'hospogo_setup_banner_dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CompleteSetupBannerProps {
  className?: string;
}

/**
 * CompleteSetupBanner - Displays a dismissible banner for hub/business users
 * who have not completed their subscription setup.
 * 
 * This addresses the "zombie state" where users close the browser during
 * onboarding and reach the dashboard without an active subscription.
 */
export function CompleteSetupBanner({ className = '' }: CompleteSetupBannerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal state
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      // If dismissed less than 24 hours ago, keep it dismissed
      if (now - dismissedTime < DISMISSAL_DURATION_MS) {
        setIsDismissed(true);
      } else {
        // Clear stale dismissal
        localStorage.removeItem(DISMISSAL_KEY);
      }
    }
  }, []);

  // Fetch current subscription status
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/subscriptions/current');
        if (res.status === 404) {
          return null; // No subscription
        }
        return res.json();
      } catch {
        return null;
      }
    },
    enabled: !!user && (user.currentRole === 'hub' || user.currentRole === 'business'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Don't show if:
  // - User is not a hub/business
  // - Still loading
  // - User has an active subscription
  // - Banner was dismissed
  const isHubOrBusiness = user?.currentRole === 'hub' || user?.currentRole === 'business';
  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  
  if (!isHubOrBusiness || isLoading || hasActiveSubscription || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  const handleCompleteSetup = () => {
    navigate('/wallet');
  };

  return (
    <div 
      className={`w-full max-w-full bg-gradient-to-r from-amber-600/15 via-amber-500/10 to-yellow-600/15 border border-amber-500/40 rounded-lg p-4 mb-6 ${className}`}
      role="alert"
      data-testid="complete-setup-banner"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-500/25 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-100 mb-1 break-words">
            Complete Your Setup
          </h3>
          <p className="text-sm text-amber-200/90 mb-3 break-words">
            Your subscription setup is incomplete. Without an active subscription, a{' '}
            <strong>$20 booking fee</strong> will apply to each shift booking. 
            Subscribe to the Business plan to waive all booking fees.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCompleteSetup}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white border-amber-400/30"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Complete Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/20"
              data-testid="button-remind-later"
            >
              Remind me later
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-full hover:bg-amber-500/25 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4 text-amber-300" />
        </button>
      </div>
    </div>
  );
}

export default CompleteSetupBanner;
