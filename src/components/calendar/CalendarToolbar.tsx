import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronLeft, ChevronRight, Settings, Plus, Zap, DollarSign, Users, Star, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { View } from "react-big-calendar";
import { fetchRosterTotals } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS, QUERY_STALE_TIMES } from "@/lib/query-keys";

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
  // Invite A-Team (business mode only) - bulk invite favorite staff
  onInviteATeamClick?: () => void;
  isInvitingATeam?: boolean;
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

// Xero Logo SVG Component
const XeroLogo = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.379l-2.526-2.526 2.526-2.526a.75.75 0 10-1.06-1.06L14.308 10.79l-2.527-2.526a.75.75 0 00-1.06 1.06l2.526 2.527-2.526 2.526a.75.75 0 101.06 1.06l2.527-2.526 2.526 2.526a.75.75 0 101.06-1.06zM9.692 13.293l-2.526-2.526a.75.75 0 00-1.06 1.06l2.526 2.527-2.526 2.526a.75.75 0 101.06 1.06l2.526-2.526 2.526 2.526a.75.75 0 101.06-1.06l-2.526-2.526 2.526-2.527a.75.75 0 10-1.06-1.06l-2.526 2.526z" />
  </svg>
);

/**
 * SyncToXeroMenuItem - High visibility item to sync payroll to Xero
 * Navigates to Settings > Business Settings where XeroSyncManager lives
 */
function SyncToXeroMenuItem({ isConnected }: { isConnected: boolean }) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // Navigate to Settings page with Integrations category pre-selected (Xero lives here)
    navigate('/settings?category=integrations');
  };
  
  return (
    <DropdownMenuItem
      onClick={handleClick}
      data-testid="sync-to-xero-trigger"
      className={cn(
        "flex items-center gap-2",
        isConnected 
          ? "bg-[#BAFF39]/10 hover:bg-[#BAFF39]/20 text-[#BAFF39] border-l-2 border-[#BAFF39]" 
          : ""
      )}
    >
      {isConnected ? (
        <XeroLogo className="h-4 w-4 shrink-0 text-[#BAFF39]" />
      ) : (
        <RefreshCw className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className={isConnected ? "font-medium" : ""}>Sync to Xero Payroll</span>
      {isConnected ? (
        <span className="text-[10px] bg-[#BAFF39]/30 text-[#BAFF39] px-1.5 rounded font-bold shrink-0">
          Connected
        </span>
      ) : (
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 rounded font-medium shrink-0">
          Setup
        </span>
      )}
    </DropdownMenuItem>
  );
}

/**
 * ManageATeamMenuItem - Navigates to Staff page with favorites filter
 * Provides quick access when "No favorites configured" error occurs
 */
function ManageATeamMenuItem() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // Navigate to Staff page with favorites filter pre-applied
    navigate('/venue/staff?filter=favorites');
  };
  
  return (
    <DropdownMenuItem
      onClick={handleClick}
      data-testid="manage-a-team-trigger"
      className="flex items-center gap-2"
    >
      <Users className="h-4 w-4 shrink-0 text-primary" />
      <span>Manage A-Team</span>
      <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded font-medium shrink-0">
        Settings
      </span>
    </DropdownMenuItem>
  );
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
  onInviteATeamClick,
  isInvitingATeam,
  dateRange,
}: CalendarToolbarProps) {
  const { data: rosterTotals } = useQuery({
    queryKey: ['roster-totals', dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: () => fetchRosterTotals(dateRange!.start, dateRange!.end),
    enabled: mode === 'business' && !!dateRange?.start && !!dateRange?.end,
    staleTime: 30_000, // 30s - avoid redundant refetches during calendar drag-and-drop
  });

  // PERFORMANCE: Xero status rarely changes - use 5min staleTime to reduce API calls
  const { data: xeroStatus } = useQuery({
    queryKey: [QUERY_KEYS.XERO_STATUS],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/integrations/xero/status');
      return res.json() as Promise<{ connected?: boolean }>;
    },
    enabled: mode === 'business',
    staleTime: QUERY_STALE_TIMES.INTEGRATION_STATUS, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
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
            {/* CLS FIX: Reserve space with skeleton while loading to prevent layout shift */}
            {mode === 'business' && dateRange?.start && (
              <div
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#BAFF39]/10 dark:bg-[#BAFF39]/20 text-[#BAFF39] dark:text-[#BAFF39] text-sm font-medium",
                  "min-w-[180px]", // Reserved width to prevent CLS
                  !isSyncedToXero && rosterTotals && "animate-pulse"
                )}
                data-testid="est-wage-cost"
                title={isSyncedToXero ? "Estimated wage cost for visible period" : "Estimated wage cost — sync to Xero to export"}
              >
                <DollarSign className="h-4 w-4 shrink-0" />
                {rosterTotals !== undefined ? (
                  <span>Est. Wage Cost: {formatCurrency(rosterTotals.totalCost, rosterTotals.currency)}</span>
                ) : (
                  <Skeleton className="h-4 w-24 bg-[#BAFF39]/20" />
                )}
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
                  {onInviteATeamClick && (
                    <DropdownMenuItem
                      onClick={onInviteATeamClick}
                      disabled={isInvitingATeam}
                      data-testid="invite-a-team-trigger"
                      className="flex items-center gap-2"
                    >
                      {isInvitingATeam ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-yellow-500" />
                      ) : (
                        <Star className="h-4 w-4 shrink-0 text-yellow-500" />
                      )}
                      <span>{isInvitingATeam ? 'Sending Invitations...' : 'Invite A-Team'}</span>
                      {!isInvitingATeam && (
                        <span className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 rounded font-medium shrink-0">
                          Favorites
                        </span>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {/* Xero Sync - High visibility for investor demo */}
                  <SyncToXeroMenuItem isConnected={isSyncedToXero} />
                  <DropdownMenuSeparator />
                  <ManageATeamMenuItem />
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/40">
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

          {/* Legend - Capacity status traffic light indicators (MOBILE VISIBLE with horizontal scroll) */}
          <div 
            className="flex items-center gap-3 sm:gap-4 text-xs overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent touch-scroll"
            data-testid="status-legend"
          >
            <div 
              className="flex items-center gap-1.5 cursor-help whitespace-nowrap shrink-0 px-2 py-1 rounded-md bg-green-500/10 sm:bg-transparent sm:px-0 sm:py-0" 
              title="100% Confirmed — All required staff have confirmed attendance"
            >
              <div className="w-3.5 h-3.5 rounded bg-green-500 border-2 border-green-600 shrink-0"></div>
              <span className="text-muted-foreground font-medium">100% Confirmed</span>
            </div>
            <div 
              className="flex items-center gap-1.5 cursor-help whitespace-nowrap shrink-0 px-2 py-1 rounded-md bg-amber-500/10 sm:bg-transparent sm:px-0 sm:py-0" 
              title="Invitations Sent — Staff have been invited, awaiting confirmation"
            >
              <div className="w-3.5 h-3.5 rounded bg-amber-500 border-2 border-amber-600 shrink-0"></div>
              <span className="text-muted-foreground font-medium">Invitations Sent</span>
            </div>
            <div 
              className="flex items-center gap-1.5 cursor-help whitespace-nowrap shrink-0 px-2 py-1 rounded-md bg-red-500/10 sm:bg-transparent sm:px-0 sm:py-0" 
              title="Vacant (Action Required) — Open slots need to be filled or invitations have been declined"
            >
              <div className="w-3.5 h-3.5 rounded bg-red-500 border-2 border-red-600 shrink-0 animate-pulse-subtle"></div>
              <span className="text-muted-foreground font-medium">Vacant</span>
            </div>
            <div 
              className="flex items-center gap-1.5 cursor-help whitespace-nowrap shrink-0 px-2 py-1 rounded-md bg-zinc-500/10 sm:bg-transparent sm:px-0 sm:py-0" 
              title="Past — Completed or expired shifts"
            >
              <div className="w-3.5 h-3.5 rounded bg-zinc-500 border-2 border-zinc-600 shrink-0"></div>
              <span className="text-muted-foreground font-medium">Past</span>
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
  );
}
