import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchShifts } from '@/lib/api';
import { Shift } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { JobFilters } from '@/components/jobs/job-filters';
import { JobCard, JobCardData } from '@/components/job-feed/JobCard';
import { SearchX } from 'lucide-react';

// Shift type for the feed
type ShiftType = Shift;

export default function JobFeedPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedJob, setSelectedJob] = useState<ShiftType | null>(null);
  
  // Default center (New York - matching mock data)
  const [centerLocation, setCenterLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [radius, setRadius] = useState(50);
  const [searchLocation, setSearchLocation] = useState('New York');

  // Build filter params from URL search params
  const status = (searchParams.get('status') as 'open' | 'filled' | 'completed') || 'open';
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

  // Use search params in query key to trigger refetch when filters change
  const { data: shifts, isLoading, error } = useQuery({
    queryKey: ['shifts', searchParams.toString()],
    queryFn: () => fetchShifts({ status, limit, offset }),
  });

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

  // Normalize shifts to ensure consistent structure for JobCard component
  const jobList: JobCardData[] = (shifts || []).map((shift: any) => {
    // Extract city and state from location string if needed
    let locationCity = 'Unknown';
    let locationState = '';
    
    if (shift.location && typeof shift.location === 'string') {
      // Parse location string like "123 Main St, New York, NY 10001"
      const parts = shift.location.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        locationCity = parts[parts.length - 2] || locationCity;
        locationState = parts[parts.length - 1]?.split(' ')[0] || locationState;
      } else if (parts.length === 1) {
        locationCity = parts[0];
      }
    }
    
    return {
      id: shift.id,
      title: shift.title,
      // Use pay if available, otherwise hourlyRate
      rate: shift.pay || shift.hourlyRate,
      payRate: shift.pay || shift.hourlyRate,
      // Use date (which is startTime) for date field
      date: shift.date || shift.startTime,
      startTime: shift.startTime,
      endTime: shift.endTime,
      // Use requirements if available, otherwise description
      description: shift.requirements || shift.description,
      // Normalize location data
      location: shift.location || (locationCity && locationState ? `${locationCity}, ${locationState}` : locationCity),
      locationCity,
      locationState,
      status: shift.status,
      // JobCard expects these fields but shifts don't have them, so set defaults
      lat: undefined,
      lng: undefined,
      shopName: undefined,
      businessId: shift.employerId,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Find Shifts</h1>
            <p className="text-muted-foreground mt-1">Browse available shifts in your area</p>
          </div>
          
          <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border">
            <Button 
              variant={viewMode === 'list' ? 'charcoal' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'charcoal' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('map')}
            >
              Map View
            </Button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <JobFilters />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-[calc(100vh-250px)] min-h-[500px]">
              <div className="flex flex-col lg:flex-row gap-6 h-full">
                {/* List View */}
                {jobList.length === 0 ? (
                  <div className={`flex-1 overflow-y-auto pr-2 flex items-center justify-center ${viewMode === 'map' ? 'hidden lg:flex lg:w-1/3' : 'w-full'}`}>
                    <div className="text-center py-16 w-full">
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
                  <div className={`flex-1 overflow-y-auto pr-2 ${viewMode === 'map' ? 'hidden lg:block lg:w-1/3 space-y-4' : 'w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 content-start'}`}>
                    {jobList.map((job) => (
                      <JobCard 
                        key={job.id} 
                        job={job}
                        isSelected={selectedJob?.id === job.id}
                        onClick={() => setSelectedJob(job)}
                        onViewDetails={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}`);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Map View */}
              <div className={`flex-1 ${viewMode === 'list' ? 'hidden' : 'block h-full'}`}>
                <GoogleMapView
                  jobs={jobList}
                  onJobSelect={setSelectedJob}
                  selectedJob={selectedJob}
                  centerLocation={centerLocation}
                  radius={radius}
                  searchLocation={searchLocation}
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

