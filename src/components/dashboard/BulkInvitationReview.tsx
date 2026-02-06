import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { 
  CalendarDays, 
  Building2, 
  Clock, 
  MapPin, 
  DollarSign, 
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

// Confetti celebration component - GPU-accelerated for smooth mobile performance
function ConfettiCelebration({ show, earnings }: { show: boolean; earnings: number }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Confetti particles - GPU accelerated with will-change */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti will-change-transform"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            backgroundColor: ['#BAFF39', '#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6'][Math.floor(Math.random() * 5)],
            width: `${8 + Math.random() * 8}px`,
            height: `${8 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            willChange: 'transform, opacity',
          }}
        />
      ))}
      
      {/* Success message overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300">
        <div className="text-center p-8 max-w-md mx-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#BAFF39]/20 mb-6 animate-bounce will-change-transform">
            <PartyPopper className="w-10 h-10 text-[#BAFF39]" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-[#BAFF39]" />
            You're Booked!
            <Sparkles className="w-6 h-6 text-[#BAFF39]" />
          </h2>
          <p className="text-lg text-white/80 mb-4">
            You just locked in
          </p>
          <div className="inline-block px-6 py-3 rounded-2xl bg-[#BAFF39] text-black font-black text-2xl shadow-[0_0_30px_rgba(186,255,57,0.5)]">
            ${earnings.toFixed(2)}
          </div>
          <p className="text-sm text-white/60 mt-3">
            in guaranteed earnings this week!
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(-10vh) rotate(0deg) translateZ(0); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg) translateZ(0); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear forwards;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}

interface ShiftInvitation {
  id: string;
  invitationId: string | null;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  location: string | null;
  status: string;
  employerId: string;
  businessName: string;
  businessLogo: string | null;
  createdAt: string;
  invitedAt: string;
  invitationType: 'multi' | 'direct';
}

interface GroupedByShop {
  shopId: string;
  shopName: string;
  shopLogo: string | null;
  shifts: ShiftInvitation[];
}

interface GroupedByWeek {
  weekStart: string;
  weekEnd: string;
  shifts: ShiftInvitation[];
}

interface InvitationsResponse {
  invitations: ShiftInvitation[];
  totalCount: number;
  groupedByShop: GroupedByShop[];
  groupedByWeek: GroupedByWeek[];
}

interface BulkAcceptResult {
  message: string;
  summary: {
    accepted: number;
    alreadyTaken: number;
    notFound: number;
    failed: number;
    total: number;
  };
  details: {
    accepted: string[];
    alreadyTaken: string[];
    notFound: string[];
    failed: string[];
    errors: Array<{ shiftId: string; error: string }>;
  };
}

export function BulkInvitationReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));
  const [viewMode, setViewMode] = useState<'shop' | 'week'>('shop');
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationEarnings, setCelebrationEarnings] = useState(0);

  // Fetch pending invitations
  const { data, isLoading, error } = useQuery<InvitationsResponse>({
    queryKey: ['/api/shifts/invitations/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/shifts/invitations/pending');
      return res.json();
    },
    // DOPAMINE SYNC: 5s refresh for investor demo - live status updates on Accept All loop
    refetchInterval: 5000,
  });

  // Calculate total earnings for selected shifts
  const calculateSelectedEarnings = useCallback(() => {
    if (!data?.invitations) return 0;
    return data.invitations
      .filter(inv => selectedIds.has(inv.id))
      .reduce((sum, inv) => {
        const hours = (new Date(inv.endTime).getTime() - new Date(inv.startTime).getTime()) / (1000 * 60 * 60);
        return sum + (parseFloat(inv.hourlyRate) * hours);
      }, 0);
  }, [data?.invitations, selectedIds]);

  // Bulk accept mutation
  const bulkAcceptMutation = useMutation({
    mutationFn: async (shiftIds: string[]) => {
      const res = await apiRequest('POST', '/api/shifts/bulk-accept', { shiftIds });
      return res.json() as Promise<BulkAcceptResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/invitations/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/offers/me'] });
      
      const acceptedIds = new Set(selectedIds);
      setSelectedIds(new Set());

      if (result.summary.accepted > 0) {
        // Calculate earnings for accepted shifts
        const earnings = data?.invitations
          ?.filter(inv => acceptedIds.has(inv.id))
          .reduce((sum, inv) => {
            const hours = (new Date(inv.endTime).getTime() - new Date(inv.startTime).getTime()) / (1000 * 60 * 60);
            return sum + (parseFloat(inv.hourlyRate) * hours);
          }, 0) || 0;
        
        // Trigger confetti celebration!
        setCelebrationEarnings(earnings);
        setShowConfetti(true);
        
        // Auto-dismiss confetti after 4 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 4000);
        
        // Also show a toast for persistence
        toast({
          title: `🎉 ${result.summary.accepted} shift${result.summary.accepted > 1 ? 's' : ''} confirmed!`,
          description: `You've locked in $${earnings.toFixed(2)} in earnings!`,
          className: 'border-[#BAFF39]/50 bg-[#BAFF39]/10',
        });
      } else if (result.summary.alreadyTaken > 0) {
        toast({
          title: 'Shifts already taken',
          description: `${result.summary.alreadyTaken} shift${result.summary.alreadyTaken > 1 ? 's were' : ' was'} already accepted by someone else.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to accept shifts',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  // Single decline mutation
  const declineMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await apiRequest('POST', `/api/shifts/${shiftId}/decline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/invitations/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({
        title: 'Invitation declined',
        description: 'The shift has been removed from your invitations.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to decline',
        description: error?.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });

  const toggleSelection = (shiftId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(shiftId)) {
        next.delete(shiftId);
      } else {
        next.add(shiftId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!data?.invitations) return;
    if (selectedIds.size === data.invitations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.invitations.map((inv) => inv.id)));
    }
  };

  const selectGroup = (shifts: ShiftInvitation[]) => {
    const groupIds = shifts.map((s) => s.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleAcceptSelected = () => {
    if (selectedIds.size === 0) return;
    bulkAcceptMutation.mutate(Array.from(selectedIds));
  };

  const formatShiftTime = (startTime: string, endTime: string) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const formatShiftDate = (startTime: string) => {
    return format(parseISO(startTime), 'EEE, MMM d');
  };

  const calculateEarnings = (hourlyRate: string, startTime: string, endTime: string) => {
    const hours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
    return (parseFloat(hourlyRate) * hours).toFixed(2);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const ShiftCard = ({ shift, isSelected }: { shift: ShiftInvitation; isSelected: boolean }) => (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-all",
        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => toggleSelection(shift.id)}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-sm">{shift.title}</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Building2 className="h-3 w-3" />
              {shift.businessName}
            </div>
          </div>
          {shift.invitationType === 'multi' && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Race
            </Badge>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatShiftDate(shift.startTime)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatShiftTime(shift.startTime, shift.endTime)}
          </div>
          {shift.location && (
            <div className="flex items-center gap-1 col-span-2">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{shift.location}</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm font-medium text-[#BAFF39]">
            <DollarSign className="h-4 w-4" />
            ${calculateEarnings(shift.hourlyRate, shift.startTime, shift.endTime)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              declineMutation.mutate(shift.id);
            }}
            disabled={declineMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );

  const ShopGroup = ({ group }: { group: GroupedByShop }) => {
    const isExpanded = expandedGroups.has(group.shopId);
    const allSelected = group.shifts.every((s) => selectedIds.has(s.id));
    const someSelected = group.shifts.some((s) => selectedIds.has(s.id));
    const totalEarnings = group.shifts.reduce(
      (sum, s) => sum + parseFloat(calculateEarnings(s.hourlyRate, s.startTime, s.endTime)),
      0
    );

    return (
      <motion.div variants={cardVariants}>
        <Card className="bg-[#1e293b] border-white/10">
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleGroupExpand(group.shopId)}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => selectGroup(group.shifts)}
              onClick={(e) => e.stopPropagation()}
              className={cn(!allSelected && someSelected && "data-[state=unchecked]:bg-primary/30")}
            />
            <Avatar className="h-10 w-10">
              <AvatarImage src={group.shopLogo || undefined} />
              <AvatarFallback>{getInitials(group.shopName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-base">{group.shopName}</CardTitle>
              <CardDescription>
                {group.shifts.length} shift{group.shifts.length > 1 ? 's' : ''} • ${totalEarnings.toFixed(2)} potential
              </CardDescription>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-3">
            {group.shifts.map((shift) => (
              <ShiftCard 
                key={shift.id} 
                shift={shift} 
                isSelected={selectedIds.has(shift.id)} 
              />
            ))}
          </CardContent>
        )}
        </Card>
      </motion.div>
    );
  };

  const WeekGroup = ({ group }: { group: GroupedByWeek }) => {
    const weekKey = group.weekStart;
    const isExpanded = expandedGroups.has(weekKey);
    const allSelected = group.shifts.every((s) => selectedIds.has(s.id));
    const someSelected = group.shifts.some((s) => selectedIds.has(s.id));
    const weekLabel = `${format(parseISO(group.weekStart), 'MMM d')} - ${format(parseISO(group.weekEnd), 'MMM d')}`;
    const totalEarnings = group.shifts.reduce(
      (sum, s) => sum + parseFloat(calculateEarnings(s.hourlyRate, s.startTime, s.endTime)),
      0
    );

    return (
      <motion.div variants={cardVariants}>
        <Card className="bg-[#1e293b] border-white/10">
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleGroupExpand(weekKey)}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => selectGroup(group.shifts)}
              onClick={(e) => e.stopPropagation()}
              className={cn(!allSelected && someSelected && "data-[state=unchecked]:bg-primary/30")}
            />
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{weekLabel}</CardTitle>
              <CardDescription>
                {group.shifts.length} shift{group.shifts.length > 1 ? 's' : ''} • ${totalEarnings.toFixed(2)} potential
              </CardDescription>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-3">
            {group.shifts.map((shift) => (
              <ShiftCard 
                key={shift.id} 
                shift={shift} 
                isSelected={selectedIds.has(shift.id)} 
              />
            ))}
          </CardContent>
        )}
        </Card>
      </motion.div>
    );
  };

  // Calculate potential earnings for selected shifts
  const selectedEarnings = useMemo(() => calculateSelectedEarnings(), [calculateSelectedEarnings]);
  const totalPotentialEarnings = useMemo(() => {
    if (!data?.invitations) return 0;
    return data.invitations.reduce((sum, inv) => {
      const hours = (new Date(inv.endTime).getTime() - new Date(inv.startTime).getTime()) / (1000 * 60 * 60);
      return sum + (parseFloat(inv.hourlyRate) * hours);
    }, 0);
  }, [data?.invitations]);

  if (isLoading) {
    return (
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className="bg-[#1e293b] border-white/10">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className="bg-[#1e293b] border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold text-lg">Failed to load invitations</h3>
            <p className="text-muted-foreground">Please refresh the page to try again.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card className="bg-[#1e293b] border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">All caught up!</h3>
            <p className="text-muted-foreground">You have no pending shift invitations.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-4" variants={listVariants} initial="hidden" animate="visible">
      {/* Confetti Celebration Overlay */}
      <ConfettiCelebration show={showConfetti} earnings={celebrationEarnings} />
      
      {/* Header with actions */}
      <motion.div variants={cardVariants}>
        <Card className="bg-[#1e293b] border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                {data.totalCount} invitation{data.totalCount > 1 ? 's' : ''} • 
                <span className="text-[#BAFF39] font-semibold ml-1">
                  ${totalPotentialEarnings.toFixed(2)} potential
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
              >
                {selectedIds.size === data.totalCount ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                onClick={handleAcceptSelected}
                disabled={selectedIds.size === 0 || bulkAcceptMutation.isPending}
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  selectedIds.size > 0 && "bg-[#BAFF39] hover:bg-[#BAFF39]/90 text-black shadow-[0_0_20px_rgba(186,255,57,0.4)]"
                )}
              >
                {bulkAcceptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Accept {selectedIds.size > 0 ? `(${selectedIds.size})` : 'Selected'}
                {selectedIds.size > 0 && selectedEarnings > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-black/20 rounded-full text-xs font-bold">
                    ${selectedEarnings.toFixed(0)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        </Card>
      </motion.div>

      {/* View toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'shop' | 'week')}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="shop">
            <Building2 className="h-4 w-4 mr-2" />
            By Shop
          </TabsTrigger>
          <TabsTrigger value="week">
            <CalendarDays className="h-4 w-4 mr-2" />
            By Week
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-4 mt-4">
          {data.groupedByShop.map((group) => (
            <ShopGroup key={group.shopId} group={group} />
          ))}
        </TabsContent>

        <TabsContent value="week" className="space-y-4 mt-4">
          {data.groupedByWeek.map((group) => (
            <WeekGroup key={group.weekStart} group={group} />
          ))}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

