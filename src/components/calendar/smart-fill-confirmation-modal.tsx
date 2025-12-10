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
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

export interface SmartMatch {
  shiftId: string;
  shiftTitle: string;
  dayOfWeek: string;
  time: string;
  suggestedCandidate: {
    id: string;
    name: string;
    email: string;
  } | null;
  previousShiftDate?: string;
}

interface SmartFillConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: SmartMatch[];
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function SmartFillConfirmationModal({
  open,
  onOpenChange,
  matches,
  onConfirm,
  isLoading = false,
}: SmartFillConfirmationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending invites:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const successfulMatches = matches.filter((m) => m.suggestedCandidate !== null);
  const noMatchCount = matches.length - successfulMatches.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Fill Roster - Review Matches</DialogTitle>
          <DialogDescription>
            Review the suggested staff assignments based on previous shifts. You can send invites to all matched professionals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No draft shifts found in the current view.</p>
            </div>
          ) : (
            <>
              {successfulMatches.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-foreground">
                    Matched Shifts ({successfulMatches.length})
                  </h3>
                  {successfulMatches.map((match) => (
                    <div
                      key={match.shiftId}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">
                          {match.dayOfWeek} {match.time}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {match.shiftTitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Invite <span className="font-medium">{match.suggestedCandidate?.name}</span>
                          {match.previousShiftDate && (
                            <span> (Worked {format(new Date(match.previousShiftDate), "MMM d")})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {noMatchCount > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-foreground">
                    No Match Found ({noMatchCount})
                  </h3>
                  {matches
                    .filter((m) => m.suggestedCandidate === null)
                    .map((match) => (
                      <div
                        key={match.shiftId}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50"
                      >
                        <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {match.dayOfWeek} {match.time}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {match.shiftTitle}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            No previous staff found for this shift pattern
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          {successfulMatches.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {(isSubmitting || isLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send {successfulMatches.length} Invite{successfulMatches.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

