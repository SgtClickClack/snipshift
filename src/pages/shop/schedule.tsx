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

import { copyPreviousWeekShifts, createShift, fetchEmployerShifts, fetchProfessionals, publishAllDraftShifts, updateShiftTimes } from '@/lib/api';
import { apiRequest } from '@/lib/queryClient';
import type { ShiftDetails } from '@/lib/api';
import { AssignStaffModal, Professional } from '@/components/calendar/assign-staff-modal';

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
type ManagedShiftStatus = Extract<ShiftStatus, 'draft' | 'open' | 'invited' | 'confirmed'>;

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ShiftDetails;
};

const MANAGED_SHIFT_STATUSES: readonly ManagedShiftStatus[] = ['draft', 'open', 'invited', 'confirmed'] as const;

function isManagedShiftStatus(status: ShiftStatus): status is ManagedShiftStatus {
  return (MANAGED_SHIFT_STATUSES as readonly ShiftStatus[]).includes(status);
}

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
    case 'pending_completion':
      return 'PENDING COMPLETION';
    default:
      return String(status).toUpperCase();
  }
}

function eventStyleForStatus(status: ShiftStatus): React.CSSProperties {
  // Visual distinction for different shift states
  switch (status) {
    case 'draft':
      // GHOST SLOT: Gray, dashed border - indicates empty slot ready for assignment
      return { 
        backgroundColor: '#F3F4F6', 
        borderColor: '#9CA3AF', 
        color: '#6B7280',
        borderStyle: 'dashed',
        opacity: 0.85,
      };
    case 'open':
      // OPEN: Blue tint - posted to job board, awaiting applications
      return { backgroundColor: '#DBEAFE', borderColor: '#3B82F6', color: '#1E40AF' };
    case 'pending':
    case 'invited':
      // PENDING: Amber/yellow - invite sent, awaiting response
      return { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' };
    case 'confirmed':
      // CONFIRMED: Green - professional accepted, shift is locked in
      return { backgroundColor: '#D1FAE5', borderColor: '#10B981', color: '#065F46' };
    case 'filled':
      // FILLED: Teal - shift is fully staffed
      return { backgroundColor: '#CCFBF1', borderColor: '#14B8A6', color: '#115E59' };
    case 'completed':
      // COMPLETED: Slate/gray - shift has ended
      return { backgroundColor: '#F1F5F9', borderColor: '#94A3B8', color: '#475569' };
    case 'cancelled':
      // CANCELLED: Rose/red - shift was cancelled
      return { backgroundColor: '#FFE4E6', borderColor: '#F43F5E', color: '#9F1239' };
    case 'pending_completion':
      // PENDING COMPLETION: Purple - shift ended, awaiting review/confirmation
      return { backgroundColor: '#F3E8FF', borderColor: '#A855F7', color: '#7E22CE' };
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

  // AssignStaffModal state for clicking on DRAFT slots
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDraftShift, setSelectedDraftShift] = useState<ShiftDetails | null>(null);

  // ShiftDetailsModal state for viewing CONFIRMED shifts
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedConfirmedShift, setSelectedConfirmedShift] = useState<ShiftDetails | null>(null);

  // EditShiftModal state for editing OPEN shifts
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOpenShift, setSelectedOpenShift] = useState<ShiftDetails | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    hourlyRate: '',
    description: '',
  });

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const { data: shifts = [], isLoading } = useQuery<ShiftDetails[]>({
    queryKey: ['shop-schedule-shifts', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => fetchEmployerShifts({ start: weekStart.toISOString(), end: weekEnd.toISOString() }),
    enabled: !!user?.id,
  });

  // Fetch professionals for the assign modal
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['professionals-for-assign'],
    queryFn: async () => {
      const data = await fetchProfessionals();
      return data.map((p: any) => ({
        id: p.id,
        name: p.name || p.displayName || 'Professional',
        displayName: p.displayName,
        email: p.email,
        photoURL: p.avatarUrl || p.photoURL,
        skills: p.skills || [],
        rating: p.rating,
        lastHired: p.lastHired,
      }));
    },
    enabled: assignModalOpen, // Only fetch when modal is open
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const draftCount = useMemo(() => (shifts || []).filter((s) => s.status === 'draft').length, [shifts]);

  const events: CalendarEvent[] = useMemo(() => {
    return (shifts || [])
      // Identity check: this calendar is for roster "Shifts" (not legacy Jobs)
      // and we only manage a tight set of statuses here to avoid cross-feature confusion.
      .filter((shift) => isManagedShiftStatus(shift.status))
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

  // Mutation for updating an OPEN shift's details
  const updateShiftDetailsMutation = useMutation({
    mutationFn: async (payload: { id: string; title: string; hourlyRate: number; description: string }) => {
      const res = await apiRequest('PATCH', `/api/shifts/${payload.id}`, {
        title: payload.title,
        hourlyRate: payload.hourlyRate,
        description: payload.description,
      });
      return await res.json();
    },
    onSuccess: () => {
      setEditModalOpen(false);
      setSelectedOpenShift(null);
      setEditForm({ title: '', hourlyRate: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      toast({
        title: 'Shift updated',
        description: 'Shift details have been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error?.message || 'Unable to update shift',
        variant: 'destructive',
      });
    },
  });

  // Mutation for inviting a professional to a draft shift (single)
  const inviteProfessionalMutation = useMutation({
    mutationFn: async ({ shiftId, professionalId }: { shiftId: string; professionalId: string }) => {
      const res = await apiRequest('POST', `/api/shifts/${shiftId}/invite`, { professionalId });
      return await res.json();
    },
    onSuccess: () => {
      setAssignModalOpen(false);
      setSelectedDraftShift(null);
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      toast({
        title: 'Invite sent!',
        description: 'The professional will be notified and can accept or decline the shift.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Invite failed',
        description: error?.message || 'Unable to send invite',
        variant: 'destructive',
      });
    },
  });

  // Mutation for inviting multiple professionals (First-to-Accept pattern)
  const multiInviteMutation = useMutation({
    mutationFn: async ({ shiftId, professionalIds }: { shiftId: string; professionalIds: string[] }) => {
      const res = await apiRequest('POST', `/api/shifts/${shiftId}/invite`, { professionalIds });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      setAssignModalOpen(false);
      setSelectedDraftShift(null);
      queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      const count = variables.professionalIds.length;
      toast({
        title: `${count} barber${count > 1 ? 's' : ''} invited!`,
        description: 'First one to accept gets the shift.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Invite failed',
        description: error?.message || 'Unable to send invites',
        variant: 'destructive',
      });
    },
  });

  // Handler for clicking on calendar events
  const handleSelectEvent = (event: CalendarEvent) => {
    const shift = event.resource;
    
    // DRAFT: Open the AssignStaffModal to invite a barber
    if (shift.status === 'draft') {
      setSelectedDraftShift(shift);
      setAssignModalOpen(true);
      return;
    }
    
    // CONFIRMED: Open ShiftDetailsModal to view who is working
    if (shift.status === 'confirmed') {
      setSelectedConfirmedShift(shift);
      setDetailsModalOpen(true);
      return;
    }
    
    // OPEN: Open EditShiftModal to change shift details
    if (shift.status === 'open') {
      setSelectedOpenShift(shift);
      setEditForm({
        title: shift.title || '',
        hourlyRate: String(shift.hourlyRate || '45'),
        description: shift.description || '',
      });
      setEditModalOpen(true);
      return;
    }

    // PENDING/INVITED: Show info about pending invite
    if (shift.status === 'pending' || shift.status === 'invited') {
      toast({
        title: shift.title,
        description: `Invite sent — awaiting response. Rate: $${shift.hourlyRate}/hr`,
      });
      return;
    }

    // Default fallback for other statuses (completed, cancelled, etc.)
    toast({
      title: shift.title,
      description: `Status: ${statusLabel(shift.status)} | Rate: $${shift.hourlyRate}/hr`,
    });
  };

  // Handler for assigning a professional to a shift (single)
  const handleAssignProfessional = (professional: Professional) => {
    if (!selectedDraftShift) return;
    inviteProfessionalMutation.mutate({
      shiftId: selectedDraftShift.id,
      professionalId: professional.id,
    });
  };

  // Handler for multi-select assignment (First-to-Accept)
  const handleMultiAssignProfessionals = (professionals: Professional[]) => {
    if (!selectedDraftShift) return;
    if (professionals.length === 0) return;
    
    if (professionals.length === 1) {
      // Single invite
      inviteProfessionalMutation.mutate({
        shiftId: selectedDraftShift.id,
        professionalId: professionals[0].id,
      });
    } else {
      // Multi-invite
      multiInviteMutation.mutate({
        shiftId: selectedDraftShift.id,
        professionalIds: professionals.map(p => p.id),
      });
    }
  };

  if (!user || (user.currentRole !== 'hub' && user.currentRole !== 'business')) {
    return <div className="p-6">Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-3">
            {/* Top row: Title + Controls */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Shop Schedule</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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

              {/* Legend (moved into the top header row for visibility) */}
              <div className="hidden md:block h-6 w-px bg-border mx-1" />
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-medium text-muted-foreground">Legend:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border-2 border-dashed border-gray-400 bg-gray-100" />
                  <span>Draft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border border-blue-500 bg-blue-100" />
                  <span>Open</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border border-green-500 bg-green-100" />
                  <span>Confirmed</span>
                </div>
              </div>
              </div>
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
                  onSelectEvent={(event) => handleSelectEvent(event as CalendarEvent)}
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
                    const isDraft = shift.status === 'draft';
                    return {
                      style: {
                        ...colors,
                        borderWidth: isDraft ? 2 : 1,
                        borderStyle: colors.borderStyle || 'solid',
                        borderRadius: 10,
                        padding: 2,
                        boxShadow: isDraft ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                        cursor: isDraft ? 'pointer' : 'default',
                      },
                    };
                  }}
                  tooltipAccessor={(event) => {
                    const shift = (event as CalendarEvent).resource;
                    const isDraft = shift.status === 'draft';
                    const baseInfo = `${shift.title} • ${statusLabel(shift.status)} • $${shift.hourlyRate}/hr`;
                    return isDraft ? `${baseInfo}\n👆 Click to assign staff` : baseInfo;
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

      {/* Shift Details Modal - Opens when clicking on a CONFIRMED shift */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedConfirmedShift?.title || 'Shift Details'}</DialogTitle>
            <DialogDescription>
              This shift is confirmed and assigned.
            </DialogDescription>
          </DialogHeader>

          {selectedConfirmedShift && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <div className="font-medium text-green-600">✓ CONFIRMED</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Hourly Rate</Label>
                  <div className="font-medium">${selectedConfirmedShift.hourlyRate}/hr</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Start</Label>
                  <div className="font-medium">
                    {format(new Date(selectedConfirmedShift.startTime), 'EEE, MMM d • h:mm a')}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">End</Label>
                  <div className="font-medium">
                    {format(new Date(selectedConfirmedShift.endTime), 'h:mm a')}
                  </div>
                </div>
              </div>

              {selectedConfirmedShift.assigneeId && (
                <div>
                  <Label className="text-muted-foreground text-sm">Assigned Professional</Label>
                  <div className="font-medium">Staff member confirmed</div>
                </div>
              )}

              {selectedConfirmedShift.description && (
                <div>
                  <Label className="text-muted-foreground text-sm">Notes</Label>
                  <div className="text-sm">{selectedConfirmedShift.description}</div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDetailsModalOpen(false);
              setSelectedConfirmedShift(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Shift Modal - Opens when clicking on an OPEN shift */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>
              {selectedOpenShift
                ? `Update details for ${format(new Date(selectedOpenShift.startTime), 'EEE, MMM d • h:mm a')}`
                : 'Modify shift details'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Weekend Barber"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-rate">Hourly Rate ($)</Label>
              <Input
                id="edit-rate"
                inputMode="decimal"
                value={editForm.hourlyRate}
                onChange={(e) => setEditForm((p) => ({ ...p, hourlyRate: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Notes (optional)</Label>
              <Textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Add any details for this shift…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditModalOpen(false);
              setSelectedOpenShift(null);
              setEditForm({ title: '', hourlyRate: '', description: '' });
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedOpenShift) return;
                const hourlyRate = Number(editForm.hourlyRate);
                if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
                  toast({
                    title: 'Invalid rate',
                    description: 'Hourly rate must be a valid number.',
                    variant: 'destructive',
                  });
                  return;
                }
                updateShiftDetailsMutation.mutate({
                  id: selectedOpenShift.id,
                  title: editForm.title.trim() || selectedOpenShift.title,
                  hourlyRate,
                  description: editForm.description.trim(),
                });
              }}
              disabled={updateShiftDetailsMutation.isPending}
            >
              {updateShiftDetailsMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Modal - Opens when clicking on a DRAFT slot */}
      {/* Supports multi-select for First-to-Accept pattern */}
      <AssignStaffModal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedDraftShift(null);
        }}
        onAssign={handleAssignProfessional}
        onMultiAssign={handleMultiAssignProfessionals}
        professionals={professionals}
        shiftTitle={selectedDraftShift?.title}
        shiftDate={selectedDraftShift ? new Date(selectedDraftShift.startTime) : undefined}
        enableMultiSelect={true}
      />
    </div>
  );
}

