import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CalendarIcon, MapPin, DollarSign, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface EnhancedJobFiltersState {
  distance: number; // km
  minRate: number;
  maxRate: number;
  dateRange: { from?: Date; to?: Date };
  jobType: string; // 'all' | 'bartender' | 'waiter' | 'chef' | 'barista'
}

interface EnhancedJobFiltersProps {
  className?: string;
  onFiltersChange?: (filters: EnhancedJobFiltersState) => void;
}

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];

export function EnhancedJobFilters({ className, onFiltersChange }: EnhancedJobFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [distance, setDistance] = useState<number>(() => {
    const dist = searchParams.get('distance');
    return dist ? parseInt(dist, 10) : 25;
  });
  
  const [minRate, setMinRate] = useState<number>(() => {
    const min = searchParams.get('minRate');
    return min ? parseFloat(min) : 0;
  });
  
  const [maxRate, setMaxRate] = useState<number>(() => {
    const max = searchParams.get('maxRate');
    return max ? parseFloat(max) : 200;
  });
  
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    return {
      from: startDate ? new Date(startDate) : undefined,
      to: endDate ? new Date(endDate) : undefined,
    };
  });
  
  const [jobType, setJobType] = useState<string>(() => {
    return searchParams.get('jobType') || 'all';
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (distance !== 25) params.set('distance', distance.toString());
    if (minRate > 0) params.set('minRate', minRate.toString());
    if (maxRate < 200) params.set('maxRate', maxRate.toString());
    if (dateRange.from) params.set('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange.to) params.set('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (jobType !== 'all') params.set('jobType', jobType);
    
    setSearchParams(params, { replace: true });
    
    // Notify parent component
    if (onFiltersChange) {
      onFiltersChange({
        distance,
        minRate,
        maxRate,
        dateRange,
        jobType,
      } as EnhancedJobFiltersState);
    }
  }, [distance, minRate, maxRate, dateRange, jobType, setSearchParams, onFiltersChange]);

  const clearFilters = () => {
    setDistance(25);
    setMinRate(0);
    setMaxRate(200);
    setDateRange({});
    setJobType('all');
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = 
    distance !== 25 ||
    minRate > 0 || 
    maxRate < 200 || 
    dateRange.from || 
    dateRange.to || 
    jobType !== 'all';

  // When className contains "block", don't apply hidden (for mobile sheet usage)
  const isForceVisible = className?.includes('block');
  
  return (
    <Card className={cn(
      "sticky top-4 z-sticky bg-card rounded-lg border shadow-sm",
      !isForceVisible && "hidden md:block",
      className
    )}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Filters</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Distance/Location */}
        <div className="space-y-2">
          <Label className="text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Distance
          </Label>
          <Select value={distance.toString()} onValueChange={(value) => setDistance(parseInt(value, 10))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISTANCE_OPTIONS.map((dist) => (
                <SelectItem key={dist} value={dist.toString()}>
                  Within {dist}km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rate Range */}
        <div className="space-y-3">
          <Label className="text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Rate Range ($/hr)
          </Label>
          <div className="space-y-2">
            <Slider
              value={[minRate, maxRate]}
              onValueChange={([min, max]) => {
                setMinRate(min);
                setMaxRate(max);
              }}
              min={0}
              max={200}
              step={5}
              className="w-full py-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>${minRate}/hr</span>
              <span>${maxRate}/hr</span>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Date Range
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange(range || {})}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Job Type */}
        <div className="space-y-2">
          <Label className="text-foreground flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Job Type
          </Label>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bartender">Bartender</SelectItem>
              <SelectItem value="waiter">Waiter/Waitress</SelectItem>
              <SelectItem value="chef">Chef/Cook</SelectItem>
              <SelectItem value="barista">Barista</SelectItem>
              <SelectItem value="stylist">Stylist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

