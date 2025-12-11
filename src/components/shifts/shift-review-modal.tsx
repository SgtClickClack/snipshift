import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/reviews/star-rating";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ShiftReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  shiftTitle: string;
  reviewerName: string; // Name of the person being reviewed
  reviewType: 'SHOP_REVIEWING_BARBER' | 'BARBER_REVIEWING_SHOP';
  isShop?: boolean; // Whether the current user is the shop
}

export default function ShiftReviewModal({
  isOpen,
  onClose,
  shiftId,
  shiftTitle,
  reviewerName,
  reviewType,
  isShop = false,
}: ShiftReviewModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [markAsNoShow, setMarkAsNoShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: {
      rating: number;
      comment?: string;
      type: 'SHOP_REVIEWING_BARBER' | 'BARBER_REVIEWING_SHOP';
      markAsNoShow?: boolean;
    }) => {
      const response = await apiRequest("POST", `/api/shifts/${shiftId}/review`, reviewData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit review' }));
        throw new Error(`${response.status}: ${JSON.stringify(errorData)}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback.",
        variant: "default",
      });
      // Invalidate shift data and user ratings
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", shiftId] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
      // Reset form
      setRating(0);
      setComment("");
      setMarkAsNoShow(false);
      setErrors({});
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to submit review';
      let message = 'Failed to submit review. Please try again.';
      
      try {
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.message) {
            message = parsed.message;
          }
        } else {
          const textMatch = errorMessage.match(/\d+:\s*(.+)/);
          if (textMatch && textMatch[1]) {
            message = textMatch[1].trim();
          }
        }
      } catch {
        // Use default message
      }

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setErrors({ submit: message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (rating === 0) {
      setErrors({ rating: "Please select a rating" });
      return;
    }

    submitReviewMutation.mutate({
      rating,
      comment: comment.trim() || undefined,
      type: reviewType,
      markAsNoShow: isShop && markAsNoShow,
    });
  };

  const handleClose = () => {
    if (!submitReviewMutation.isPending) {
      onClose();
      // Reset form when closing
      setRating(0);
      setComment("");
      setMarkAsNoShow(false);
      setErrors({});
    }
  };

  const reviewTypeLabel = reviewType === 'SHOP_REVIEWING_BARBER' 
    ? 'Rate the Barber' 
    : 'Rate the Shop';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{reviewTypeLabel}</DialogTitle>
          <DialogDescription>
            Share your experience with <span className="font-semibold">{reviewerName}</span> for "{shiftTitle}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="rating" className="text-steel-900 mb-3 block">
              Rating *
            </Label>
            <StarRating rating={rating} onChange={setRating} />
            {errors.rating && (
              <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.rating}
              </p>
            )}
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

          {isShop && reviewType === 'SHOP_REVIEWING_BARBER' && (
            <div className="flex items-center justify-between p-4 border border-steel-200 rounded-lg bg-steel-50">
              <div className="flex-1">
                <Label htmlFor="no-show" className="text-steel-900 font-medium cursor-pointer">
                  Mark as No-Show
                </Label>
                <p className="text-sm text-steel-600 mt-1">
                  Check this if the barber did not show up for the shift
                </p>
              </div>
              <Switch
                id="no-show"
                checked={markAsNoShow}
                onCheckedChange={setMarkAsNoShow}
              />
            </div>
          )}

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errors.submit}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitReviewMutation.isPending || rating === 0}
              className="steel-button"
            >
              {submitReviewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
