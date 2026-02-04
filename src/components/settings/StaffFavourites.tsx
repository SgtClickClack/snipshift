/**
 * StaffFavourites - Business owners can mark staff as favorites (A-Team).
 * Favorites are used by the Smart Fill and "Invite A-Team" features.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Loader2, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  rating?: number | null;
  completedShiftCount?: number;
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

export default function StaffFavourites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch staff who have worked for this venue
  const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['venue-staff'],
    queryFn: fetchStaffForEmployer,
    enabled: !!user?.id,
  });

  // Fetch current favorites
  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['favorite-professionals'],
    queryFn: fetchFavoriteProfessionals,
    enabled: !!user?.id,
  });

  // Mutation to toggle favorite status
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ staffId, isFavorite }: { staffId: string; isFavorite: boolean }) => {
      const currentFavorites = favorites || [];
      let newFavorites: string[];
      
      if (isFavorite) {
        // Add to favorites
        newFavorites = [...currentFavorites, staffId];
      } else {
        // Remove from favorites
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
    onMutate: async ({ staffId }) => {
      setTogglingId(staffId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['favorite-professionals'], data.newFavorites);
      toast({
        title: data.isFavorite ? 'Added to A-Team' : 'Removed from A-Team',
        description: data.isFavorite 
          ? 'This staff member will be prioritized for auto-fill.' 
          : 'Staff member removed from favorites.',
      });
    },
    onError: (error: any) => {
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

  const isLoading = isLoadingStaff || isLoadingFavorites;

  // Merge staff with favorite status
  const staffWithFavorites = staff.map((s) => ({
    ...s,
    isFavorite: favorites.includes(s.id),
  }));

  // Sort: favorites first, then by name
  const sortedStaff = [...staffWithFavorites].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const favoriteCount = favorites.length;

  if (!user?.id) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          A-Team (Favorites)
        </CardTitle>
        <CardDescription>
          Mark your preferred staff as favorites. They'll be prioritized when using{' '}
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span className="font-medium">Invite A-Team</span>
          </span>{' '}
          from the Roster Tools.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading staff...
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No staff yet. When professionals complete shifts for you, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Summary badge */}
            {favoriteCount > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-yellow-500/10 rounded-lg">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">
                  {favoriteCount} favorite{favoriteCount !== 1 ? 's' : ''} in your A-Team
                </span>
              </div>
            )}

            {sortedStaff.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-4 p-3 border rounded-lg transition-colors",
                  s.isFavorite && "bg-yellow-500/5 border-yellow-500/20"
                )}
                data-testid={`staff-favorite-row-${s.id}`}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={s.avatarUrl} />
                  <AvatarFallback>
                    {(s.name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{s.name}</p>
                    {s.isFavorite && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                        A-Team
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {s.email && (
                      <span className="truncate">{s.email}</span>
                    )}
                    {s.rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {Number(s.rating).toFixed(1)}
                      </span>
                    )}
                    {s.completedShiftCount != null && s.completedShiftCount > 0 && (
                      <span>{s.completedShiftCount} shift{s.completedShiftCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Toggle Button */}
                <Button
                  variant={s.isFavorite ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleFavorite(s.id, s.isFavorite)}
                  disabled={togglingId === s.id}
                  className={cn(
                    "shrink-0",
                    s.isFavorite && "bg-yellow-500 hover:bg-yellow-600 text-white"
                  )}
                  data-testid={`staff-favorite-toggle-${s.id}`}
                >
                  {togglingId === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Star className={cn(
                        "h-4 w-4",
                        s.isFavorite ? "fill-current" : ""
                      )} />
                      <span className="ml-1 hidden sm:inline">
                        {s.isFavorite ? 'Favorite' : 'Add'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
