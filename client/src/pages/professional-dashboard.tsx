import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { Job } from "@shared/firebase-schema";

import { Filter, Heart, Calendar, DollarSign, MessageCircle, User, FileText, Search, MapPin, Clock, Map, List } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, startOfWeek, endOfWeek } from "date-fns";
import StartChatButton from "@/components/messaging/start-chat-button";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import QuickActions from "@/components/dashboard/quick-actions";
import ProfileForm from "@/components/profile/profile-form";
import MessagingModal from "@/components/messaging/messaging-modal";
import AdvancedJobFilters, { JobFilterOptions } from "@/components/job-feed/advanced-job-filters";
import JobApplicationModal from "@/components/job-feed/job-application-modal";
import GoogleMapView from "@/components/job-feed/google-map-view";
import LocationSearch from "@/components/job-feed/location-search";

export default function ProfessionalDashboard() {
  const user = authService.getCurrentUser();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'overview' | 'jobs' | 'applications' | 'profile'>('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Location and travel state
  const [searchLocation, setSearchLocation] = useState("Current Location");
  const [locationCoordinates, setLocationCoordinates] = useState({ lat: -33.8688, lng: 151.2093 }); // Default to Sydney
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



  // Advanced job filtering with all criteria
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search query filter
      if (jobFilters.searchQuery) {
        const searchLower = jobFilters.searchQuery.toLowerCase();
        const matchesSearch = 
          job.title.toLowerCase().includes(searchLower) ||
          job.description.toLowerCase().includes(searchLower) ||
          job.skillsRequired?.some(skill => skill.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Location filter
      if (jobFilters.location) {
        const locationLower = jobFilters.location.toLowerCase();
        const matchesLocation = 
          job.location.city.toLowerCase().includes(locationLower) ||
          job.location.state.toLowerCase().includes(locationLower);
        if (!matchesLocation) return false;
      }

      // Pay rate filter
      if (job.payRate < jobFilters.payRateMin || job.payRate > jobFilters.payRateMax) {
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
          case "next-week":
            const nextWeekStart = startOfWeek(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            const nextWeekEnd = endOfWeek(nextWeekStart);
            if (jobDate < nextWeekStart || jobDate > nextWeekEnd) return false;
            break;
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
        // Navigate to calendar view
        break;
      case 'open-messages':
        setShowMessaging(true);
        break;
      default:
        break;
    }
  };

  // Mock stats for demonstration
  const stats = {
    activeApplications: jobs.filter(job => job.applicants?.includes(user?.id || '')).length,
    upcomingBookings: 2, // This would come from booking system
    unreadMessages: 1, // This would come from messaging service
    averageRating: 4.8
  };

  if (!user || user.role !== "professional") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--bg-professional)'}}>
      {/* Dashboard Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b-2 border-steel-300/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-steel-900">Professional Dashboard</h1>
              <p className="text-steel-600">{user?.displayName || user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowMessaging(true)}
                className="bg-gradient-to-r from-steel-700 to-steel-800 hover:from-steel-800 hover:to-steel-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-open-messages"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button 
                onClick={() => setActiveView('jobs')}
                className="bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="button-browse-jobs"
              >
                <Search className="mr-2 h-4 w-4" />
                Browse Jobs
              </Button>
              <Button
                onClick={() => {
                  setActiveView('jobs');
                  setViewMode('map');
                }}
                variant="outline"
                data-testid="button-travel-mode"
              >
                <Map className="mr-2 h-4 w-4" />
                Travel Mode
              </Button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex space-x-8 mt-4">
            <button
              onClick={() => setActiveView('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              data-testid="tab-overview"
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('jobs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'jobs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              data-testid="tab-jobs"
            >
              Job Feed
            </button>
            <button
              onClick={() => setActiveView('applications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'applications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              data-testid="tab-applications"
            >
              Applications ({stats.activeApplications})
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              data-testid="tab-profile"
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            <DashboardStats role="professional" stats={stats} />
            
            <div className="grid lg:grid-cols-3 gap-6">
              <QuickActions role="professional" onAction={handleQuickAction} />
              
              <div className="lg:col-span-2">
                <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-steel-300/50">
                  <CardHeader className="bg-gradient-to-b from-steel-50 to-white rounded-t-lg border-b border-steel-200/50">
                    <CardTitle className="text-steel-900">Recent Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {jobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{job.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              ${job.payRate}/{job.payType} • {job.location.city}, {job.location.state}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <StartChatButton
                              otherUserId={job.hubId}
                              otherUserName="Hub Owner"
                              otherUserRole="hub"
                              variant="outline"
                              size="sm"
                            />
                            <Button 
                              onClick={() => {
                                setSelectedJob(job);
                                setShowApplicationModal(true);
                              }} 
                              size="sm"
                              disabled={job.applicants?.includes(user?.id || "")}
                            >
                              {job.applicants?.includes(user?.id || "") ? "Applied" : "Apply"}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {jobs.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          No jobs available right now. Check back later for new opportunities!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {/* Jobs Tab */}
        {activeView === 'jobs' && (
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
                  <GoogleMapView
                    jobs={filteredJobs}
                    onJobSelect={setSelectedJob}
                    selectedJob={selectedJob}
                    centerLocation={locationCoordinates}
                    radius={searchRadius}
                    searchLocation={searchLocation}
                  />
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
                          Showing filtered results • <Button 
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
                {filteredJobs.map((job) => {
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
                                <span>{job.location.city}, {job.location.state}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="mr-1 h-4 w-4" />
                                <span>{format(new Date(job.date), "MMM d, yyyy")}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="mr-1 h-4 w-4" />
                                <span>{format(new Date(job.date), "h:mm a")}</span>
                              </div>
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
                              {job.skillsRequired.map((skill, index) => (
                                <Badge 
                                  key={index}
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
                            <StartChatButton
                              otherUserId={job.hubId}
                              otherUserName="Hub Owner"
                              otherUserRole="hub"
                              variant="outline"
                              size="sm"
                            />
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
          <Card>
            <CardHeader>
              <CardTitle>My Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.activeApplications === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No applications yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Start applying to jobs to see your applications here</p>
                  <Button onClick={() => setActiveView('jobs')}>Browse Jobs</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.filter(job => job.applicants?.includes(user?.id || '')).map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{job.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Applied on {format(new Date(job.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(new Date(job.date), "MMM d")}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <DollarSign className="mr-2 h-4 w-4" />
                          ${job.payRate}/{job.payType}
                        </div>
                        <StartChatButton
                          otherUserId={job.hubId}
                          otherUserName="Hub Owner"
                          otherUserRole="hub"
                          variant="outline"
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Profile Tab */}
        {activeView === 'profile' && (
          <div className="max-w-4xl">
            <ProfileForm onSave={(data) => console.log('Profile saved:', data)} />
          </div>
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
