import { Clock, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface VerificationPendingBannerProps {
  className?: string;
  onDismiss?: () => void;
}

interface VerificationStatus {
  verificationStatus: 'pending_review' | 'verified' | 'at_risk' | 'suspended';
}

/**
 * Standardized banner component for displaying verification pending status for new signups.
 * Shows a prominent banner at the top of pages when a user's account is pending verification.
 */
export function VerificationPendingBanner({ className, onDismiss }: VerificationPendingBannerProps) {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user has dismissed this banner in this session
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('verification_banner_dismissed') === 'true';
    }
    return false;
  });

  // Fetch verification status
  const { data: status } = useQuery<VerificationStatus>({
    queryKey: ['verification-status', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users/verification-status');
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('verification_banner_dismissed', 'true');
    }
    onDismiss?.();
  };

  // Only show for professional users with pending_review status
  if (
    !user ||
    !status ||
    status.verificationStatus !== 'pending_review' ||
    isDismissed ||
    !user.roles?.includes('professional')
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30',
        className
      )}
      role="alert"
      data-testid="verification-pending-banner"
    >
      <Clock className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-blue-900 dark:text-blue-100">
          Verification Pending
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          New accounts are marked as "Pending Review" until their first successful shift completion.
          Complete a shift to get verified!
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 rounded transition-colors"
        aria-label="Dismiss banner"
        data-testid="dismiss-verification-banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
