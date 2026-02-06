import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchShifts } from '@/lib/api/shared';
import { Shift, Job } from '@shared/firebase-schema';
import { Button } from '@/components/ui/button';
import { JobCardSkeleton } from '@/components/loading/skeleton-loaders';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { EnhancedJobFilters } from '@/components/job-feed/enhanced-job-filters';
import { EnhancedJobCard } from '@/components/job-feed/enhanced-job-card';
import { JobCardData } from '@/components/job-feed/JobCard';
import { LocationInput } from '@/components/ui/location-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { List, Map, ArrowUpDown, Loader2, MapPin, Navigation, SlidersHorizontal, Search } from 'lucide-react';
import { parseISO, differenceInHours } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { calculateDistance, reverseGeocodeToCity, geocodeAddress } from '@/lib/google-maps';
import { useIsStaffCompliant } from '@/hooks/useCompliance';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/empty-state';
import { RSARequiredModal } from '@/components/job-feed/rsa-required-modal';

type SortOption = 'highest-rate' | 'closest' | 'soonest';
type ViewMode = 'list' | 'map';

export default function JobFeedPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isStaffCompliant = useIsStaffCompliant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedJob, setSelectedJob] = useState<JobCardData | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('soonest');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [rsaWarningDismissed, setRsaWarningDismissed] = useState(() => {
    return sessionStorage.getItem('dismissed_rsa_warning') === 'true';
  });
  const [showRsaRequiredModal, setShowRsaRequiredModal] = useState(false);
  
  // Dynamic location state
  // Default to Brisbane, Australia as fallback (HospoGo is Brisbane-focused)
  const DEFAULT_LOCATION = { lat: -27.4705, lng: 153.0260 };
  const DEFAULT_CITY = 'Brisbane';
  
  const [centerLocation, setCenterLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);
  const [radius] = useState(50);
  const [searchLocation, setSearchLocation] = useState<string>('Locating...');
  const [locationSearchValue, setLocationSearchValue] = useState<string>('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);

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
        async (error) => {
          // GPS permission denied or error - try to use user's home suburb
          console.warn('Geolocation error:', error.message);
          
          let fallbackLocation = DEFAULT_LOCATION;
          let fallbackCity = DEFAULT_CITY;
          
          // Try to geocode user's location if available
          if (user?.location) {
            try {
              const coords = await geocodeAddress(user.location);
              if (coords) {
                fallbackLocation = coords;
                // Extract city from location string
                const locationParts = user.location.split(',').map(s => s.trim());
                fallbackCity = locationParts[0] || DEFAULT_CITY;
              }
            } catch (geocodeError) {
              console.warn('Failed to geocode user location:', geocodeError);
            }
          }
          
          setUserLocation(fallbackLocation);
          setCenterLocation(fallbackLocation);
          setSearchLocation(fallbackCity);
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

  // Handle manual location selection from search
  const handleLocationSelect = useCallback((location: { lat: number; lng: number; address: string }) => {
    setUserLocation(location);
    setCenterLocation(location);
    setSearchLocation(location.address.split(',')[0] || location.address);
    setShowLocationSearch(false);
    setLocationSearchValue('');
    toast({
      title: 'Location Updated',
      description: `Showing shifts near ${location.address.split(',')[0]}`,
    });
  }, [toast]);

  // Handle "Use My Location" button click
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location Unavailable',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    setIsLocating(true);
    setShowLocationSearch(false);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setUserLocation(coords);
        setCenterLocation(coords);
        
        try {
          const cityName = await reverseGeocodeToCity(coords.lat, coords.lng);
          setSearchLocation(cityName || 'Current Location');
          toast({
            title: 'Location Updated',
            description: `Using your current location${cityName ? ` (${cityName})` : ''}`,
          });
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          setSearchLocation('Current Location');
        }
        
        setIsLocating(false);
      },
      async (error) => {
        console.warn('Geolocation error:', error.message);
        
        // Try to use user's home suburb as fallback
        let fallbackLocation = DEFAULT_LOCATION;
        let fallbackCity = DEFAULT_CITY;
        
        if (user?.location) {
          try {
            const coords = await geocodeAddress(user.location);
            if (coords) {
              fallbackLocation = coords;
              const locationParts = user.location.split(',').map(s => s.trim());
              fallbackCity = locationParts[0] || DEFAULT_CITY;
              
              setUserLocation(fallbackLocation);
              setCenterLocation(fallbackLocation);
              setSearchLocation(fallbackCity);
              
              toast({
                title: 'Using Your Home Location',
                description: `Using ${fallbackCity} from your profile since GPS is unavailable.`,
              });
            } else {
              throw new Error('Geocoding failed');
            }
          } catch (geocodeError) {
            console.warn('Failed to geocode user location:', geocodeError);
            toast({
              title: 'Location Error',
              description: 'Could not get your location. Please search for a location manually.',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Location Error',
            description: 'Could not get your location. Please search for a location manually.',
            variant: 'destructive',
          });
        }
        
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [toast]);

  // Build filter params from URL search params
  const status = (searchParams.get('status') as 'open' | 'filled' | 'completed') || 'open';
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

  // Use search params and location in query key to trigger refetch when filters or location change
  const { data: shifts, isLoading, error } = useQuery({
    queryKey: ['shifts', searchParams.toString(), userLocation?.lat, userLocation?.lng, radius],
    queryFn: () => fetchShifts({ 
      status, 
      limit, 
      offset,
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      radius: radius,
    }),
    enabled: !isLocating, // Only fetch when location is determined
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

      // Extract lat/lng from shift data
      let shiftLat: number | undefined = undefined;
      let shiftLng: number | undefined = undefined;
      
      if (shift.lat !== null && shift.lat !== undefined) {
        shiftLat = typeof shift.lat === 'string' ? parseFloat(shift.lat) : shift.lat;
      }
      if (shift.lng !== null && shift.lng !== undefined) {
        shiftLng = typeof shift.lng === 'string' ? parseFloat(shift.lng) : shift.lng;
      }

      // Use distance from API if available (from marketplace endpoint), otherwise calculate client-side
      let distance: number | undefined = undefined;
      if ((shift as any).distance !== undefined && (shift as any).distance !== null) {
        distance = typeof (shift as any).distance === 'string' 
          ? parseFloat((shift as any).distance) 
          : (shift as any).distance;
      } else if (userLocation && shiftLat !== undefined && shiftLng !== undefined && !isNaN(shiftLat) && !isNaN(shiftLng)) {
        // Fallback to client-side calculation if API didn't provide distance
        distance = calculateDistance(userLocation, { lat: shiftLat, lng: shiftLng });
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
        lat: shiftLat,
        lng: shiftLng,
        shopName: shift.shopName || undefined,
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
      // TODO: Implement job type filtering based on actual API data structure
      // For now, we keep all jobs when a job type filter is selected
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

  const userProfile = (user?.profile ?? {}) as { rsa_expiry?: string; rsaExpiry?: string };

  // Check if RSA is expired
  const isRsaExpired = useMemo(() => {
    if (!user) return false;
    const rsaExpiryRaw = user.rsaExpiry || userProfile.rsa_expiry || userProfile.rsaExpiry || null;
    if (!rsaExpiryRaw) return false;
    
    try {
      const expiry = new Date(rsaExpiryRaw);
      if (isNaN(expiry.getTime())) return false;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return todayStart.getTime() >= expiry.getTime();
    } catch {
      return false;
    }
  }, [user]);

  const handleQuickApply = (job: JobCardData) => {
    // Check RSA compliance before allowing application
    if (!isStaffCompliant) {
      setShowRsaRequiredModal(true);
      return;
    }
    
    // Navigate to application page or show modal
    toast({
      title: 'Application Started',
      description: `Applying to ${job.title}`,
    });
    // This page is shift-based (feed comes from /api/shifts), so route to shift details.
    navigate(`/shifts/${job.id}`);
  };

  const handleDismissRsaWarning = () => {
    sessionStorage.setItem('dismissed_rsa_warning', 'true');
    setRsaWarningDismissed(true);
  };

  // Show loading state if query is loading or data is not yet available
  // We'll show skeleton loaders in the content area instead of full page fallback

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-error">Error loading jobs</h2>
        <p className="text-muted-foreground mt-2">Please try again later.</p>
      </div>
    );
  }

  // Show RSA warning overlay only if not compliant AND not dismissed
  const showRsaOverlay = !isStaffCompliant && !rsaWarningDismissed;

  return (
    <div className="min-h-screen bg-background relative">
      <div className={showRsaOverlay ? 'pointer-events-none select-none blur-sm' : ''}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Find Shifts</h1>
            <div className="mt-1">
              {isLocating ? (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Locating you...</span>
                </p>
              ) : showLocationSearch ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-64">
                    <LocationInput
                      value={locationSearchValue}
                      onChange={setLocationSearchValue}
                      onSelect={handleLocationSelect}
                      placeholder="Search city or suburb..."
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyLocation}
                    className="flex items-center gap-1"
                  >
                    <Navigation className="h-3 w-3" />
                    Use GPS
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLocationSearch(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLocationSearch(true)}
                  className="text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors group"
                >
                  <span>Browse available shifts near</span>
                  <span className="font-medium text-foreground flex items-center gap-1 group-hover:text-primary">
                    <MapPin className="h-3 w-3" />
                    {searchLocation}
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-primary">(change)</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Mobile Filter Button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden flex items-center gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden xs:inline">Filters</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filter Shifts</SheetTitle>
                </SheetHeader>
                <EnhancedJobFilters className="block border-0 shadow-none" />
              </SheetContent>
            </Sheet>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-28 sm:w-44">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest-rate">Highest Rate</SelectItem>
                  <SelectItem value="closest">Closest</SelectItem>
                  <SelectItem value="soonest">Soonest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 sm:gap-2 bg-card p-1 rounded-lg border border-border">
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-2 sm:px-3"
              >
                <List className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button 
                variant={viewMode === 'map' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('map')}
                className="px-2 sm:px-3"
              >
                <Map className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Map</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sticky Filters Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <EnhancedJobFilters />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="glassmorphic-card bg-card rounded-lg border shadow-sm p-6 min-h-[600px]">
              {isLoading || shifts === undefined ? (
                <JobCardSkeleton count={6} />
              ) : viewMode === 'list' ? (
                <>
                  {filteredAndSortedJobs.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[500px]">
                      <EmptyState
                        icon={Search}
                        title="No shifts found in your area"
                        description={searchParams.toString() 
                          ? "We couldn't find any jobs matching your filters. Try adjusting your search criteria or increasing the radius."
                          : "There are no shifts available at the moment. Please check back later!"}
                        action={searchParams.toString() ? {
                          label: "Clear All Filters",
                          onClick: () => setSearchParams({}, { replace: true }),
                          variant: "outline"
                        } : undefined}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {(filteredAndSortedJobs || []).map((job) => (
                        <EnhancedJobCard
                          key={job.id}
                          job={job as JobCardData & { distance?: number; estimatedTotalPay?: number; hours?: number }}
                          onQuickApply={handleQuickApply}
                          onViewDetails={(e) => {
                            e.stopPropagation();
                            // Navigate to shift details page since job feed shows shifts
                            navigate(`/shifts/${job.id}`);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
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

      {showRsaOverlay ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg text-center">
            <h2 className="text-xl font-bold text-foreground">
              RSA Verification Required to View Shifts
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your RSA certificate and ensure it's verified and not expired before browsing shifts.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleDismissRsaWarning}>
                Maybe Later
              </Button>
              <Button onClick={() => navigate('/settings?category=verification')}>
                Go to Verification
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <RSARequiredModal
        isOpen={showRsaRequiredModal}
        onClose={() => setShowRsaRequiredModal(false)}
        isExpired={isRsaExpired}
      />
    </div>
  );
}
