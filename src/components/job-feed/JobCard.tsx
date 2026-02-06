import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { Job } from '@shared/firebase-schema';

// Define a normalized Job type that includes the processed fields used in the UI
export interface JobCardData extends Job {
  locationCity?: string;
  locationState?: string;
  rate?: string | number;
  payRate?: string | number;
}

interface JobCardProps {
  job: JobCardData;
  isSelected?: boolean;
  onClick?: () => void;
  onViewDetails?: (e: React.MouseEvent) => void;
}

export function JobCard({ job, isSelected, onClick, onViewDetails }: JobCardProps) {
  return (
    <Card 
      className={`card-chrome cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-primary ring-1 ring-primary shadow-md' 
          : 'hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-steel-900 line-clamp-1">{job.title}</h3>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap ml-2">
            {job.rate || job.payRate || 'Rate TBD'}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm text-steel-600 mb-4">
          {job.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-steel-400" />
              <span className="line-clamp-1">{!job.location ? '' : typeof job.location === 'string' ? job.location : (() => {
                const o = job.location as { city?: string; state?: string; address?: string };
                return (o.city && o.state ? `${o.city}, ${o.state}` : o.address ?? '').trim();
              })()}</span>
            </div>
          )}
          {job.date && (
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-4 w-4 shrink-0 text-steel-400" />
              <span className="truncate">
                {job.date}
                {job.startTime && job.endTime && ` • ${job.startTime} - ${job.endTime}`}
                <span className="text-xs text-steel-500 ml-1">(Job Location Time)</span>
              </span>
            </div>
          )}
          {job.shopName && (
            <div className="text-steel-500 text-xs font-medium pl-6">
              {job.shopName}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="steel"
            className="w-full"
            onClick={onViewDetails}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

