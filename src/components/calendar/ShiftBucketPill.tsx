/**
 * ShiftBucketPill - Renders a capacity bucket (e.g. "Bar: 2/3")
 * Groups shifts by time/label, shows filled/required count
 * Visual states: Blue=filled, Red=vacant, Orange=partial
 * Click to expand: show assigned staff + Add Staff for empty slots
 */

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
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

  const staffWithCost: Array<{ staff: { id?: string; name?: string; displayName?: string; avatarUrl?: string }; cost: number }> = [];
  for (const ev of events) {
    const shift = ev.resource?.booking?.shift || ev.resource?.booking?.job;
    const raw = shift?.assignedStaff ?? shift?.assignments ?? shift?.professional;
    const list = toAssignedList(raw);
    const start = ev.start instanceof Date ? ev.start : new Date(ev.start);
    const end = ev.end instanceof Date ? ev.end : new Date(ev.end);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const rate = shift?.hourlyRate != null ? Number(shift.hourlyRate) : 0;
    const shiftCost = Math.round(durationHours * rate * 100) / 100;
    for (const s of list) {
      const staffRate = s?.baseHourlyRate != null ? Number(s.baseHourlyRate) : rate;
      const cost = Math.round(durationHours * staffRate * 100) / 100;
      staffWithCost.push({ staff: s, cost });
    }
  }
  const emptySlots = Math.max(0, requiredCount - staffWithCost.length);
  const isFilled = filledCount >= requiredCount;
  const isVacant = filledCount === 0;
  const isPartial = !isFilled && !isVacant;

  const variantClass = isFilled
    ? 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800'
    : isVacant
      ? 'bg-red-500/90 dark:bg-red-600/90 hover:bg-red-500 dark:hover:bg-red-600'
      : 'bg-orange-500/90 dark:bg-orange-600/90 hover:bg-orange-500 dark:hover:bg-orange-600';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onClick={handleClick}
          data-testid={bucket.templateId ? `shift-bucket-pill-${bucket.templateId}` : 'shift-bucket-pill'}
          className={cn(
            'shift-bucket-pill w-full h-full rounded-md cursor-pointer',
            'flex items-center gap-1.5 px-3 py-2 min-[768px]:px-2 min-[768px]:py-1',
            'text-white transition-colors touch-manipulation',
            variantClass,
            className
          )}
          style={{ minHeight: '28px' }}
        >
          <span className="text-xs font-medium truncate flex-1">
            {label}: {filledCount}/{requiredCount}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2" data-testid="bucket-expand-view">
          <div className="font-medium text-sm">
            {label} ({filledCount}/{requiredCount})
          </div>
          <div className="space-y-1.5">
            {staffWithCost.map((item, i) => (
              <div
                key={`${item.staff?.id || i}-${item.cost}`}
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
                {((mode === undefined || mode === 'business') && canShowCost) && (
                  <span className="text-xs text-muted-foreground shrink-0" data-testid="staff-shift-cost">
                    Cost: {formatCost(item.cost)}
                  </span>
                )}
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <Button
                key={`empty-${i}`}
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
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
