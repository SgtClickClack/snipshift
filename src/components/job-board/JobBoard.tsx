import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { fetchShifts, applyToShift } from '@/lib/api';
import { Shift } from '@/shared/types';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { MapPin, Clock, DollarSign, Calendar, Filter, X, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDistance } from '@/lib/google-maps';
import { EmptyState } from '@/components/ui/empty-state';

interface JobBoardFilters {
  dateRangeStart?: string;
  dateRangeEnd?: string;
  location?: string;
  radius?: number;
  minHourlyRate?: number;
}

interface OpportunityCardProps {
  shift: Shift;
  onApply: (shiftId: string) => void;
  isApplying: boolean;
  hasApplied: boolean;
  distance?: number;
}

function OpportunityCard({ shift, onApply, isApplying, hasApplied, distance }: OpportunityCardProps) {
  const startTime = shift.startTime ? parseISO(shift.startTime) : null;
  const endTime = shift.endTime ? parseISO(shift.endTime) : null;
  const hourlyRate = parseFloat(shift.hourlyRate || '0');

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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2">{shift.title}</CardTitle>
            {/* Mobile-first grid layout for shift details */}
            <div className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground">
              {/* Date row */}
              {startTime && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{formatDate(startTime)}</span>
                </div>
              )}
              {/* Time row */}
              {startTime && endTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{formatTime(startTime)} - {formatTime(endTime)}</span>
                  {hours && <span className="text-xs whitespace-nowrap">({hours}h)</span>}
                </div>
              )}
              {/* Location row */}
              {shift.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{shift.location}</span>
                  {distance !== undefined && (
                    <span className="text-xs whitespace-nowrap">({distance.toFixed(1)} mi)</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant={shift.autoAccept ? 'default' : 'secondary'} 
            className={`shrink-0 self-start ${shift.autoAccept ? 'bg-[#BAFF39] text-black' : ''}`}
          >
            {shift.autoAccept ? 'Instant' : 'Apply'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {shift.description && (
          <p className="text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
            {shift.description}
          </p>
        )}
        {/* Pay and action - optimized for mobile */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#BAFF39]" />
              <span className="text-lg font-semibold">${hourlyRate.toFixed(2)}/hr</span>
            </div>
            {hours && (
              <span className="text-sm font-medium text-[#BAFF39]">
                ${(hourlyRate * parseFloat(hours)).toFixed(0)} total
              </span>
            )}
          </div>
          <Button
            onClick={() => onApply(shift.id)}
            disabled={isApplying || hasApplied}
            variant={hasApplied ? 'outline' : 'accent'}
            className="w-full min-h-[44px]"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : hasApplied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Applied
              </>
            ) : (
              'Quick Apply'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JobBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<JobBoardFilters>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [appliedShiftIds, setAppliedShiftIds] = useState<Set<string>>(new Set());
  const [applyingShiftId, setApplyingShiftId] = useState<string | null>(null);

  // Get user location with HIGH ACCURACY GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Silently fail - location is optional
        },
        // HIGH ACCURACY GPS OPTIONS
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, []);

  // Fetch open shifts
  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts', 'open'],
    queryFn: () => fetchShifts({ status: 'open' }),
  });

  // Filter shifts
  const filteredShifts = useMemo(() => {
    let filtered = [...shifts];

    // Filter by date range
    if (filters.dateRangeStart) {
      const startDate = new Date(filters.dateRangeStart);
      filtered = filtered.filter((shift) => {
        if (!shift.startTime) return false;
        const shiftDate = parseISO(shift.startTime);
        return shiftDate >= startDate;
      });
    }

    if (filters.dateRangeEnd) {
      const endDate = new Date(filters.dateRangeEnd);
      endDate.setHours(23, 59, 59); // Include entire end date
      filtered = filtered.filter((shift) => {
        if (!shift.startTime) return false;
        const shiftDate = parseISO(shift.startTime);
        return shiftDate <= endDate;
      });
    }

    // Filter by minimum hourly rate
    if (filters.minHourlyRate !== undefined && filters.minHourlyRate > 0) {
      filtered = filtered.filter((shift) => {
        const rate = parseFloat(shift.hourlyRate || '0');
        return rate >= filters.minHourlyRate!;
      });
    }

    // Filter by location/radius (if location is provided)
    if (filters.location && filters.radius && userLocation) {
      // For now, we'll just filter by location string match
      // In a real implementation, you'd geocode the location and calculate distances
      if (filters.location.trim()) {
        filtered = filtered.filter((shift) => {
          if (!shift.location) return false;
          return shift.location.toLowerCase().includes(filters.location!.toLowerCase());
        });
      }
    }

    return filtered;
  }, [shifts, filters, userLocation]);

  // Calculate distances for filtered shifts
  const shiftsWithDistance = useMemo(() => {
    if (!userLocation) return filteredShifts.map((shift) => ({ shift, distance: undefined }));

    return filteredShifts.map((shift) => {
      // Try to extract coordinates from location or use a default
      // In a real implementation, you'd geocode the location
      const distance: number | undefined = undefined;
      
      // For now, we'll skip distance calculation if location format is unclear
      // You could enhance this with geocoding
      
      return { shift, distance };
    });
  }, [filteredShifts, userLocation]);

  // Apply to shift mutation
  const applyMutation = useMutation({
    mutationFn: applyToShift,
    onMutate: async (shiftId: string) => {
      setApplyingShiftId(shiftId);
      // Optimistic update
      setAppliedShiftIds((prev) => new Set(prev).add(shiftId));
    },
    onSuccess: (data, shiftId) => {
      if (data.instantAccept) {
        toast({
          title: 'Shift Accepted!',
          description: 'You have been instantly accepted for this shift.',
        });
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
        queryClient.invalidateQueries({ queryKey: ['applications'] });
      } else {
        toast({
          title: 'Application Submitted',
          description: 'Your application has been submitted. The shop will review it shortly.',
        });
      }
    },
    onError: (error: any, shiftId) => {
      // Revert optimistic update
      setAppliedShiftIds((prev) => {
        const next = new Set(prev);
        next.delete(shiftId);
        return next;
      });
      toast({
        title: 'Application Failed',
        description: error?.message || 'Failed to apply for shift. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setApplyingShiftId(null);
    },
  });

  const handleApply = (shiftId: string) => {
    applyMutation.mutate(shiftId);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Job Board</h1>
          <p className="text-muted-foreground mt-1">
            Browse and apply for open shifts
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {Object.keys(filters).length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {Object.keys(filters).length}
            </Badge>
          )}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Filters</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({});
                  setShowFilters(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateStart">Start Date</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={filters.dateRangeStart || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateRangeStart: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateEnd">End Date</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={filters.dateRangeEnd || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateRangeEnd: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minRate">Min Hourly Rate ($)</Label>
                <Input
                  id="minRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minHourlyRate || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minHourlyRate: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State"
                  value={filters.location || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Radius (miles)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="0"
                  value={filters.radius || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      radius: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : shiftsWithDistance.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Search}
              title="No shifts found in your area"
              description={filteredShifts.length === 0 && shifts.length > 0
                ? 'No shifts match your filters. Try adjusting your search criteria.'
                : 'No open shifts available at the moment. Check back later!'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shiftsWithDistance.map(({ shift, distance }) => (
            <OpportunityCard
              key={shift.id}
              shift={shift}
              onApply={handleApply}
              isApplying={applyingShiftId === shift.id}
              hasApplied={appliedShiftIds.has(shift.id)}
              distance={distance}
            />
          ))}
        </div>
      )}
    </div>
  );
}

