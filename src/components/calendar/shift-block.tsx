import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserPlus, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShiftBlockProps {
  event: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource?: {
      booking?: any;
      status?: 'draft' | 'invited' | 'confirmed' | 'pending' | 'completed' | 'past';
      type?: 'job' | 'shift';
    };
  };
  onClick?: () => void;
  isRecurring?: boolean;
}

/**
 * ShiftBlock Component
 * Renders a shift event block with different states:
 * - DRAFT: Ghost slot with "+ Add Staff" label
 * - INVITED: Orange/Amber pill with invitee info and pending spinner
 * - CONFIRMED: Green block with full staff profile
 */
export function ShiftBlock({ event, onClick, isRecurring }: ShiftBlockProps) {
  const status = event.resource?.status || 'draft';
  const shift = event.resource?.booking?.shift || event.resource?.booking?.job;
  const assignedStaff = shift?.assignedStaff || shift?.professional;
  const showRecurring = isRecurring || shift?.isRecurring || shift?.recurringSeriesId;

  // State A: DRAFT (Ghost Slot)
  if (status === 'draft') {
    return (
      <div
        onClick={onClick}
        className={cn(
          "w-full h-full rounded border-2 border-dashed border-gray-400",
          "bg-transparent opacity-60 cursor-pointer",
          "flex items-center justify-center",
          "hover:opacity-80 hover:border-gray-500 transition-all",
          "text-gray-600 text-xs font-medium relative"
        )}
        style={{ minHeight: '24px' }}
      >
        <div className="flex items-center gap-1">
          <UserPlus className="h-3 w-3" />
          <span>Add Staff</span>
        </div>
        {showRecurring && (
          <Repeat className="h-3 w-3 absolute top-0 right-0 text-gray-500" />
        )}
      </div>
    );
  }

  // State B: INVITED (Pending)
  if (status === 'invited') {
    const staffName = assignedStaff?.name || assignedStaff?.displayName || 'Staff Member';
    const initials = staffName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        onClick={onClick}
        className={cn(
          "w-full h-full rounded-full px-2 py-1",
          "bg-amber-500 border-2 border-amber-600",
          "cursor-pointer hover:bg-amber-600 transition-colors",
          "flex items-center gap-2 relative"
        )}
        style={{ minHeight: '24px' }}
      >
        <Avatar className="h-5 w-5 border border-amber-700">
          <AvatarImage src={assignedStaff?.photoURL || assignedStaff?.avatar} />
          <AvatarFallback className="bg-amber-600 text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-white text-xs font-medium truncate flex-1">
          {staffName}
        </span>
        <Loader2 className="h-3 w-3 text-white animate-spin flex-shrink-0" />
        {showRecurring && (
          <Repeat className="h-3 w-3 text-white absolute top-0 right-0" />
        )}
      </div>
    );
  }

  // State C: CONFIRMED (Locked) - Green with full profile
  if (status === 'confirmed' || status === 'filled') {
    const staffName = assignedStaff?.name || assignedStaff?.displayName || 'Staff Member';
    const initials = staffName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div
        onClick={onClick}
        className={cn(
          "w-full h-full rounded px-2 py-1",
          "bg-green-600 border-2 border-green-700",
          "cursor-pointer hover:bg-green-700 transition-colors",
          "flex items-center gap-2 relative"
        )}
        style={{ minHeight: '24px' }}
      >
        <Avatar className="h-5 w-5 border border-green-800">
          <AvatarImage src={assignedStaff?.photoURL || assignedStaff?.avatar} />
          <AvatarFallback className="bg-green-700 text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">
            {staffName}
          </div>
          {event.title && (
            <div className="text-green-100 text-[10px] truncate">
              {event.title}
            </div>
          )}
        </div>
        {showRecurring && (
          <Repeat className="h-3 w-3 text-white absolute top-0 right-0" />
        )}
      </div>
    );
  }

  // Fallback: Default rendering for other statuses
  return (
    <div
      onClick={onClick}
      className={cn(
        "w-full h-full rounded px-2 py-1",
        "bg-blue-600 border-2 border-blue-700",
        "cursor-pointer hover:bg-blue-700 transition-colors",
        "text-white text-xs font-medium relative"
      )}
      style={{ minHeight: '24px' }}
    >
      {event.title || 'Shift'}
      {showRecurring && (
        <Repeat className="h-3 w-3 text-white absolute top-0 right-0" />
      )}
    </div>
  );
}

