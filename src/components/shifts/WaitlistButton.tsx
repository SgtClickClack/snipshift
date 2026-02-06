import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { joinWaitlist, leaveWaitlist, getWaitlistStatus } from '@/lib/api';
import { Loader2, UserPlus, UserMinus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WaitlistButtonProps {
  shiftId: string;
  shiftStatus: string;
  className?: string;
}

/**
 * WaitlistButton Component
 * 
 * Displays waitlist join/leave functionality for filled shifts.
 * Shows current waitlist status and rank if user is on waitlist.
 */
export function WaitlistButton({ shiftId, shiftStatus, className }: WaitlistButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Only show waitlist for filled/confirmed shifts
  const isFilled = shiftStatus === 'filled' || shiftStatus === 'confirmed';

  // Fetch waitlist status
  const { data: waitlistStatus, isLoading } = useQuery({
    queryKey: ['waitlist-status', shiftId],
    queryFn: () => getWaitlistStatus(shiftId),
    enabled: !!user && isFilled,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Fetch waitlisted shifts to get rank
  const { data: waitlistedShifts } = useQuery({
    queryKey: ['waitlisted-shifts'],
    queryFn: async () => {
      const { getWaitlistedShifts } = await import('@/lib/api');
      return getWaitlistedShifts();
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Find current shift's rank
  const currentEntry = waitlistedShifts?.shifts.find(entry => entry.shiftId === shiftId);
  const rank = currentEntry?.rank;

  const joinMutation = useMutation({
    mutationFn: () => joinWaitlist(shiftId),
    onSuccess: (data) => {
      setIsJoining(false);
      toast({
        title: 'Joined Waitlist',
        description: `You're ${getRankSuffix(data.entry.rank)} in line. You'll be notified if the shift becomes available.`,
      });
      queryClient.invalidateQueries({ queryKey: ['waitlist-status', shiftId] });
      queryClient.invalidateQueries({ queryKey: ['waitlisted-shifts'] });
    },
    onError: (error: any) => {
      setIsJoining(false);
      const errorMessage = error.message || 'Failed to join waitlist';
      toast({
        title: 'Join Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveWaitlist(shiftId),
    onSuccess: () => {
      setIsLeaving(false);
      toast({
        title: 'Left Waitlist',
        description: 'You have been removed from the waitlist.',
      });
      queryClient.invalidateQueries({ queryKey: ['waitlist-status', shiftId] });
      queryClient.invalidateQueries({ queryKey: ['waitlisted-shifts'] });
    },
    onError: (error: any) => {
      setIsLeaving(false);
      toast({
        title: 'Leave Failed',
        description: error.message || 'Failed to leave waitlist',
        variant: 'destructive',
      });
    },
  });

  // Get rank suffix (1st, 2nd, 3rd, 4th, 5th)
  const getRankSuffix = (num: number): string => {
    if (num === 1) return '1st';
    if (num === 2) return '2nd';
    if (num === 3) return '3rd';
    return `${num}th`;
  };

  const handleJoin = () => {
    if (isFull) {
      toast({
        title: 'Waitlist Full',
        description: 'The waitlist is full (5 workers maximum).',
        variant: 'destructive',
      });
      return;
    }
    setIsJoining(true);
    joinMutation.mutate();
  };

  const handleLeave = () => {
    setIsLeaving(true);
    leaveMutation.mutate();
  };

  // Don't render if shift is not filled or user is not authenticated
  if (!isFilled || !user) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <Button
        variant="outline"
        disabled
        className={className}
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  const isOnWaitlist = waitlistStatus?.isOnWaitlist ?? false;
  const waitlistCount = waitlistStatus?.waitlistCount ?? 0;
  const maxWaitlistSize = waitlistStatus?.maxWaitlistSize ?? 5;
  const isFull = waitlistCount >= maxWaitlistSize;

  if (isOnWaitlist) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-base px-3 py-1">
            <Users className="h-4 w-4 mr-1" />
            {rank ? `${getRankSuffix(rank)} in line` : 'On Waitlist'}
          </Badge>
        </div>
        <Button
          variant="outline"
          onClick={handleLeave}
          disabled={isLeaving}
          className={className}
        >
          {isLeaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Leaving...
            </>
          ) : (
            <>
              <UserMinus className="h-4 w-4 mr-2" />
              Leave Waitlist
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleJoin}
      disabled={isJoining || isFull}
      className={className}
    >
      {isJoining ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Joining...
        </>
      ) : isFull ? (
        <>
          <Users className="h-4 w-4 mr-2" />
          Waitlist Full
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Join Waitlist
        </>
      )}
    </Button>
  );
}
