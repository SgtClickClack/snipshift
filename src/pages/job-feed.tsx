import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchJobs, JobFilterParams } from '@/lib/api';
import { Job } from '@shared/firebase-schema';
import { Button } from '@/components/ui/button';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { JobFilters } from '@/components/jobs/job-filters';
import { JobCard, JobCardData } from '@/components/job-feed/JobCard';

// JobType is now imported from shared schema, but we keep a local alias for API normalization
type JobType = Job;

export default function JobFeedPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  
  // Default center (New York - matching mock data)
  const [centerLocation, setCenterLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [radius, setRadius] = useState(50);
  const [searchLocation, setSearchLocation] = useState('New York');

  // Build filter params from URL search params
  const filterParams: JobFilterParams = {};
  const search = searchParams.get('search');
  const minRate = searchParams.get('minRate');
  const maxRate = searchParams.get('maxRate');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const nearbyLat = searchParams.get('lat');
  const nearbyLng = searchParams.get('lng');
  const nearbyRadius = searchParams.get('radius');

  if (search) filterParams.search = search;
  if (minRate) filterParams.minRate = parseFloat(minRate);
  if (maxRate) filterParams.maxRate = parseFloat(maxRate);
  if (startDate) filterParams.startDate = startDate;
  if (endDate) filterParams.endDate = endDate;
  if (nearbyLat && nearbyLng) {
    filterParams.lat = parseFloat(nearbyLat);
    filterParams.lng = parseFloat(nearbyLng);
    if (nearbyRadius) filterParams.radius = parseFloat(nearbyRadius);
  }

  // Use search params in query key to trigger refetch when filters change
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs', searchParams.toString()],
    queryFn: () => fetchJobs(filterParams),
  });

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Error loading jobs</h2>
        <p className="text-neutral-600 mt-2">Please try again later.</p>
      </div>
    );
  }

  // Normalize jobs to ensure consistent structure
  const jobList: JobCardData[] = (jobs || []).map((job: any) => {
    // Extract city and state from location string if needed
    let locationCity = job.city || 'Unknown';
    let locationState = job.state || '';
    
    if (job.location && typeof job.location === 'string') {
      // Parse location string like "123 Main St, New York, NY 10001"
      const parts = job.location.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        locationCity = parts[parts.length - 2] || locationCity;
        locationState = parts[parts.length - 1]?.split(' ')[0] || locationState;
      }
    }
    
    return {
      ...job,
      // Use rate if available, otherwise payRate
      rate: job.rate || job.payRate,
      payRate: job.rate || job.payRate,
      // Normalize location data
      location: job.location || (locationCity && locationState ? `${locationCity}, ${locationState}` : undefined),
      locationCity,
      locationState,
      // Ensure coordinates are numbers
      lat: job.lat ? Number(job.lat) : undefined,
      lng: job.lng ? Number(job.lng) : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-steel-900">Find Shifts</h1>
            <p className="text-steel-600 mt-1">Browse available shifts in your area</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-steel-200">
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
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)] min-h-[500px]">
              {/* List View */}
              <div className={`flex-1 overflow-y-auto pr-2 space-y-4 ${viewMode === 'map' ? 'hidden lg:block lg:w-1/3' : 'w-full'}`}>
                {jobList.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-steel-500 mb-4">
                      <p className="text-lg font-semibold mb-2">No shifts found</p>
                      <p className="text-sm">
                        {searchParams.toString() 
                          ? "No jobs match your current filters. Try adjusting your search criteria."
                          : "No shifts available at the moment. Check back later!"}
                      </p>
                    </div>
                    {searchParams.toString() && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchParams({}, { replace: true });
                        }}
                        className="mt-4"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  jobList.map((job) => (
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
                  ))
                )}
              </div>

              {/* Map View */}
              <div className={`flex-1 bg-white rounded-lg border border-steel-200 overflow-hidden ${viewMode === 'list' ? 'hidden lg:block' : 'block h-full'}`}>
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
  );
}

