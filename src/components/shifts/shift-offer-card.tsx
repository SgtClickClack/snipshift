import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ShiftOffer } from "@/lib/api/professional";
import { OptimizedImage } from "@/components/ui/optimized-image";

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
    <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          {/* Business Logo */}
          <div className="flex-shrink-0">
            {offer.businessLogo ? (
                <OptimizedImage
                src={offer.businessLogo}
                alt={offer.businessName}
                fallbackType="image"
                className="w-16 h-16 rounded-lg object-cover border-2 border-primary/40"
                containerClassName="rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center border-2 border-primary/40">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>

          {/* Business Name and Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 truncate">
              {offer.businessName}
            </h3>
            <h4 className="text-lg sm:text-xl font-bold text-foreground mb-2 line-clamp-2">
              {offer.title}
            </h4>
            <Badge variant="outline" className="border-primary text-primary">
              Job Request
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4">
        {/* Date and Time - Grid layout for mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium truncate">
              {format(startTime, "EEE, MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0 sm:hidden" />
            <span className="truncate">
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
            </span>
            <span className="text-muted-foreground/70 text-xs whitespace-nowrap">
              ({durationHours.toFixed(1)}h)
            </span>
          </div>
        </div>

        {/* Location */}
        {offer.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{offer.location}</span>
          </div>
        )}

        {/* Pay Information - Stack on mobile, side-by-side on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pt-3 border-t">
          <div className="flex items-baseline justify-between sm:block">
            <div className="text-xs sm:text-sm text-muted-foreground">Hourly Rate</div>
            <div className="text-base sm:text-lg font-semibold">${hourlyRate.toFixed(2)}/hr</div>
          </div>
          <div className="flex items-baseline justify-between sm:block sm:text-right">
            <div className="text-xs sm:text-sm text-muted-foreground">Total Pay</div>
            <div className="text-2xl sm:text-3xl font-bold text-primary">
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
            type="button"
            onClick={() => onAccept(offer.id)}
            disabled={isProcessing}
            variant="accent"
            className="flex-1"
            data-testid="shift-offer-accept-button"
          >
            Accept Shift
          </Button>
          <Button
            type="button"
            onClick={() => onDecline(offer.id)}
            disabled={isProcessing}
            variant="outline"
            className="flex-1 border-zinc-600 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            data-testid="shift-offer-decline-button"
          >
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

