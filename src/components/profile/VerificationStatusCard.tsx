import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Shield, Star, Clock, AlertTriangle, Wine } from 'lucide-react';
import { VerificationBadge, TopRatedBadge, type VerificationStatus } from './VerificationBadge';

interface VerificationStatusData {
  verificationStatus: VerificationStatus;
  completedShiftCount: number;
  noShowCount: number;
  noShowsLast30Days: number;
  topRatedBadge: boolean;
  averageRating: number | null;
  reviewCount: number;
  consecutiveFiveStarCount: number;
  canWorkAlcoholShifts: boolean;
  rsaCertificateUploaded: boolean;
}

async function fetchVerificationStatus(): Promise<VerificationStatusData> {
  const res = await fetch('/api/me/verification-status', {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch verification status');
  }
  return res.json();
}

export function VerificationStatusCard() {
  const { user } = useAuth();

  const { data: status, isLoading } = useQuery<VerificationStatusData>({
    queryKey: ['verification-status', user?.id],
    queryFn: fetchVerificationStatus,
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  // Calculate progress to Top Rated badge (needs 5 consecutive 5-star reviews)
  const topRatedProgress = Math.min((status.consecutiveFiveStarCount / 5) * 100, 100);
  const needsMoreReviewsForBadge = !status.topRatedBadge && status.consecutiveFiveStarCount < 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <VerificationBadge status={status.verificationStatus} />
            {status.topRatedBadge && <TopRatedBadge />}
          </div>
        </div>
        <CardDescription>
          Your professional standing and verification status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Messages */}
        {status.verificationStatus === 'pending_review' && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <Clock className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Complete Your First Shift
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                New accounts are marked as "Pending Review" until their first successful shift completion.
                Complete a shift to get verified!
              </p>
            </div>
          </div>
        )}

        {status.verificationStatus === 'at_risk' && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Your Rating Needs Attention
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your average rating has dropped below 4.0. Focus on delivering excellent service
                to maintain your account standing and visibility to venues.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-primary">{status.completedShiftCount}</div>
            <div className="text-xs text-muted-foreground">Completed Shifts</div>
          </div>
          
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {status.averageRating?.toFixed(1) || '—'}
            </div>
            <div className="text-xs text-muted-foreground">Average Rating</div>
          </div>
          
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-primary">{status.reviewCount}</div>
            <div className="text-xs text-muted-foreground">Total Reviews</div>
          </div>
          
          <div className="rounded-lg border p-4 text-center">
            <div className={`text-2xl font-bold ${status.noShowsLast30Days > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {status.noShowsLast30Days}
            </div>
            <div className="text-xs text-muted-foreground">No-Shows (30 days)</div>
          </div>
        </div>

        {/* Top Rated Badge Progress */}
        {needsMoreReviewsForBadge && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Progress to Top Rated Badge
              </span>
              <span className="text-muted-foreground">
                {status.consecutiveFiveStarCount}/5 consecutive 5-star reviews
              </span>
            </div>
            <Progress value={topRatedProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Earn the Top Rated badge by receiving 5 consecutive 5-star reviews from venues.
            </p>
          </div>
        )}

        {status.topRatedBadge && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30">
            <Star className="mt-0.5 h-5 w-5 fill-amber-500 text-amber-500" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Top Rated Professional
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You've earned this badge by consistently delivering excellent service
                with {status.consecutiveFiveStarCount}+ consecutive 5-star reviews!
              </p>
            </div>
          </div>
        )}

        {/* Alcohol Service Eligibility */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wine className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Alcohol Service Shifts</p>
                <p className="text-sm text-muted-foreground">
                  RSA certification required
                </p>
              </div>
            </div>
            {status.canWorkAlcoholShifts ? (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Eligible</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Upload RSA</span>
              </div>
            )}
          </div>
          {!status.rsaCertificateUploaded && (
            <p className="mt-2 text-xs text-muted-foreground">
              Upload a photo of your RSA certificate to unlock Alcohol Service shifts.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
