/**
 * InvitationDashboard - Staff view for managing shift invitations
 * 
 * Features:
 * - "Accept All" button to confirm all pending invitations at once
 * - "Pick & Choose" list with individual accept/reject toggles
 * - Confetti celebration effect on Accept All
 * - HospoGo brand neon styling
 * 
 * Used by professional/staff users to manage their shift invitations.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfettiAnimation } from '@/components/onboarding/ConfettiAnimation';
import { format, isToday, isTomorrow } from 'date-fns';

interface ShiftInvitation {
  id: string;
  shiftId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  createdAt: string;
  shift: {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    hourlyRate: string;
    location?: string;
    venue?: {
      name: string;
      avatarUrl?: string;
    };
  };
}

async function fetchMyInvitations(): Promise<ShiftInvitation[]> {
  const res = await apiRequest('GET', '/api/shifts/invitations/me');
  if (!res.ok) return [];
  return res.json();
}

async function respondToInvitation(
  shiftId: string, 
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  const res = await apiRequest('POST', `/api/shifts/${shiftId}/${accept ? 'accept' : 'decline'}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to respond to invitation');
  }
  return { success: true };
}

async function acceptAllInvitations(
  shiftIds: string[]
): Promise<{ accepted: number; errors: string[] }> {
  const res = await apiRequest('POST', '/api/shifts/invitations/accept-all', { shiftIds });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to accept invitations');
  }
  return res.json();
}

function formatShiftDate(startTime: string): string {
  const date = new Date(startTime);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function formatShiftTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function calculateEstimatedPay(hourlyRate: string, startTime: string, endTime: string): number {
  const rate = parseFloat(hourlyRate) || 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.round(rate * hours);
}

export default function InvitationDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch pending invitations
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: fetchMyInvitations,
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Filter to only pending invitations
  const pendingInvitations = useMemo(() => 
    invitations.filter(inv => inv.status === 'PENDING'),
    [invitations]
  );

  // Mutation for individual response
  const respondMutation = useMutation({
    mutationFn: ({ shiftId, accept }: { shiftId: string; accept: boolean }) => 
      respondToInvitation(shiftId, accept),
    onMutate: ({ shiftId }) => {
      setRespondingIds(prev => new Set(prev).add(shiftId));
    },
    onSuccess: (_, { shiftId, accept }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift-offers'] });
      toast({
        title: accept ? 'Shift Accepted' : 'Shift Declined',
        description: accept 
          ? 'You\'ve been added to the roster!' 
          : 'The venue has been notified.',
      });
    },
    onError: (error: any, { accept }) => {
      toast({
        title: 'Failed to respond',
        description: error?.message || `Could not ${accept ? 'accept' : 'decline'} the shift.`,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, { shiftId }) => {
      setRespondingIds(prev => {
        const next = new Set(prev);
        next.delete(shiftId);
        return next;
      });
    },
  });

  // Mutation for accept all
  const acceptAllMutation = useMutation({
    mutationFn: () => {
      const idsToAccept = pendingInvitations.map(inv => inv.shiftId);
      return acceptAllInvitations(idsToAccept);
    },
    onMutate: () => {
      setIsAcceptingAll(true);
    },
    onSuccess: (result) => {
      // Trigger confetti celebration!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
      // Force invalidate all relevant queries to update UI instantly
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift-offers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      
      toast({
        title: '🎉 All Shifts Accepted!',
        description: `You've confirmed ${result.accepted} shift${result.accepted !== 1 ? 's' : ''}. See you there!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to accept shifts',
        description: error?.message || 'Some shifts could not be accepted.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsAcceptingAll(false);
    },
  });

  const handleRespond = (shiftId: string, accept: boolean) => {
    respondMutation.mutate({ shiftId, accept });
  };

  const handleAcceptAll = () => {
    if (pendingInvitations.length === 0) return;
    acceptAllMutation.mutate();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!user?.id) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-neon mb-4" />
        <p className="text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  // Empty state - All caught up
  if (pendingInvitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-card/50 rounded-[40px] border border-border/50">
        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-bold mb-2">All Caught Up!</h3>
        <p className="text-muted-foreground">You don't have any pending shift invitations right now.</p>
      </div>
    );
  }

  return (
    <>
      {showConfetti && <ConfettiAnimation />}
      
      <div className="space-y-6 max-w-lg mx-auto p-4">
        {/* Bulk Action Header - HospoGo Neon Style */}
        <div className="relative p-8 rounded-[40px] border border-brand-neon/20 bg-brand-neon/5 text-center overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-neon opacity-10 rounded-full blur-3xl pointer-events-none"></div>
          
          <Sparkles className="text-brand-neon mx-auto mb-4" size={32} />
          <h2 className="text-3xl font-black uppercase italic mb-2">
            New <span className="text-brand-neon">Offers</span>
          </h2>
          <p className="text-muted-foreground mb-6">
            You have {pendingInvitations.length} shift{pendingInvitations.length !== 1 ? 's' : ''} waiting for your confirmation.
          </p>
          
          <Button
            onClick={handleAcceptAll}
            disabled={isAcceptingAll}
            className="w-full bg-brand-neon text-brand-dark py-6 rounded-2xl font-black text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(186,255,57,0.3)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(186,255,57,0.4)] transition-all active:scale-95"
            data-testid="accept-all-invitations-btn"
          >
            {isAcceptingAll ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Accept All Shifts"
            )}
          </Button>
        </div>

        {/* Individual Invitations List */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground px-4">
            Individual Invitations
          </p>
          
          {pendingInvitations.map((invitation) => {
            const isExpanded = expandedIds.has(invitation.id);
            const isResponding = respondingIds.has(invitation.shiftId);
            const estimatedPay = calculateEstimatedPay(
              invitation.shift.hourlyRate,
              invitation.shift.startTime,
              invitation.shift.endTime
            );
            
            return (
              <div 
                key={invitation.id} 
                className="bg-card p-6 rounded-[30px] border border-border hover:border-border/80 transition-all"
                data-testid={`invitation-card-${invitation.shiftId}`}
              >
                {/* Header: Title + Estimated Pay */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg mb-1 truncate">
                      {invitation.shift.title || "General Shift"}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar size={12} className="text-brand-neon shrink-0" />
                      {formatShiftDate(invitation.shift.startTime)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-brand-neon font-black text-lg">{formatCurrency(estimatedPay)}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Est. Pay</div>
                  </div>
                </div>

                {/* Info Row: Time + Venue */}
                <div 
                  className="flex flex-wrap items-center gap-4 py-3 border-y border-border/50 mb-4 cursor-pointer"
                  onClick={() => toggleExpand(invitation.id)}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-muted-foreground shrink-0" />
                    <span>{formatShiftTime(invitation.shift.startTime, invitation.shift.endTime)}</span>
                  </div>
                  {invitation.shift.venue?.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={14} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{invitation.shift.venue.name}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(invitation.id);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pb-4 mb-4 border-b border-border/50 space-y-2 text-sm">
                    {invitation.shift.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{invitation.shift.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{formatCurrency(parseFloat(invitation.shift.hourlyRate))}/hr</span>
                    </div>
                    {invitation.shift.description && (
                      <p className="text-muted-foreground pt-2">
                        {invitation.shift.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    variant="ghost"
                    onClick={() => handleRespond(invitation.shiftId, false)}
                    disabled={isResponding}
                    className="flex-1 py-3 rounded-xl bg-muted/50 text-muted-foreground text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all"
                  >
                    {isResponding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Decline"
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleRespond(invitation.shiftId, true)}
                    disabled={isResponding}
                    className="flex-1 py-3 rounded-xl border-brand-neon/30 text-brand-neon text-xs font-bold uppercase tracking-widest hover:bg-brand-neon hover:text-brand-dark transition-all"
                  >
                    {isResponding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Accept"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
