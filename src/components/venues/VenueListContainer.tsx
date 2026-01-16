import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, CheckCircle2, Building2, Loader2 } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface Venue {
  id: string;
  name: string;
  location: string | null;
  imageUrl: string | null;
  avatarUrl: string | null;
  status: 'pending' | 'active';
  createdAt: string;
}

interface VenueListResponse {
  venues: Venue[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * VenueListContainer - Displays marketplace venue listings with infinite scroll
 * Includes verification filter (checked by default to show only active venues)
 */
export function VenueListContainer() {
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch venues with pagination
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage } = useQuery({
    queryKey: ['marketplace-venues', verifiedOnly],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        verified: verifiedOnly.toString(),
      });

      const res = await apiRequest('GET', `/api/marketplace/venues?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch venues');
      }
      return res.json() as Promise<VenueListResponse>;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Update all venues when data changes
  useEffect(() => {
    if (data?.pages) {
      const venues = data.pages.flatMap((page) => page.venues);
      setAllVenues(venues);
    }
  }, [data]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
    setAllVenues([]);
  }, [verifiedOnly]);

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetching, fetchNextPage]);

  const handleVerifiedToggle = (checked: boolean) => {
    setVerifiedOnly(checked);
  };

  if (isLoading && allVenues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Marketplace Venues</h2>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Marketplace Venues</h2>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="verified-filter"
            checked={verifiedOnly}
            onCheckedChange={handleVerifiedToggle}
          />
          <Label
            htmlFor="verified-filter"
            className="text-sm font-medium cursor-pointer"
          >
            Verified Only
          </Label>
        </div>
      </div>

      {/* Venue Grid */}
      {allVenues.length === 0 && !isLoading ? (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {verifiedOnly
              ? 'No verified venues available at the moment.'
              : 'No venues available at the moment.'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {hasNextPage && (
            <div ref={observerTarget} className="flex justify-center py-8">
              {isFetching && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading more venues...</span>
                </div>
              )}
            </div>
          )}

          {/* End of List */}
          {!hasNextPage && allVenues.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>You've reached the end of the list</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * VenueCard - Individual venue card component
 */
function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      {/* Venue Image */}
      <div className="relative h-48 bg-muted overflow-hidden">
        {venue.imageUrl ? (
          <OptimizedImage
            src={venue.imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Building2 className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Status Badge */}
        {venue.status === 'active' && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white border-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{venue.name}</h3>
        
        {venue.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{venue.location}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge
            variant={venue.status === 'active' ? 'default' : 'outline'}
            className={
              venue.status === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-amber-500/10 text-amber-600'
            }
          >
            {venue.status === 'active' ? 'Active' : 'Pending'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default VenueListContainer;
