import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Star, Sparkles, Clock } from "lucide-react";
import { format } from "date-fns";
import { Professional } from "./assign-staff-modal";

interface ShiftAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (professional: Professional) => void;
  onPostToJobBoard: () => void;
  start: Date;
  end: Date;
  favoriteProfessionals: Professional[];
  allProfessionals: Professional[];
  isLoading?: boolean;
}

export function ShiftAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  onPostToJobBoard,
  start,
  end,
  favoriteProfessionals,
  allProfessionals,
  isLoading = false,
}: ShiftAssignmentModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Format time range for display
  const timeRange = useMemo(() => {
    return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  }, [start, end]);

  // Filter professionals based on search query
  const filteredProfessionals = useMemo(() => {
    if (!searchQuery.trim()) {
      return allProfessionals.filter(p => !favoriteProfessionals.find(f => f.id === p.id));
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
  }, [searchQuery, allProfessionals, favoriteProfessionals]);

  const handleQuickAssign = (professional: Professional) => {
    onAssign(professional);
    onClose();
    setSearchQuery("");
  };

  const handleSmartFill = () => {
    onPostToJobBoard();
    onClose();
    setSearchQuery("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Shift: {timeRange}</DialogTitle>
          <DialogDescription>
            <div className="space-y-1 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  {format(start, "EEEE, MMMM d, yyyy")}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6 py-4">
          {/* Section 1: Quick Fill (Favorites) */}
          {favoriteProfessionals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <h3 className="text-sm font-semibold">Quick Fill</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {favoriteProfessionals.map((professional) => (
                  <div
                    key={professional.id}
                    className="flex items-center justify-between p-3 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg hover:bg-accent transition-colors cursor-pointer bg-yellow-50/50 dark:bg-yellow-950/20"
                    onClick={() => handleQuickAssign(professional)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={professional.photoURL || professional.avatar}
                        />
                        <AvatarFallback>
                          {getInitials(professional.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">
                            {professional.name}
                          </div>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        </div>
                        {professional.rating && (
                          <div className="text-sm text-muted-foreground">
                            ⭐ {professional.rating}
                          </div>
                        )}
                        {professional.skills &&
                          professional.skills.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {professional.skills
                                .slice(0, 3)
                                .map((skill, idx) => (
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
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAssign(professional);
                      }}
                      disabled={isLoading}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Manual Search */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Manual Search</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredProfessionals.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No professionals found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredProfessionals.map((professional) => (
                    <div
                      key={professional.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => handleQuickAssign(professional)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={professional.photoURL || professional.avatar}
                          />
                          <AvatarFallback>
                            {getInitials(professional.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {professional.name}
                          </div>
                          {professional.rating && (
                            <div className="text-sm text-muted-foreground">
                              ⭐ {professional.rating}
                            </div>
                          )}
                          {professional.skills &&
                            professional.skills.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {professional.skills
                                  .slice(0, 3)
                                  .map((skill, idx) => (
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
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAssign(professional);
                        }}
                        disabled={isLoading}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 3: Smart Fill */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Smart Fill</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Post this shift to the "Open Jobs" board for professionals to discover and apply.
            </p>
            <Button
              onClick={handleSmartFill}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isLoading ? "Posting..." : "Post to Open Jobs Board"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

