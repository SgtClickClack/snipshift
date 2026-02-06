import { StarRating } from './star-rating';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  jobId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
  };
}

interface ReviewListProps {
  reviews: Review[];
  emptyMessage?: string;
}

export function ReviewList({ reviews, emptyMessage = 'No reviews yet' }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-steel-600">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="card-chrome">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-steel-900 mb-1">
                  {review.reviewer.name}
                </h4>
                <p className="text-sm text-steel-600 mb-2">
                  {review.job.title}
                </p>
              </div>
              <div className="text-xs text-steel-500">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </div>
            </div>

            <div className="mb-3">
              <StarRating rating={review.rating} readonly size="sm" />
            </div>

            {review.comment && (
              <p className="text-sm text-steel-700 whitespace-pre-wrap break-words overflow-hidden bg-steel-50 p-3 rounded border border-steel-200">
                {review.comment}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

