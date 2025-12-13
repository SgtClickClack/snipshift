import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { addWeeks, endOfWeek, format, parse, startOfWeek, subWeeks, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useIsMobile } from '@/hooks/useMobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { copyPreviousWeekShifts, createShift, fetchEmployerShifts, publishAllDraftShifts, updateShiftTimes } from '@/lib/api';
import type { ShiftDetails } from '@/lib/api';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});
const DnDCalendar = withDragAndDrop(Calendar);

type ShiftStatus = ShiftDetails['status'];

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ShiftDetails;
};

function statusLabel(status: ShiftStatus): string {
  switch (status) {
    case 'draft':
      return 'DRAFT';
    case 'open':
      return 'OPEN';
    case 'pending':
    case 'invited':
      return 'PENDING';
    case 'confirmed':
      return 'CONFIRMED';
    case 'filled':
      return 'FILLED';
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return String(status).toUpperCase();
  }
}

function eventStyleForStatus(status: ShiftStatus): React.CSSProperties {
  // Pastel palette (readable text)
  switch (status) {
    case 'draft':
      return { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#0F172A' }; // blue-100
    case 'open':
      return { backgroundColor: '#DCFCE7', borderColor: '#86EFAC', color: '#052E16' }; // green-100
    case 'pending':
    case 'invited':
      return { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', color: '#451A03' }; // amber-100
    case 'confirmed':
      return { backgroundColor: '#E9D5FF', borderColor: '#C4B5FD', color: '#2E1065' }; // purple-200
    case 'filled':
      return { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1', color: '#0F172A' }; // slate-200
    case 'completed':
      return { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', color: '#0F172A' }; // slate-100
    case 'cancelled':
      return { backgroundColor: '#FFE4E6', borderColor: '#FDA4AF', color: '#450A0A' }; // rose-100
    default:
      return { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1', color: '#0F172A' };
  }
}

export default function ShopSchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<View>(() => 'week');

  useEffect(() => {
    // Keep the calendar usable on mobile: default to Day view.
    if (isMobile && view === 'week') {
      setView('day');
    }
  }, [isMobile, view]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [draftForm, setDraftForm] = useState({
    role: 'barber',
    title: '',
    hourlyRate: '45',
    description: '',
  });

  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  const [confirmMoveOpen, setConfirmMoveOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    shift: ShiftDetails;
    start: Date;
    end: Date;
  } | null>(null);
  const [moveReason, setMoveReason] = useState('');

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const { data: shifts = [], isLoading } = useQuery<ShiftDetails[]>({
    queryKey: ['shop-schedule-shifts', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => fetchEmployerShifts({ start: weekStart.toISOString(), end: weekEnd.toISOString() }),
    enabled: !!user?.id,
  });

  const draftCount = useMemo(() => (shifts || []).filter((s) => s.status === 'draft').length, [shifts]);

  const events: CalendarEvent[] = useMemo(() => {
    return (shifts || [])
      .map((shift) => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
        return {
          id: shift.id,
          title: shift.title,
          start,
          end,
          resource: shift,
        };
      })
      .filter((e): e is CalendarEvent => e !== null);
  }, [shifts]);

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error('No time slot selected');
      const title = (draftForm.title || draftForm.role).trim() || 'Draft Shift';
      const hourlyRate = Number(draftForm.hourlyRate);
      if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
        throw new Error('Hourly rate must be a valid number');
      }
      return await createShift({
        title,
        description: (draftForm.description || 'Draft shift').trim(),
        startTime: selectedSlot.start.toISOString(),
        endTime: selectedSlot.end.toISOString(),
        hourlyRate,
        status: 'draft',
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      setSelectedSlot(null);
      setDraftForm({ role: 'barber', title: '', hourlyRate: '45', description: '' });
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      toast({ title: 'Draft created', description: 'Shift saved as DRAFT. Publish when ready.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Create failed',
        description: error?.message || 'Unable to create shift',
        variant: 'destructive',
      });
    },
  });

  const updateTimesMutation = useMutation({
    mutationFn: async (payload: { id: string; start: Date; end: Date; reason?: string }) => {
      return await updateShiftTimes(payload.id, {
        startTime: payload.start.toISOString(),
        endTime: payload.end.toISOString(),
        changeReason: payload.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error?.message || 'Unable to update shift',
        variant: 'destructive',
      });
    },
  });

  const copyPreviousWeekMutation = useMutation({
    mutationFn: async () => {
      return await copyPreviousWeekShifts({ start: weekStart.toISOString(), end: weekEnd.toISOString() });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      toast({
        title: 'Copied',
        description: data.count === 0 ? 'No shifts found last week.' : `Created ${data.count} DRAFT shift(s) for this week.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Copy failed',
        description: error?.message || 'Unable to copy previous week',
        variant: 'destructive',
      });
    },
  });

  const publishAllMutation = useMutation({
    mutationFn: async () => {
      return await publishAllDraftShifts({ start: weekStart.toISOString(), end: weekEnd.toISOString() });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      toast({
        title: 'Published',
        description: data.count === 0 ? 'No DRAFT shifts to publish.' : `Published ${data.count} shift(s) to OPEN.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Publish failed',
        description: error?.message || 'Unable to publish shifts',
        variant: 'destructive',
      });
    },
  });

  if (!user || (user.currentRole !== 'hub' && user.currentRole !== 'business')) {
    return <div className="p-6">Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Shop Schedule</CardTitle>
              <div className="text-sm text-muted-foreground">
                Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setCopyConfirmOpen(true)}
                disabled={copyPreviousWeekMutation.isPending}
              >
                {copyPreviousWeekMutation.isPending ? 'Copying…' : 'Copy Previous Week'}
              </Button>
              <Button
                onClick={() => setPublishConfirmOpen(true)}
                disabled={publishAllMutation.isPending || draftCount === 0}
              >
                {publishAllMutation.isPending ? 'Publishing…' : `Publish All${draftCount ? ` (${draftCount})` : ''}`}
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                Prev week
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                Next week
              </Button>
              <div className="w-full md:w-auto" />
              <Select value={view} onValueChange={(v) => setView(v as View)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  {!isMobile ? <SelectItem value="week">Week</SelectItem> : null}
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="agenda">List</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-card">
              <div style={{ height: isMobile ? 620 : 760 }}>
                <DnDCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={view}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  onView={(v) => setView(v)}
                  selectable
                  resizable
                  onSelectSlot={({ start, end }) => {
                    setSelectedSlot({ start, end });
                    setCreateOpen(true);
                  }}
                  onEventDrop={({ event, start, end }) => {
                    const shift = (event as CalendarEvent).resource;
                    const nextStart = start as Date;
                    const nextEnd = end as Date;
                    if (!shift || Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) return;

                    if (shift.status === 'open') {
                      updateTimesMutation.mutate({ id: shift.id, start: nextStart, end: nextEnd });
                      return;
                    }

                    if (shift.status === 'confirmed') {
                      setPendingMove({ shift, start: nextStart, end: nextEnd });
                      setMoveReason('');
                      setConfirmMoveOpen(true);
                      return;
                    }

                    toast({
                      title: 'Locked shift',
                      description: `Only OPEN shifts can be dragged. This shift is ${statusLabel(shift.status)}.`,
                      variant: 'destructive',
                    });
                  }}
                  draggableAccessor={(event) => {
                    const shift = (event as CalendarEvent).resource;
                    if (!shift) return false;
                    // Allow dragging OPEN or CONFIRMED (confirmed requires reason modal)
                    return shift.status === 'open' || shift.status === 'confirmed';
                  }}
                  eventPropGetter={(event) => {
                    const shift = (event as CalendarEvent).resource;
                    const colors = eventStyleForStatus(shift.status);
                    return {
                      style: {
                        ...colors,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderRadius: 10,
                        padding: 2,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                      },
                    };
                  }}
                  tooltipAccessor={(event) => {
                    const shift = (event as CalendarEvent).resource;
                    return `${shift.title} • ${statusLabel(shift.status)} • $${shift.hourlyRate}/hr`;
                  }}
                />
              </div>
            </div>
            {isLoading ? <div className="mt-3 text-sm text-muted-foreground">Loading shifts…</div> : null}
          </CardContent>
        </Card>
      </div>

      {/* Quick Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Create (Draft)</DialogTitle>
            <DialogDescription>
              {selectedSlot
                ? `Create a draft shift from ${format(selectedSlot.start, 'EEE h:mm a')} to ${format(selectedSlot.end, 'h:mm a')}`
                : 'Pick a time slot to create a shift.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={draftForm.role} onValueChange={(role) => setDraftForm((p) => ({ ...p, role }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barber">Barber</SelectItem>
                  <SelectItem value="hairdresser">Hairdresser</SelectItem>
                  <SelectItem value="stylist">Stylist</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={draftForm.title}
                onChange={(e) => setDraftForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Weekend Barber"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rate">Hourly rate</Label>
              <Input
                id="rate"
                inputMode="decimal"
                value={draftForm.hourlyRate}
                onChange={(e) => setDraftForm((p) => ({ ...p, hourlyRate: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Notes (optional)</Label>
              <Textarea
                id="desc"
                value={draftForm.description}
                onChange={(e) => setDraftForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Add any details for this shift…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createDraftMutation.mutate()} disabled={createDraftMutation.isPending}>
              {createDraftMutation.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Previous Week confirm */}
      <Dialog open={copyConfirmOpen} onOpenChange={setCopyConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Previous Week</DialogTitle>
            <DialogDescription>
              This will duplicate last week’s shifts into this week as <strong>DRAFT</strong> shifts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCopyConfirmOpen(false);
                copyPreviousWeekMutation.mutate();
              }}
              disabled={copyPreviousWeekMutation.isPending}
            >
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish All confirm */}
      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish All Drafts</DialogTitle>
            <DialogDescription>
              This will publish all <strong>DRAFT</strong> shifts in the current week to <strong>OPEN</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setPublishConfirmOpen(false);
                publishAllMutation.mutate();
              }}
              disabled={publishAllMutation.isPending || draftCount === 0}
            >
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm move for CONFIRMED shift */}
      <Dialog open={confirmMoveOpen} onOpenChange={setConfirmMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warning: Changing a confirmed shift</DialogTitle>
            <DialogDescription>
              This shift is assigned to a Professional. Provide a reason to proceed (they will be notified).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              placeholder="e.g. Shop closed early due to plumbing issue…"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmMoveOpen(false);
                setPendingMove(null);
                setMoveReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pendingMove) return;
                const reason = moveReason.trim();
                if (!reason) {
                  toast({
                    title: 'Reason required',
                    description: 'Please provide a reason to modify a confirmed shift.',
                    variant: 'destructive',
                  });
                  return;
                }
                updateTimesMutation.mutate({
                  id: pendingMove.shift.id,
                  start: pendingMove.start,
                  end: pendingMove.end,
                  reason,
                });
                setConfirmMoveOpen(false);
                setPendingMove(null);
                setMoveReason('');
              }}
              disabled={updateTimesMutation.isPending}
            >
              {updateTimesMutation.isPending ? 'Updating…' : 'Proceed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

