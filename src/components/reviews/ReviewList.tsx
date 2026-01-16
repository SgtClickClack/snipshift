import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/reviews/star-rating';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { User, Calendar, MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  shiftId: string;
  rating: number;
  comment: string | null;
  isAnonymous: boolean;
  revealedAt: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
  } | null;
  shift: {
    id: string;
    title: string;
  } | null;
}

interface ReviewListProps {
  reviews: Review[];
  isLoading?: boolean;
}

/**
 * ReviewList - Displays a list of reviews with StarRating component
 */
export function ReviewList({ reviews, isLoading = false }: ReviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No reviews yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const date = new Date(review.createdAt);
        const isRevealed = !review.isAnonymous || review.revealedAt !== null;

        return (
          <Card key={review.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {isRevealed && review.reviewer ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{review.reviewer.name || 'Anonymous'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground italic">Anonymous</span>
                    </div>
                  )}
                  {review.isAnonymous && !isRevealed && (
                    <Badge variant="secondary" className="text-xs">
                      Hidden
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(date, 'MMM d, yyyy')}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-3">
                <StarRating rating={review.rating} readonly size="sm" />
              </div>

              {/* Shift Title */}
              {review.shift && (
                <div className="mb-2 text-sm text-muted-foreground">
                  For: {review.shift.title}
                </div>
              )}

              {/* Comment */}
              {review.comment && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm">{review.comment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
