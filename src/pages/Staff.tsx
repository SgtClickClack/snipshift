/**
 * Staff Page - Business owners can manage their staff and favorites (A-Team)
 * 
 * Features:
 * - View all staff who have worked for the venue
 * - Toggle favorite status with star icon
 * - Filter to show only favorites
 * - Quick access from Calendar "Manage A-Team" button
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Loader2, Users, Search, Filter, ArrowLeft, Zap, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { isBusinessRole } from '@/lib/roles';

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  rating?: number | null;
  completedShiftCount?: number;
  baseHourlyRate?: number | null;
  isFavorite?: boolean;
}

async function fetchStaffForEmployer(): Promise<StaffMember[]> {
  const res = await apiRequest('GET', '/api/venues/me/staff');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchFavoriteProfessionals(): Promise<string[]> {
  const res = await apiRequest('GET', '/api/me');
  if (!res.ok) return [];
  const data = await res.json();
  return data.favoriteProfessionals || [];
}

export default function StaffPage() {
  const { user, isLoading: isAuthLoading, isSystemReady, hasFirebaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const canFetchStaff = !!user?.id && isSystemReady && hasFirebaseUser && !isAuthLoading;
  
  // URL-based filter for favorites (used by "Manage A-Team" shortcut)
  const showFavoritesOnly = searchParams.get('filter') === 'favorites';

  const toggleFavoritesFilter = () => {
    if (showFavoritesOnly) {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', 'favorites');
    }
    setSearchParams(searchParams);
  };

  // Fetch staff who have worked for this venue
  const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['venue-staff'],
    queryFn: fetchStaffForEmployer,
    enabled: canFetchStaff,
  });

  // Fetch current favorites
  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['favorite-professionals'],
    queryFn: fetchFavoriteProfessionals,
    enabled: canFetchStaff,
  });

  // Mutation to toggle favorite status with OPTIMISTIC UI
  // Updates immediately in the UI before API call completes - zero flicker
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ staffId, isFavorite }: { staffId: string; isFavorite: boolean }) => {
      const currentFavorites = queryClient.getQueryData<string[]>(['favorite-professionals']) || [];
      let newFavorites: string[];
      
      if (isFavorite) {
        newFavorites = [...currentFavorites, staffId];
      } else {
        newFavorites = currentFavorites.filter((id) => id !== staffId);
      }

      const res = await apiRequest('PATCH', '/api/me/settings', {
        favoriteProfessionals: newFavorites,
      });

      if (!res.ok) {
        throw new Error('Failed to update favorites');
      }

      return { staffId, isFavorite, newFavorites };
    },
    onMutate: async ({ staffId, isFavorite }) => {
      setTogglingId(staffId);
      
      // OPTIMISTIC UPDATE: Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['favorite-professionals'] });
      
      // Snapshot previous value for rollback
      const previousFavorites = queryClient.getQueryData<string[]>(['favorite-professionals']) || [];
      
      // Optimistically update the cache IMMEDIATELY
      const optimisticFavorites = isFavorite
        ? [...previousFavorites, staffId]
        : previousFavorites.filter((id) => id !== staffId);
      
      queryClient.setQueryData(['favorite-professionals'], optimisticFavorites);
      
      // Return context with snapshot for rollback
      return { previousFavorites };
    },
    onSuccess: (data) => {
      // Confirm the optimistic update with server response
      queryClient.setQueryData(['favorite-professionals'], data.newFavorites);
      toast({
        title: data.isFavorite ? 'Added to A-Team' : 'Removed from A-Team',
        description: data.isFavorite 
          ? 'Staff member will be prioritized for Invite A-Team.' 
          : 'Staff member removed from favorites.',
      });
    },
    onError: (error: any, _variables, context) => {
      // ROLLBACK: Restore previous state on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorite-professionals'], context.previousFavorites);
      }
      toast({
        title: 'Failed to update',
        description: error?.message || 'Could not update favorite status.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setTogglingId(null);
    },
  });

  const handleToggleFavorite = (staffId: string, currentlyFavorite: boolean) => {
    toggleFavoriteMutation.mutate({
      staffId,
      isFavorite: !currentlyFavorite,
    });
  };

  const isLoading = isLoadingStaff || isLoadingFavorites || isAuthLoading;

  // Merge staff with favorite status
  const staffWithFavorites = useMemo(() => {
    return staff.map((s) => ({
      ...s,
      isFavorite: favorites.includes(s.id),
    }));
  }, [staff, favorites]);

  // Filter and search
  const filteredStaff = useMemo(() => {
    let result = staffWithFavorites;
    
    // Filter by favorites if active
    if (showFavoritesOnly) {
      result = result.filter((s) => s.isFavorite);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => 
        s.name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
      );
    }
    
    // Sort: favorites first, then by name
    return [...result].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [staffWithFavorites, showFavoritesOnly, searchQuery]);

  const favoriteCount = favorites.length;

  // Role check
  if (!isAuthLoading && user && !isBusinessRole(user.currentRole)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is only available for business users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Staff Management" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="h-8 w-8" />
                Staff Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your team and mark your favorites for quick scheduling
              </p>
            </div>
            {favoriteCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {favoriteCount} in A-Team
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                onClick={toggleFavoritesFilter}
                className={cn(
                  "shrink-0",
                  showFavoritesOnly && "bg-yellow-500 hover:bg-yellow-600 text-white"
                )}
              >
                <Star className={cn("h-4 w-4 mr-2", showFavoritesOnly && "fill-current")} />
                {showFavoritesOnly ? 'Showing A-Team Only' : 'Filter A-Team'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* A-Team Info Card */}
        <Card className="mb-6 border-2 border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 p-3 bg-yellow-500/20 rounded-full">
                <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                  A-Team Favorites
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click the star icon next to any staff member to add them to your A-Team. 
                  Use "Invite A-Team" from the Calendar's Roster Tools to quickly fill shifts 
                  with your most reliable workers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Staff
              {!isLoading && (
                <Badge variant="secondary" className="ml-2">
                  {filteredStaff.length} {showFavoritesOnly ? 'favorite' : 'total'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Staff members who have completed shifts for your venue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                {showFavoritesOnly ? (
                  <>
                    <p className="text-lg font-semibold mb-2">Your A-Team Roster is Empty</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                      Build your dream team. Click the star icon on staff members to add them to your A-Team for priority shift invitations.
                    </p>
                    <Button 
                      onClick={toggleFavoritesFilter}
                      className="bg-primary hover:bg-primary/90 text-black font-semibold shadow-[0_0_15px_rgba(186,255,57,0.3)]"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Show All Staff
                    </Button>
                  </>
                ) : searchQuery ? (
                  <>
                    <p className="text-lg font-semibold mb-2">No Matches Found</p>
                    <p className="text-sm text-muted-foreground">
                      Try a different search term or clear the filter.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold mb-2">The Engine is Warming Up</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Your staff roster will populate as professionals complete shifts at your venue. Post your first shift to get the wheels turning.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStaff.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-4 p-4 border rounded-lg transition-all hover:shadow-md",
                      s.isFavorite && "bg-yellow-500/5 border-yellow-500/30"
                    )}
                    data-testid={`staff-row-${s.id}`}
                  >
                    {/* Favorite Star Toggle - Primary Action */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-10 w-10 shrink-0 transition-all",
                        s.isFavorite 
                          ? "text-primary hover:text-primary/80" 
                          : "text-gray-400 hover:text-primary"
                      )}
                      onClick={() => handleToggleFavorite(s.id, s.isFavorite || false)}
                      disabled={togglingId === s.id}
                      title={s.isFavorite ? 'Remove from A-Team' : 'Add to A-Team'}
                      data-testid={`staff-favorite-toggle-${s.id}`}
                    >
                      {togglingId === s.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Star 
                          className={cn(
                            "h-5 w-5 transition-all",
                            s.isFavorite && "fill-primary"
                          )} 
                        />
                      )}
                    </Button>

                    {/* Avatar */}
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={s.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(s.name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{s.name}</p>
                        {s.isFavorite && (
                          <Badge 
                            variant="secondary" 
                            className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                          >
                            A-Team
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        {s.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {s.email}
                          </span>
                        )}
                        {s.completedShiftCount != null && s.completedShiftCount > 0 && (
                          <span className="shrink-0">
                            {s.completedShiftCount} shift{s.completedShiftCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {s.rating != null && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {Number(s.rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pay Rate Badge */}
                    {s.baseHourlyRate != null && (
                      <Badge variant="outline" className="shrink-0">
                        ${s.baseHourlyRate}/hr
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
