import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import Confetti from 'react-confetti';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IntegrationErrorBoundary } from '@/components/common/IntegrationErrorBoundary';
import { apiRequest } from '@/lib/queryClient';
import { RefreshCw, Loader2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import XeroSyncHistory from './XeroSyncHistory';

interface XeroCalendar {
  id: string;
  name: string;
  calendarType: string;
  startDate: string | null;
  paymentDate: string | null;
  referenceDate: string | null;
}

interface SyncResult {
  synced: Array<{ employeeId: string; xeroEmployeeId: string; hours: number; status: string; employeeName?: string }>;
  failed: Array<{ employeeId: string; reason: string; employeeName?: string }>;
  message?: string;
}

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: formatDateForInput(monday),
    end: formatDateForInput(sunday),
  };
}

/** Map generic Xero API errors to user-friendly messages */
function mapXeroErrorToUserMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('pay period') && (lower.includes('lock') || lower.includes('locked'))) {
    return 'Pay period is locked in Xero. Unlock it in Xero Payroll to sync timesheets.';
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'Access denied. The pay period may be locked in Xero, or your Xero connection may need to be refreshed.';
  }
  if (lower.includes('duplicate') || lower.includes('already exists')) {
    return 'A timesheet already exists for this employee and period in Xero.';
  }
  if (lower.includes('token') && (lower.includes('expired') || lower.includes('invalid'))) {
    return 'Xero connection expired. Please reconnect in Settings.';
  }
  if (lower.includes('api error') || lower.includes('500')) {
    return 'Xero is temporarily unavailable. Please try again in a few minutes.';
  }
  return raw;
}

export default function XeroSyncManager() {
  const { toast } = useToast();
  const { user, isSystemReady, isLoading: isAuthLoading, hasFirebaseUser } = useAuth();
  const [xeroConnected, setXeroConnected] = useState(false);
  const [calendars, setCalendars] = useState<XeroCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 });

  useEffect(() => {
    if (showSuccessBurst) {
      const t = setTimeout(() => setShowSuccessBurst(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showSuccessBurst]);
  
  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canCheckStatus = !!user?.id && isSystemReady && hasFirebaseUser && !isAuthLoading;

  useEffect(() => {
    if (!canCheckStatus) return;
    let cancelled = false;
    apiRequest('GET', '/api/integrations/xero/status')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setXeroConnected(d.connected === true);
      })
      .catch(() => {
        if (!cancelled) setXeroConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canCheckStatus]);

  const fetchCalendars = useCallback(async () => {
    if (!xeroConnected || !canCheckStatus) return;
    setIsLoadingCalendars(true);
    try {
      const res = await apiRequest('GET', '/api/integrations/xero/calendars');
      const data = await res.json();
      const calList = data.calendars ?? [];
      setCalendars(calList);
      if (calList.length > 0) {
        setSelectedCalendarId((prev) => (prev && calList.some((c: XeroCalendar) => c.id === prev) ? prev : calList[0].id));
      }
    } catch (err) {
      toast({
        title: 'Failed to load calendars',
        description: err instanceof Error ? err.message : 'Could not fetch Xero payroll calendars.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCalendars(false);
    }
  }, [xeroConnected, canCheckStatus, toast]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  useEffect(() => {
    if (calendars.length > 0 && !startDate && !endDate) {
      const { start, end } = getDefaultDateRange();
      setStartDate(start);
      setEndDate(end);
    }
  }, [calendars, startDate, endDate]);

  const handleSyncClick = () => {
    if (!selectedCalendarId || !startDate || !endDate) return;
    setConfirmOpen(true);
  };

  const handleConfirmSync = async () => {
    if (!selectedCalendarId || !startDate || !endDate) return;
    setIsSyncing(true);
    setLastResult(null);
    try {
      const res = await apiRequest('POST', '/api/integrations/xero/sync-timesheet', {
        calendarId: selectedCalendarId,
        startDate,
        endDate,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? 'Sync failed');
      }

      setLastResult({ synced: data.synced ?? [], failed: data.failed ?? [] });
      setConfirmOpen(false);

      const syncedCount = (data.synced ?? []).length;
      const failedCount = (data.failed ?? []).length;
      const totalHours = (data.synced ?? []).reduce((sum: number, s: { hours?: number }) => sum + (s.hours ?? 0), 0);

      if (syncedCount > 0) {
        setShowSuccessBurst(true);
        toast({
          title: 'Timesheets synced',
          description: `Synced ${syncedCount} employee(s). Total: ${totalHours.toFixed(1)} hours.${failedCount > 0 ? ` ${failedCount} skipped (no mapping).` : ''}`,
        });
      } else if (data.message) {
        toast({
          title: 'No data to sync',
          description: data.message,
          variant: 'destructive',
        });
      } else if (failedCount > 0) {
        toast({
          title: 'Sync completed with issues',
          description: `${failedCount} employee(s) could not be synced (missing Xero mapping).`,
          variant: 'destructive',
        });
      }
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Could not sync timesheets to Xero.';
      const friendlyMsg = mapXeroErrorToUserMessage(rawMsg);
      toast({
        title: 'Sync failed',
        description: friendlyMsg,
        variant: 'destructive',
      });
      setConfirmOpen(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const canSync = selectedCalendarId && startDate && endDate && new Date(startDate) <= new Date(endDate);

  if (!xeroConnected) return null;

  return (
    <IntegrationErrorBoundary>
      {/* Xero Sync Success Confetti Burst */}
      {showSuccessBurst && (
        <>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={150}
            gravity={0.4}
            colors={['hsl(81,85%,58%)', '#84cc16', '#13b5ea', '#ffffff', '#fbbf24']}
            confettiSource={{ x: windowSize.width / 2, y: windowSize.height / 3, w: 0, h: 0 }}
          />
          <div
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            aria-hidden
          >
            <div className="animate-pulse rounded-full bg-primary/30 p-8 scale-125">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
          </div>
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manual Sync
            {/* Contextual Help Tooltip for Mutex Sync */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                  title="Learn about mutex sync protection"
                  aria-label="Help: Mutex sync explanation"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[300px] text-xs">
                <p className="font-medium mb-1">Mutex Sync Protection</p>
                <p>Concurrent sync requests are queued to prevent duplicate timesheet entries. The system automatically handles retries and rolls back on failures to maintain data integrity between HospoGo and Xero.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>
            Push approved and completed shifts to Xero Payroll as timesheets. Select a payroll calendar and date range, then sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCalendars ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading payroll calendars...</span>
            </div>
          ) : calendars.length === 0 ? (
            <p className="text-muted-foreground py-4">
              No payroll calendars found in Xero. Ensure your Xero organisation has Payroll AU configured.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Payroll Calendar</Label>
                <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                  <SelectTrigger data-testid="xero-calendar-select">
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.calendarType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sync-start">Start Date</Label>
                  <Input
                    id="sync-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sync-end">End Date</Label>
                  <Input
                    id="sync-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSyncClick} disabled={!canSync || isSyncing} className="gap-2" data-testid="xero-sync-now">
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync Now
              </Button>

              {lastResult && (lastResult.synced.length > 0 || lastResult.failed.length > 0) && (
                <div className="rounded-md border p-4 space-y-4" data-testid="xero-sync-result">
                  {/* Header with status badge */}
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Last sync result</p>
                    {lastResult.synced.length > 0 && lastResult.failed.length > 0 && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                        Partial Success
                      </span>
                    )}
                    {lastResult.synced.length > 0 && lastResult.failed.length === 0 && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-500/20 text-green-500 border border-green-500/30">
                        Success
                      </span>
                    )}
                    {lastResult.synced.length === 0 && lastResult.failed.length > 0 && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-500 border border-red-500/30">
                        Failed
                      </span>
                    )}
                  </div>
                  
                  {/* Synced employees */}
                  {lastResult.synced.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        {lastResult.synced.length} employee(s) synced (
                        {lastResult.synced.reduce((s, x) => s + (x.hours ?? 0), 0).toFixed(1)} hours)
                      </span>
                    </div>
                  )}
                  
                  {/* Failed employees with detailed list */}
                  {lastResult.failed.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          {lastResult.failed.length} employee(s) skipped
                        </span>
                      </div>
                      
                      {/* Detailed list of failed employees with primary highlighting and Fix Mapping CTA */}
                      <div className="ml-6 space-y-1.5">
                        {lastResult.failed.map((failed, idx) => (
                          <div 
                            key={failed.employeeId || idx}
                            className="flex items-center justify-between p-2 rounded-md bg-primary/10 border-2 border-primary/40 shadow-[0_0_8px_rgba(186,255,57,0.15)]"
                            data-testid={`xero-failed-row-${failed.employeeId}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              <span className="text-sm font-semibold text-primary">
                                {failed.employeeName || `Employee ${failed.employeeId.slice(0, 8)}...`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {failed.reason.includes('mapping') ? 'Missing Xero ID' : failed.reason}
                              </span>
                              {/* Fix Mapping CTA - high visibility for Lucas */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs font-bold bg-primary text-black hover:bg-primary/80 rounded-full shadow-md"
                                onClick={() => {
                                  // Navigate to team settings with employee ID
                                  window.location.href = `/settings?category=team&highlight=${failed.employeeId}`;
                                }}
                                data-testid={`fix-mapping-${failed.employeeId}`}
                              >
                                Fix Mapping
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Action hint */}
                      <p className="ml-6 text-xs text-muted-foreground">
                        💡 Update staff Xero ID mappings in Settings → Team → Xero Integration
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Sync</DialogTitle>
            <DialogDescription className="text-zinc-400">
              You are about to sync timesheets to Xero for {startDate} to {endDate}. Approved and completed shifts
              will be pushed as draft timesheets. Employees without a Xero mapping will be skipped.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-4 sm:flex-row">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSyncing} className="flex-1 sm:flex-none border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button onClick={handleConfirmSync} disabled={isSyncing} className="flex-1 sm:flex-none gap-2 bg-primary text-zinc-900 hover:bg-primary/90" data-testid="xero-confirm-sync">
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Confirm Sync
              </Button>
            </div>
          </DialogFooter>
          {/* HOSPO-GO Branding Footer */}
          <div className="pt-3 border-t border-zinc-800 flex justify-center">
            <span className="text-[10px] text-zinc-600 tracking-wider">
              Powered by <span className="font-black italic">HOSPO<span className="text-primary">GO</span></span>
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync History - Lucas's "Security Blanket" for financial integrity audit */}
      <XeroSyncHistory />
    </IntegrationErrorBoundary>
  );
}
