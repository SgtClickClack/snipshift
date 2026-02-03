import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
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
import { RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface XeroCalendar {
  id: string;
  name: string;
  calendarType: string;
  startDate: string | null;
  paymentDate: string | null;
  referenceDate: string | null;
}

interface SyncResult {
  synced: Array<{ employeeId: string; xeroEmployeeId: string; hours: number; status: string }>;
  failed: Array<{ employeeId: string; reason: string }>;
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

  useEffect(() => {
    if (showSuccessBurst) {
      const t = setTimeout(() => setShowSuccessBurst(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showSuccessBurst]);

  useEffect(() => {
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
  }, []);

  const fetchCalendars = useCallback(async () => {
    if (!xeroConnected) return;
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
  }, [xeroConnected, toast]);

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
      {showSuccessBurst && (
        <div
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          aria-hidden
        >
          <div className="animate-pulse rounded-full bg-emerald-500/30 p-8 scale-125">
            <CheckCircle2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manual Sync
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
                <div className="rounded-md border p-4 space-y-2" data-testid="xero-sync-result">
                  <p className="font-medium text-sm">Last sync result</p>
                  {lastResult.synced.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        {lastResult.synced.length} employee(s) synced (
                        {lastResult.synced.reduce((s, x) => s + (x.hours ?? 0), 0).toFixed(1)} hours)
                      </span>
                    </div>
                  )}
                  {lastResult.failed.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        {lastResult.failed.length} skipped: {lastResult.failed.map((f) => f.reason).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Sync</DialogTitle>
            <DialogDescription>
              You are about to sync timesheets to Xero for {startDate} to {endDate}. Approved and completed shifts
              will be pushed as draft timesheets. Employees without a Xero mapping will be skipped.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSyncing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSync} disabled={isSyncing} className="gap-2" data-testid="xero-confirm-sync">
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Confirm Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IntegrationErrorBoundary>
  );
}
