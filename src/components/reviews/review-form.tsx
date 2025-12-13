import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createReview, CreateReviewData } from '@/lib/api';
import { StarRating } from './star-rating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewFormProps {
  jobId: string;
  jobTitle: string;
  revieweeId: string;
  revieweeName: string;
  onSuccess?: () => void;
}

export function ReviewForm({ jobId, jobTitle, revieweeId, revieweeName, onSuccess }: ReviewFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');

  // Frontend guard: prevent self-review
  if (user && user.id === revieweeId) {
    return (
      <Card className="card-chrome">
        <CardContent className="p-8 text-center">
          <p className="text-steel-600">You cannot review yourself.</p>
        </CardContent>
      </Card>
    );
  }

  const createReviewMutation = useMutation({
    mutationFn: (data: CreateReviewData) => createReview(data),
    onSuccess: () => {
      toast({
        title: 'Review submitted',
        description: 'Thank you for your feedback!',
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to submit review',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Additional guard check before submission
    if (user && user.id === revieweeId) {
      toast({
        title: 'Cannot review yourself',
        description: 'You cannot review yourself.',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a rating.',
        variant: 'destructive',
      });
      return;
    }

    createReviewMutation.mutate({
      revieweeId,
      jobId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <Card className="card-chrome">
      <CardHeader>
        <CardTitle className="text-xl text-steel-900">Leave a Review</CardTitle>
        <p className="text-sm text-steel-600 mt-1">
          Rate your experience with <span className="font-semibold">{revieweeName}</span> for "{jobTitle}"
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="rating" className="text-steel-900 mb-2 block">
              Rating *
            </Label>
            <StarRating rating={rating} onChange={setRating} />
          </div>

          <div>
            <Label htmlFor="comment" className="text-steel-900 mb-2 block">
              Comment (optional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-steel-500 mt-1">
              {comment.length}/1000 characters
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={createReviewMutation.isPending || rating === 0}
              className="steel-button"
            >
              {createReviewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

