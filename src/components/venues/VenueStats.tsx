import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, FileText } from 'lucide-react';

interface VenueStatsProps {
  operatingHours: any;
  address: any;
  liquorLicenseNumber: string | null;
}

/**
 * VenueStats - Displays operating hours, location, and venue details
 */
export function VenueStats({
  operatingHours,
  address,
  liquorLicenseNumber,
}: VenueStatsProps) {
  const daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  const formatDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const formatTime = (time: string) => {
    // Convert 24h to 12h format if needed
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Operating Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {daysOfWeek.map((day) => {
            const hours = operatingHours?.[day];
            if (!hours || hours.closed) {
              return (
                <div key={day} className="flex justify-between items-center py-1">
                  <span className="font-medium">{formatDay(day)}</span>
                  <span className="text-muted-foreground">Closed</span>
                </div>
              );
            }
            return (
              <div key={day} className="flex justify-between items-center py-1">
                <span className="font-medium">{formatDay(day)}</span>
                <span className="text-muted-foreground">
                  {hours.open && formatTime(hours.open)} -{' '}
                  {hours.close && formatTime(hours.close)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Location Details */}
        {address && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium mb-1">Location</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {address.street && <p>{address.street}</p>}
                  <p>
                    {address.suburb && `${address.suburb}, `}
                    {address.city} {address.state} {address.postcode}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liquor License */}
        {liquorLicenseNumber && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium mb-1">Liquor License</p>
                <p className="text-sm text-muted-foreground">
                  {liquorLicenseNumber}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
