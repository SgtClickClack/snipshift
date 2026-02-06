import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, DollarSign, Calendar } from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { JobCardData } from './JobCard';

interface EnhancedJobCardProps {
  job: JobCardData & {
    salonName?: string;
    salonLogo?: string;
    distance?: number; // in km
    estimatedTotalPay?: number;
    hours?: number;
  };
  onQuickApply?: (job: JobCardData) => void;
  onViewDetails?: (e: React.MouseEvent) => void;
}

export function EnhancedJobCard({ 
  job, 
  onQuickApply, 
  onViewDetails 
}: EnhancedJobCardProps) {
  // Calculate hours if start and end times are available
  const hours = job.hours || (() => {
    if (job.startTime && job.endTime) {
      try {
        const start = parseISO(job.startTime);
        const end = parseISO(job.endTime);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          return Math.round((differenceInHours(end, start) * 10)) / 10;
        }
      } catch {
        // Invalid date format
      }
    }
    return undefined;
  })();

  // Calculate estimated total pay
  const estimatedTotalPay = job.estimatedTotalPay || (() => {
    if (hours && job.rate) {
      const rate = typeof job.rate === 'string' ? parseFloat(job.rate) : job.rate;
      if (!isNaN(rate)) {
        return Math.round(rate * hours);
      }
    }
    return undefined;
  })();

  // Format date and time
  const formatDateTime = () => {
    if (!job.date && !job.startTime) return 'Date TBD';
    
    try {
      const dateStr = job.startTime || job.date;
      if (!dateStr) return 'Date TBD';
      
      const date = parseISO(dateStr);
      if (isNaN(date.getTime())) return 'Date TBD';
      
      const dateFormatted = format(date, 'MMM d, yyyy');
      const timeFormatted = format(date, 'h:mm a');
      
      if (job.endTime) {
        try {
          const endDate = parseISO(job.endTime);
          if (!isNaN(endDate.getTime())) {
            const endTimeFormatted = format(endDate, 'h:mm a');
            return `${dateFormatted} • ${timeFormatted} - ${endTimeFormatted}`;
          }
        } catch {
          // Invalid end time
        }
      }
      
      return `${dateFormatted} • ${timeFormatted}`;
    } catch {
      return 'Date TBD';
    }
  };

  // Format distance
  const formatDistance = () => {
    if (job.distance === undefined) return null;
    if (job.distance < 1) {
      return `${Math.round(job.distance * 1000)}m away`;
    }
    return `${job.distance.toFixed(1)} km away`;
  };

  // Get venue initials for avatar fallback
  const getVenueInitials = () => {
    if (job.salonName) {
      return job.salonName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'V';
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border">
      <CardContent className="p-5">
        {/* Header with Venue Info */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12 border-2 border-border">
            {job.salonLogo ? (
              <AvatarImage src={job.salonLogo} alt={job.salonName || 'Venue'} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getVenueInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground line-clamp-1 mb-1">
              {job.title}
            </h3>
            {job.salonName && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {job.salonName}
              </p>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{formatDateTime()}</span>
          {hours && (
            <Badge variant="outline" className="ml-auto text-xs">
              {hours}h
            </Badge>
          )}
        </div>

        {/* Location & Distance */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="line-clamp-1 flex-1">
            {!job.location ? (job.locationCity || 'Location TBD') : typeof job.location === 'string' ? job.location : (() => {
              const o = job.location as { city?: string; state?: string };
              return (o.city && o.state ? `${o.city}, ${o.state}` : o.city || o.state || '').trim() || 'Location TBD';
            })()}
          </span>
          {formatDistance() && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {formatDistance()}
            </Badge>
          )}
        </div>

        {/* Pay Information */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              {estimatedTotalPay && (
                <div className="font-bold text-lg text-foreground">
                  ${estimatedTotalPay.toLocaleString()} total
                </div>
              )}
              {job.rate && (
                <div className="text-sm text-muted-foreground">
                  ${typeof job.rate === 'string' ? parseFloat(job.rate) : job.rate}/hr
                </div>
              )}
            </div>
          </div>
          {job.status && (
            <Badge 
              variant={job.status === 'open' ? 'default' : 'secondary'}
              className={
                job.status === 'open' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : ''
              }
            >
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onQuickApply && (
            <Button 
              size="sm" 
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={() => onQuickApply(job)}
            >
              Quick Apply
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1"
            onClick={onViewDetails}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

