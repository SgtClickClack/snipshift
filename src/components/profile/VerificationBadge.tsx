import { CheckCircle2, AlertTriangle, Clock, Ban, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VerificationStatus = 'pending_review' | 'verified' | 'at_risk' | 'suspended';

interface VerificationBadgeProps {
  status: VerificationStatus;
  className?: string;
}

export function VerificationBadge({ status, className }: VerificationBadgeProps) {
  switch (status) {
    case 'verified':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30',
            className
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </span>
      );

    case 'pending_review':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-500/30',
            className
          )}
        >
          <Clock className="h-3 w-3" />
          Pending Review
        </span>
      );

    case 'at_risk':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-500/30',
            className
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          At Risk
        </span>
      );

    case 'suspended':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-500/30',
            className
          )}
        >
          <Ban className="h-3 w-3" />
          Suspended
        </span>
      );

    default:
      return null;
  }
}

interface TopRatedBadgeProps {
  className?: string;
}

/**
 * Top Rated Badge - Displayed for professionals with 5+ consecutive 5-star reviews
 */
export function TopRatedBadge({ className }: TopRatedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-600 ring-1 ring-amber-400/40',
        className
      )}
    >
      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
      Top Rated
    </span>
  );
}

interface CombinedBadgesProps {
  verificationStatus?: VerificationStatus;
  topRatedBadge?: boolean;
  className?: string;
}

/**
 * Combined display of verification status and Top Rated badge
 */
export function CombinedBadges({ verificationStatus, topRatedBadge, className }: CombinedBadgesProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {verificationStatus && <VerificationBadge status={verificationStatus} />}
      {topRatedBadge && <TopRatedBadge />}
    </div>
  );
}
