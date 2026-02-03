import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronLeft, ChevronRight, Settings, Plus, Zap, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { View } from "react-big-calendar";
import { fetchRosterTotals } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";

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
  // Auto-Fill Week from Templates (business mode only)
  onAutoFillClick?: () => void;
  // Date range for roster totals (business mode only)
  dateRange?: { start: Date; end: Date } | null;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
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
  onAutoFillClick,
  dateRange,
}: CalendarToolbarProps) {
  const { data: rosterTotals } = useQuery({
    queryKey: ['roster-totals', dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: () => fetchRosterTotals(dateRange!.start, dateRange!.end),
    enabled: mode === 'business' && !!dateRange?.start && !!dateRange?.end,
    staleTime: 30_000, // 30s - avoid redundant refetches during calendar drag-and-drop
  });

  const { data: xeroStatus } = useQuery({
    queryKey: ['xero-status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/integrations/xero/status');
      return res.json() as Promise<{ connected?: boolean }>;
    },
    enabled: mode === 'business',
  });
  const isSyncedToXero = xeroStatus?.connected === true;

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
            
            {/* Financial Health indicator - Only show in business mode. Pulse when Xero disconnected (CTA for Lucas) */}
            {mode === 'business' && rosterTotals !== undefined && (
              <div
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium",
                  !isSyncedToXero && "animate-pulse"
                )}
                data-testid="est-wage-cost"
                title={isSyncedToXero ? "Estimated wage cost for visible period" : "Estimated wage cost — sync to Xero to export"}
              >
                <DollarSign className="h-4 w-4 shrink-0" />
                Est. Wage Cost: {formatCurrency(rosterTotals.totalCost, rosterTotals.currency)}
              </div>
            )}
            {/* Roster Tools dropdown - Only show in business mode */}
            {mode === 'business' && onAutoFillClick && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Roster Tools"
                    data-testid="roster-tools-dropdown"
                    className="flex items-center gap-2"
                  >
                    <span>Roster Tools</span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={onAutoFillClick}
                    data-testid="auto-fill-trigger"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4 shrink-0" />
                    <span>Auto-Fill from Templates</span>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded font-medium shrink-0">
                      Beta
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
