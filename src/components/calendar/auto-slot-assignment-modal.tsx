import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { GeneratedShiftSlot } from "@/utils/shift-slot-generator";
import { Professional } from "./assign-staff-modal";

interface AutoSlotAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: GeneratedShiftSlot | null;
  favoriteProfessionals: Professional[];
  allProfessionals: Professional[];
  onAssign: (professional: Professional) => void;
  onCreateCustom: () => void;
  isLoading?: boolean;
}

export function AutoSlotAssignmentModal({
  isOpen,
  onClose,
  slot,
  favoriteProfessionals,
  allProfessionals,
  onAssign,
  onCreateCustom,
  isLoading = false,
}: AutoSlotAssignmentModalProps) {
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);

  if (!slot) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAssign = () => {
    if (selectedProfessional) {
      onAssign(selectedProfessional);
      setSelectedProfessional(null);
    }
  };

  const getPatternLabel = (pattern: string) => {
    switch (pattern) {
      case 'half-day':
        return slot.slotIndex === 0 ? 'Morning' : 'Afternoon';
      case 'thirds':
        return slot.slotIndex === 0 ? 'Morning' : slot.slotIndex === 1 ? 'Afternoon' : 'Close';
      case 'full-day':
        return 'Full Day';
      default:
        return 'Shift';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Staff to Shift Slot</DialogTitle>
          <DialogDescription>
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  {format(slot.start, "EEEE, MMMM d, yyyy")} • {getPatternLabel(slot.pattern)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(slot.start, "h:mm a")} - {format(slot.end, "h:mm a")}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Professional Preview */}
          {selectedProfessional && (
            <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedProfessional.photoURL || selectedProfessional.avatar} />
                    <AvatarFallback>{getInitials(selectedProfessional.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{selectedProfessional.name}</div>
                    {selectedProfessional.rating && (
                      <div className="text-sm text-muted-foreground">⭐ {selectedProfessional.rating}</div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProfessional(null)}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Favorites Section */}
          {favoriteProfessionals.length > 0 && !selectedProfessional && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <h3 className="text-sm font-semibold">Quick Assign from Favorites</h3>
              </div>
              <div className="space-y-2">
                {favoriteProfessionals.map((professional) => (
                  <div
                    key={professional.id}
                    className="flex items-center justify-between p-3 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg hover:bg-accent transition-colors cursor-pointer bg-yellow-50/50 dark:bg-yellow-950/20"
                    onClick={() => setSelectedProfessional(professional)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={professional.photoURL || professional.avatar} />
                        <AvatarFallback>{getInitials(professional.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{professional.name}</div>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        </div>
                        {professional.rating && (
                          <div className="text-sm text-muted-foreground">⭐ {professional.rating}</div>
                        )}
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
                        setSelectedProfessional(professional);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Professionals Section */}
          {!selectedProfessional && (
            <div>
              <h3 className="text-sm font-semibold mb-3">All Professionals</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allProfessionals
                  .filter(p => !favoriteProfessionals.find(f => f.id === p.id))
                  .map((professional) => (
                    <div
                      key={professional.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => setSelectedProfessional(professional)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={professional.photoURL || professional.avatar} />
                          <AvatarFallback>{getInitials(professional.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{professional.name}</div>
                          {professional.rating && (
                            <div className="text-sm text-muted-foreground">⭐ {professional.rating}</div>
                          )}
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
                          setSelectedProfessional(professional);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Select
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCreateCustom}
            disabled={isLoading}
          >
            Create Custom Shift
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedProfessional || isLoading}
          >
            {isLoading ? "Assigning..." : `Assign ${selectedProfessional?.name || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

