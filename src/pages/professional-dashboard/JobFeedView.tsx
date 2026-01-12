import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { JobCard } from './JobCard';
import { useJobFeedData, JobFeedFilters } from './useJobFeedData';
import { LoadingSpinner } from '@/components/loading/loading-spinner';
import { JobFeedFilterBar } from '@/components/professional/JobFeedFilterBar';

/**
 * JobFeedView Component
 * 
 * Main component for displaying available shifts/jobs for professionals.
 * Includes filter bar area, job list with loading and empty states.
 * 
 * @component
 */
export default function JobFeedView() {
  const [searchParams] = useSearchParams();

  // Extract filters from URL query parameters
  const filters: JobFeedFilters = useMemo(() => {
    const filterObj: JobFeedFilters = {};

    const location = searchParams.get('location');
    if (location) {
      filterObj.location = location;
    }

    const minPayRate = searchParams.get('minPayRate');
    if (minPayRate) {
      filterObj.minPayRate = parseFloat(minPayRate);
    }

    const maxPayRate = searchParams.get('maxPayRate');
    if (maxPayRate) {
      filterObj.maxPayRate = parseFloat(maxPayRate);
    }

    const jobType = searchParams.get('jobType');
    if (jobType && ['bartender', 'waiter', 'chef', 'barista', 'other'].includes(jobType)) {
      filterObj.jobType = jobType as 'bartender' | 'waiter' | 'chef' | 'barista' | 'other';
    }

    return filterObj;
  }, [searchParams]);

  // Fetch job data from API with filters from URL
  const { jobs, isLoading, error } = useJobFeedData(filters);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Title */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Available Shifts</h1>
          <p className="text-muted-foreground mt-2">
            Browse and filter available shifts that match your skills and preferences
          </p>
        </header>

        {/* Filter Bar Component Area */}
        <div className="mb-6">
          <JobFeedFilterBar />
        </div>

        {/* Job List Component Area */}
        <div className="space-y-4">
          {isLoading ? (
            // Loading State
            <Card>
              <CardContent className="p-6 md:p-12">
                <LoadingSpinner size="lg" />
                <p className="text-center text-muted-foreground mt-4">Loading available shifts...</p>
              </CardContent>
            </Card>
          ) : error ? (
            // Error State
            <Card>
              <CardContent className="p-6 md:p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="bg-destructive/10 rounded-full p-4 mb-4">
                    <svg
                      className="h-12 w-12 text-destructive"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Error loading shifts
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    {error.message || 'An error occurred while fetching available shifts. Please try again later.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : jobs.length === 0 ? (
            // Empty State
            <Card>
              <CardContent className="p-6 md:p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="bg-muted rounded-full p-4 mb-4">
                    <svg
                      className="h-12 w-12 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No shifts matching your criteria
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    Try adjusting your filters to see more available shifts.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Job List
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="job-list">
              {(jobs || []).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  data-testid={`job-card-${job.id}`}
                  onViewDetails={() => {
                    // TODO: Implement navigation to job details
                  }}
                  onApply={() => {
                    // TODO: Implement job application
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

