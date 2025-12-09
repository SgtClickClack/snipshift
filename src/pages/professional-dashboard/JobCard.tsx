import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, DollarSign } from 'lucide-react';

/**
 * Job Card Data Interface
 * 
 * Represents the structure of job/shift data displayed in the card.
 * Matches the response format from /api/professional/jobs endpoint.
 */
export interface JobCardData {
  id: string;
  title: string;
  location: string;
  payRate: string;
  dateTime: string;
}

/**
 * JobCard Component Props
 */
interface JobCardProps extends React.HTMLAttributes<HTMLDivElement> {
  job: JobCardData;
  onViewDetails?: () => void;
  onApply?: () => void;
}

/**
 * JobCard Component
 * 
 * Displays a single job/shift card with key information:
 * - Job Title/Type
 * - Location
 * - Pay Rate
 * - Date/Time
 * - Call-to-action buttons
 * 
 * @component
 */
export function JobCard({ job, onViewDetails, onApply, ...props }: JobCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border" {...props}>
      <CardContent className="p-5">
        {/* Job Title */}
        <div className="mb-4">
          <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-2">
            {job.title}
          </h3>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <span className="line-clamp-2">{job.location}</span>
        </div>

        {/* Pay Rate */}
        <div className="flex items-center gap-2 text-sm mb-3">
          <DollarSign className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-semibold text-foreground">{job.payRate}</span>
        </div>

        {/* Date/Time */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <span className="line-clamp-2">{job.dateTime}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-border">
          {onApply && (
            <Button
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={onApply}
            >
              Apply
            </Button>
          )}
          {onViewDetails && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onViewDetails}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

