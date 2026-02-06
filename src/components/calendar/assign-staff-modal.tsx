import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, UserPlus, Clock, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Professional {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  avatar?: string;
  skills?: string[];
  rating?: number;
  lastHired?: string; // ISO date string
}

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (professional: Professional) => void;
  onMultiAssign?: (professionals: Professional[]) => void;
  professionals: Professional[];
  favoriteProfessionals?: Professional[];
  shiftTitle?: string;
  shiftDate?: Date;
  enableMultiSelect?: boolean;
}

/**
 * AssignStaffModal Component
 * Modal for assigning staff to a shift (Ghost Slot)
 * Features:
 * - Search bar to find professionals by name or skill
 * - Recent Hires section
 * - Single invite button OR Multi-select with checkboxes
 * - "Invite X Professionals" button when multiple are selected
 */
export function AssignStaffModal({
  isOpen,
  onClose,
  onAssign,
  onMultiAssign,
  professionals,
  favoriteProfessionals,
  shiftTitle,
  shiftDate,
  enableMultiSelect = true, // Default to multi-select mode
}: AssignStaffModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter professionals based on search query
  const filteredProfessionals = useMemo(() => {
    if (!searchQuery.trim()) {
      return professionals;
    }

    const query = searchQuery.toLowerCase();
    return professionals.filter((prof) => {
      const nameMatch = prof.name.toLowerCase().includes(query) ||
        prof.displayName?.toLowerCase().includes(query);
      const skillMatch = prof.skills?.some((skill) =>
        skill.toLowerCase().includes(query)
      );
      return nameMatch || skillMatch;
    });
  }, [searchQuery, professionals]);

  const recentProfessionals = useMemo(() => {
    if (favoriteProfessionals && favoriteProfessionals.length > 0) {
      return favoriteProfessionals.slice(0, 6);
    }
    return [...professionals]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  }, [favoriteProfessionals, professionals]);

  const handleToggleSelection = (professional: Professional) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(professional.id)) {
        next.delete(professional.id);
      } else {
        next.add(professional.id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const currentList = searchQuery ? filteredProfessionals : recentProfessionals;
    const allSelected = currentList.every((p) => selectedIds.has(p.id));
    
    if (allSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all visible
      setSelectedIds(new Set(currentList.map((p) => p.id)));
    }
  };

  const handleInviteSingle = (professional: Professional) => {
    onAssign(professional);
    onClose();
    setSearchQuery('');
    setSelectedIds(new Set());
  };

  const handleInviteMultiple = () => {
    if (selectedIds.size === 0) return;
    
    const selectedProfessionals = professionals.filter((p) => selectedIds.has(p.id));
    
    if (selectedProfessionals.length === 1 && !onMultiAssign) {
      // Fall back to single assign if only one selected
      onAssign(selectedProfessionals[0]);
    } else if (onMultiAssign) {
      onMultiAssign(selectedProfessionals);
    } else {
      // Legacy: call onAssign for each (not recommended)
      selectedProfessionals.forEach((p) => onAssign(p));
    }
    
    onClose();
    setSearchQuery('');
    setSelectedIds(new Set());
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setSelectedIds(new Set());
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastHired = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  };

  const currentList = searchQuery ? filteredProfessionals : recentProfessionals;
  const allCurrentSelected = currentList.length > 0 && currentList.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const ProfessionalCard = ({ professional, showCheckbox }: { professional: Professional; showCheckbox: boolean }) => (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors",
        showCheckbox && selectedIds.has(professional.id) && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showCheckbox && (
          <Checkbox
            checked={selectedIds.has(professional.id)}
            onCheckedChange={() => handleToggleSelection(professional)}
            className="h-5 w-5"
          />
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={professional.photoURL || professional.avatar} />
          <AvatarFallback>
            {getInitials(professional.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {professional.name}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {professional.rating && (
              <span>⭐ {professional.rating}</span>
            )}
            {professional.lastHired && (
              <span>• {formatLastHired(professional.lastHired)}</span>
            )}
          </div>
          {professional.skills && professional.skills.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {professional.skills.slice(0, 3).map((skill, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      {!showCheckbox && (
        <Button
          onClick={() => handleInviteSingle(professional)}
          size="sm"
          className="ml-4"
          data-testid={`invite-button-${professional.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Invite
        </Button>
      )}
      {showCheckbox && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-4"
          onClick={() => handleToggleSelection(professional)}
        >
          {selectedIds.has(professional.id) ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
          )}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Staff to Shift
          </DialogTitle>
          <DialogDescription>
            {shiftTitle && (
              <span className="block mb-1">
                <strong>{shiftTitle}</strong>
              </span>
            )}
            {shiftDate && (
              <span className="text-sm text-muted-foreground">
                {shiftDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            {enableMultiSelect && (
              <span className="block mt-2 text-sm text-muted-foreground">
                Select one or more professionals to invite. First one to accept gets the shift!
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 md:pl-10"
            />
          </div>

          {/* Select All toggle (when multi-select is enabled) */}
          {enableMultiSelect && currentList.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <label
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Checkbox
                  checked={allCurrentSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4"
                />
                <span>Select All ({currentList.length})</span>
              </label>
              {someSelected && (
                <span className="text-sm text-primary font-medium">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Recent Hires Section */}
            {!searchQuery && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {favoriteProfessionals && favoriteProfessionals.length > 0 ? 'Favorites' : 'Top Professionals'}
                </h3>
                <div className="space-y-2">
                  {recentProfessionals.map((professional) => (
                    <ProfessionalCard
                      key={professional.id}
                      professional={professional}
                      showCheckbox={enableMultiSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Search Results Section */}
            {searchQuery && (
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Search Results ({filteredProfessionals.length})
                </h3>
                {filteredProfessionals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No professionals found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProfessionals.map((professional) => (
                      <ProfessionalCard
                        key={professional.id}
                        professional={professional}
                        showCheckbox={enableMultiSelect}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with multi-invite button */}
        {enableMultiSelect && (
          <DialogFooter className="mt-4 pt-4 border-t flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteMultiple}
              disabled={selectedIds.size === 0}
              className="w-full sm:w-auto sm:min-w-[160px]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {selectedIds.size === 0 
                ? 'Select Professionals' 
                : selectedIds.size === 1 
                  ? 'Invite 1 Professional' 
                  : `Invite ${selectedIds.size} Professionals`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
