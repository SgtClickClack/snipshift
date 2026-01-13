/**
 * NoShowAction Component
 * 
 * A "nuclear option" button for venues to report staff no-shows.
 * Triggers immediate penalties: 2 strikes + 48h suspension.
 * 
 * Visibility: Only shown when shift.status is 'assigned'/'confirmed'/'filled' 
 * AND current_time > shift.start_time
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, UserX, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/useToast';
import { apiRequest } from '@/lib/queryClient';

interface NoShowActionProps {
  shiftId: string;
  shiftStatus: string;
  shiftStartTime: string | Date;
  assigneeName?: string;
  /** Optional callback after successful no-show report */
  onSuccess?: (result: NoShowResult) => void;
  /** Visual variant */
  variant?: 'default' | 'compact';
}

interface NoShowResult {
  message: string;
  shiftId: string;
  staffId: string;
  staffName: string;
  strikesAdded: number;
  totalStrikes: number;
  suspendedUntil: string | null;
  reliabilityScore: string;
}

/**
 * Checks if the no-show button should be visible
 */
export function canReportNoShow(
  status: string, 
  startTime: string | Date
): boolean {
  // Valid statuses for no-show reporting
  const validStatuses = ['assigned', 'confirmed', 'filled', 'pending_completion'];
  if (!validStatuses.includes(status)) {
    return false;
  }

  // Check if shift start time has passed
  const shiftStart = new Date(startTime);
  const now = new Date();
  return now >= shiftStart;
}

export function NoShowAction({
  shiftId,
  shiftStatus,
  shiftStartTime,
  assigneeName,
  onSuccess,
  variant = 'default',
}: NoShowActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reportNoShowMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/shifts/${shiftId}/no-show`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to report no-show');
      }
      return response.json() as Promise<NoShowResult>;
    },
    onSuccess: (result) => {
      setIsOpen(false);
      toast({
        title: 'No-Show Reported',
        description: `${result.staffName || 'Staff member'} has received ${result.strikesAdded} strikes. Their account has been suspended for 48 hours.`,
        variant: 'default',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      
      onSuccess?.(result);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Report No-Show',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Don't render if conditions aren't met
  if (!canReportNoShow(shiftStatus, shiftStartTime)) {
    return null;
  }

  const isCompact = variant === 'compact';

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={isCompact ? 'sm' : 'default'}
          className="text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all hover:border-red-500/40"
          data-testid="btn-report-no-show"
        >
          {isCompact ? (
            <UserX className="h-4 w-4" />
          ) : (
            <>
              <UserX className="h-4 w-4 mr-2" />
              Report No-Show
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Report Staff No-Show?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>This action cannot be undone.</strong>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Reporting {assigneeName || 'this staff member'} as a no-show will:
            </p>
            
            <ul className="text-sm text-muted-foreground space-y-2 ml-1">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>Issue <strong className="text-foreground">2 reliability strikes</strong> to their account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span><strong className="text-foreground">Suspend their account</strong> for 48 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>Mark the shift as <strong className="text-foreground">no-show completed</strong></span>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground pt-2 border-t">
              Only report no-shows for staff who genuinely failed to attend. False reports may result in venue penalties.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            className="sm:flex-1"
            disabled={reportNoShowMutation.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              reportNoShowMutation.mutate();
            }}
            disabled={reportNoShowMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white sm:flex-1"
          >
            {reportNoShowMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reporting...
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Confirm No-Show
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default NoShowAction;
