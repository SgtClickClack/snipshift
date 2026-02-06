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

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp,
  DollarSign,
  BadgeCheck,
  Wallet
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

/**
 * High-Performance Confetti Animation
 * Uses CSS transforms and requestAnimationFrame for smooth 60fps rendering
 * Non-blocking - doesn't interfere with UI state transitions
 */
function HighPerformanceConfetti({ 
  show, 
  onComplete 
}: { 
  show: boolean; 
  onComplete?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    delay: number;
    duration: number;
    color: string;
    size: number;
    rotation: number;
  }>>([]);

  useEffect(() => {
    if (show && !isVisible) {
      // Generate particles once
      const newParticles = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.5 + Math.random() * 1.5,
        color: ['hsl(var(--primary))', '#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#FF69B4'][Math.floor(Math.random() * 6)],
        size: 6 + Math.random() * 10,
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);
      setIsVisible(true);
      
      // Auto cleanup after animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        setParticles([]);
        onComplete?.();
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [show, isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden will-change-transform"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute will-change-transform"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Earnings Locked In Badge
 * Shown after successful acceptance to reinforce value proposition
 */
function EarningsLockedBadge({ amount }: { amount: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/30">
        <BadgeCheck className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm font-semibold text-white">Earnings Locked In</span>
      <span className="text-sm font-black text-primary">${amount.toFixed(0)}</span>
    </div>
  );
}

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
  const [lockedEarnings, setLockedEarnings] = useState<number | null>(null);
  const [showSuccessState, setShowSuccessState] = useState(false);

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
    onSuccess: (_, { accept }) => {
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

  // Calculate total potential earnings
  const totalPotentialEarnings = useMemo(() => {
    return pendingInvitations.reduce((sum, inv) => {
      return sum + calculateEstimatedPay(inv.shift.hourlyRate, inv.shift.startTime, inv.shift.endTime);
    }, 0);
  }, [pendingInvitations]);

  // Mutation for accept all
  const acceptAllMutation = useMutation({
    mutationFn: () => {
      const idsToAccept = pendingInvitations.map(inv => inv.shiftId);
      return acceptAllInvitations(idsToAccept);
    },
    onMutate: () => {
      setIsAcceptingAll(true);
    },
    onSuccess: () => {
      // Calculate earnings from accepted shifts
      const earnings = pendingInvitations.reduce((sum, inv) => {
        return sum + calculateEstimatedPay(inv.shift.hourlyRate, inv.shift.startTime, inv.shift.endTime);
      }, 0);
      
      // Trigger high-performance confetti (non-blocking)
      setShowConfetti(true);
      setLockedEarnings(earnings);
      setShowSuccessState(true);
      
      // Force invalidate all relevant queries to update UI instantly
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift-offers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      
      toast({
        title: '🎉 All Shifts Accepted!',
        description: `You've locked in $${earnings.toFixed(0)} in earnings!`,
        className: 'border-primary/50 bg-primary/10',
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

  // Handle confetti completion (non-blocking transition)
  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

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
      {/* High-Performance Confetti - Non-blocking UI */}
      <HighPerformanceConfetti show={showConfetti} onComplete={handleConfettiComplete} />
      
      <div className="space-y-6 max-w-lg mx-auto p-4">
        {/* Success State with Earnings Locked Badge */}
        {showSuccessState && lockedEarnings !== null && (
          <div className="flex flex-col items-center justify-center p-8 rounded-[40px] border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-bounce">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-white mb-4">You're All Set!</h2>
            <EarningsLockedBadge amount={lockedEarnings} />
            <p className="text-sm text-muted-foreground mt-4">
              Check your calendar to see your upcoming shifts.
            </p>
          </div>
        )}

        {/* Bulk Action Header - HospoGo Neon Style */}
        {!showSuccessState && (
          <div className="relative p-8 rounded-[40px] border border-brand-neon/20 bg-brand-neon/5 text-center overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-neon opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            
            <Sparkles className="text-brand-neon mx-auto mb-4" size={32} />
            <h2 className="text-3xl font-black uppercase italic mb-2">
              New <span className="text-brand-neon">Offers</span>
            </h2>
            <p className="text-muted-foreground mb-2">
              You have {pendingInvitations.length} shift{pendingInvitations.length !== 1 ? 's' : ''} waiting for your confirmation.
            </p>
            
            {/* Potential earnings badge */}
            {totalPotentialEarnings > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  ${totalPotentialEarnings.toFixed(0)} potential
                </span>
              </div>
            )}
            
            <Button
              onClick={handleAcceptAll}
              disabled={isAcceptingAll}
              className="w-full bg-brand-neon text-brand-dark py-6 rounded-2xl font-black text-lg uppercase tracking-widest shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all active:scale-95"
              data-testid="accept-all-invitations-btn"
            >
              {isAcceptingAll ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Accept All Shifts
                  {totalPotentialEarnings > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-black/20 rounded-full text-sm">
                      ${totalPotentialEarnings.toFixed(0)}
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        )}

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
