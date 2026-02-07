/**
 * ShiftBucketPill - Renders a capacity bucket (e.g. "Bar: 2/3")
 * Groups shifts by time/label, shows filled/required count
 * Visual states: Green=confirmed, Amber=pending, Red=vacant (with pulse)
 * 
 * Click triggers the ShiftBucketManagementModal for full management UX
 * (Popover removed in favor of modal for better mobile experience)
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface BucketEvent {
  id: string;
  title?: string;
  start: Date;
  end: Date;
  resource?: {
    booking?: { shift?: any; job?: any };
    status?: string;
    type?: string;
  };
}

export interface ShiftBucket {
  key: string;
  label: string;
  filledCount: number;
  requiredCount: number;
  events: BucketEvent[];
  start: Date;
  end: Date;
  templateId?: string;
}

export interface ShiftBucketPillProps {
  bucket: ShiftBucket;
  /** Called when user clicks the pill - should open ShiftBucketManagementModal */
  onClick?: () => void;
  /** Called when user wants to add staff directly (legacy, kept for backward compat) */
  onAddStaff?: (bucket: ShiftBucket, slotIndex?: number) => void;
  className?: string;
  /** When false, hides Cost in expand view (professional/staff users must not see financial data). */
  canShowCost?: boolean;
  /** Explicit mode guard: when not "business", Cost is never shown */
  mode?: 'professional' | 'business';
}

export function ShiftBucketPill({ bucket, onClick, className }: ShiftBucketPillProps) {
  const { label, filledCount, requiredCount, events } = bucket;

  // Memoize derived state values with status-based color coding
  // Status interpretation:
  // - 'confirmed'/'completed': Worker confirmed attendance -> Green
  // - 'invited'/'pending'/'offered': Invitations sent, awaiting response -> Amber
  // - 'open'/'draft'/'rejected'/'cancelled': Vacant or rejected -> Red
  const { bucketStatus, variantClass } = useMemo(() => {
    const filled = filledCount >= requiredCount;
    const vacant = filledCount === 0;
    const empty = Math.max(0, requiredCount - filledCount);
    
    // Determine bucket status from events
    const confirmedCount = events.filter(ev => {
      const status = ev.resource?.status;
      return status === 'confirmed' || status === 'completed' || status === 'filled';
    }).length;
    
    const pendingInvitationCount = events.filter(ev => {
      const status = ev.resource?.status;
      return status === 'invited' || status === 'pending' || status === 'offered' || status === 'pending_invitation';
    }).length;
    
    const rejectedOrVacantCount = events.filter(ev => {
      const status = ev.resource?.status;
      return status === 'rejected' || status === 'cancelled' || status === 'declined';
    }).length;
    
    // Determine overall bucket status
    let status: 'confirmed' | 'pending' | 'vacant' = 'vacant';
    if (filled && confirmedCount >= requiredCount) {
      status = 'confirmed';
    } else if (pendingInvitationCount > 0 || (filledCount > 0 && filledCount < requiredCount)) {
      status = 'pending';
    } else if (vacant || rejectedOrVacantCount > 0 || empty > 0) {
      status = 'vacant';
    }
    
    // Refined status colors with left-border accent and glassmorphism:
    // - Emerald: 100% Confirmed – all slots filled
    // - Amber: Invitations Pending – awaiting responses
    // - Red: Vacant/Rejected – needs attention (subtle pulse)
    let variant: string;
    switch (status) {
      case 'confirmed':
        variant = 'bg-emerald-500/15 dark:bg-emerald-500/10 hover:bg-emerald-500/25 dark:hover:bg-emerald-500/20 border border-emerald-500/25 dark:border-emerald-500/20 border-l-[3px] border-l-emerald-500';
        break;
      case 'pending':
        variant = 'bg-amber-500/15 dark:bg-amber-500/10 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 border border-amber-500/25 dark:border-amber-500/20 border-l-[3px] border-l-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.08)] dark:shadow-[0_0_12px_rgba(245,158,11,0.12)]';
        break;
      case 'vacant':
      default:
        // Subtle pulse on vacant buckets to alert owner
        variant = 'bg-red-500/15 dark:bg-red-500/10 hover:bg-red-500/25 dark:hover:bg-red-500/20 border border-red-500/25 dark:border-red-500/20 border-l-[3px] border-l-red-500 animate-pulse-subtle';
        break;
    }
    
    return { bucketStatus: status, variantClass: variant };
  }, [filledCount, requiredCount, events]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      data-testid={bucket.templateId ? `shift-bucket-pill-${bucket.templateId}` : 'shift-bucket-pill'}
      // Data attributes for E2E test stability
      data-filled-count={filledCount}
      data-required-count={requiredCount}
      data-bucket-state={bucketStatus}
      className={cn(
        'shift-bucket-pill w-full h-full rounded-lg cursor-pointer',
        'flex items-center gap-1.5 px-3 py-2 min-[1024px]:px-2 min-[1024px]:py-1',
        'transition-all duration-200 ease-out touch-manipulation',
        // Touch target: 44px minimum on mobile+tablet, relaxed on desktop
        'min-h-[44px] min-[1024px]:min-h-[32px]',
        variantClass,
        className
      )}
    >
      <span className="text-xs font-black truncate flex-1 text-foreground" style={{ fontFamily: 'Urbanist, sans-serif' }}>
        {label}:{' '}
        <span className="text-primary font-black">
          {filledCount}/{requiredCount}
        </span>
      </span>
    </div>
  );
}
