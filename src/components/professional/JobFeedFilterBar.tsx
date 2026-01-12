/**
 * JobFeedFilterBar Component
 * 
 * Filter bar for the professional job feed with location, pay rate, and job type filters.
 * Filters are synced with URL query parameters for shareability and persistence.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Scissors, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JobFeedFilterBarFilters {
  location?: string;
  minPayRate?: number;
  maxPayRate?: number;
  jobType?: 'bartender' | 'waiter' | 'chef' | 'barista' | 'other';
}

interface JobFeedFilterBarProps {
  onFiltersChange?: (filters: JobFeedFilterBarFilters) => void;
  className?: string;
}

const DEFAULT_MIN_RATE = 0;
const DEFAULT_MAX_RATE = 200;

export function JobFeedFilterBar({ onFiltersChange, className }: JobFeedFilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filter state from URL params
  const [location, setLocation] = useState<string>(() => {
    return searchParams.get('location') || '';
  });

  const [minPayRate, setMinPayRate] = useState<number>(() => {
    const min = searchParams.get('minPayRate');
    return min ? parseFloat(min) : DEFAULT_MIN_RATE;
  });

  const [maxPayRate, setMaxPayRate] = useState<number>(() => {
    const max = searchParams.get('maxPayRate');
    return max ? parseFloat(max) : DEFAULT_MAX_RATE;
  });

  const [jobType, setJobType] = useState<'bartender' | 'waiter' | 'chef' | 'barista' | 'other' | 'all'>(() => {
    const type = searchParams.get('jobType');
    return (type as 'bartender' | 'waiter' | 'chef' | 'barista' | 'other') || 'all';
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    if (location) {
      params.set('location', location);
    } else {
      params.delete('location');
    }

    if (minPayRate > DEFAULT_MIN_RATE) {
      params.set('minPayRate', minPayRate.toString());
    } else {
      params.delete('minPayRate');
    }

    if (maxPayRate < DEFAULT_MAX_RATE) {
      params.set('maxPayRate', maxPayRate.toString());
    } else {
      params.delete('maxPayRate');
    }

    if (jobType && jobType !== 'all') {
      params.set('jobType', jobType);
    } else {
      params.delete('jobType');
    }

    setSearchParams(params, { replace: true });

    // Notify parent component
    if (onFiltersChange) {
      const filters: JobFeedFilterBarFilters = {};
      if (location) filters.location = location;
      if (minPayRate > DEFAULT_MIN_RATE) filters.minPayRate = minPayRate;
      if (maxPayRate < DEFAULT_MAX_RATE) filters.maxPayRate = maxPayRate;
      if (jobType && jobType !== 'all') filters.jobType = jobType;
      onFiltersChange(filters);
    }
  }, [location, minPayRate, maxPayRate, jobType, setSearchParams, onFiltersChange, searchParams]);

  const clearFilters = () => {
    setLocation('');
    setMinPayRate(DEFAULT_MIN_RATE);
    setMaxPayRate(DEFAULT_MAX_RATE);
    setJobType('all');
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    location !== '' ||
    minPayRate > DEFAULT_MIN_RATE ||
    maxPayRate < DEFAULT_MAX_RATE ||
    (jobType && jobType !== 'all');

  return (
    <Card className={cn('border-border', className)} data-testid="job-feed-filter-bar">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with Clear Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Location Input */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              type="text"
              placeholder="e.g., Melbourne, VIC"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Pay Rate Range Slider */}
          <div className="space-y-3">
            <Label className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pay Rate Range ($/hr)
            </Label>
            <div className="space-y-2">
              <Slider
                value={[minPayRate, maxPayRate]}
                onValueChange={([min, max]) => {
                  setMinPayRate(min);
                  setMaxPayRate(max);
                }}
                min={0}
                max={200}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${minPayRate}/hr</span>
                <span>${maxPayRate}/hr</span>
              </div>
            </div>
          </div>

          {/* Job Type Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="jobType" className="text-sm flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Job Type
            </Label>
            <Select value={jobType} onValueChange={(value) => setJobType(value as typeof jobType)}>
              <SelectTrigger id="jobType" data-testid="filter-job-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bartender">Bartender</SelectItem>
                <SelectItem value="waiter">Waiter/Waitress</SelectItem>
                <SelectItem value="chef">Chef/Cook</SelectItem>
                <SelectItem value="barista">Barista</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

