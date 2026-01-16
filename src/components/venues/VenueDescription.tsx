import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface VenueDescriptionProps {
  description: string | null;
  address: any;
}

/**
 * VenueDescription - Displays venue about section and facilities
 */
export function VenueDescription({
  description,
  address,
}: VenueDescriptionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          About
        </CardTitle>
      </CardHeader>
      <CardContent>
        {description ? (
          <p className="text-muted-foreground whitespace-pre-line">
            {description}
          </p>
        ) : (
          <p className="text-muted-foreground italic">
            No description available for this venue.
          </p>
        )}

        {/* Address Details */}
        {address && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-3">Full Address</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              {address.street && <p>{address.street}</p>}
              <p>
                {address.suburb && `${address.suburb}, `}
                {address.city} {address.state} {address.postcode}
              </p>
              {address.country && <p>{address.country}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
