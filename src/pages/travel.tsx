import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchShifts } from '@/lib/api';
import { Shift, Job } from '@shared/firebase-schema';
import { Button } from '@/components/ui/button';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { EnhancedJobFilters } from '@/components/job-feed/enhanced-job-filters';
import { EnhancedJobCard } from '@/components/job-feed/enhanced-job-card';
import { JobCardData } from '@/components/job-feed/JobCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { List, Map, SearchX, ArrowUpDown, Loader2 } from 'lucide-react';
import { parseISO, differenceInHours } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { calculateDistance, reverseGeocodeToCity } from '@/lib/google-maps';

type SortOption = 'highest-rate' | 'closest' | 'soonest';

export default function TravelPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJob, setSelectedJob] = useState<JobCardData | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('soonest');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  
  // Dynamic location state (no more hardcoded defaults)
  // Default to Sydney, Australia as fallback when GPS is denied
  const DEFAULT_LOCATION = { lat: -33.8688, lng: 151.2093 };
  const DEFAULT_CITY = 'Sydney';
  
  const [centerLocation, setCenterLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);
  const [radius] = useState(50);
  const [searchLocation, setSearchLocation] = useState<string>('Locating...');

  // Get user location with HIGH ACCURACY GPS
  useEffect(() => {
    const getUserLocation = async () => {
      setIsLocating(true);
      
      if (!navigator.geolocation) {
        // Geolocation not supported - use default
        setUserLocation(DEFAULT_LOCATION);
        setCenterLocation(DEFAULT_LOCATION);
        setSearchLocation(DEFAULT_CITY);
        setIsLocating(false);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          setUserLocation(coords);
          setCenterLocation(coords);
          
          // Reverse geocode to get city name
          try {
            const cityName = await reverseGeocodeToCity(coords.lat, coords.lng);
            setSearchLocation(cityName || 'Current Location');
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            setSearchLocation('Current Location');
          }
          
          setIsLocating(false);
        },
        (error) => {
          // GPS permission denied or error - use default fallback
          console.warn('Geolocation error:', error.message);
          setUserLocation(DEFAULT_LOCATION);
          setCenterLocation(DEFAULT_LOCATION);
          setSearchLocation(DEFAULT_CITY);
          setIsLocating(false);
        },
        // HIGH ACCURACY GPS OPTIONS
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };
    
    getUserLocation();
  }, []);

  // Build filter params from URL search params
  const status = (searchParams.get('status') as 'open' | 'filled' | 'completed') || 'open';
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

  // Use search params in query key to trigger refetch when filters change
  const { data: shifts, isLoading, error } = useQuery({
    queryKey: ['shifts', searchParams.toString()],
    queryFn: () => fetchShifts({ status, limit, offset }),
  });

  // Normalize job data
  const jobList = useMemo(() => {
    if (!shifts) return [];

    return (shifts || []).map((shift: Shift) => {
      // Extract city and state from location string if needed
      let locationCity = 'Unknown';
      let locationState = '';
      
      if (shift.location && typeof shift.location === 'string') {
        const parts = shift.location.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          locationCity = parts[parts.length - 2] || locationCity;
          locationState = parts[parts.length - 1]?.split(' ')[0] || locationState;
        } else if (parts.length === 1) {
          locationCity = parts[0];
        }
      }
      
      const rateValue = shift.pay || shift.hourlyRate;
      const rateString = rateValue !== undefined ? String(rateValue) : undefined;
      
      let dateValue: string | undefined = undefined;
      const rawDate = shift.date || shift.startTime;
      if (rawDate && typeof rawDate === 'string') {
        const testDate = new Date(rawDate);
        if (!isNaN(testDate.getTime())) {
          dateValue = rawDate;
        }
      }

      // Calculate distance if we have coordinates
      let distance: number | undefined = undefined;
      if (userLocation && shift.location) {
        // Try to extract lat/lng from location or use default
        // This is a simplified version - in production, you'd geocode the address
        const lat = parseFloat(shift.location.split(',')[0]) || undefined;
        const lng = parseFloat(shift.location.split(',')[1]) || undefined;
        if (lat && lng) {
          distance = calculateDistance(userLocation, { lat, lng });
        }
      }

      // Calculate hours and estimated pay
      let hours: number | undefined = undefined;
      let estimatedTotalPay: number | undefined = undefined;
      if (shift.startTime && shift.endTime) {
        try {
          const start = parseISO(shift.startTime);
          const end = parseISO(shift.endTime);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            hours = Math.round((differenceInHours(end, start) * 10)) / 10;
            if (rateString) {
              const rate = parseFloat(rateString);
              if (!isNaN(rate)) {
                estimatedTotalPay = Math.round(rate * hours);
              }
            }
          }
        } catch {
          // Invalid date format
        }
      }

      return {
        id: shift.id,
        title: shift.title,
        rate: rateString,
        payRate: rateString,
        date: dateValue,
        startTime: shift.startTime,
        endTime: shift.endTime,
        description: shift.requirements || shift.description,
        location: shift.location || (locationCity && locationState ? `${locationCity}, ${locationState}` : locationCity),
        locationCity,
        locationState,
        status: shift.status,
        lat: undefined,
        lng: undefined,
        shopName: undefined,
        businessId: shift.employerId,
        distance,
        hours,
        estimatedTotalPay,
      } as JobCardData & { distance?: number; hours?: number; estimatedTotalPay?: number };
    });
  }, [shifts, userLocation]);

  // Apply filters and sorting
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = [...jobList];

    // Apply filters from URL params
    const distanceFilter = searchParams.get('distance') ? parseInt(searchParams.get('distance')!, 10) : null;
    const minRate = searchParams.get('minRate') ? parseFloat(searchParams.get('minRate')!) : null;
    const maxRate = searchParams.get('maxRate') ? parseFloat(searchParams.get('maxRate')!) : null;
    const jobType = searchParams.get('jobType') || null;

    if (distanceFilter && userLocation) {
      filtered = filtered.filter((job) => {
        if (job.distance === undefined) return false;
        return job.distance <= distanceFilter;
      });
    }

    if (minRate !== null) {
      filtered = filtered.filter((job) => {
        if (!job.rate) return false;
        const rate = typeof job.rate === 'string' ? parseFloat(job.rate) : job.rate;
        return !isNaN(rate) && rate >= minRate;
      });
    }

    if (maxRate !== null) {
      filtered = filtered.filter((job) => {
        if (!job.rate) return false;
        const rate = typeof job.rate === 'string' ? parseFloat(job.rate) : job.rate;
        return !isNaN(rate) && rate <= maxRate;
      });
    }

    if (jobType && jobType !== 'all') {
      // Filter by job type if the job data includes this field
      // This will need to be implemented based on your actual API data structure
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'highest-rate': {
          const rateA = typeof a.rate === 'string' ? parseFloat(a.rate) : (a.rate || 0);
          const rateB = typeof b.rate === 'string' ? parseFloat(b.rate) : (b.rate || 0);
          return rateB - rateA;
        }
        case 'closest': {
          const distA = a.distance ?? Infinity;
          const distB = b.distance ?? Infinity;
          return distA - distB;
        }
        case 'soonest': {
          const dateA = a.startTime ? parseISO(a.startTime).getTime() : Infinity;
          const dateB = b.startTime ? parseISO(b.startTime).getTime() : Infinity;
          return dateA - dateB;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobList, sortBy, searchParams, userLocation]);

  const handleQuickApply = (job: JobCardData) => {
    // Navigate to application page or show modal
    toast({
      title: 'Application Started',
      description: `Applying to ${job.title}`,
    });
    // Travel Mode is shift-based (feed comes from /api/shifts), so route to shift details.
    navigate(`/shifts/${job.id}`);
  };

  // Show loading state if query is loading or data is not yet available
  if (isLoading || shifts === undefined) {
    return <PageLoadingFallback />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-error">Error loading jobs</h2>
        <p className="text-muted-foreground mt-2">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Travel Mode</h1>
            <p className="text-muted-foreground mt-1">Explore shifts on the map</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest-rate">Highest Rate</SelectItem>
                  <SelectItem value="closest">Closest</SelectItem>
                  <SelectItem value="soonest">Soonest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle - Always show map view but allow switching to list */}
            <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/jobs')}
              >
                <List className="h-4 w-4 mr-2" />
                List View
              </Button>
              <Button 
                variant="default" 
                size="sm"
                disabled
              >
                <Map className="h-4 w-4 mr-2" />
                Map View
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sticky Filters Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <EnhancedJobFilters />
          </div>

          {/* Main Content - Always Map View */}
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-lg border shadow-sm p-6 min-h-[600px]">
              {filteredAndSortedJobs.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[500px]">
                  <div className="text-center py-8 md:py-16 w-full">
                    <div className="flex flex-col items-center justify-center text-muted-foreground mb-6">
                      <div className="bg-card p-4 rounded-full shadow-sm border border-border mb-4">
                        <SearchX className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-xl font-bold text-foreground mb-2">No shifts found</p>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {searchParams.toString() 
                          ? "We couldn't find any jobs matching your filters. Try adjusting your search criteria or increasing the radius."
                          : "There are no shifts available at the moment. Please check back later!"}
                      </p>
                    </div>
                    {searchParams.toString() && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchParams({}, { replace: true });
                        }}
                        className="mt-2"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-[600px]">
                  <GoogleMapView
                    jobs={filteredAndSortedJobs as Job[]}
                    onJobSelect={(job) => setSelectedJob(job as JobCardData | null)}
                    selectedJob={selectedJob as Job | null}
                    centerLocation={userLocation || centerLocation}
                    radius={radius}
                    searchLocation={searchLocation}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
