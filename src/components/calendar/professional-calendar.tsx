import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Calendar, momentLocalizer, View, Event } from "react-big-calendar";
import moment from "moment";
import { format, isPast, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  DollarSign,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StartChatButton from "@/components/messaging/start-chat-button";

// Import react-big-calendar CSS
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

// Extend Event type to include our custom properties
interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    booking: any;
    status: "confirmed" | "pending" | "completed" | "past";
    type: "job" | "shift";
  };
}

interface ProfessionalCalendarProps {
  bookings?: any[] | null;
  isLoading?: boolean;
  onDateSelect?: (date: Date) => void;
}

type JobStatus = "all" | "pending" | "confirmed" | "completed";

// Current Time Indicator Component
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
        <div className="w-14 text-xs text-primary font-medium pr-2 text-right bg-background/80">
          {format(currentTime, "h:mm a")}
        </div>
        <div className="flex-1 relative">
          <div className="h-0.5 bg-primary relative">
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
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
}: ProfessionalCalendarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [statusFilter, setStatusFilter] = useState<JobStatus>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeIndicatorRef = useRef<HTMLDivElement>(null);

  // Update current time every minute for time indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
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

            // Determine status
            let status: "confirmed" | "pending" | "completed" | "past";
            if (isPast(endDate) && !isToday(endDate)) {
              status = "past";
            } else if (booking.status === "accepted" || booking.status === "confirmed") {
              status = "confirmed";
            } else if (booking.status === "completed") {
              status = "completed";
            } else {
              status = "pending";
            }

            return {
              id: booking.id || job.id || `event-${Date.now()}-${Math.random()}`,
              title: job.title || "Untitled Job",
              start: startDate,
              end: endDate,
              resource: {
                booking,
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

  // Event style getter
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      // Defensive check: ensure event and resource exist
      if (!event || !event.resource) {
        return {
          style: {
            backgroundColor: "#6b7280",
            borderColor: "#4b5563",
            color: "#fff",
            borderRadius: "4px",
            border: "1px solid #4b5563",
            padding: "2px 4px",
          },
        };
      }

      let backgroundColor = "";
      let borderColor = "";
      let color = "#fff";

      const status = event.resource.status || "pending";
      switch (status) {
        case "confirmed":
          backgroundColor = "#22c55e"; // green-500
          borderColor = "#16a34a"; // green-600
          break;
        case "pending":
          backgroundColor = "#3b82f6"; // blue-500
          borderColor = "#2563eb"; // blue-600
          break;
        case "completed":
          backgroundColor = "#6b7280"; // gray-500
          borderColor = "#4b5563"; // gray-600
          break;
        case "past":
          backgroundColor = "#9ca3af"; // gray-400
          borderColor = "#6b7280"; // gray-500
          color = "#1f2937"; // gray-800
          break;
        default:
          backgroundColor = "#6b7280";
          borderColor = "#4b5563";
      }

      return {
        style: {
          backgroundColor,
          borderColor,
          color,
          borderRadius: "4px",
          border: `1px solid ${borderColor}`,
          padding: "2px 4px",
        },
      };
    },
    []
  );

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    // Defensive check: ensure event exists
    if (!event) return;
    setSelectedEvent(event);
    setShowEventDetails(true);
  }, []);

  // Handle slot click (for adding availability)
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      // Defensive check: ensure start date is valid
      if (!start || isNaN(start.getTime())) return;
      setSelectedDate(start);
      setShowCreateModal(true);
      if (onDateSelect) {
        onDateSelect(start);
      }
    },
    [onDateSelect]
  );

  // Handle date change from mini calendar
  const handleMiniCalendarSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setSelectedDate(date);
    }
  }, []);

  // Navigate calendar
  const navigate = useCallback((action: "PREV" | "NEXT" | "TODAY") => {
    if (action === "TODAY") {
      setCurrentDate(new Date());
      return;
    }

    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(
        action === "PREV" ? newDate.getMonth() - 1 : newDate.getMonth() + 1
      );
    } else if (view === "week") {
      newDate.setDate(action === "PREV" ? newDate.getDate() - 7 : newDate.getDate() + 7);
    } else if (view === "day") {
      newDate.setDate(action === "PREV" ? newDate.getDate() - 1 : newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, view]);

  // Get week range for date range display
  const weekRange = useMemo(() => {
    if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start: weekStart, end: weekEnd };
    }
    return null;
  }, [currentDate, view]);

  // Custom toolbar component (returns null to hide default toolbar)
  const customToolbar = useCallback(() => null, []);
  
  // Custom header component to add current day styling
  const customHeader = useCallback(
    ({ date, localizer, label }: { date: Date; localizer: any; label: string }) => {
      const isCurrentDay = isSameDay(date, new Date());
      // Split the label (format: "EEE M/d" like "Mon 9/12")
      const parts = label.split(" ");
      return (
        <div
          className={`rbc-header ${isCurrentDay ? "rbc-header-today" : ""}`}
        >
          {parts.length > 1 ? (
            <>
              <div className="font-semibold">{parts[0]}</div>
              <div className="text-sm text-muted-foreground">{parts.slice(1).join(" ")}</div>
            </>
          ) : (
            label
          )}
        </div>
      );
    },
    []
  );

  // Create availability mutation (placeholder - adjust based on your API)
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: { date: Date; startTime: string; endTime: string }) => {
      // This is a placeholder - adjust based on your actual API endpoint
      const response = await apiRequest("POST", "/api/availability", {
        date: data.date.toISOString(),
        startTime: data.startTime,
        endTime: data.endTime,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Availability created",
        description: "Your availability has been added successfully",
      });
      setShowCreateModal(false);
    },
    onError: () => {
      toast({
        title: "Failed to create availability",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleCreateAvailability = () => {
    if (!selectedDate) return;
    // For now, create a default 8-hour availability window
    const startTime = new Date(selectedDate);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(selectedDate);
    endTime.setHours(17, 0, 0, 0);

    createAvailabilityMutation.mutate({
      date: selectedDate,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Sidebar - 25% */}
      <div className="w-full lg:w-1/4 space-y-4">
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

        {/* Create Availability Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={() => {
                setSelectedDate(new Date());
                setShowCreateModal(true);
              }}
              className="w-full"
              size="lg"
              data-testid="button-create-availability"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Availability/Shift
            </Button>
          </CardContent>
        </Card>

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
        <Card className="h-full flex flex-col">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl" data-testid="calendar-schedule-title">Schedule</CardTitle>
              <div className="flex items-center gap-2">
                {/* View Switcher */}
                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    variant={view === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView("month")}
                  >
                    Month
                  </Button>
                  <Button
                    variant={view === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView("week")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={view === "day" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView("day")}
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
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("TODAY")}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("NEXT")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading calendar...</div>
              </div>
            ) : (
              <div className="h-full min-h-[600px] relative" ref={calendarRef}>
                {/* Date Range Display */}
                {weekRange && (
                  <div className="mb-2 text-sm font-medium text-muted-foreground">
                    {format(weekRange.start, "MMM d")} - {format(weekRange.end, "MMM d, yyyy")}
                  </div>
                )}
                {/* Calendar component - filteredEvents is always an array due to defensive coding */}
                {/* Ensure events is always a valid array for react-big-calendar */}
                {(() => {
                  try {
                    const safeEvents = Array.isArray(filteredEvents) ? filteredEvents : [];
                    return (
                      <Calendar
                        localizer={localizer}
                        events={safeEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: "100%" }}
                        view={view}
                        onView={setView}
                        date={currentDate}
                        onNavigate={setCurrentDate}
                        onSelectEvent={handleSelectEvent}
                        onSelectSlot={handleSelectSlot}
                        selectable
                        eventPropGetter={eventStyleGetter}
                        components={{
                          toolbar: customToolbar,
                          header: customHeader,
                        }}
                        formats={{
                          dayFormat: "EEE",
                          dayHeaderFormat: (date: Date, culture?: string, localizer?: any) => {
                            // This is used for week view column headers
                            return format(date, "EEE M/d");
                          },
                          dayRangeHeaderFormat: ({ start, end }) =>
                            `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
                          monthHeaderFormat: "MMMM yyyy",
                          timeGutterFormat: "h:mm a",
                          eventTimeRangeFormat: ({ start, end }) =>
                            `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
                        }}
                      />
                    );
                  } catch (error) {
                    console.error('Error rendering Calendar component:', error);
                    return (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-muted-foreground">Error loading calendar. Please refresh the page.</div>
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
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Availability Modal */}
      <Sheet open={showCreateModal} onOpenChange={setShowCreateModal}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Availability</SheetTitle>
            <SheetDescription>
              Set your availability for {selectedDate && format(selectedDate, "MMMM d, yyyy")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature allows you to mark when you're available for shifts. Employers can
              see your availability and offer you shifts during those times.
            </p>
            <Button
              onClick={handleCreateAvailability}
              disabled={createAvailabilityMutation.isPending}
              className="w-full"
            >
              {createAvailabilityMutation.isPending
                ? "Creating..."
                : "Create Availability"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

