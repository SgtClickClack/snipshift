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
    
    // Color coding based on status:
    // - Green: 100% Confirmed - all slots filled with confirmed workers
    // - Amber: Invitations Pending - some slots have pending invitations
    // - Red: Vacant/Rejected - slots are empty + PULSE animation to alert owner
    let variant: string;
    switch (status) {
      case 'confirmed':
        variant = 'bg-green-500/90 dark:bg-green-600/90 hover:bg-green-500 dark:hover:bg-green-600 border-2 border-green-600 dark:border-green-500';
        break;
      case 'pending':
        variant = 'bg-amber-500/90 dark:bg-amber-600/90 hover:bg-amber-500 dark:hover:bg-amber-600 border-2 border-amber-600 dark:border-amber-500';
        break;
      case 'vacant':
      default:
        // PULSE effect on RED buckets to alert owner of staffing risks
        variant = 'bg-red-500/90 dark:bg-red-600/90 hover:bg-red-500 dark:hover:bg-red-600 border-2 border-red-600 dark:border-red-500 animate-pulse-subtle';
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
        'shift-bucket-pill w-full h-full rounded-md cursor-pointer',
        'flex items-center gap-1.5 px-3 py-2 min-[768px]:px-2 min-[768px]:py-1',
        'text-white transition-colors touch-manipulation',
        // Mobile touch target: minimum 44px for accessibility
        'min-h-[44px] min-[768px]:min-h-[28px]',
        variantClass,
        className
      )}
    >
      {/* Label in white, count in Electric Lime (#BAFF39) for high visibility */}
      <span className="text-xs font-black truncate flex-1" style={{ fontFamily: 'Urbanist, sans-serif' }}>
        {label}:{' '}
        <span style={{ color: '#BAFF39' }}>
          {filledCount}/{requiredCount}
        </span>
      </span>
    </div>
  );
}
