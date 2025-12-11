import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, CheckCircle2, XCircle, Clock, Calendar, MapPin, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export interface Application {
  id: string;
  userId?: string;
  name: string;
  email: string;
  coverLetter?: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  respondedAt?: string | null;
  job?: {
    id: string;
    title: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  } | null;
  shift?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    isOnboarded?: boolean;
  } | null;
}

interface ApplicationCardProps {
  application: Application;
  onApprove: (applicationId: string) => void;
  onDecline: (applicationId: string) => void;
  isProcessing?: boolean;
}

export function ApplicationCard({ 
  application, 
  onApprove, 
  onDecline,
  isProcessing = false 
}: ApplicationCardProps) {
  const navigate = useNavigate();

  const shift = application.shift;
  const job = application.job;
  const user = application.user;
  
  // Use user data if available, otherwise fall back to application data
  const applicantName = user?.name || application.name;
  const applicantAvatar = user?.avatarUrl || null;
  const applicantRating = user?.averageRating || null;
  const applicantReviewCount = user?.reviewCount || 0;
  const isVerified = user?.isOnboarded || false;

  // Get shift/job details
  const title = shift?.title || job?.title || 'Unknown Position';
  const location = shift?.location || job?.location || null;
  
  // Parse dates
  let shiftDate: Date | null = null;
  let startTime: string | null = null;
  let endTime: string | null = null;

  if (shift?.startTime) {
    try {
      shiftDate = parseISO(shift.startTime);
      startTime = format(shiftDate, 'h:mm a');
      if (shift.endTime) {
        const endDate = parseISO(shift.endTime);
        endTime = format(endDate, 'h:mm a');
      }
    } catch (e) {
      // Invalid date
    }
  } else if (job?.date) {
    try {
      shiftDate = parseISO(job.date);
      if (job.startTime) {
        startTime = job.startTime;
      }
      if (job.endTime) {
        endTime = job.endTime;
      }
    } catch (e) {
      // Invalid date
    }
  }

  const handleCardClick = () => {
    if (application.userId) {
      navigate(`/profile/${application.userId}`);
    }
  };

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove(application.id);
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDecline(application.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Applicant Avatar */}
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={applicantAvatar || undefined} alt={applicantName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(applicantName)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">{applicantName}</h3>
                  {isVerified && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                
                {/* Rating */}
                {applicantRating !== null && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{applicantRating.toFixed(1)}</span>
                    {applicantReviewCount > 0 && (
                      <span className="text-xs">({applicantReviewCount} reviews)</span>
                    )}
                  </div>
                )}

                {/* Shift/Job Info */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium text-foreground">{title}</span>
                  </div>
                  
                  {shiftDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(shiftDate, 'MMM d, yyyy')}
                        {startTime && endTime && ` • ${startTime} - ${endTime}`}
                      </span>
                    </div>
                  )}
                  
                  {location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <Badge 
                variant={
                  application.status === 'accepted' ? 'default' :
                  application.status === 'rejected' ? 'destructive' :
                  'secondary'
                }
                className="flex-shrink-0"
              >
                {application.status === 'pending' && (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Review
                  </>
                )}
                {application.status === 'accepted' && (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approved
                  </>
                )}
                {application.status === 'rejected' && (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Declined
                  </>
                )}
              </Badge>
            </div>

            {/* Cover Letter */}
            {application.coverLetter && (
              <div className="mt-3 p-3 bg-muted rounded-md text-sm text-muted-foreground italic">
                "{application.coverLetter}"
              </div>
            )}

            {/* Actions */}
            {application.status === 'pending' && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Applied Date */}
            <div className="mt-3 text-xs text-muted-foreground">
              Applied on {format(parseISO(application.appliedAt), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

