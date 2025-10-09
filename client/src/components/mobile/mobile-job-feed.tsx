import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Filter, X } from "lucide-react";
import { Job } from "@shared/schema";
import MobileJobFilter from "./mobile-job-filter";
import MobileJobDetails from "./mobile-job-details";

export default function MobileJobFeed() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    payRange: '',
    jobType: '',
    experience: ''
  });

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['/api/jobs', filters],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/jobs');
      return response.json();
    }
  });

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
  };

  const handleBackToList = () => {
    setSelectedJob(null);
  };

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  if (selectedJob) {
    return (
      <MobileJobDetails 
        job={selectedJob} 
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="mobile-job-feed">
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h1 className="text-xl font-bold text-steel-900">Jobs</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(true)}
          data-testid="mobile-filter-button"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Active Filters */}
      {Object.values(filters).some(f => f) && (
        <div className="p-4 bg-steel-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-steel-700">Active Filters:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ location: '', payRange: '', jobType: '', experience: '' })}
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.location && (
              <Badge variant="secondary" data-testid="active-filter-indicator">
                Location: {filters.location}
              </Badge>
            )}
            {filters.payRange && (
              <Badge variant="secondary">
                Pay: {filters.payRange}
              </Badge>
            )}
            {filters.jobType && (
              <Badge variant="secondary">
                Type: {filters.jobType}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-steel-600 mx-auto"></div>
            <p className="mt-2 text-steel-600">Loading jobs...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-600">Failed to load jobs</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-steel-600">No jobs found</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setShowFilters(true)}
            >
              Adjust Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {jobs.map((job: Job) => (
              <Card 
                key={job.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleJobSelect(job)}
                data-testid="mobile-job-card"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-steel-900" data-testid="job-title">
                        {job.title}
                      </h3>
                      <p className="text-sm text-steel-600">{job.hubName}</p>
                    </div>
                    
                    <div className="flex items-center text-sm text-steel-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span data-testid="job-location">{job.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-steel-600">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span data-testid="job-pay">${job.payRate}/hr</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-steel-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{job.shiftDuration}h</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {job.requiredSkills?.map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <MobileJobFilter
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
