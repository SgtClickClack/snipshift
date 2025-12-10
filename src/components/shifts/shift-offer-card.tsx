import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ShiftOffer } from "@/lib/api";

interface ShiftOfferCardProps {
  offer: ShiftOffer;
  onAccept: (shiftId: string) => void;
  onDecline: (shiftId: string) => void;
  isProcessing?: boolean;
}

export function ShiftOfferCard({ 
  offer, 
  onAccept, 
  onDecline,
  isProcessing = false 
}: ShiftOfferCardProps) {
  // Calculate duration in hours
  const startTime = new Date(offer.startTime);
  const endTime = new Date(offer.endTime);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  // Calculate estimated total pay
  const hourlyRate = parseFloat(offer.hourlyRate);
  const estimatedTotalPay = durationHours * hourlyRate;

  return (
    <Card className="border-2 border-teal-500/30 hover:border-teal-500/50 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          {/* Business Logo */}
          <div className="flex-shrink-0">
            {offer.businessLogo ? (
              <img
                src={offer.businessLogo}
                alt={offer.businessName}
                className="w-16 h-16 rounded-lg object-cover border-2 border-teal-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-teal-100 flex items-center justify-center border-2 border-teal-200">
                <Building2 className="w-8 h-8 text-teal-600" />
              </div>
            )}
          </div>

          {/* Business Name and Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {offer.businessName}
            </h3>
            <h4 className="text-xl font-bold text-foreground mb-2">
              {offer.title}
            </h4>
            <Badge variant="outline" className="border-teal-500 text-teal-700">
              Job Request
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date and Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {format(startTime, "EEEE, MMMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
          </span>
          <span className="text-muted-foreground/70">
            ({durationHours.toFixed(1)} hours)
          </span>
        </div>

        {/* Location */}
        {offer.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{offer.location}</span>
          </div>
        )}

        {/* Pay Information */}
        <div className="flex items-baseline justify-between pt-2 border-t">
          <div>
            <div className="text-sm text-muted-foreground">Hourly Rate</div>
            <div className="text-lg font-semibold">${hourlyRate.toFixed(2)}/hr</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Estimated Total Pay</div>
            <div className="text-3xl font-bold text-teal-600">
              ${estimatedTotalPay.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Description */}
        {offer.description && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {offer.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => onAccept(offer.id)}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Accept Shift
          </Button>
          <Button
            onClick={() => onDecline(offer.id)}
            disabled={isProcessing}
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
          >
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

