import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, CalendarIcon, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useMobile';

interface JobFiltersProps {
  className?: string;
}

export function JobFilters({ className }: JobFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  
  // Filter state from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [role, setRole] = useState<'bartender' | 'waiter' | 'chef' | 'barista' | 'other' | ''>(
    (searchParams.get('role') as 'bartender' | 'waiter' | 'chef' | 'barista' | 'other') || ''
  );
  const [minRate, setMinRate] = useState<number>(
    searchParams.get('minRate') ? parseFloat(searchParams.get('minRate')!) : 0
  );
  const [maxRate, setMaxRate] = useState<number>(
    searchParams.get('maxRate') ? parseFloat(searchParams.get('maxRate')!) : 200
  );
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    return {
      from: startDate ? new Date(startDate) : undefined,
      to: endDate ? new Date(endDate) : undefined,
    };
  });
  const [nearbyOnly, setNearbyOnly] = useState(searchParams.get('nearbyOnly') === 'true');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(
    searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : 50
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Get user location with HIGH ACCURACY GPS
  useEffect(() => {
    if (nearbyOnly && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setNearbyOnly(false);
        },
        // HIGH ACCURACY GPS OPTIONS
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, [nearbyOnly]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (role) params.set('role', role);
    if (minRate > 0) params.set('minRate', minRate.toString());
    if (maxRate < 200) params.set('maxRate', maxRate.toString());
    if (dateRange.from) params.set('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange.to) params.set('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (nearbyOnly && userLocation) {
      params.set('nearbyOnly', 'true');
      params.set('lat', userLocation.lat.toString());
      params.set('lng', userLocation.lng.toString());
      params.set('radius', radius.toString());
    }
    
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, role, minRate, maxRate, dateRange, nearbyOnly, userLocation, radius, setSearchParams]);

  const clearFilters = () => {
    setSearch('');
    setRole('');
    setMinRate(0);
    setMaxRate(200);
    setDateRange({});
    setNearbyOnly(false);
    setUserLocation(null);
    setRadius(50);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = 
    debouncedSearch || 
    role ||
    minRate > 0 || 
    maxRate < 200 || 
    dateRange.from || 
    dateRange.to || 
    nearbyOnly;

  const filterContent = (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="space-y-2">
          <Label htmlFor="search" className="text-foreground flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Jobs
        </Label>
        <Input
          id="search"
          type="text"
          placeholder="Search by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-background border-border focus:border-primary"
        />
      </div>

      {/* Role Filter */}
      <div className="space-y-2">
        <Label htmlFor="role" className="text-foreground">
          Role Type
        </Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'bartender' | 'waiter' | 'chef' | 'barista' | 'other' | '')}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Roles</option>
          <option value="bartender">Bartender</option>
          <option value="waiter">Waiter/Waitress</option>
          <option value="chef">Chef/Cook</option>
          <option value="barista">Barista</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Pay Rate Range */}
      <div className="space-y-3">
        <Label className="text-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Pay Rate ($/hr)
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
                "w-full justify-start text-left font-normal bg-background border-border",
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
          <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)] overflow-x-auto" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange(range || {})}
              numberOfMonths={isMobile ? 1 : 2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Nearby Only */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="nearbyOnly"
            checked={nearbyOnly}
            onCheckedChange={(checked) => setNearbyOnly(checked === true)}
          />
          <Label
            htmlFor="nearbyOnly"
            className="text-foreground flex items-center gap-2 cursor-pointer"
          >
            <MapPin className="h-4 w-4" />
            Nearby Only
          </Label>
        </div>
        {nearbyOnly && (
          <div className="ml-6 space-y-2">
            <Label className="text-muted-foreground text-sm">Radius (km)</Label>
            <Slider
              value={[radius]}
              onValueChange={([value]) => setRadius(value)}
              min={5}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">{radius} km</div>
          </div>
        )}
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={clearFilters}
          className="w-full border-border text-foreground hover:bg-muted"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                  {[
                    debouncedSearch && 1,
                    role && 1,
                    minRate > 0 && 1,
                    maxRate < 200 && 1,
                    dateRange.from && 1,
                    dateRange.to && 1,
                    nearbyOnly && 1,
                  ].filter(Boolean).length}
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="bg-background">
            <DrawerHeader>
              <DrawerTitle>Filter Jobs</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
              {filterContent}
            </div>
            <DrawerFooter>
              <Button onClick={() => setDrawerOpen(false)} className="w-full">
                Apply Filters
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Card className={cn("hidden md:block sticky top-4 z-sticky bg-card rounded-lg border border-border shadow-sm text-card-foreground", className)}>
      <CardHeader>
        <CardTitle className="text-lg text-foreground flex items-center justify-between">
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
      <CardContent>{filterContent}</CardContent>
    </Card>
  );
}

