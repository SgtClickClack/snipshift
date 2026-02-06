import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { MapPin, CheckCircle2, Building2 } from 'lucide-react';

interface VenueProfileLayoutProps {
  name: string;
  imageUrl: string | null;
  avatarUrl: string | null;
  location: string | null;
  status: 'pending' | 'active';
  children: React.ReactNode;
}

/**
 * VenueProfileLayout - Handles the shell, header, and metadata for venue profile
 * Mobile-first layout with responsive design
 */
export function VenueProfileLayout({
  name,
  imageUrl,
  avatarUrl,
  location,
  status,
  children,
}: VenueProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image Section */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <OptimizedImage
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Building2 className="h-24 w-24 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Status Badge Overlay */}
        {status === 'active' && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-green-500 text-white border-green-600 shadow-lg">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20">
        {/* Header Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-background bg-muted overflow-hidden shadow-md">
                    {avatarUrl ? (
                      <OptimizedImage
                        src={avatarUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Title and Location */}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl sm:text-3xl mb-2 line-clamp-2">
                    {name}
                  </CardTitle>
                  {location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="text-sm sm:text-base line-clamp-2">{location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        {children}
      </div>
    </div>
  );
}
