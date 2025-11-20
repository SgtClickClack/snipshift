import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/lib/api';
import { Job } from '@/types'; // Assuming types exist or define inline
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import GoogleMapView from '@/components/job-feed/google-map-view';
import { MapPin, Clock, DollarSign, Filter } from 'lucide-react';

// Job type matching API response structure
interface JobType {
  id: string;
  title: string;
  shopName?: string;
  rate?: string;
  payRate?: string; // For backward compatibility
  date: string;
  lat?: number;
  lng?: number;
  location?: string; // Full location string from API
  // Additional fields
  description?: string;
  startTime?: string;
  endTime?: string;
  address?: string;
  city?: string;
  state?: string;
  hubId?: string;
  skillsRequired?: string[];
}

export default function JobFeedPage() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  
  // Default center (New York - matching mock data)
  const [centerLocation, setCenterLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [radius, setRadius] = useState(50);
  const [searchLocation, setSearchLocation] = useState('New York');

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => fetchJobs(),
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
  const jobList = (jobs || []).map((job: any) => {
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
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-steel-900 text-white' : 'text-steel-600'}
            >
              List View
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('map')}
              className={viewMode === 'map' ? 'bg-steel-900 text-white' : 'text-steel-600'}
            >
              Map View
            </Button>
          </div>
        </header>

        {/* Search & Filter Bar (Placeholder) */}
        <div className="bg-white p-4 rounded-lg border border-steel-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-steel-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search by location (e.g. New York)" 
              className="w-full pl-10 pr-4 py-2 border border-steel-200 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              defaultValue="New York"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">
          {/* List View */}
          <div className={`flex-1 overflow-y-auto pr-2 space-y-4 ${viewMode === 'map' ? 'hidden lg:block lg:w-1/3' : 'w-full'}`}>
            {jobList.length === 0 ? (
              <div className="text-center py-12 text-steel-500">
                No shifts found matching your criteria.
              </div>
            ) : (
              jobList.map((job: JobType) => (
                <Card 
                  key={job.id} 
                  className={`card-chrome cursor-pointer transition-colors ${selectedJob?.id === job.id ? 'border-primary ring-1 ring-primary' : ''}`}
                  onClick={() => setSelectedJob(job)}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-steel-900">{job.title}</h3>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {job.rate || job.payRate || 'Rate TBD'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-steel-600 mb-4">
                      {job.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      {job.date && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {job.date}
                            {job.startTime && job.endTime && ` • ${job.startTime} - ${job.endTime}`}
                          </span>
                        </div>
                      )}
                      {job.shopName && (
                        <div className="text-steel-500 text-xs">
                          {job.shopName}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="w-full steel-button">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
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
  );
}

