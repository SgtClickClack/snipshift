/**
 * ShiftBucketPill - Renders a capacity bucket (e.g. "Bar: 2/3")
 * Groups shifts by time/label, shows filled/required count
 * Visual states: Blue=filled, Red=vacant, Orange=partial
 * Click to expand: show assigned staff + Add Staff for empty slots
 * 
 * PERFORMANCE: Uses Framer Motion for smooth, non-janky popover transitions
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

function toAssignedList(val: unknown): Array<{ id?: string; name?: string; displayName?: string; avatarUrl?: string; baseHourlyRate?: number | string }> {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val && typeof val === 'object') return [val as any];
  return [];
}

function formatCost(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(amount);
}

export interface ShiftBucketPillProps {
  bucket: ShiftBucket;
  onClick?: () => void;
  onAddStaff?: (bucket: ShiftBucket, slotIndex?: number) => void;
  className?: string;
  /** When false, hides Cost in expand view (professional/staff users must not see financial data). Use mode !== "business" for guard. */
  canShowCost?: boolean;
  /** Explicit mode guard: when not "business", Cost is never shown (overrides canShowCost) */
  mode?: 'professional' | 'business';
}

export function ShiftBucketPill({ bucket, onClick, onAddStaff, className, canShowCost = false, mode }: ShiftBucketPillProps) {
  const [open, setOpen] = useState(false);
  const { label, filledCount, requiredCount, events } = bucket;
  const triggerRef = useRef<HTMLDivElement>(null);
  const [popoverSide, setPopoverSide] = useState<'bottom' | 'top'>('bottom');
  const [popoverAlign, setPopoverAlign] = useState<'start' | 'center' | 'end'>('start');

  // PERFORMANCE: Detect screen edge to prevent popover clipping (both vertical and horizontal)
  // This handles tablet/mobile edge detection where popover might clip off screen
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceRight = viewportWidth - rect.right;
    const spaceLeft = rect.left;
    
    // Vertical: If less than 200px below, show popover above
    setPopoverSide(spaceBelow < 200 ? 'top' : 'bottom');
    
    // Horizontal: Detect which side has more space
    // Popover is ~256px wide (w-64)
    const popoverWidth = 256;
    if (spaceRight < popoverWidth / 2 && spaceLeft > popoverWidth / 2) {
      // Not enough space on right, align to end
      setPopoverAlign('end');
    } else if (spaceLeft < popoverWidth / 2 && spaceRight > popoverWidth / 2) {
      // Not enough space on left, align to start
      setPopoverAlign('start');
    } else {
      // Enough space on both sides, center it
      setPopoverAlign('center');
    }
  }, [open]);

  // PERFORMANCE: Memoize staff cost calculation to prevent recalculation on every render
  // This was identified as a performance issue in the audit - nested loops ran on every render
  const staffWithCost = useMemo(() => {
    const result: Array<{ staff: { id?: string; name?: string; displayName?: string; avatarUrl?: string }; cost: number }> = [];
    
    // Early return if no events to process
    if (!events?.length) return result;
    
    for (const ev of events) {
      const shift = ev.resource?.booking?.shift || ev.resource?.booking?.job;
      const raw = shift?.assignedStaff ?? shift?.assignments ?? shift?.professional;
      const list = toAssignedList(raw);
      const start = ev.start instanceof Date ? ev.start : new Date(ev.start);
      const end = ev.end instanceof Date ? ev.end : new Date(ev.end);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const rate = shift?.hourlyRate != null ? Number(shift.hourlyRate) : 0;
      
      for (const s of list) {
        const staffRate = s?.baseHourlyRate != null ? Number(s.baseHourlyRate) : rate;
        const cost = Math.round(durationHours * staffRate * 100) / 100;
        result.push({ staff: s, cost });
      }
    }
    
    return result;
  }, [events]);

  // Memoize derived state values
  const { emptySlots, isFilled, isVacant, variantClass } = useMemo(() => {
    const empty = Math.max(0, requiredCount - staffWithCost.length);
    const filled = filledCount >= requiredCount;
    const vacant = filledCount === 0;
    
    const variant = filled
      ? 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800'
      : vacant
        ? 'bg-red-500/90 dark:bg-red-600/90 hover:bg-red-500 dark:hover:bg-red-600'
        : 'bg-orange-500/90 dark:bg-orange-600/90 hover:bg-orange-500 dark:hover:bg-orange-600';
    
    return { emptySlots: empty, isFilled: filled, isVacant: vacant, variantClass: variant };
  }, [filledCount, requiredCount, staffWithCost.length]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          ref={triggerRef}
          onClick={handleClick}
          data-testid={bucket.templateId ? `shift-bucket-pill-${bucket.templateId}` : 'shift-bucket-pill'}
          // Data attributes for E2E test stability - avoid text-based filtering
          data-filled-count={filledCount}
          data-required-count={requiredCount}
          data-bucket-state={isFilled ? 'filled' : isVacant ? 'vacant' : 'partial'}
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
          <span className="text-xs font-medium truncate flex-1">
            {label}: {filledCount}/{requiredCount}
          </span>
        </div>
      </PopoverTrigger>
      <AnimatePresence>
        {open && (
          <PopoverContent
            // RESPONSIVE: Adaptive width for mobile/tablet with max-width to prevent overflow
            className="w-[min(256px,calc(100vw-2rem))] sm:w-64 p-0 overflow-hidden"
            align={popoverAlign}
            side={popoverSide}
            sideOffset={8}
            collisionPadding={16} // Ensure popover stays within viewport edges
            onClick={(e) => e.stopPropagation()}
            asChild
            forceMount
          >
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.95, 
                y: popoverSide === 'bottom' ? -8 : 8,
                x: popoverAlign === 'end' ? 8 : popoverAlign === 'start' ? -8 : 0
              }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ 
                opacity: 0, 
                scale: 0.95, 
                y: popoverSide === 'bottom' ? -8 : 8,
                x: popoverAlign === 'end' ? 8 : popoverAlign === 'start' ? -8 : 0
              }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="p-3"
            >
              <div className="space-y-2" data-testid="bucket-expand-view">
                <div className="font-medium text-sm">
                  {label} ({filledCount}/{requiredCount})
                </div>
                {/* Max height with scroll for high-density days (many staff members) */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {staffWithCost.map((item, i) => (
                    <motion.div
                      key={`${item.staff?.id || i}-${item.cost}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.15 }}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={(item.staff as any)?.avatarUrl} />
                          <AvatarFallback className="text-[10px]">
                            {(item.staff?.name || item.staff?.displayName || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{item.staff?.name || item.staff?.displayName || 'Staff'}</span>
                      </div>
                      {/* FINANCIAL GUARD: Strictly hide Cost for non-business users */}
                      {/* Cost is ONLY shown when mode is explicitly 'business' AND canShowCost is true */}
                      {mode === 'business' && canShowCost && (
                        <span className="text-xs text-muted-foreground shrink-0" data-testid="staff-shift-cost">
                          Cost: {formatCost(item.cost)}
                        </span>
                      )}
                    </motion.div>
                  ))}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <motion.div
                      key={`empty-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (staffWithCost.length + i) * 0.03, duration: 0.15 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          onAddStaff?.(bucket, i);
                          setOpen(false);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Staff
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
