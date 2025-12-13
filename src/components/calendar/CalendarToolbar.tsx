import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { View } from "react-big-calendar";
import { AutoFillButton } from "./auto-fill-button";

interface CalendarToolbarProps {
  mode: 'professional' | 'business';
  view: View;
  onViewChange: (view: View) => void;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onSettingsClick: () => void;
  onSmartFillClick: () => void;
  isCalculatingMatches: boolean;
}

export function CalendarToolbar({
  mode,
  view,
  onViewChange,
  onNavigate,
  onSettingsClick,
  onSmartFillClick,
  isCalculatingMatches,
}: CalendarToolbarProps) {
  return (
    <CardHeader className="border-b bg-gradient-to-r from-background via-purple-50/5 to-blue-50/5 dark:from-background dark:via-purple-950/10 dark:to-blue-950/10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <CardTitle 
          className="text-xl bg-gradient-to-r from-foreground via-purple-600 to-blue-600 dark:from-foreground dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent" 
          data-testid="calendar-schedule-title"
        >
          Schedule
        </CardTitle>
        <div className="flex items-center gap-2">
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
          <div className="flex gap-1 border rounded-md p-1 bg-background/50 backdrop-blur-sm">
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
          
          {/* Smart Fill Button - Only show in business mode, aligned with view switcher */}
          {mode === 'business' && (
            <AutoFillButton
              onClick={onSmartFillClick}
              isLoading={isCalculatingMatches}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center gap-1">
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
    </CardHeader>
  );
}
