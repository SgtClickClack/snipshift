import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, User, FileText } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { format } from 'date-fns';

interface Worker {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
}

interface Shift {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  location: string | null;
  status: string;
}

interface ShiftApplication {
  id: string;
  shiftId: string;
  workerId: string;
  venueId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  createdAt: string;
  updatedAt: string;
  worker: Worker | null;
  shift: Shift | null;
}

interface ApplicantCardProps {
  application: ShiftApplication;
  onViewProfile?: (workerId: string) => void;
}

/**
 * ApplicantCard - Displays worker information for a shift application
 */
export function ApplicantCard({ application, onViewProfile }: ApplicantCardProps) {
  const worker = application.worker;
  const shift = application.shift;

  if (!worker) {
    return null;
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatShiftDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatShiftTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a');
    } catch {
      return dateString;
    }
  };

  const bioSnippet = worker.bio
    ? worker.bio.length > 100
      ? `${worker.bio.substring(0, 100)}...`
      : worker.bio
    : 'No bio available';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16">
            <AvatarImage src={worker.avatarUrl || undefined} />
            <AvatarFallback>{getInitials(worker.name)}</AvatarFallback>
          </Avatar>

          {/* Worker Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-lg">{worker.name || 'Unknown Worker'}</h3>
                {worker.email && (
                  <p className="text-sm text-muted-foreground">{worker.email}</p>
                )}
              </div>
              <Badge
                variant={
                  application.status === 'accepted'
                    ? 'default'
                    : application.status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
                className={
                  application.status === 'accepted'
                    ? 'bg-green-500 text-white'
                    : application.status === 'rejected'
                    ? 'bg-red-500 text-white'
                    : ''
                }
              >
                {application.status === 'accepted'
                  ? 'Accepted'
                  : application.status === 'rejected'
                  ? 'Rejected'
                  : 'Pending'}
              </Badge>
            </div>

            {/* Bio Snippet */}
            <div className="flex items-start gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground line-clamp-2">{bioSnippet}</p>
            </div>

            {/* Shift Details */}
            {shift && (
              <div className="space-y-1 mb-3 text-sm">
                <p className="font-medium">{shift.title}</p>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{formatShiftDate(shift.startTime)}</span>
                  <span>
                    {formatShiftTime(shift.startTime)} - {formatShiftTime(shift.endTime)}
                  </span>
                  {shift.hourlyRate && (
                    <span>${parseFloat(shift.hourlyRate).toFixed(2)}/hr</span>
                  )}
                </div>
                {shift.location && (
                  <p className="text-muted-foreground">{shift.location}</p>
                )}
              </div>
            )}

            {/* Application Message */}
            {application.message && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Message:</p>
                <p className="text-sm text-muted-foreground">{application.message}</p>
              </div>
            )}

            {/* View Profile Button */}
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile(application.workerId)}
                className="mt-3"
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
