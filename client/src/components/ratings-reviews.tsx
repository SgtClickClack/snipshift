import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, User, Calendar } from 'lucide-react';

interface Review {
  id: string;
  raterName: string;
  rating: number;
  review: string;
  createdAt: string;
  jobTitle?: string;
}

const mockReviews: Review[] = [
  {
    id: '1',
    raterName: 'Elite Barbershop',
    rating: 5,
    review: 'Excellent work! Very professional and skilled. Would definitely hire again.',
    createdAt: '2024-01-10',
    jobTitle: 'Senior Barber - Weekend Shift'
  },
  {
    id: '2',
    raterName: 'Mobile Grooming Co',
    rating: 4,
    review: 'Great mobile service. Punctual and professional. Highly recommend.',
    createdAt: '2024-01-05',
    jobTitle: 'Mobile Barber Service'
  }
];

export default function RatingsReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedJob, setSelectedJob] = useState<string>('');

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "You must select at least one star to submit a review.",
        variant: "destructive",
      });
      return;
    }

    const newReview: Review = {
      id: Date.now().toString(),
      raterName: 'You',
      rating,
      review: reviewText,
      createdAt: new Date().toISOString().split('T')[0],
      jobTitle: selectedJob
    };

    setReviews(prev => [newReview, ...prev]);
    setRating(0);
    setReviewText('');
    setSelectedJob('');
    setShowRatingModal(false);

    toast({
      title: "Review submitted successfully",
      description: "Your review has been posted and will be visible to others.",
    });
  };

  const renderStars = (rating: number, interactive = false, size = 'h-5 w-5') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={interactive ? () => handleStarClick(star) : undefined}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
            data-testid={`star-${star}`}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`${size} ${
                star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ratings & Reviews</h2>
        <p className="text-gray-600">View and manage your professional ratings and reviews</p>
      </div>

      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Rating Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">4.8</div>
              <div className="flex justify-center mt-1">
                {renderStars(4.8)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Based on {reviews.length} reviews</p>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter(r => r.rating === star).length;
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm w-8">{star}</span>
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{review.raterName}</h4>
                      {review.jobTitle && (
                        <p className="text-sm text-gray-600">{review.jobTitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      {renderStars(review.rating)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{review.createdAt}</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700">{review.review}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rate and Review Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="modal-rate-barber">
            <h2 className="text-xl font-bold mb-4">Rate and Review</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Job/Shift
              </label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                aria-label="Select completed job to rate"
              >
                <option value="">Select a completed job</option>
                <option value="Senior Barber - Weekend Shift">Senior Barber - Weekend Shift</option>
                <option value="Mobile Barber Service">Mobile Barber Service</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex justify-center">
                {renderStars(rating, true)}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review (Optional)
              </label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience working with this professional..."
                rows={4}
                data-testid="textarea-review"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRatingModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                className="flex-1"
                data-testid="button-submit-review"
              >
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="text-center">
        <Button
          onClick={() => setShowRatingModal(true)}
          data-testid="button-rate-barber"
        >
          Rate a Professional
        </Button>
      </div>
    </div>
  );
}
