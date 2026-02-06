import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { MapPin, CheckCircle2, Building2 } from 'lucide-react';

interface VenueHeaderProps {
  name: string;
  imageUrl: string | null;
  avatarUrl: string | null;
  location: string | null;
  status: 'pending' | 'active';
}

/**
 * VenueHeader - Displays venue cover image, avatar, and verification badge
 */
export function VenueHeader({
  name,
  imageUrl,
  avatarUrl,
  location,
  status,
}: VenueHeaderProps) {
  return (
    <Card className="overflow-hidden">
      {/* Cover Image */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-muted to-muted/50">
        {imageUrl ? (
          <OptimizedImage
            src={imageUrl}
            alt={`${name} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-24 w-24 text-muted-foreground/50" />
          </div>
        )}

        {/* Avatar Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/95 to-transparent">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-background bg-muted overflow-hidden">
                {avatarUrl ? (
                  <OptimizedImage
                    src={avatarUrl}
                    alt={`${name} avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              {status === 'active' && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Venue Info */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{name}</h1>
                {status === 'active' && (
                  <Badge className="bg-green-500 text-white border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              {location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
