import { useState, useMemo, useCallback, useEffect, useRef, Component, ReactNode } from "react";
import { Calendar, momentLocalizer, View, Event } from "react-big-calendar";
import moment from "moment";
import { format, isPast, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  DollarSign,
  Filter,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StartChatButton from "@/components/messaging/start-chat-button";
import { ShiftBlock } from "./shift-block";
import { AssignStaffModal, Professional } from "./assign-staff-modal";
import { AutoFillButton } from "./auto-fill-button";
import { SmartFillConfirmationModal, SmartMatch } from "./smart-fill-confirmation-modal";
import { calculateSmartMatches } from "./smart-fill-utils";
import { useAuth } from "@/contexts/AuthContext";

// Import react-big-calendar CSS
import "react-big-calendar/lib/css/react-big-calendar.css";

// Initialize localizer with error handling
let localizer: ReturnType<typeof momentLocalizer> | null = null;
try {
  if (moment && typeof moment === 'function') {
    localizer = momentLocalizer(moment);
    console.log('[CALENDAR INIT] Localizer initialized successfully');
  } else {
    console.error('[CALENDAR INIT] Moment.js is not available');
  }
} catch (error) {
  console.error('[CALENDAR INIT] Failed to initialize localizer:', error);
}

// Validate localizer at module load time
if (!localizer) {
  console.error('[CALENDAR INIT] Localizer is null - Calendar will not render');
}

// Extend Event type to include our custom properties
interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    booking: any;
    status: "draft" | "invited" | "confirmed" | "pending" | "completed" | "past";
    type: "job" | "shift";
  };
}

interface ProfessionalCalendarProps {
  bookings?: any[] | null;
  isLoading?: boolean;
  onDateSelect?: (date: Date) => void;
  /** Mode: 'professional' for My Shifts, 'business' for All Company Shifts */
  mode?: 'professional' | 'business';
  /** Callback when Create button is clicked in business mode (opens Create New Shift modal) */
  onCreateShift?: () => void;
}

type JobStatus = "all" | "pending" | "confirmed" | "completed";

// Error Boundary for Calendar Component
interface CalendarErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CalendarErrorBoundary extends Component<
  { children: ReactNode },
  CalendarErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CalendarErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CALENDAR ERROR BOUNDARY] Caught error:', error);
    console.error('[CALENDAR ERROR BOUNDARY] Error info:', errorInfo);
    console.error('[CALENDAR ERROR BOUNDARY] Error stack:', error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="flex items-center justify-center h-full min-h-[600px]" 
          data-testid="calendar-error-boundary"
        >
          <div className="text-muted-foreground">
            Calendar render error: {this.state.error?.message || 'Unknown error'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Current Time Indicator Component - Red line like Google Calendar
function CurrentTimeIndicator({
  currentTime,
  view,
  currentDate,
}: {
  currentTime: Date;
  view: View;
  currentDate: Date;
}) {
  const isToday = isSameDay(currentTime, currentDate);
  const isInCurrentWeek =
    view === "week" &&
    currentTime >= startOfWeek(currentDate, { weekStartsOn: 0 }) &&
    currentTime <= endOfWeek(currentDate, { weekStartsOn: 0 });

  if ((view === "week" && !isInCurrentWeek) || (view === "day" && !isToday)) {
    return null;
  }

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // Calculate position: calendar typically shows 6 AM to 11 PM (17 hours = 1020 minutes)
  // Starting from 6 AM (360 minutes)
  const startHour = 6;
  const endHour = 23;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalRange = endMinutes - startMinutes;
  const positionFromStart = totalMinutes - startMinutes;
  const topPosition = Math.max(0, Math.min(100, (positionFromStart / totalRange) * 100));

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{
        top: `${topPosition}%`,
        marginTop: "-1px",
      }}
    >
      <div className="flex items-center h-0.5">
        <div className="w-14 text-xs text-red-600 font-medium pr-2 pl-1 text-right bg-red-50 dark:bg-red-950/80 rounded-full border border-red-200 dark:border-red-900/50">
          {format(currentTime, "h:mm a")}
        </div>
        <div className="flex-1 relative">
          <div className="h-0.5 bg-red-600 relative">
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-600 rounded-full border-2 border-background"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfessionalCalendar({
  bookings = [],
  isLoading = false,
  onDateSelect,
  mode = 'professional',
  onCreateShift,
}: ProfessionalCalendarProps) {
  // Log component mount
  console.log('[CALENDAR COMPONENT] ProfessionalCalendar component mounted');
  console.log('[CALENDAR COMPONENT] Props:', { 
    bookingsCount: Array.isArray(bookings) ? bookings.length : 'not array',
    isLoading,
    hasOnDateSelect: !!onDateSelect
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const date = new Date();
    // Ensure date is valid
    if (isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  });
  const [view, setView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const date = new Date();
    return isNaN(date.getTime()) ? undefined : date;
  });
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeIndicatorRef = useRef<HTMLDivElement>(null);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [selectedShiftForAssignment, setSelectedShiftForAssignment] = useState<CalendarEvent | null>(null);
  const [showSmartFillModal, setShowSmartFillModal] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [pendingRecurringAction, setPendingRecurringAction] = useState<{
    type: 'delete' | 'move';
    event: CalendarEvent;
    newStart?: Date;
    newEnd?: Date;
  } | null>(null);
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [isCalculatingMatches, setIsCalculatingMatches] = useState(false);

  // Update current time every second for smooth time indicator movement
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for smooth movement
    return () => clearInterval(interval);
  }, []);

  // Convert bookings to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    // Defensive check: ensure bookings is always an array
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return [];
    }

    try {
      return bookings
        .map((booking: any) => {
          // Skip invalid bookings
          if (!booking || typeof booking !== 'object') return null;

          try {
            const job = booking.job || booking.shift;
            if (!job) return null;

            // Determine date from job/shift
            const dateStr = job.date || job.startTime || booking.appliedAt;
            if (!dateStr) return null;

            const startDate = new Date(dateStr);
            if (isNaN(startDate.getTime())) return null;

            // Determine end date (default to 8 hours later if not specified)
            let endDate: Date;
            if (job.endTime) {
              endDate = new Date(job.endTime);
              // Validate endDate
              if (isNaN(endDate.getTime())) {
                endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
              }
            } else {
              endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
            }

            // Ensure endDate is after startDate
            if (endDate <= startDate) {
              endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
            }

            // Determine status - support draft, invited, confirmed, pending, completed, past
            let status: "draft" | "invited" | "confirmed" | "pending" | "completed" | "past";
            if (isPast(endDate) && !isToday(endDate)) {
              status = "past";
            } else if (job.status === "draft") {
              status = "draft";
            } else if (job.status === "invited") {
              status = "invited";
            } else if (booking.status === "accepted" || booking.status === "confirmed" || job.status === "filled") {
              status = "confirmed";
            } else if (booking.status === "completed" || job.status === "completed") {
              status = "completed";
            } else {
              status = "pending";
            }

            // Include assignedStaff if available
            const assignedStaff = job.assignedStaff || booking.assignedStaff || null;
            
            return {
              id: booking.id || job.id || `event-${Date.now()}-${Math.random()}`,
              title: job.title || "Untitled Job",
              start: startDate,
              end: endDate,
              resource: {
                booking: {
                  ...booking,
                  shift: booking.shift ? {
                    ...booking.shift,
                    assignedStaff,
                  } : undefined,
                  job: booking.job ? {
                    ...booking.job,
                    assignedStaff,
                  } : undefined,
                },
                status,
                type: booking.job ? "job" : "shift",
              },
            } as CalendarEvent;
          } catch (error) {
            // Log error but don't crash - skip this booking
            console.warn('Error processing booking:', error, booking);
            return null;
          }
        })
        .filter((event): event is CalendarEvent => event !== null);
    } catch (error) {
      // If entire conversion fails, return empty array to prevent crash
      console.error('Error converting bookings to events:', error);
      return [];
    }
  }, [bookings]);

  // Filter events based on status
  const filteredEvents = useMemo(() => {
    // Defensive check: ensure events is always an array
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    if (statusFilter === "all") return events;
    
    try {
      return events.filter((event) => {
        if (!event || !event.resource) return false;
        if (statusFilter === "pending") return event.resource.status === "pending";
        if (statusFilter === "confirmed") return event.resource.status === "confirmed";
        if (statusFilter === "completed") return event.resource.status === "completed";
        return true;
      });
    } catch (error) {
      // If filtering fails, return empty array to prevent crash
      console.error('Error filtering events:', error);
      return [];
    }
  }, [events, statusFilter]);

  // Event style getter with high contrast colors (WCAG AA compliant)
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      // Defensive check: ensure event and resource exist
      if (!event || !event.resource) {
        return {
          style: {
            backgroundColor: "#4b5563", // gray-600 - darker for better contrast
            borderColor: "#374151", // gray-700 - darker border
            color: "#ffffff", // white text for high contrast
            borderRadius: "4px",
            border: "2px solid #374151",
            padding: "4px 6px",
            fontWeight: "500",
          },
        };
      }

      let backgroundColor = "";
      let borderColor = "";
      let color = "#ffffff"; // Default to white for high contrast
      let opacity = 1; // Default opacity

      const status = event.resource.status || "pending";
      
      // Check if event is in the past
      const now = new Date();
      const isPastEvent = event.end < now;
      
      // Apply faded style (opacity 0.6) to past events
      if (isPastEvent) {
        opacity = 0.6;
      }

      switch (status) {
        case "draft":
          // Ghost slot styling - transparent with dashed border
          backgroundColor = "transparent";
          borderColor = "#9ca3af"; // gray-400
          color = "#6b7280"; // gray-500
          opacity = 0.6;
          break;
        case "invited":
          backgroundColor = "#f59e0b"; // amber-500
          borderColor = "#d97706"; // amber-600
          color = "#ffffff"; // white text
          break;
        case "confirmed":
          backgroundColor = "#16a34a"; // green-600 - darker for better contrast
          borderColor = "#15803d"; // green-700 - darker border
          color = "#ffffff"; // white text
          break;
        case "pending":
          backgroundColor = "#2563eb"; // blue-600 - darker for better contrast
          borderColor = "#1d4ed8"; // blue-700 - darker border
          color = "#ffffff"; // white text
          break;
        case "completed":
          backgroundColor = "#4b5563"; // gray-600 - darker for better contrast
          borderColor = "#374151"; // gray-700 - darker border
          color = "#ffffff"; // white text
          break;
        case "past":
          backgroundColor = "#6b7280"; // gray-500
          borderColor = "#4b5563"; // gray-600
          color = "#ffffff"; // white text for better contrast
          break;
        default:
          backgroundColor = "#4b5563"; // gray-600
          borderColor = "#374151"; // gray-700
          color = "#ffffff"; // white text
      }

      return {
        style: {
          backgroundColor,
          borderColor,
          color,
          borderRadius: "4px",
          border: `2px solid ${borderColor}`,
          padding: "4px 6px",
          fontWeight: "500",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          opacity,
        },
      };
    },
    []
  );

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    // Defensive check: ensure event exists
    if (!event) return;
    
    // If it's a draft shift in business mode, open AssignStaffModal
    if (mode === 'business' && event.resource?.status === 'draft') {
      setSelectedShiftForAssignment(event);
      setShowAssignStaffModal(true);
      return;
    }
    
    // Otherwise, show event details
    setSelectedEvent(event);
    setShowEventDetails(true);
  }, [mode]);

  // Handle slot click (for quick event creation)
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      // Validate dates
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn('[CALENDAR] Invalid slot selection - dates are invalid');
        return;
      }
      
      // Ensure end is after start
      const validEnd = end > start ? end : new Date(start.getTime() + 60 * 60 * 1000); // Default to 1 hour if invalid
      
      setSelectedSlot({ start, end: validEnd });
      setSelectedDate(start);
      setNewEventTitle(""); // Reset title
      setShowCreateModal(true);
      
      if (onDateSelect) {
        onDateSelect(start);
      }
    },
    [onDateSelect]
  );

  // Handle date change from mini calendar
  const handleMiniCalendarSelect = useCallback((date: Date | undefined) => {
    if (date && !isNaN(date.getTime())) {
      setCurrentDate(date);
      setSelectedDate(date);
    }
  }, []);

  // Handle navigation from react-big-calendar (receives Date object)
  const handleNavigate = useCallback((newDate: Date | string) => {
    try {
      // Handle both Date objects and date strings
      const date = newDate instanceof Date ? newDate : new Date(newDate);
      
      // Validate date
      if (!date || isNaN(date.getTime())) {
        console.warn('[CALENDAR] Invalid date in handleNavigate:', newDate);
        return;
      }
      
      // Ensure date is within reasonable bounds (not too far in past/future)
      const minDate = new Date(1900, 0, 1);
      const maxDate = new Date(2100, 11, 31);
      
      if (date < minDate || date > maxDate) {
        console.warn('[CALENDAR] Date out of bounds in handleNavigate:', date);
        return;
      }
      
      setCurrentDate(date);
      
      // Update selected date if it's not set or if navigating to a different day
      if (!selectedDate || !isSameDay(date, selectedDate)) {
        setSelectedDate(date);
      }
    } catch (error) {
      console.error('[CALENDAR] Error in handleNavigate:', error);
    }
  }, [selectedDate]);

  // Handle view change from react-big-calendar
  const handleViewChange = useCallback((newView: View | string) => {
    try {
      // Validate view
      const validViews: View[] = ['month', 'week', 'day', 'agenda'];
      if (!newView || !validViews.includes(newView as View)) {
        console.warn('[CALENDAR] Invalid view in handleViewChange:', newView);
        return;
      }
      
      const viewToSet = newView as View;
      
      // When switching views, ensure currentDate is valid for the new view
      // Adjust date if necessary (e.g., when switching to week view, ensure we're at start of week)
      let adjustedDate = currentDate;
      
      if (viewToSet === 'week') {
        // Adjust to start of week
        adjustedDate = startOfWeek(currentDate, { weekStartsOn: 0 });
      } else if (viewToSet === 'day') {
        // For day view, just use the current date
        adjustedDate = currentDate;
      } else if (viewToSet === 'month') {
        // For month view, ensure we're at the start of the month
        adjustedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      }
      
      // Validate adjusted date
      if (adjustedDate && !isNaN(adjustedDate.getTime())) {
        setCurrentDate(adjustedDate);
        if (!selectedDate || !isSameDay(adjustedDate, selectedDate)) {
          setSelectedDate(adjustedDate);
        }
      }
      
      setView(viewToSet);
    } catch (error) {
      console.error('[CALENDAR] Error in handleViewChange:', error);
    }
  }, [currentDate, selectedDate]);

  // Navigate calendar (for custom buttons)
  const navigate = useCallback((action: "PREV" | "NEXT" | "TODAY") => {
    try {
      if (action === "TODAY") {
        const today = new Date();
        if (!isNaN(today.getTime())) {
          setCurrentDate(today);
          setSelectedDate(today);
        }
        return;
      }

      const newDate = new Date(currentDate);
      
      // Validate current date first
      if (isNaN(newDate.getTime())) {
        console.warn('[CALENDAR] Invalid currentDate in navigate, resetting to today');
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        return;
      }
      
      // Navigate based on current view
      if (view === "month") {
        newDate.setMonth(
          action === "PREV" ? newDate.getMonth() - 1 : newDate.getMonth() + 1
        );
      } else if (view === "week") {
        // Navigate by weeks, maintaining day of week
        newDate.setDate(action === "PREV" ? newDate.getDate() - 7 : newDate.getDate() + 7);
      } else if (view === "day") {
        // Navigate by days
        newDate.setDate(action === "PREV" ? newDate.getDate() - 1 : newDate.getDate() + 1);
      }
      
      // Validate the new date before setting
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate);
        // Update selected date if navigating to a different day
        if (!selectedDate || !isSameDay(newDate, selectedDate)) {
          setSelectedDate(newDate);
        }
      } else {
        console.warn('[CALENDAR] Invalid newDate after navigation calculation');
      }
    } catch (error) {
      console.error('[CALENDAR] Error in navigate:', error);
    }
  }, [currentDate, view, selectedDate]);

  // Get date range for display based on current view
  const dateRange = useMemo(() => {
    if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start: weekStart, end: weekEnd };
    } else if (view === "day") {
      return { start: currentDate, end: currentDate };
    } else if (view === "month") {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return { start: monthStart, end: monthEnd };
    }
    return null;
  }, [currentDate, view]);

  // Smart Fill handlers
  const handleSmartFillClick = useCallback(async () => {
    if (!dateRange || mode !== 'business') {
      toast({
        title: "Smart Fill Unavailable",
        description: "Smart Fill is only available in business mode.",
        variant: "destructive",
      });
      return;
    }

    setIsCalculatingMatches(true);
    try {
      // Extract draft shifts from bookings
      const draftShifts = events
        .filter((event) => event.resource?.status === 'draft' && event.resource?.type === 'shift')
        .map((event) => {
          const booking = event.resource?.booking;
          const shift = booking?.shift || booking?.job;
          return {
            id: event.id,
            title: event.title,
            startTime: shift?.startTime || event.start.toISOString(),
            endTime: shift?.endTime || event.end.toISOString(),
            status: 'draft',
            role: shift?.role,
            jobType: shift?.jobType,
          };
        });

      if (draftShifts.length === 0) {
        toast({
          title: "No Draft Shifts",
          description: "No draft shifts found in the current view.",
        });
        setIsCalculatingMatches(false);
        return;
      }

      // Get employer ID from the first booking (assuming all belong to same employer)
      const firstBooking = bookings?.[0];
      const employerId = firstBooking?.shift?.employerId || firstBooking?.job?.businessId;
      
      if (!employerId) {
        toast({
          title: "Error",
          description: "Could not determine employer ID.",
          variant: "destructive",
        });
        setIsCalculatingMatches(false);
        return;
      }

      // Calculate matches
      const matches = await calculateSmartMatches(draftShifts, employerId, dateRange);
      setSmartMatches(matches);
      setShowSmartFillModal(true);
    } catch (error) {
      console.error("Error calculating smart matches:", error);
      toast({
        title: "Error",
        description: "Failed to calculate smart matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingMatches(false);
    }
  }, [dateRange, mode, events, bookings, toast]);

  const handleSendInvites = useCallback(async () => {
    const matchesToSend = smartMatches.filter((m) => m.suggestedCandidate !== null);
    
    if (matchesToSend.length === 0) {
      return;
    }

    try {
      // Update each shift status from DRAFT to INVITED
      for (const match of matchesToSend) {
        try {
          await apiRequest('PATCH', `/api/shifts/${match.shiftId}`, { 
            status: 'invited'
          });
          
          // TODO: Trigger notification to the professional
          // This would typically be done via a separate endpoint or notification service
        } catch (error) {
          console.error(`Failed to update shift ${match.shiftId}:`, error);
        }
      }

      // Invalidate queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ['shop-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });

      toast({
        title: "Invites Sent",
        description: `Successfully sent ${matchesToSend.length} invite${matchesToSend.length !== 1 ? 's' : ''}.`,
      });

      setShowSmartFillModal(false);
    } catch (error) {
      console.error("Error sending invites:", error);
      toast({
        title: "Error",
        description: "Failed to send some invites. Please try again.",
        variant: "destructive",
      });
    }
  }, [smartMatches, queryClient, toast]);

  // Custom toolbar component (returns null to hide default toolbar)
  const customToolbar = useCallback(() => null, []);
  
  // Custom header component to add current day styling with background highlight
  const customHeader = useCallback(
    ({ date, localizer, label }: { date: Date; localizer: any; label: string }) => {
      const isCurrentDay = isSameDay(date, new Date());
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Add subtle color accents based on day of week
      const dayColors: Record<number, { bg: string; text: string; darkText: string }> = {
        0: { bg: "rgba(168, 85, 247, 0.08)", text: "text-purple-600", darkText: "dark:text-purple-400" }, // Sunday - Purple
        1: { bg: "rgba(59, 130, 246, 0.08)", text: "text-blue-600", darkText: "dark:text-blue-400" }, // Monday - Blue
        2: { bg: "rgba(14, 165, 233, 0.08)", text: "text-sky-600", darkText: "dark:text-sky-400" }, // Tuesday - Sky
        3: { bg: "rgba(20, 184, 166, 0.08)", text: "text-teal-600", darkText: "dark:text-teal-400" }, // Wednesday - Teal
        4: { bg: "rgba(34, 197, 94, 0.08)", text: "text-green-600", darkText: "dark:text-green-400" }, // Thursday - Green
        5: { bg: "rgba(251, 146, 60, 0.08)", text: "text-orange-600", darkText: "dark:text-orange-400" }, // Friday - Orange
        6: { bg: "rgba(236, 72, 153, 0.08)", text: "text-pink-600", darkText: "dark:text-pink-400" }, // Saturday - Pink
      };
      
      const dayColor = dayColors[dayOfWeek];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Split the label (format: "EEE M/d" like "Mon 9/12")
      const parts = label.split(" ");
      
      return (
        <div
          className={`rbc-header ${isCurrentDay ? "rbc-header-today" : ""} ${isWeekend ? "rbc-header-weekend" : ""}`}
          style={isCurrentDay 
            ? { backgroundColor: "rgba(59, 130, 246, 0.15)" } 
            : { backgroundColor: dayColor.bg }
          }
        >
          {parts.length > 1 ? (
            <>
              <div className={`font-bold ${isCurrentDay ? "text-blue-600 dark:text-blue-300" : `${dayColor.text} ${dayColor.darkText}`}`}>{parts[0]}</div>
              <div className={`text-sm ${isCurrentDay ? "text-blue-700 dark:text-blue-200 font-medium" : "text-muted-foreground dark:text-muted-foreground"}`}>{parts.slice(1).join(" ")}</div>
            </>
          ) : (
            <span className={isCurrentDay ? "font-bold text-blue-600 dark:text-blue-300" : `font-semibold ${dayColor.text} ${dayColor.darkText}`}>{label}</span>
          )}
        </div>
      );
    },
    []
  );

  // Create event/availability mutation - uses shifts endpoint for availability slots
  const createEventMutation = useMutation({
    mutationFn: async (data: { title: string; start: Date; end: Date }) => {
      // Use shifts endpoint with proper data structure matching ShiftSchema
      // Note: hourlyRate is required by the database, so we provide a default
      // In business mode, create as 'draft' (Ghost Slot). In professional mode, use 'open'
      const defaultStatus = mode === 'business' ? 'draft' : 'open';
      const response = await apiRequest("POST", "/api/shifts", {
        title: data.title || (mode === 'business' ? "New Shift" : "Availability"),
        description: mode === 'business' ? "Shift slot" : "Availability slot",
        startTime: data.start.toISOString(),
        endTime: data.end.toISOString(),
        hourlyRate: "0", // Default to 0 for availability slots (can be updated later)
        status: defaultStatus,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both applications and shifts queries to refresh calendar
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: mode === 'business' ? "Shift created" : "Event created",
        description: mode === 'business' 
          ? "Your shift slot has been created. Click it to assign staff."
          : "Your availability slot has been created successfully",
      });
      setShowCreateModal(false);
      setSelectedSlot(null);
      setNewEventTitle("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create event",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Update event mutation for drag-and-drop and resize
  const updateEventMutation = useMutation({
    mutationFn: async (data: { id: string; start: Date; end: Date }) => {
      // Try to update via PUT endpoint (full update) or PATCH if PUT doesn't exist
      try {
        const response = await apiRequest("PUT", `/api/shifts/${data.id}`, {
          startTime: data.start.toISOString(),
          endTime: data.end.toISOString(),
        });
        return response.json();
      } catch (error: any) {
        // Fallback: if PUT doesn't work, we might need to handle this differently
        // For now, we'll throw the error and handle it in onError
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Event updated",
        description: "Shift has been rescheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update event",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Assign staff to shift mutation
  const assignStaffMutation = useMutation({
    mutationFn: async (data: { shiftId: string; professional: Professional }) => {
      const response = await apiRequest("PUT", `/api/shifts/${data.shiftId}`, {
        status: "invited",
        assignedStaffId: data.professional.id,
        assignedStaff: {
          id: data.professional.id,
          name: data.professional.name,
          displayName: data.professional.displayName,
          email: data.professional.email,
          photoURL: data.professional.photoURL || data.professional.avatar,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Staff invited",
        description: "An invitation has been sent to the selected professional",
      });
      setShowAssignStaffModal(false);
      setSelectedShiftForAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to assign staff",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Handle staff assignment
  const handleAssignStaff = useCallback((professional: Professional) => {
    if (!selectedShiftForAssignment) return;
    assignStaffMutation.mutate({
      shiftId: selectedShiftForAssignment.id,
      professional,
    });
  }, [selectedShiftForAssignment, assignStaffMutation]);

  // Check if event is part of a recurring series
  const isRecurringEvent = useCallback((event: CalendarEvent): boolean => {
    const shift = event.resource?.booking?.shift || event.resource?.booking?.job;
    return !!(shift?.isRecurring || shift?.recurringSeriesId);
  }, []);

  // Handle Smart Fill confirmation (used by SmartFillConfirmationModal)
  const handleSmartFillConfirm = useCallback(async () => {
    try {
      // Send invites for all matches with suggested candidates
      const matchesWithCandidates = smartMatches.filter((m) => m.suggestedCandidate !== null);
      
      for (const match of matchesWithCandidates) {
        if (match.suggestedCandidate) {
          await assignStaffMutation.mutateAsync({
            shiftId: match.shiftId,
            professional: {
              id: match.suggestedCandidate.id,
              name: match.suggestedCandidate.name,
              email: match.suggestedCandidate.email,
            },
          });
        }
      }
      
      toast({
        title: "Invites sent",
        description: `Sent ${matchesWithCandidates.length} invitation(s) to matched professionals`,
      });
      
      setShowSmartFillModal(false);
      setSmartMatches([]);
    } catch (error: any) {
      toast({
        title: "Failed to send invites",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    }
  }, [smartMatches, assignStaffMutation, toast]);

  // Handle event drop (drag-and-drop)
  const handleEventDrop = useCallback(
    ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      // Validate dates
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast({
          title: "Invalid time slot",
          description: "Please select a valid time slot",
          variant: "destructive",
        });
        return;
      }

      // Ensure end is after start
      const validEnd = end > start ? end : new Date(start.getTime() + 60 * 60 * 1000);

      // Check if this is a recurring shift
      if (isRecurringEvent(event)) {
        // Show dialog to ask user if they want to move this shift only or all future shifts
        setPendingRecurringAction({
          type: 'move',
          event,
          newStart: start,
          newEnd: validEnd,
        });
        setShowRecurringDialog(true);
        return;
      }

      // Non-recurring shift - proceed with update
      updateEventMutation.mutate({
        id: event.id,
        start,
        end: validEnd,
      });
    },
    [updateEventMutation, toast, isRecurringEvent]
  );

  // Handle event resize
  const handleEventResize = useCallback(
    ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
      // Validate dates
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast({
          title: "Invalid time slot",
          description: "Please select a valid time slot",
          variant: "destructive",
        });
        return;
      }

      // Ensure end is after start
      const validEnd = end > start ? end : new Date(start.getTime() + 60 * 60 * 1000);

      // Check if this is a recurring shift
      if (isRecurringEvent(event)) {
        // Show dialog to ask user if they want to resize this shift only or all future shifts
        setPendingRecurringAction({
          type: 'move',
          event,
          newStart: start,
          newEnd: validEnd,
        });
        setShowRecurringDialog(true);
        return;
      }

      // Non-recurring shift - proceed with update
      updateEventMutation.mutate({
        id: event.id,
        start,
        end: validEnd,
      });
    },
    [updateEventMutation, toast, isRecurringEvent]
  );

  // Handle recurring action confirmation
  const handleRecurringAction = useCallback(
    (applyToAll: boolean) => {
      if (!pendingRecurringAction) return;

      const { type, event, newStart, newEnd } = pendingRecurringAction;

      if (type === 'move' && newStart && newEnd) {
        // For now, we'll just update the single shift
        // In a full implementation, you'd need to:
        // 1. If applyToAll: Find all future shifts in the series and update them
        // 2. If !applyToAll: Just update this shift (and potentially break the series)
        updateEventMutation.mutate({
          id: event.id,
          start: newStart,
          end: newEnd,
        });
      } else if (type === 'delete') {
        // Handle delete - would need to implement delete mutation
        // For now, just show a message
        toast({
          title: "Delete recurring shift",
          description: applyToAll 
            ? "All future shifts in this series will be deleted"
            : "Only this shift will be deleted",
        });
      }

      setShowRecurringDialog(false);
      setPendingRecurringAction(null);
    },
    [pendingRecurringAction, updateEventMutation, toast]
  );

  const handleCreateEvent = () => {
    if (!selectedSlot) {
      // Fallback: use selectedDate if no slot selected
      if (!selectedDate) return;
      const startTime = new Date(selectedDate);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(selectedDate);
      endTime.setHours(17, 0, 0, 0);
      
      createEventMutation.mutate({
        title: newEventTitle || "New Event",
        start: startTime,
        end: endTime,
      });
      return;
    }

    // Validate slot dates
    if (isNaN(selectedSlot.start.getTime()) || isNaN(selectedSlot.end.getTime())) {
      toast({
        title: "Invalid time slot",
        description: "Please select a valid time slot",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate({
      title: newEventTitle || "New Event",
      start: selectedSlot.start,
      end: selectedSlot.end,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Sidebar - 25% */}
      <div className="w-full lg:w-1/4 space-y-4 bg-gradient-to-br from-slate-900/50 via-purple-900/20 to-blue-900/20 dark:from-slate-800/80 dark:via-purple-900/30 dark:to-blue-900/30 dark:border-slate-700/60 p-4 rounded-lg border border-slate-800/50">
        {/* Mini Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" data-testid="quick-navigation-title">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleMiniCalendarSelect}
              className="w-full"
              modifiersClassNames={{
                today: "font-semibold bg-accent",
              }}
            />
            {/* Quick Day Navigation */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, idx) => (
                  <div key={day} className="text-muted-foreground font-medium py-1">
                    {day}
                  </div>
                ))}
                {eachDayOfInterval({
                  start: startOfWeek(new Date(), { weekStartsOn: 0 }),
                  end: endOfWeek(new Date(), { weekStartsOn: 0 }),
                }).map((day, idx) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentDay = isSameDay(day, new Date());
                  return (
                    <button
                      key={idx}
                      onClick={() => handleMiniCalendarSelect(day)}
                      className={`
                        aspect-square rounded-md text-xs font-medium transition-colors
                        ${isSelected ? "bg-primary text-primary-foreground" : ""}
                        ${isCurrentDay && !isSelected ? "bg-accent text-accent-foreground border border-primary/20" : ""}
                        ${!isSelected && !isCurrentDay ? "hover:bg-accent" : ""}
                      `}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Availability/Shift Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={() => {
                if (mode === 'business' && onCreateShift) {
                  // Business mode: Open Create New Shift modal
                  onCreateShift();
                } else {
                  // Professional mode: Open Create Availability modal
                  const today = new Date();
                  setSelectedDate(today);
                  setSelectedSlot(null); // Clear slot selection for manual creation
                  setNewEventTitle("");
                  setShowCreateModal(true);
                }
              }}
              className="w-full"
              size="lg"
              data-testid={mode === 'business' ? "button-create-shift" : "button-create-availability"}
            >
              <Plus className="mr-2 h-4 w-4" />
              {mode === 'business' ? 'Create New Shift' : 'Create Availability'}
            </Button>
          </CardContent>
        </Card>

        {/* Empty State Message */}
        {!isLoading && filteredEvents.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  {mode === 'business' ? 'No shifts scheduled' : 'No shifts scheduled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mode === 'business' 
                    ? 'Create a new shift to get started' 
                    : 'Create availability to start booking shifts'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Job Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as JobStatus)}>
                <SelectTrigger>
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
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium">Legend</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-500"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-400"></div>
                  <span>Past</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar Area - 75% */}
      <div className="flex-1 lg:w-3/4" data-testid="calendar-main-area">
        <Card className="h-full flex flex-col bg-background">
          <CardHeader className="border-b bg-gradient-to-r from-background via-purple-50/5 to-blue-50/5 dark:from-background dark:via-purple-950/10 dark:to-blue-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl bg-gradient-to-r from-foreground via-purple-600 to-blue-600 dark:from-foreground dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent" data-testid="calendar-schedule-title">Schedule</CardTitle>
              <div className="flex items-center gap-2">
                {/* Smart Fill Button - Only show in business mode */}
                {mode === 'business' && (
                  <AutoFillButton
                    onClick={handleSmartFillClick}
                    isLoading={isCalculatingMatches}
                  />
                )}
                
                {/* View Switcher */}
                <div className="flex gap-1 border rounded-md p-1 bg-background/50 backdrop-blur-sm">
                  <Button
                    variant={view === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewChange("month")}
                    data-testid="button-view-month"
                  >
                    Month
                  </Button>
                  <Button
                    variant={view === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewChange("week")}
                    data-testid="button-view-week"
                  >
                    Week
                  </Button>
                  <Button
                    variant={view === "day" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewChange("day")}
                    data-testid="button-view-day"
                  >
                    Day
                  </Button>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("PREV")}
                    data-testid="button-nav-prev"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("TODAY")}
                    data-testid="button-nav-today"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("NEXT")}
                    data-testid="button-nav-next"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-hidden" style={{ minHeight: '650px', height: '100%' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full min-h-[600px]">
                <div className="text-muted-foreground">Loading calendar...</div>
              </div>
            ) : (
              <div 
                className="relative" 
                ref={calendarRef} 
                style={{ 
                  minHeight: view === 'month' ? '600px' : view === 'week' ? '700px' : '600px',
                  height: view === 'month' ? '600px' : view === 'week' ? '700px' : '600px',
                  width: '100%'
                }}
              >
                {/* Date Range Display */}
                {dateRange && (
                  <div className="mb-2 text-sm font-medium text-muted-foreground">
                    {view === "day" ? (
                      format(dateRange.start, "EEEE, MMMM d, yyyy")
                    ) : view === "week" ? (
                      `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
                    ) : view === "month" ? (
                      format(currentDate, "MMMM yyyy")
                    ) : null}
                  </div>
                )}
                
                {/* Calendar component - filteredEvents is always an array due to defensive coding */}
                {/* Ensure events is always a valid array for react-big-calendar */}
                {(() => {
                  console.log('[CALENDAR RENDER] Starting Calendar render function');
                  console.log('[CALENDAR RENDER] isLoading:', isLoading);
                  console.log('[CALENDAR RENDER] filteredEvents count:', Array.isArray(filteredEvents) ? filteredEvents.length : 'not array');
                  try {
                    // Comprehensive prop validation
                    const safeEvents = Array.isArray(filteredEvents) ? filteredEvents : [];
                    
                    // Validate localizer
                    if (!localizer) {
                      console.error('[CALENDAR ERROR] Localizer not initialized - Calendar cannot render');
                      return (
                        <div className="flex items-center justify-center h-full min-h-[600px]" data-testid="calendar-error-localizer">
                          <div className="text-muted-foreground">Calendar initialization error: Localizer not initialized. Check console for details.</div>
                        </div>
                      );
                    }
                    
                    // Validate moment.js
                    if (!moment || typeof moment !== 'function') {
                      console.error('[CALENDAR ERROR] Moment.js not available:', typeof moment);
                      return (
                        <div className="flex items-center justify-center h-full min-h-[600px]" data-testid="calendar-error-moment">
                          <div className="text-muted-foreground">Calendar initialization error: Moment.js not available</div>
                        </div>
                      );
                    }
                    
                    // Validate currentDate
                    if (!currentDate || !(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
                      console.error('[CALENDAR ERROR] Invalid currentDate:', currentDate);
                      return (
                        <div className="flex items-center justify-center h-full min-h-[600px]" data-testid="calendar-error-date">
                          <div className="text-muted-foreground">Calendar initialization error: Invalid date</div>
                        </div>
                      );
                    }
                    
                    // Validate view
                    const validViews: View[] = ['month', 'week', 'day', 'agenda'];
                    if (!validViews.includes(view)) {
                      console.error('[CALENDAR ERROR] Invalid view:', view);
                      return (
                        <div className="flex items-center justify-center h-full min-h-[600px]" data-testid="calendar-error-view">
                          <div className="text-muted-foreground">Calendar initialization error: Invalid view</div>
                        </div>
                      );
                    }
                    
                    // Validate events structure
                    const invalidEvents = safeEvents.filter((event: any) => {
                      return !event || 
                             !(event.start instanceof Date) || 
                             !(event.end instanceof Date) ||
                             isNaN(event.start.getTime()) ||
                             isNaN(event.end.getTime());
                    });
                    
                    if (invalidEvents.length > 0) {
                      console.warn('[CALENDAR WARNING] Found invalid events:', invalidEvents.length);
                    }
                    
                    // Log prop validation success
                    console.log('[CALENDAR DEBUG] Props validated:', {
                      eventsCount: safeEvents.length,
                      localizerType: typeof localizer,
                      momentType: typeof moment,
                      currentDate: currentDate.toISOString(),
                      view: view
                    });
                    
                    // Calculate height based on view for stable rendering
                    const calendarHeight = view === 'month' ? 600 : view === 'week' ? 700 : 600;
                    
                    // Render Calendar with error boundary
                    return (
                      <div 
                        data-testid="react-big-calendar-container" 
                        style={{ 
                          height: `${calendarHeight}px`, 
                          minHeight: `${calendarHeight}px`,
                          width: '100%',
                          position: 'relative'
                        }}
                      >
                        <CalendarErrorBoundary>
                          <Calendar
                            localizer={localizer}
                            events={safeEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ 
                              height: `${calendarHeight}px`, 
                              minHeight: `${calendarHeight}px`,
                              width: '100%'
                            }}
                            view={view}
                            onView={handleViewChange}
                            date={currentDate}
                            onNavigate={handleNavigate}
                            onSelectEvent={handleSelectEvent}
                            onSelectSlot={handleSelectSlot}
                            onEventDrop={handleEventDrop}
                            onEventResize={handleEventResize}
                            selectable
                            resizable
                            draggableAccessor={(event: CalendarEvent) => {
                              // Allow dragging only if event is not in the past
                              const now = new Date();
                              return event.end >= now;
                            }}
                            eventPropGetter={eventStyleGetter}
                            min={new Date(2020, 0, 1, 0, 0, 0)}
                            max={new Date(2030, 11, 31, 23, 59, 59)}
                            components={{
                              toolbar: customToolbar,
                              header: customHeader,
                              event: ({ event }: { event: CalendarEvent }) => {
                                // Use ShiftBlock for business mode, default rendering for professional mode
                                if (mode === 'business') {
                                  const shift = event.resource?.booking?.shift || event.resource?.booking?.job;
                                  const isRecurring = shift?.isRecurring || shift?.recurringSeriesId;
                                  return (
                                    <ShiftBlock
                                      event={event}
                                      onClick={() => handleSelectEvent(event)}
                                      isRecurring={isRecurring}
                                    />
                                  );
                                }
                                // Default event rendering for professional mode
                                return (
                                  <div className="rbc-event-content">
                                    {event.title}
                                  </div>
                                );
                              },
                            }}
                            formats={{
                              dayFormat: (date: Date, culture?: string, localizer?: any) => {
                                try {
                                  // Use moment format for week/day view headers: "Mon 12/10"
                                  return moment(date).format("ddd D/M");
                                } catch (e) {
                                  console.error('[CALENDAR ERROR] dayFormat error:', e);
                                  return format(date, "EEE M/d");
                                }
                              },
                              weekdayFormat: (date: Date, culture?: string, localizer?: any) => {
                                try {
                                  // Format for month view weekday headers: "Mon"
                                  return moment(date).format("ddd");
                                } catch (e) {
                                  console.error('[CALENDAR ERROR] weekdayFormat error:', e);
                                  return format(date, "EEE");
                                }
                              },
                              dayHeaderFormat: (date: Date, culture?: string, localizer?: any) => {
                                try {
                                  // Week view day headers: "Mon 12/10"
                                  return moment(date).format("ddd D/M");
                                } catch (e) {
                                  console.error('[CALENDAR ERROR] dayHeaderFormat error:', e);
                                  return format(date, "EEE M/d");
                                }
                              },
                              dayRangeHeaderFormat: ({ start, end }) => {
                                try {
                                  return `${moment(start).format("MMM D")} - ${moment(end).format("MMM D, YYYY")}`;
                                } catch (e) {
                                  console.error('[CALENDAR ERROR] dayRangeHeaderFormat error:', e);
                                  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
                                }
                              },
                              monthHeaderFormat: "MMMM yyyy",
                              timeGutterFormat: "h:mm a",
                              eventTimeRangeFormat: ({ start, end }) => {
                                try {
                                  return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
                                } catch (e) {
                                  console.error('[CALENDAR ERROR] eventTimeRangeFormat error:', e);
                                  return `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
                                }
                              },
                            }}
                          />
                        </CalendarErrorBoundary>
                      </div>
                    );
                  } catch (error) {
                    console.error('[CALENDAR ERROR] Fatal error rendering Calendar component:', error);
                    console.error('[CALENDAR ERROR] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
                    return (
                      <div className="flex items-center justify-center h-full min-h-[600px]" data-testid="calendar-error-fatal">
                        <div className="text-muted-foreground">
                          Error loading calendar: {error instanceof Error ? error.message : String(error)}
                        </div>
                      </div>
                    );
                  }
                })()}
                {/* Current Time Indicator - only show in week/day view */}
                {view === "week" || view === "day" ? (
                  <CurrentTimeIndicator
                    currentTime={currentTime}
                    view={view}
                    currentDate={currentDate}
                  />
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Details Sheet */}
      <Sheet open={showEventDetails} onOpenChange={setShowEventDetails}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedEvent?.title || "Event Details"}</SheetTitle>
            <SheetDescription>
              {selectedEvent && (
                <Badge
                  className={
                    selectedEvent.resource.status === "confirmed"
                      ? "bg-green-600"
                      : selectedEvent.resource.status === "pending"
                      ? "bg-blue-600"
                      : "bg-gray-600"
                  }
                >
                  {selectedEvent.resource.status.charAt(0).toUpperCase() +
                    selectedEvent.resource.status.slice(1)}
                </Badge>
              )}
            </SheetDescription>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(selectedEvent.start, "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(selectedEvent.start, "h:mm a")} -{" "}
                  {format(selectedEvent.end, "h:mm a")}
                </span>
              </div>
              {(selectedEvent.resource.booking.job?.address ||
                selectedEvent.resource.booking.shift?.location) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedEvent.resource.booking.job?.address ||
                      selectedEvent.resource.booking.shift?.location}
                  </span>
                </div>
              )}
              {(selectedEvent.resource.booking.job?.payRate ||
                selectedEvent.resource.booking.shift?.hourlyRate) && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    $
                    {selectedEvent.resource.booking.job?.payRate ||
                      selectedEvent.resource.booking.shift?.hourlyRate}
                    /{selectedEvent.resource.booking.job?.payType || "hour"}
                  </span>
                </div>
              )}
              {selectedEvent.resource.booking.job?.description && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.resource.booking.job.description}
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                {selectedEvent.resource.booking.job?.hubId && (
                  <StartChatButton
                    otherUserId={selectedEvent.resource.booking.job.hubId}
                    otherUserName="Employer"
                    otherUserRole="hub"
                    variant="outline"
                    className="flex-1"
                  />
                )}
                <Button variant="outline" className="flex-1">
                  View Details
                </Button>
                {mode === 'business' && isRecurringEvent(selectedEvent) && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setPendingRecurringAction({
                        type: 'delete',
                        event: selectedEvent,
                      });
                      setShowRecurringDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              {mode === 'business' && isRecurringEvent(selectedEvent) && (
                <div className="pt-2 border-t flex items-center gap-2 text-sm text-muted-foreground">
                  <Repeat className="h-4 w-4" />
                  <span>This is part of a recurring series</span>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Recurring Shift Action Dialog */}
      <AlertDialog open={showRecurringDialog} onOpenChange={setShowRecurringDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recurring Shift</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRecurringAction?.type === 'delete'
                ? "This shift is part of a recurring series. What would you like to do?"
                : "This shift is part of a recurring series. Would you like to apply this change to all future shifts?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRecurringDialog(false);
              setPendingRecurringAction(null);
            }}>
              Cancel
            </AlertDialogCancel>
            {pendingRecurringAction?.type === 'delete' ? (
              <>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => handleRecurringAction(false)}
                >
                  This Shift Only
                </AlertDialogAction>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => handleRecurringAction(true)}
                >
                  All Future Shifts
                </AlertDialogAction>
              </>
            ) : (
              <>
                <AlertDialogAction onClick={() => handleRecurringAction(false)}>
                  This Shift Only
                </AlertDialogAction>
                <AlertDialogAction onClick={() => handleRecurringAction(true)}>
                  All Future Shifts
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Event Creation Modal */}
      <Sheet open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          // Reset form when closing
          setSelectedSlot(null);
          setNewEventTitle("");
        }
      }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create New Event</SheetTitle>
            <SheetDescription>
              {selectedSlot ? (
                <>
                  Create an event from {format(selectedSlot.start, "MMM d, h:mm a")} to {format(selectedSlot.end, "h:mm a")}
                </>
              ) : selectedDate ? (
                <>Create an event for {format(selectedDate, "MMMM d, yyyy")}</>
              ) : (
                "Create a new event"
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                placeholder="Enter event title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateEvent();
                  }
                }}
                autoFocus
              />
            </div>
            
            {selectedSlot && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(selectedSlot.start, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSlot(null);
                  setNewEventTitle("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEvent}
                disabled={createEventMutation.isPending}
                className="flex-1"
              >
                {createEventMutation.isPending
                  ? "Creating..."
                  : "Create Event"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Assign Staff Modal */}
      {mode === 'business' && selectedShiftForAssignment && (
        <AssignStaffModal
          isOpen={showAssignStaffModal}
          onClose={() => {
            setShowAssignStaffModal(false);
            setSelectedShiftForAssignment(null);
          }}
          onAssign={handleAssignStaff}
          shiftTitle={selectedShiftForAssignment.title}
          shiftDate={selectedShiftForAssignment.start}
        />
      )}

      {/* Smart Fill Confirmation Modal */}
      {mode === 'business' && (
        <SmartFillConfirmationModal
          open={showSmartFillModal}
          onOpenChange={setShowSmartFillModal}
          matches={smartMatches}
          onConfirm={handleSendInvites}
          isLoading={isCalculatingMatches}
        />
      )}
    </div>
  );
}

