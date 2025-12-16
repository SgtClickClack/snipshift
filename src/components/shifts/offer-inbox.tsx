import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchShiftOffers, acceptShiftOffer, declineShiftOffer, ShiftOffer } from "@/lib/api";
import { ShiftOfferCard } from "./shift-offer-card";
import { useToast } from "@/hooks/useToast";
import { Inbox, Loader2, BellRing } from "lucide-react";
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
        <CardHeader className="pb-2">
          <CardTitle>Job Requests</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="flex items-center gap-3 py-2 text-center">
            <Inbox className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                You're all caught up!
              </p>
              <p className="text-xs text-muted-foreground">
                Update your availability to get more offers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="offer-inbox" className="border-2 border-teal-500/50 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500 rounded-full">
              <BellRing className="w-5 h-5 text-white animate-pulse" />
            </div>
            <CardTitle className="text-lg">New Shift Invitations</CardTitle>
          </div>
          <Badge variant="default" className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 text-sm font-semibold">
            {offers.length} Pending
          </Badge>
        </div>
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

