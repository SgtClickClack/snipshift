import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { fetchWorkerRecommendations, ShiftRecommendation } from '@/lib/api/analytics/professional';
import { applyToShift } from '@/lib/api/professional';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { MapPin, Clock, DollarSign, Calendar, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface RecommendedShiftCardProps {
  recommendation: ShiftRecommendation;
  onApply: (shiftId: string) => void;
  isApplying: boolean;
  hasApplied: boolean;
}

function RecommendedShiftCard({ 
  recommendation, 
  onApply, 
  isApplying, 
  hasApplied 
}: RecommendedShiftCardProps) {
  const navigate = useNavigate();
  const startTime = recommendation.startTime ? parseISO(recommendation.startTime) : null;
  const endTime = recommendation.endTime ? parseISO(recommendation.endTime) : null;
  const hourlyRate = parseFloat(recommendation.hourlyRate || '0');

  const formatDate = (date: Date | null) => {
    if (!date) return 'Date TBD';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return format(date, 'h:mm a');
  };

  const hours = startTime && endTime 
    ? ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1)
    : null;

  const getMatchReasonColor = (reason: string) => {
    if (reason.includes('Highly Rated') || reason.includes('Top Rated')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300';
    }
    if (reason.includes('Close')) {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300';
    }
    if (reason.includes('Just Posted')) {
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300';
    }
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300';
  };

  return (
    <Card className="min-w-[320px] max-w-[320px] hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg leading-tight flex-1">{recommendation.title}</CardTitle>
          <Badge 
            variant="outline" 
            className={`text-xs whitespace-nowrap ${getMatchReasonColor(recommendation.matchReason)}`}
          >
            {recommendation.matchReason}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2">
          {startTime && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(startTime)}</span>
            </div>
          )}
          {startTime && endTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
            </div>
          )}
        </div>
        {recommendation.location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{recommendation.location}</span>
            {recommendation.distanceKm !== undefined && (
              <span className="text-xs">({recommendation.distanceKm.toFixed(1)} km)</span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        {recommendation.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {recommendation.description}
          </p>
        )}
        
        {/* Venue Rating */}
        {recommendation.venue.averageRating && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="font-medium">{recommendation.venue.name}</span>
            <Badge variant="secondary" className="text-xs">
              ⭐ {recommendation.venue.averageRating.toFixed(1)}
              {recommendation.venue.reviewCount > 0 && ` (${recommendation.venue.reviewCount})`}
            </Badge>
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-semibold">${hourlyRate.toFixed(2)}/hr</span>
            {hours && (
              <span className="text-xs text-muted-foreground">
                (${(hourlyRate * parseFloat(hours)).toFixed(2)})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/shifts/${recommendation.id}`)}
            >
              View
            </Button>
            <Button
              onClick={() => onApply(recommendation.id)}
              disabled={isApplying || hasApplied}
              variant={hasApplied ? 'outline' : 'accent'}
              size="sm"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Applying...
                </>
              ) : hasApplied ? (
                'Applied'
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecommendedShiftsProps {
  className?: string;
}

export function RecommendedShifts({ className }: RecommendedShiftsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [appliedShiftIds, setAppliedShiftIds] = useState<Set<string>>(new Set());
  const [applyingShiftId, setApplyingShiftId] = useState<string | null>(null);

  // Get user location with silent fallback - with mounted check to prevent state updates after unmount
  // If geolocation fails or is denied, the API returns empty recommendations gracefully
  useEffect(() => {
    let isMounted = true;
    
    if (!navigator.geolocation) {
      // Geolocation not supported - continue silently
      return;
    }

    // Wrap in try-catch for additional safety
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isMounted) {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        },
        () => {
          // Silent fallback - geolocation denied or failed
          // API will return empty recommendations which is handled gracefully
          if (isMounted) {
            setUserLocation(null);
          }
        },
        {
          enableHighAccuracy: false, // Use low accuracy for faster response
          timeout: 5000, // Reduced timeout to avoid long waits
          maximumAge: 600000, // 10 minutes cache
        }
      );
    } catch {
      // Catch any unexpected errors silently
      if (isMounted) {
        setUserLocation(null);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const { data: recommendationsData, isLoading, error } = useQuery({
    queryKey: ['worker-recommendations', userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchWorkerRecommendations(userLocation?.lat, userLocation?.lng),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  const handleApply = async (shiftId: string) => {
    if (appliedShiftIds.has(shiftId)) return;

    setApplyingShiftId(shiftId);
    try {
      await applyToShift(shiftId);
      setAppliedShiftIds(prev => new Set(prev).add(shiftId));
      toast({
        title: 'Application submitted',
        description: 'Your application has been sent to the venue.',
      });
    } catch (error: any) {
      toast({
        title: 'Application failed',
        description: error?.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setApplyingShiftId(null);
    }
  };

  if (error) {
    // Don't show error state, just don't render the component
    return null;
  }

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Top Picks for You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!recommendationsData || recommendationsData.recommendations.length === 0) {
    return null; // Don't show empty state
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Top Picks for You
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/job-feed')}
              className="text-sm"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-4 -mx-2 px-2">
            <div className="flex gap-4 min-w-max">
              {recommendationsData.recommendations.map((recommendation) => (
                <RecommendedShiftCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onApply={handleApply}
                  isApplying={applyingShiftId === recommendation.id}
                  hasApplied={appliedShiftIds.has(recommendation.id)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
