import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Ban, Trophy, Star, Clock, TrendingUp, FileCheck, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MedicalCertificateUpload } from '@/components/appeals/MedicalCertificateUpload';
import { fetchPriorityBoostStatus } from '@/lib/api';

interface ReputationStats {
  strikes: number;
  reliabilityScore: string;
  reliabilityLabel: string;
  shiftsSinceLastStrike: number;
  shiftsUntilStrikeRemoval: number;
  recoveryProgress: number;
  suspendedUntil: string | null;
  isSuspended: boolean;
  completedShiftCount: number;
  noShowCount: number;
  lastNoShowShiftId?: string;
}

// Strike state configuration
const STRIKE_STATES = {
  0: {
    label: 'Elite Professional',
    color: '#BAFF39', // Lime/neon green
    subtext: 'You have a perfect reliability record!',
    bgClass: 'from-[#BAFF39]/20 to-[#84cc16]/10',
    borderClass: 'border-[#BAFF39]/50',
    textClass: 'text-[#84cc16]',
    icon: Trophy,
  },
  1: {
    label: 'Good Standing',
    color: '#FBBF24', // Amber
    subtext: '1 Strike active. Reliability is key to high-paying shifts.',
    bgClass: 'from-amber-500/20 to-amber-400/10',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-500',
    icon: AlertTriangle,
  },
  2: {
    label: 'At Risk',
    color: '#EF4444', // Red
    subtext: '2 Strikes active. High risk of permanent deactivation.',
    bgClass: 'from-red-500/20 to-red-400/10',
    borderClass: 'border-red-500/50',
    textClass: 'text-red-500',
    icon: Ban,
  },
} as const;

// Countdown timer for suspension
function SuspensionCountdown({ suspendedUntil }: { suspendedUntil: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const targetTime = new Date(suspendedUntil).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [suspendedUntil]);

  const formatNumber = (n: number) => n.toString().padStart(2, '0');

  if (isExpired) {
    return (
      <div className="text-center">
        <p className="text-emerald-500 text-lg font-semibold">Suspension period has ended!</p>
        <p className="text-muted-foreground text-sm mt-1">Refresh the page to access your account.</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-muted-foreground text-sm mb-2 flex items-center justify-center gap-2">
        <Clock className="h-4 w-4" />
        Access restored in:
      </p>
      <div className="flex items-center justify-center gap-2 text-4xl font-mono font-bold text-red-500">
        <span className="bg-red-500/10 px-3 py-2 rounded-lg">{formatNumber(timeLeft.hours)}</span>
        <span className="text-red-400">:</span>
        <span className="bg-red-500/10 px-3 py-2 rounded-lg">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-red-400">:</span>
        <span className="bg-red-500/10 px-3 py-2 rounded-lg">{formatNumber(timeLeft.seconds)}</span>
      </div>
      <div className="flex justify-center gap-8 mt-2 text-xs text-muted-foreground">
        <span>Hours</span>
        <span>Minutes</span>
        <span>Seconds</span>
      </div>
    </div>
  );
}

// Full-screen suspension overlay
function SuspensionOverlay({ suspendedUntil, lastShiftId }: { suspendedUntil: string; lastShiftId?: string }) {
  const [showMedicalUpload, setShowMedicalUpload] = useState(false);
  const queryClient = useQueryClient();

  const handleUploadSuccess = () => {
    // Refresh the page to update suspension status
    queryClient.invalidateQueries({ queryKey: ['/api/me/reputation'] });
    queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    setShowMedicalUpload(false);
    // Force a page refresh to update the UI state
    window.location.reload();
  };

  // Show medical certificate upload form
  if (showMedicalUpload && lastShiftId) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <MedicalCertificateUpload 
            shiftId={lastShiftId}
            onSuccess={handleUploadSuccess}
            onClose={() => setShowMedicalUpload(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Warning Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
          <Ban className="h-12 w-12 text-red-500" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Account Suspended</h1>
          <p className="text-muted-foreground text-lg">
            Your account has been temporarily suspended due to no-show violations.
          </p>
        </div>

        {/* Countdown Timer */}
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-6">
            <SuspensionCountdown suspendedUntil={suspendedUntil} />
          </CardContent>
        </Card>

        {/* Medical Certificate Appeal */}
        {lastShiftId && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <FileCheck className="h-5 w-5" />
                  <span className="font-medium">Have a medical certificate?</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  If you were unable to attend due to illness, submit a medical certificate to have your suspension reviewed and potentially lifted.
                </p>
                <Button 
                  onClick={() => setShowMedicalUpload(true)}
                  className="w-full"
                  variant="default"
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Submit Medical Certificate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>During suspension, you cannot:</p>
          <ul className="list-disc list-inside text-left mx-auto max-w-xs space-y-1">
            <li>Accept new shifts</li>
            <li>Apply to jobs</li>
            <li>Receive shift invitations</li>
          </ul>
        </div>

        {/* Support Link */}
        <p className="text-sm text-muted-foreground">
          Think this is a mistake?{' '}
          <a href="mailto:support@hospogo.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

// Strike recovery progress bar
function StrikeRecoveryProgress({ 
  recoveryProgress, 
  strikes,
}: { 
  recoveryProgress: number; 
  strikes: number;
}) {
  if (strikes === 0) return null;

  const progress = (recoveryProgress / 5) * 100;
  const shiftsRemaining = Math.max(0, 5 - recoveryProgress);

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Strike Recovery Progress
        </span>
        <span className="font-medium">{recoveryProgress}/5 shifts</span>
      </div>
      <Progress 
        value={progress} 
        className="h-2 bg-muted/50" 
      />
      <p className="text-xs text-muted-foreground mt-2">
        Complete {shiftsRemaining} more shift{shiftsRemaining !== 1 ? 's' : ''} with 4.5+ stars to remove a strike.
      </p>
    </div>
  );
}

export function ProReliabilityTracker() {
  const { user } = useAuth();

  const { data: reputationStats, isLoading, error } = useQuery<ReputationStats>({
    queryKey: ['/api/me/reputation'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/me/reputation');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchOnWindowFocus: true,
  });

  const { data: priorityBoost } = useQuery({
    queryKey: ['/api/worker/priority-boost'],
    queryFn: fetchPriorityBoostStatus,
    enabled: !!user?.id,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  });

  // Don't render for non-professionals or while loading
  if (!user || user.role !== 'professional') return null;
  if (isLoading) return null;
  if (error || !reputationStats) return null;

  const { 
    strikes, 
    recoveryProgress,
    suspendedUntil,
    isSuspended,
    completedShiftCount,
    lastNoShowShiftId,
  } = reputationStats;

  // Show suspension overlay if suspended
  if (isSuspended && suspendedUntil) {
    return <SuspensionOverlay suspendedUntil={suspendedUntil} lastShiftId={lastNoShowShiftId} />;
  }

  // Get state configuration based on strikes (cap at 2 for styling purposes)
  const strikeKey = Math.min(strikes, 2) as 0 | 1 | 2;
  const state = STRIKE_STATES[strikeKey];
  const Icon = state.icon;

  return (
    <Card 
      className={cn(
        'overflow-hidden border-2 transition-all duration-300',
        state.borderClass,
        'bg-gradient-to-r',
        state.bgClass
      )}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div 
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
              strikes === 0 ? 'bg-[#BAFF39]/30' : strikes === 1 ? 'bg-amber-500/30' : 'bg-red-500/30'
            )}
          >
            <Icon 
              className="h-6 w-6 [color:var(--dynamic-color)]" 
              style={{ '--dynamic-color': state.color } as React.CSSProperties}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 
                className="text-lg font-bold [color:var(--dynamic-color)]"
                style={{ '--dynamic-color': state.color } as React.CSSProperties}
              >
                {state.label}
              </h3>
              {/* Glowing Electric Lime Crown for >95% reliability (0 strikes + 10+ shifts) */}
              {strikes === 0 && completedShiftCount >= 10 && (
                <div className="relative">
                  <Crown 
                    className="h-6 w-6 text-[#BAFF39] drop-shadow-[0_0_8px_rgba(186,255,57,0.8)] animate-pulse" 
                    style={{ filter: 'drop-shadow(0 0 12px rgba(186,255,57,0.6))' }}
                  />
                </div>
              )}
              {strikes === 0 && (
                <div className="flex items-center gap-1 text-[#84cc16]">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
              )}
            </div>

            {/* Subtext */}
            <p className="text-sm text-muted-foreground">
              {state.subtext}
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                {completedShiftCount} shifts completed
              </span>
              {strikes > 0 && (
                <span className={cn('flex items-center gap-1', state.textClass)}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {strikes} active strike{strikes > 1 ? 's' : ''}
                </span>
              )}
              {priorityBoost?.hasActiveBoost && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Zap className="h-3.5 w-3.5" />
                  Priority Boost: +10% ({Math.round(priorityBoost.token?.hoursRemaining ?? 0)}h)
                </span>
              )}
            </div>

            {/* Strike Recovery Progress */}
            <StrikeRecoveryProgress 
              recoveryProgress={recoveryProgress}
              strikes={strikes}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProReliabilityTracker;
