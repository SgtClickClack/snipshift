import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Star } from "lucide-react";
import { fetchShiftsPendingReview } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import ShiftReviewModal from "./shift-review-modal";
import { formatDistanceToNow } from "date-fns";

export default function PendingReviewNotification() {
  const { user } = useAuth();
  const [selectedShift, setSelectedShift] = useState<{
    id: string;
    title: string;
    reviewerName: string;
    reviewType: 'SHOP_REVIEWING_BARBER' | 'BARBER_REVIEWING_SHOP';
  } | null>(null);

  const { data: pendingShifts, isLoading } = useQuery({
    queryKey: ['shifts-pending-review', user?.id],
    queryFn: fetchShiftsPendingReview,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes instead of 1 minute
    refetchOnWindowFocus: false,
  });

  if (isLoading || !pendingShifts || pendingShifts.length === 0) {
    return null;
  }

  const handleReviewClick = (shift: typeof pendingShifts[0]) => {
    const isShop = shift.employerId === user?.id;
    const reviewerName = isShop ? shift.assigneeName || 'Staff Member' : shift.employerName || 'Venue';
    const reviewType = isShop ? 'SHOP_REVIEWING_BARBER' : 'BARBER_REVIEWING_SHOP';

    setSelectedShift({
      id: shift.id,
      title: shift.title,
      reviewerName,
      reviewType,
    });
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-lg">Action Required: Rate Your Shifts</CardTitle>
          </div>
          <CardDescription>
            You have {pendingShifts.length} shift{pendingShifts.length > 1 ? 's' : ''} waiting for your review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingShifts.slice(0, 3).map((shift) => {
              const isShop = shift.employerId === user?.id;
              const reviewerName = isShop ? shift.assigneeName || 'Staff Member' : shift.employerName || 'Venue';
              const timeAgo = formatDistanceToNow(new Date(shift.endTime), { addSuffix: true });

              return (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-steel-800 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex-1">
                    <p className="font-medium text-steel-900 dark:text-steel-100">
                      {shift.title}
                    </p>
                    <p className="text-sm text-steel-600 dark:text-steel-400">
                      Rate your shift with {reviewerName} {timeAgo}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleReviewClick(shift)}
                    size="sm"
                    className="steel-button"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </div>
              );
            })}
            {pendingShifts.length > 3 && (
              <p className="text-sm text-steel-600 dark:text-steel-400 text-center pt-2">
                +{pendingShifts.length - 3} more shift{pendingShifts.length - 3 > 1 ? 's' : ''} pending review
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedShift && (
        <ShiftReviewModal
          isOpen={!!selectedShift}
          onClose={() => setSelectedShift(null)}
          shiftId={selectedShift.id}
          shiftTitle={selectedShift.title}
          reviewerName={selectedShift.reviewerName}
          reviewType={selectedShift.reviewType}
          isShop={selectedShift.reviewType === 'SHOP_REVIEWING_BARBER'}
        />
      )}
    </>
  );
}
