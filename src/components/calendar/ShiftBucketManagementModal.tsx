/**
 * ShiftBucketManagementModal - Command center for managing shift buckets
 * 
 * Provides three primary actions:
 * 1. A-Team: Invite favorite professionals
 * 2. Search: Manual search for specific staff
 * 3. Marketplace: Post to job board
 * 
 * BRANDING: Uses brand primary for primary actions
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  UserPlus, 
  Star, 
  Clock, 
  Users,
  Store,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ShiftBucket } from "./ShiftBucketPill";
import type { Professional } from "./assign-staff-modal";

// Electric Lime brand color
const BRAND_LIME = "hsl(var(--primary))";

export interface BucketManagementData {
  bucket: ShiftBucket;
  label: string;
  startTime: Date;
  endTime: Date;
  dateFormatted: string;
  filledCount: number;
  requiredCount: number;
}

interface ShiftBucketManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bucket: BucketManagementData | null;
  favoriteProfessionals: Professional[];
  allProfessionals: Professional[];
  onInviteATeam: (bucket: ShiftBucket) => void;
  onAssignProfessional: (professional: Professional, bucket: ShiftBucket) => void;
  onPostToMarketplace: (bucket: ShiftBucket) => void;
  isLoading?: boolean;
}

export function ShiftBucketManagementModal({
  isOpen,
  onClose,
  bucket,
  favoriteProfessionals,
  allProfessionals,
  onInviteATeam,
  onAssignProfessional,
  onPostToMarketplace,
  isLoading = false,
}: ShiftBucketManagementModalProps) {
  const [view, setView] = useState<'actions' | 'search'>('actions');
  const [searchQuery, setSearchQuery] = useState("");

  // Reset view when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setView('actions');
      setSearchQuery("");
      onClose();
    }
  };

  // Filter professionals based on search query
  const filteredProfessionals = useMemo(() => {
    if (!searchQuery.trim()) {
      return allProfessionals;
    }

    const query = searchQuery.toLowerCase();
    return allProfessionals.filter((prof) => {
      const nameMatch =
        prof.name.toLowerCase().includes(query) ||
        prof.displayName?.toLowerCase().includes(query);
      const skillMatch = prof.skills?.some((skill) =>
        skill.toLowerCase().includes(query)
      );
      return nameMatch || skillMatch;
    });
  }, [searchQuery, allProfessionals]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // HOOK ORDER FIX: Extract assigned staff from bucket events
  // This useMemo MUST be called before any early returns to prevent React Error #310
  // ("Rendered fewer hooks than expected"). Hooks must be called unconditionally
  // and in the same order on every render.
  const assignedStaff = useMemo(() => {
    // Handle null bucket case - return empty array
    if (!bucket?.bucket?.events) {
      return [];
    }
    
    const staff: Array<{ id: string; name: string; avatarUrl?: string }> = [];
    for (const event of bucket.bucket.events) {
      const shift = (event as any).resource?.booking?.shift || (event as any).resource?.booking?.job;
      const assigned = shift?.assignedStaff ?? shift?.assignments ?? shift?.professional;
      if (Array.isArray(assigned)) {
        for (const s of assigned) {
          if (s?.id && !staff.find(x => x.id === s.id)) {
            staff.push({ id: s.id, name: s.name || s.displayName || 'Staff', avatarUrl: s.avatarUrl });
          }
        }
      } else if (assigned?.id) {
        if (!staff.find(x => x.id === assigned.id)) {
          staff.push({ id: assigned.id, name: assigned.name || assigned.displayName || 'Staff', avatarUrl: assigned.avatarUrl });
        }
      }
    }
    return staff;
  }, [bucket?.bucket?.events]);

  // Early return AFTER all hooks have been called
  if (!bucket) return null;

  const vacantSlots = Math.max(0, bucket.requiredCount - bucket.filledCount);
  const isFullyStaffed = bucket.filledCount >= bucket.requiredCount;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header with capacity indicator */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-br from-zinc-900 to-zinc-950">
          <DialogTitle className="flex items-center justify-between text-white">
            <span className="text-lg">{bucket.label}</span>
            {/* HIGH VISIBILITY COUNT - Urbanist font-weight 900 */}
            <span 
              className={cn(
                "text-2xl font-black tracking-tight",
                isFullyStaffed 
                  ? "text-green-400" 
                  : vacantSlots > 0 
                    ? "text-red-400 animate-pulse" 
                    : "text-amber-400"
              )}
              style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 900 }}
            >
              {bucket.filledCount}/{bucket.requiredCount}
            </span>
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{format(bucket.startTime, "h:mm a")} - {format(bucket.endTime, "h:mm a")}</span>
              </div>
              <div className="text-zinc-500">
                {bucket.dateFormatted}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {view === 'actions' ? (
            <div className="space-y-6">
              {/* Currently Assigned Staff */}
              {assignedStaff.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Currently Assigned ({assignedStaff.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {assignedStaff.map((staff) => (
                      <div 
                        key={staff.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={staff.avatarUrl} />
                          <AvatarFallback className="text-[10px] bg-green-600">
                            {getInitials(staff.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{staff.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vacant Slots Warning */}
              {vacantSlots > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 font-semibold">
                    <Users className="h-5 w-5" />
                    <span>{vacantSlots} vacant slot{vacantSlots > 1 ? 's' : ''} need staffing</span>
                  </div>
                </div>
              )}

              {/* Command Center Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold mb-3">Fill Vacant Slots</h3>
                
                {/* A-TEAM BUTTON */}
                <Button
                  onClick={() => {
                    onInviteATeam(bucket.bucket);
                    onClose();
                  }}
                  disabled={isLoading || favoriteProfessionals.length === 0}
                  className="w-full h-14 justify-between text-black font-bold text-base"
                  style={{ backgroundColor: BRAND_LIME }}
                >
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 fill-black" />
                    <div className="text-left">
                      <div>Invite A-Team</div>
                      <div className="text-xs font-normal opacity-70">
                        {favoriteProfessionals.length > 0 
                          ? `${favoriteProfessionals.length} favorite${favoriteProfessionals.length > 1 ? 's' : ''} available`
                          : 'No favorites configured'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* SEARCH BUTTON */}
                <Button
                  onClick={() => setView('search')}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-14 justify-between font-semibold text-base border-2 hover:border-primary hover:bg-primary/10"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5" />
                    <div className="text-left">
                      <div>Search Staff</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        Find and assign specific professionals
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* MARKETPLACE BUTTON */}
                <Button
                  onClick={() => {
                    onPostToMarketplace(bucket.bucket);
                    onClose();
                  }}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-14 justify-between font-semibold text-base border-2 hover:border-primary hover:bg-primary/10"
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5" />
                    <div className="text-left">
                      <div>Post to Marketplace</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        Broadcast to job board for applications
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : (
            /* SEARCH VIEW */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setView('actions')}
                  className="text-muted-foreground"
                >
                  ← Back
                </Button>
                <h3 className="font-semibold">Search Staff</h3>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {/* Favorites Section */}
              {favoriteProfessionals.length > 0 && !searchQuery && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <h4 className="text-sm font-semibold">Favorites</h4>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {favoriteProfessionals.map((professional) => (
                      <ProfessionalRow 
                        key={professional.id}
                        professional={professional}
                        isFavorite={true}
                        onAssign={() => {
                          onAssignProfessional(professional, bucket.bucket);
                          onClose();
                        }}
                        isLoading={isLoading}
                        getInitials={getInitials}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              <div>
                {searchQuery && (
                  <h4 className="text-sm font-semibold mb-2">
                    {filteredProfessionals.length} result{filteredProfessionals.length !== 1 ? 's' : ''}
                  </h4>
                )}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredProfessionals.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No professionals found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredProfessionals.map((professional) => (
                      <ProfessionalRow 
                        key={professional.id}
                        professional={professional}
                        isFavorite={favoriteProfessionals.some(f => f.id === professional.id)}
                        onAssign={() => {
                          onAssignProfessional(professional, bucket.bucket);
                          onClose();
                        }}
                        isLoading={isLoading}
                        getInitials={getInitials}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Professional row component for consistency
function ProfessionalRow({
  professional,
  isFavorite,
  onAssign,
  isLoading,
  getInitials,
}: {
  professional: Professional;
  isFavorite: boolean;
  onAssign: () => void;
  isLoading: boolean;
  getInitials: (name: string) => string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer",
        isFavorite && "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20"
      )}
      onClick={onAssign}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={professional.photoURL || professional.avatar} />
          <AvatarFallback>{getInitials(professional.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{professional.name}</div>
            {isFavorite && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
            )}
          </div>
          {professional.skills && professional.skills.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {professional.skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onAssign();
        }}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-black font-semibold"
      >
        <UserPlus className="h-4 w-4 mr-1" />
        Assign
      </Button>
    </div>
  );
}
