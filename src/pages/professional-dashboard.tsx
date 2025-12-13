import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Job } from "@shared/firebase-schema";

import { Filter, Heart, Calendar, DollarSign, MessageCircle, User, FileText, Search, MapPin, Clock, Map, List, LayoutDashboard, Briefcase, Users, Wallet } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, startOfWeek, endOfWeek } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import StartChatButton from "@/components/messaging/start-chat-button";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import QuickActions from "@/components/dashboard/quick-actions";
import ProfessionalOverview from "@/components/dashboard/professional-overview";
import ProfileForm from "@/components/profile/profile-form";
import ProfessionalDigitalResume from "@/components/profile/professional-digital-resume";
import MessagingModal from "@/components/messaging/messaging-modal";
import AdvancedJobFilters, { JobFilterOptions } from "@/components/job-feed/advanced-job-filters";
import JobApplicationModal from "@/components/job-feed/job-application-modal";
import GoogleMapView from "@/components/job-feed/google-map-view";
import LocationSearch from "@/components/job-feed/location-search";
import ProfessionalCalendar from "@/components/calendar/professional-calendar";
import ApplicationsView from "./professional-dashboard/ApplicationsView";
import { SEO } from "@/components/seo/SEO";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { OfferInbox } from "@/components/shifts/offer-inbox";
import JobBoard from "@/components/job-board/JobBoard";
import PendingReviewNotification from "@/components/shifts/pending-review-notification";
import PayoutSettings from "@/components/payments/payout-settings";
import EarningsDashboard from "@/components/payments/earnings-dashboard";

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const activeView = (viewParam as 'overview' | 'jobs' | 'applications' | 'profile' | 'calendar' | 'payouts' | 'earnings') || 'overview';
  
  const setActiveView = (view: 'overview' | 'jobs' | 'applications' | 'profile' | 'calendar' | 'payouts' | 'earnings') => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', view);
      return newParams;
    });
  };

  const [showFilters, setShowFilters] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Location and travel state
  const [searchLocation, setSearchLocation] = useState("Current Location");
  const [locationCoordinates, setLocationCoordinates] = useState<{ lat: number; lng: number } | null>(null); // Start as null until geolocation completes
  const [isLocating, setIsLocating] = useState(true);
  const [searchRadius, setSearchRadius] = useState(20);
  const [favoriteLocations, setFavoriteLocations] = useState<string[]>(["Sydney", "Melbourne"]);
  
  const [jobFilters, setJobFilters] = useState<JobFilterOptions>({
    searchQuery: "",
    location: "",
    payRateMin: 0,
    payRateMax: 500,
    payType: "all",
    skillsRequired: [],
    dateRange: "all"
  });

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/applications', { status: 'accepted' }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/applications?status=accepted");
      return res.json();
    },
    enabled: !!user?.id
  });

  // Memoize bookings to prevent unnecessary Calendar re-renders
  const bookings = useMemo(() => bookingsData || [], [bookingsData]);

  // Extract booked dates from bookings for calendar indicators
  const bookedDates = useMemo(() => {
    if (!bookings || bookings.length === 0) return []
    return bookings
      .map((booking) => {
        // Extract date from booking (job date, shift startTime, or appliedAt)
        const dateStr = booking.job?.date || booking.shift?.startTime || booking.appliedAt
        if (!dateStr) return null
        
        // Handle different date formats
        const bookingDate = typeof dateStr === 'string' 
          ? new Date(dateStr) 
          : dateStr instanceof Date 
          ? dateStr 
          : null
        
        if (!bookingDate || isNaN(bookingDate.getTime())) return null
        
        // Normalize to start of day
        const normalized = new Date(bookingDate)
        normalized.setHours(0, 0, 0, 0)
        return normalized
      })
      .filter((d): d is Date => d !== null)
  }, [bookings]);

  // Get user's current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      // Fallback to Sydney if geolocation not supported
      setLocationCoordinates({ lat: -33.8688, lng: 151.2093 });
      setIsLocating(false);
      return;
    }

    setIsLocating(true);

    const geolocationOptions = {
      enableHighAccuracy: true,
      timeout: 3000, // 3 second timeout
      maximumAge: 0 // Don't use cached position
    };

    const successCallback = (position: GeolocationPosition) => {
      clearTimeout(timeoutId);
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      setLocationCoordinates(coords);
      setSearchLocation("Current Location");
      setIsLocating(false);
    };

    const errorCallback = () => {
      clearTimeout(timeoutId);
      // Fallback to Sydney if geolocation fails
      setLocationCoordinates({ lat: -33.8688, lng: 151.2093 });
      setSearchLocation("Sydney");
      setIsLocating(false);
    };

    // Set timeout fallback
    const timeoutId = setTimeout(() => {
      // Fallback to Sydney after 3 seconds
      setLocationCoordinates({ lat: -33.8688, lng: 151.2093 });
      setSearchLocation("Sydney");
      setIsLocating(false);
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      successCallback,
      errorCallback,
      geolocationOptions
    );

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Advanced job filtering with all criteria
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search query filter
      if (jobFilters.searchQuery) {
        const searchLower = jobFilters.searchQuery.toLowerCase();
        const matchesSearch = 
          job.title.toLowerCase().includes(searchLower) ||
          (job.description?.toLowerCase() || '').includes(searchLower) ||
          job.skillsRequired?.some(skill => skill.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Location filter
      if (jobFilters.location) {
        const locationLower = jobFilters.location.toLowerCase();
        // Handle potentially null/undefined or object/string location
        let jobCity = '';
        let jobState = '';
        
        if (job.location && typeof job.location === 'object') {
          jobCity = job.location.city || '';
          jobState = job.location.state || '';
        } else if (typeof job.location === 'string') {
          jobCity = job.location;
        }

        const matchesLocation = 
          jobCity.toLowerCase().includes(locationLower) ||
          jobState.toLowerCase().includes(locationLower);
        if (!matchesLocation) return false;
      }

      // Pay rate filter
      const rawRate = job.payRate;
      let rate = 0;
      if (typeof rawRate === 'string') {
        rate = parseFloat(rawRate.replace(/[^0-9.]/g, ''));
      } else if (typeof rawRate === 'number') {
        rate = rawRate;
      }
      
      if (isNaN(rate)) rate = 0;

      if (rate < jobFilters.payRateMin || rate > jobFilters.payRateMax) {
        return false;
      }

      // Pay type filter
      if (jobFilters.payType !== "all" && job.payType !== jobFilters.payType) {
        return false;
      }

      // Skills filter
      if (jobFilters.skillsRequired.length > 0) {
        const hasRequiredSkills = jobFilters.skillsRequired.some(filterSkill =>
          job.skillsRequired?.some(jobSkill => 
            jobSkill.toLowerCase().includes(filterSkill.toLowerCase())
          )
        );
        if (!hasRequiredSkills) return false;
      }

      // Date range filter
      if (jobFilters.dateRange !== "all") {
        const jobDate = new Date(job.date);
        switch (jobFilters.dateRange) {
          case "today":
            if (!isToday(jobDate)) return false;
            break;
          case "tomorrow":
            if (!isTomorrow(jobDate)) return false;
            break;
          case "this-week":
            if (!isThisWeek(jobDate)) return false;
            break;
          case "next-week": {
            const nextWeekStart = startOfWeek(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            const nextWeekEnd = endOfWeek(nextWeekStart);
            if (jobDate < nextWeekStart || jobDate > nextWeekEnd) return false;
            break;
          }
          case "this-month":
            if (!isThisMonth(jobDate)) return false;
            break;
        }
      }

      return true;
    });
  }, [jobs, jobFilters]);

  const handleApplyToJob = (job: Job) => {
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleClearFilters = () => {
    setJobFilters({
      searchQuery: "",
      location: "",
      payRateMin: 0,
      payRateMax: 500,
      payType: "all",
      skillsRequired: [],
      dateRange: "all"
    });
  };

  // Location and travel handlers
  const handleLocationChange = (location: string, coordinates: { lat: number; lng: number }) => {
    setSearchLocation(location);
    setLocationCoordinates(coordinates);
  };

  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
  };

  const handleAddFavorite = (location: string) => {
    if (!favoriteLocations.includes(location)) {
      setFavoriteLocations([...favoriteLocations, location]);
    }
  };

  const handleRemoveFavorite = (location: string) => {
    setFavoriteLocations(favoriteLocations.filter(loc => loc !== location));
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'browse-jobs':
        setActiveView('jobs');
        break;
      case 'my-applications':
        setActiveView('applications');
        break;
      case 'view-calendar':
        setActiveView('calendar');
        break;
      case 'open-messages':
        navigate('/professional-messages');
        break;
      default:
        break;
    }
  };

  const handleStatClick = (action: string) => {
    switch (action) {
      case 'applications':
        setActiveView('applications');
        break;
      case 'bookings':
        setActiveView('calendar');
        break;
      case 'messages':
        navigate('/professional-messages');
        break;
      case 'reviews':
        setActiveView('profile');
        break;
      default:
        break;
    }
  };

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/dashboard");
      return res.json();
    },
    enabled: !!user,
  });

  // Stats
  const stats = dashboardStats?.summary || {
    activeApplications: jobs.filter(job => job.applicants?.includes(user?.id || '')).length,
    upcomingBookings: bookings.length,
    unreadMessages: 0,
    averageRating: 0
  };


  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO title="Professional Dashboard" />
      
      {/* Banner/Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader
          bannerImage={user?.bannerUrl || user?.bannerImage}
          profileImage={user?.avatarUrl || user?.photoURL}
          title={user?.displayName || "Professional Dashboard"}
          subtitle={user?.email}
        />
      </div>

      {/* Dashboard Header */}
      <div className="bg-card/95 backdrop-blur-sm shadow-lg border-b-2 border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Professional Dashboard</h1>
              <p className="text-muted-foreground">{user?.displayName || user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/professional-messages')}
                className="flex-1 md:flex-none bg-gradient-to-r from-steel-700 to-steel-800 hover:from-steel-800 hover:to-steel-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-open-messages"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Messages</span>
                <span className="inline sm:hidden">Chat</span>
              </Button>
              <Button 
                onClick={() => setActiveView('jobs')}
                className="flex-1 md:flex-none bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="button-browse-jobs"
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Browse Jobs</span>
                <span className="inline sm:hidden">Jobs</span>
              </Button>
              <Button
                onClick={() => navigate('/earnings')}
                variant="outline"
                className="flex-1 md:flex-none"
                data-testid="button-earnings"
              >
                <Wallet className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Earnings</span>
                <span className="inline sm:hidden">Wallet</span>
              </Button>
              <Button
                onClick={() => navigate('/travel')}
                variant="outline"
                className="flex-1 md:flex-none"
                data-testid="button-travel-mode"
              >
                <Map className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Travel Mode</span>
                <span className="inline sm:hidden">Map</span>
              </Button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex justify-between md:justify-start md:space-x-8 pb-2 md:pb-0 mt-4 overflow-x-hidden">
            <button
              onClick={() => setActiveView('overview')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700'
              }`}
              data-testid="tab-overview"
            >
              <LayoutDashboard className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Overview</span>
            </button>
            <button
              onClick={() => setActiveView('jobs')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'jobs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700'
              }`}
              data-testid="tab-jobs"
            >
              <Briefcase className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Job Feed</span>
            </button>
            <button
              onClick={() => setActiveView('applications')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'applications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700'
              }`}
              data-testid="tab-applications"
            >
              <Users className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Applications</span>
              <span className="hidden md:inline text-muted-foreground">({stats.activeApplications})</span>
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'calendar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700'
              }`}
              data-testid="tab-calendar"
            >
              <Calendar className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Calendar</span>
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700'
              }`}
              data-testid="tab-profile"
            >
              <User className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Profile</span>
            </button>
            <button
              onClick={() => setActiveView('earnings')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'earnings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700'
              }`}
              data-testid="tab-earnings"
            >
              <DollarSign className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Earnings</span>
            </button>
            <button
              onClick={() => setActiveView('payouts')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-2 md:px-1 pb-3 border-b-2 font-medium text-sm ${
                activeView === 'payouts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-steel-500 hover:text-steel-700'
              }`}
              data-testid="tab-payouts"
            >
              <Wallet className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Payouts</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job Requests - Always visible at the top */}
        <div className="mb-8">
          <OfferInbox />
        </div>

        {/* Pending Review Notification */}
        <div className="mb-8">
          <PendingReviewNotification />
        </div>

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <ProfessionalOverview
            bookings={bookings}
            jobs={jobs}
            onViewChange={setActiveView}
          />
        )}
        
        {/* Jobs Tab */}
        {activeView === 'jobs' && (
          <div className="space-y-6">
            <JobBoard />
          </div>
        )}
        
        {/* Legacy Jobs View - Keeping for reference but replaced by JobBoard */}
        {false && activeView === 'jobs' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Location Search Panel */}
              <div className="lg:col-span-1">
                <LocationSearch
                  onLocationChange={handleLocationChange}
                  onRadiusChange={handleRadiusChange}
                  currentLocation={searchLocation}
                  currentRadius={searchRadius}
                  favoriteLocations={favoriteLocations}
                  onAddFavorite={handleAddFavorite}
                  onRemoveFavorite={handleRemoveFavorite}
                />
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* View Toggle and Filters */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      data-testid="button-list-view"
                    >
                      <List className="mr-2 h-4 w-4" />
                      List View
                    </Button>
                    <Button
                      variant={viewMode === 'map' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('map')}
                      data-testid="button-map-view"
                    >
                      <Map className="mr-2 h-4 w-4" />
                      Map View
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    data-testid="button-toggle-advanced-filters"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Advanced Filters
                  </Button>
                </div>

                {/* Advanced Filters (collapsible) */}
                {showFilters && (
                  <AdvancedJobFilters
                    filters={jobFilters}
                    onFiltersChange={setJobFilters}
                    onClearFilters={handleClearFilters}
                    isExpanded={true}
                    onToggleExpanded={() => setShowFilters(!showFilters)}
                  />
                )}

                {/* Map View */}
                {viewMode === 'map' && (
                  <>
                    {isLocating && (
                      <Card className="mb-4">
                        <CardContent className="p-4 flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">Locating your position...</span>
                        </CardContent>
                      </Card>
                    )}
                    {locationCoordinates && (
                      <GoogleMapView
                        jobs={filteredJobs}
                        onJobSelect={setSelectedJob}
                        selectedJob={selectedJob}
                        centerLocation={locationCoordinates}
                        radius={searchRadius}
                        searchLocation={searchLocation}
                      />
                    )}
                  </>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Available Jobs ({filteredJobs.length}
                        {filteredJobs.length !== jobs.length && ` of ${jobs.length}`})
                      </CardTitle>
                      {filteredJobs.length !== jobs.length && (
                        <div className="text-sm text-muted-foreground">
                          Showing filtered results â€¢ <Button 
                            variant="link" 
                            className="p-0 h-auto text-sm" 
                            onClick={handleClearFilters}
                          >
                            Clear filters
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading jobs...</div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8">
                {jobs.length === 0 ? (
                  <>
                    <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-neutral-600 mb-2">No jobs available at the moment.</p>
                    <p className="text-sm text-neutral-500">Check back later for new opportunities!</p>
                  </>
                ) : (
                  <>
                    <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-neutral-600 mb-2">No jobs match your current filters.</p>
                    <p className="text-sm text-neutral-500 mb-4">Try adjusting your search criteria to see more results.</p>
                    <Button onClick={handleClearFilters} variant="outline">
                      Clear All Filters
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {(filteredJobs || []).map((job) => {
                  const hasApplied = job.applicants?.includes(user?.id || "");
                  
                  return (
                    <Card key={job.id} className="border hover:shadow-md transition-shadow" data-testid={`job-card-${job.id}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-neutral-900 text-lg mb-2" data-testid={`job-title-${job.id}`}>
                              {job.title}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center">
                                <MapPin className="mr-1 h-4 w-4" />
                                <span>
                                  {typeof job.location === 'object' && job.location
                                    ? `${job.location.city || ''}, ${job.location.state || ''}`
                                    : (job.location || 'Remote')}
                                </span>
                              </div>
                              {job.date && (
                                <>
                                  <div className="flex items-center">
                                    <Calendar className="mr-1 h-4 w-4" />
                                    <span>
                                      {(() => {
                                        try {
                                          const date = new Date(job.date);
                                          return isNaN(date.getTime()) ? 'Date TBD' : format(date, "MMM d, yyyy");
                                        } catch {
                                          return 'Date TBD';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="mr-1 h-4 w-4" />
                                    <span>
                                      {(() => {
                                        try {
                                          const date = new Date(job.date);
                                          return isNaN(date.getTime()) ? 'Time TBD' : format(date, "h:mm a");
                                        } catch {
                                          return 'Time TBD';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-neutral-900">
                              ${job.payRate}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              per {job.payType}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-neutral-700 mb-4" data-testid={`job-description-${job.id}`}>
                          {job.description}
                        </p>
                        
                        {job.skillsRequired && job.skillsRequired.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Required Skills:</p>
                            <div className="flex flex-wrap gap-1">
                              {(job.skillsRequired || []).map((skill, index) => (
                                <Badge 
                                  key={`${skill}-${index}`}
                                  variant="secondary"
                                  className="text-xs"
                                  data-testid={`skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-4 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{job.applicants?.length || 0} applicant(s)</span>
                            {hasApplied && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                Applied
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {job.hubId && (
                              <StartChatButton
                                otherUserId={job.hubId}
                                otherUserName="Shop Owner"
                                otherUserRole="hub"
                                variant="outline"
                                size="sm"
                              />
                            )}
                            <Button
                              onClick={() => handleApplyToJob(job)}
                              disabled={hasApplied}
                              variant={hasApplied ? "outline" : "default"}
                              className={hasApplied ? "" : "bg-primary hover:bg-primary/90"}
                              data-testid={`button-apply-${job.id}`}
                            >
                              {hasApplied ? "Applied" : "Apply Now"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Applications Tab */}
        {activeView === 'applications' && (
          <div data-testid="applications-view-container">
            <ApplicationsView />
          </div>
        )}
        
        {/* Calendar Tab */}
        {activeView === 'calendar' && (
          <ProfessionalCalendar
            bookings={bookings}
            isLoading={isLoadingBookings}
            onDateSelect={setDate}
          />
        )}
        
        {/* Profile Tab */}
        {activeView === 'profile' && (
          <ProfessionalDigitalResume />
        )}

        {/* Earnings Tab */}
        {activeView === 'earnings' && (
          <EarningsDashboard onNavigateToPayouts={() => setActiveView('payouts')} />
        )}

        {/* Payouts Tab */}
        {activeView === 'payouts' && (
          <PayoutSettings />
        )}
      </div>
      
      <MessagingModal
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
      />
      
      <JobApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        job={selectedJob}
      />
    </div>
  );
}
