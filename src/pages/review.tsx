import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchJobDetails, fetchJobApplications } from '@/lib/api';
import { ReviewForm } from '@/components/reviews/review-form';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ReviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const jobId = searchParams.get('jobId');

  const [revieweeId, setRevieweeId] = useState<string | null>(null);
  const [revieweeName, setRevieweeName] = useState<string>('');

  const { data: job, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJobDetails(jobId!),
    enabled: !!jobId,
  });

  const { data: applications } = useQuery({
    queryKey: ['job-applications', jobId],
    queryFn: () => fetchJobApplications(jobId!),
    enabled: !!jobId && !!user,
  });

  useEffect(() => {
    if (!jobId || !job || !user) {
      return;
    }

    // Determine who to review based on user's role
    if (job.businessId === user.id) {
      // User is the employer - review the accepted professional
      const acceptedApp = applications?.find(app => app.status === 'accepted');
      if (acceptedApp && acceptedApp.userId) {
        setRevieweeId(acceptedApp.userId);
        setRevieweeName(acceptedApp.name);
      }
    } else {
      // User is the professional - review the employer
      if (job.businessId) {
        setRevieweeId(job.businessId);
        setRevieweeName(job.businessName || job.shopName || 'Business Owner');
      }
    }
  }, [job, user, jobId, applications]);

  if (!jobId) {
    return null;
  }

  if (isLoadingJob) {
    return <PageLoadingFallback />;
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="card-chrome max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Job Not Found</h2>
            <p className="text-neutral-600 mb-4">The job you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/my-applications')} className="steel-button">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if job is completed
  if (job.status !== 'completed') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="card-chrome max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-steel-900 mb-2">Job Not Completed</h2>
            <p className="text-neutral-600 mb-4">Reviews can only be left for completed jobs.</p>
            <Button onClick={() => navigate('/my-applications')} className="steel-button">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleReviewSuccess = () => {
    navigate('/my-applications');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-steel-900 mb-2">Leave a Review</h1>
          <p className="text-steel-600">Share your experience for "{job.title}"</p>
        </div>

        {revieweeId ? (
          <ReviewForm
            jobId={jobId}
            jobTitle={job.title}
            revieweeId={revieweeId}
            revieweeName={revieweeName}
            onSuccess={handleReviewSuccess}
          />
        ) : (
          <Card className="card-chrome">
            <CardContent className="p-8 text-center">
              <p className="text-steel-600">
                {applications ? "Unable to load review form. The user to review could not be found." : "Loading review form..."}
              </p>
              {applications && (
                <Button 
                  onClick={() => navigate('/my-applications')} 
                  variant="outline" 
                  className="mt-4"
                >
                  Back to Applications
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

