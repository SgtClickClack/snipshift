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
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    payRange: '',
    jobType: '',
    experience: ''
  });

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['/api/jobs', filters],
    queryFn: async () => {
      // Always return mock data for testing
      return [
        {
          id: '1',
          title: 'Senior Barber - Weekend Shift',
          hubName: 'Elite Barbershop',
          location: 'Sydney, NSW',
          payRate: 35,
          shiftDuration: 8,
          requiredSkills: ['Hair Cutting', 'Fade Techniques', 'Beard Styling']
        },
        {
          id: '2',
          title: 'Mobile Barber Service',
          hubName: 'Mobile Grooming Co',
          location: 'Melbourne, VIC',
          payRate: 40,
          shiftDuration: 8,
          requiredSkills: ['Mobile Services', 'Customer Service', 'Hair Cutting']
        }
      ];
    }
  });

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
  };

  const handleApplyForJob = (job: Job) => {
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = () => {
    console.log('Application submitted for:', selectedJob?.title);
    setShowApplicationModal(false);
    setCoverLetter('');
    setSelectedJob(null);
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
          data-testid="filter-location"
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
      <div className="flex-1 overflow-y-auto" data-testid="shift-results">
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
                data-testid="shift-card"
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
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJobSelect(job);
                        }}
                        data-testid="button-view-shift"
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyForJob(job);
                        }}
                        data-testid="button-apply-shift"
                      >
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" data-testid="modal-shift-details">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-steel-900">{selectedJob.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJob(null)}
                className="text-steel-600 hover:text-steel-900"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-steel-900">Hub Details</h3>
                <p className="text-steel-600">{selectedJob.hubName}</p>
              </div>
              
              <div className="flex items-center text-steel-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{selectedJob.location}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-steel-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>${selectedJob.payRate}/hr</span>
                </div>
                <div className="flex items-center text-steel-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{selectedJob.shiftDuration} hours</span>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-steel-900 mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.requiredSkills?.map((skill: string) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedJob(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleApplyForJob(selectedJob);
                    setSelectedJob(null);
                  }}
                  data-testid="button-apply-shift-modal"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" data-testid="modal-shift-application">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-steel-900">Apply for {selectedJob.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApplicationModal(false)}
                className="text-steel-600 hover:text-steel-900"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-steel-900 mb-2">Job Details</h3>
                <p className="text-steel-600">{selectedJob.hubName} - {selectedJob.location}</p>
                <p className="text-steel-600">${selectedJob.payRate}/hr for {selectedJob.shiftDuration} hours</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-steel-900 mb-2">
                  Cover Letter
                </label>
                <textarea
                  className="w-full p-3 border border-steel-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Tell us why you're interested in this position..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  data-testid="textarea-cover-letter"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowApplicationModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitApplication}
                  data-testid="button-submit-application"
                >
                  Submit Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
