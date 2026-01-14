import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Settings, Plus } from "lucide-react";
import { View } from "react-big-calendar";

type JobStatus = 'all' | 'pending' | 'confirmed' | 'completed';

interface CalendarToolbarProps {
  mode: 'professional' | 'business';
  view: View;
  onViewChange: (view: View) => void;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onSettingsClick: () => void;
  // Filter props
  statusFilter?: JobStatus;
  onStatusFilterChange?: (status: JobStatus) => void;
  // Legacy props - no longer used but kept for compatibility
  onSmartFillClick?: () => void;
  isCalculatingMatches?: boolean;
  // Create Availability button (professional mode only)
  onCreateAvailability?: () => void;
}

export function CalendarToolbar({
  mode,
  view,
  onViewChange,
  onNavigate,
  onSettingsClick,
  statusFilter = 'all',
  onStatusFilterChange,
  onCreateAvailability,
}: CalendarToolbarProps) {
  return (
    <CardHeader className="border-b bg-gradient-to-r from-background via-purple-50/5 to-blue-50/5 dark:from-background dark:via-purple-950/10 dark:to-blue-950/10">
      <div className="flex flex-col gap-3">
        {/* Top row: Title + View/Nav controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle 
            className="text-xl bg-gradient-to-r from-foreground via-purple-600 to-blue-600 dark:from-foreground dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent" 
            data-testid="calendar-schedule-title"
          >
            Schedule
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Create Availability Button - Only show in professional mode */}
            {mode === 'professional' && onCreateAvailability && (
              <Button
                variant="default"
                size="sm"
                onClick={onCreateAvailability}
                data-testid="button-create-availability"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Availability
              </Button>
            )}
            
            {/* Calendar Settings Button - Only show in business mode */}
            {mode === 'business' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSettingsClick}
                title="Calendar Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            
            {/* View Switcher */}
            <div className="shrink-0 flex gap-1 border rounded-md p-1 bg-background/50 backdrop-blur-sm">
              <Button
                variant={view === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("month")}
                data-testid="button-view-month"
              >
                Month
              </Button>
              <Button
                variant={view === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("week")}
                data-testid="button-view-week"
              >
                Week
              </Button>
              <Button
                variant={view === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange("day")}
                data-testid="button-view-day"
              >
                Day
              </Button>
            </div>
            
            {/* Navigation */}
            <div className="shrink-0 flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("PREV")}
                data-testid="button-nav-prev"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("TODAY")}
                data-testid="button-nav-today"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("NEXT")}
                data-testid="button-nav-next"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom row: Filter + Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/40">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange?.(value as JobStatus)}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-muted-foreground">Confirmed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span className="text-muted-foreground">Open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-zinc-500"></div>
              <span className="text-muted-foreground">Past</span>
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
  );
}
