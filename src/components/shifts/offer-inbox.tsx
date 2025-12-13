import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchShiftOffers, acceptShiftOffer, declineShiftOffer, ShiftOffer } from "@/lib/api";
import { ShiftOfferCard } from "./shift-offer-card";
import { useToast } from "@/hooks/use-toast";
import { Inbox, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";

export function OfferInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addNotification } = useNotification();

  // Fetch shift offers
  const { data: offers = [], isLoading } = useQuery<ShiftOffer[]>({
    queryKey: ['/api/shifts/offers/me'],
    queryFn: fetchShiftOffers,
    enabled: !!user?.id,
  });

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: acceptShiftOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/offers/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({
        title: "Shift Accepted",
        description: "You've successfully accepted the shift offer.",
      });
      // Add notification
      addNotification('success', 'Shift confirmed! Added to your calendar.');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to accept shift offer.",
        variant: "destructive",
      });
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: declineShiftOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/offers/me'] });
      toast({
        title: "Shift Declined",
        description: "You've declined the shift offer.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to decline shift offer.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = (shiftId: string) => {
    acceptMutation.mutate(shiftId);
  };

  const handleDecline = (shiftId: string) => {
    declineMutation.mutate(shiftId);
  };

  const isProcessing = acceptMutation.isPending || declineMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading offers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (offers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center min-h-[200px] py-8 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-base font-medium text-foreground mb-1">
              You're all caught up!
            </p>
            <p className="text-sm text-muted-foreground">
              Update your availability to get more offers
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="offer-inbox">
      <CardHeader>
        <CardTitle>Job Requests ({offers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {offers.map((offer) => (
            <ShiftOfferCard
              key={offer.id}
              offer={offer}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

