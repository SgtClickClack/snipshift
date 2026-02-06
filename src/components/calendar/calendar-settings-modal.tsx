import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, Save, Sun, Sunset, Moon, Calendar, Trash2, Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clearAllShifts } from "@/lib/api/venue";
import { getCalendarInvalidationKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

export type ShiftPattern = 'full-day' | 'half-day' | 'thirds' | 'custom';

export interface OpeningHours {
  [key: string]: {
    open: string;
    close: string;
    enabled: boolean;
  };
}

/** Custom shift slot for the 'custom' pattern */
export interface CustomShiftSlot {
  id?: string;
  clientId?: string; // For new slots before save
  label: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
}

export interface CalendarSettings {
  openingHours: OpeningHours;
  shiftPattern: ShiftPattern;
  defaultShiftLength?: number; // in hours, for custom pattern
  /** Required staff count for preset patterns (full-day, half-day, thirds) */
  defaultRequiredStaff?: number;
  /** Custom shift slots for 'custom' pattern */
  customSlots?: CustomShiftSlot[];
}

/** API response type for shift templates */
interface ShiftTemplateApi {
  id: string;
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredStaffCount: number;
  label: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: CalendarSettings) => void;
  initialSettings?: CalendarSettings;
  onClear?: () => void; // Optional callback when schedule is cleared
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon', fullLabel: 'Monday' },
  { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
  { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
  { key: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
  { key: 'friday', label: 'Fri', fullLabel: 'Friday' },
  { key: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
  { key: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
];

const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: '09:00', close: '18:00', enabled: true },
  tuesday: { open: '09:00', close: '18:00', enabled: true },
  wednesday: { open: '09:00', close: '18:00', enabled: true },
  thursday: { open: '09:00', close: '18:00', enabled: true },
  friday: { open: '09:00', close: '18:00', enabled: true },
  saturday: { open: '09:00', close: '17:00', enabled: true },
  sunday: { open: '09:00', close: '17:00', enabled: false },
};

const SHIFT_PATTERNS = [
  {
    value: 'full-day' as ShiftPattern,
    label: 'Full Day',
    icon: Calendar,
    description: '1 shift per day',
    example: '9am – 6pm',
  },
  {
    value: 'half-day' as ShiftPattern,
    label: 'Half Day',
    icon: Sun,
    description: '2 shifts per day',
    example: '9am–1:30pm, 1:30pm–6pm',
  },
  {
    value: 'thirds' as ShiftPattern,
    label: 'Thirds',
    icon: Sunset,
    description: '3 shifts per day',
    example: '9am–12pm, 12pm–3pm, 3pm–6pm',
  },
  {
    value: 'custom' as ShiftPattern,
    label: 'Custom',
    icon: Moon,
    description: 'Set your own length',
    example: 'e.g. 4-hour shifts',
  },
];

/** Slot Preview Component - Shows preview of generated shift templates */
function SlotPreview({
  pattern,
  openingHours,
  defaultRequiredStaff,
  customSlots,
  formatTime,
}: {
  pattern: ShiftPattern;
  openingHours: OpeningHours;
  defaultRequiredStaff: number;
  customSlots: CustomShiftSlot[];
  formatTime: (time: string) => string;
}) {
  // Calculate enabled days count
  const enabledDays = DAYS_OF_WEEK.filter(d => openingHours[d.key]?.enabled);
  
  if (enabledDays.length === 0) {
    return null;
  }

  // Get first enabled day for example preview
  const exampleDay = enabledDays[0];
  const dayHours = openingHours[exampleDay.key];
  
  // Generate preview slots based on pattern
  const previewSlots: Array<{ label: string; time: string; staff: number }> = [];
  
  if (pattern === 'custom') {
    customSlots.forEach(slot => {
      previewSlots.push({
        label: slot.label || 'Shift',
        time: `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`,
        staff: slot.requiredStaff,
      });
    });
  } else {
    const openMinutes = timeToMinutesHelper(dayHours.open);
    const closeMinutes = timeToMinutesHelper(dayHours.close);
    const totalMinutes = closeMinutes - openMinutes;
    
    if (totalMinutes > 0) {
      let slotCount = 1;
      let slotLabels = ['Full Day'];
      
      switch (pattern) {
        case 'full-day':
          slotCount = 1;
          slotLabels = ['Full Day'];
          break;
        case 'half-day':
          slotCount = 2;
          slotLabels = ['Morning', 'Afternoon'];
          break;
        case 'thirds':
          slotCount = 3;
          slotLabels = ['Morning', 'Midday', 'Evening'];
          break;
      }
      
      const slotDuration = Math.floor(totalMinutes / slotCount);
      
      for (let i = 0; i < slotCount; i++) {
        const slotStart = openMinutes + (i * slotDuration);
        const slotEnd = i === slotCount - 1 ? closeMinutes : slotStart + slotDuration;
        
        previewSlots.push({
          label: slotLabels[i] || `Shift ${i + 1}`,
          time: `${formatTime(minutesToTimeHelper(slotStart))} – ${formatTime(minutesToTimeHelper(slotEnd))}`,
          staff: defaultRequiredStaff,
        });
      }
    }
  }

  if (previewSlots.length === 0) {
    return null;
  }

  // Calculate total staff needed per day
  const totalStaffPerDay = previewSlots.reduce((sum, slot) => sum + slot.staff, 0);
  
  return (
    <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg" data-testid="slot-preview">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">Preview: Daily Capacity</span>
      </div>
      
      <div className="space-y-1.5">
        {previewSlots.map((slot, i) => (
          <div 
            key={`preview-${i}`} 
            className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1.5"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{slot.label}</span>
              <span className="text-muted-foreground">{slot.time}</span>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Users className="h-3 w-3" />
              <span className="font-medium">{slot.staff} staff</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-2 pt-2 border-t border-primary/20 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {enabledDays.length} day{enabledDays.length !== 1 ? 's' : ''} enabled
        </span>
        <span className="font-medium text-primary">
          {totalStaffPerDay} total staff/day × {enabledDays.length} days = {totalStaffPerDay * enabledDays.length} shifts/week
        </span>
      </div>
    </div>
  );
}

/** Helper: Convert time string (HH:mm) to minutes since midnight */
function timeToMinutesHelper(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Helper: Convert minutes since midnight to time string (HH:mm) */
function minutesToTimeHelper(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function CalendarSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  onClear,
}: CalendarSettingsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    initialSettings?.openingHours || DEFAULT_OPENING_HOURS
  );
  const [shiftPattern, setShiftPattern] = useState<ShiftPattern>(
    initialSettings?.shiftPattern || 'thirds'
  );
  const [defaultShiftLength, setDefaultShiftLength] = useState<number>(
    initialSettings?.defaultShiftLength || 4
  );
  const [isClearing, setIsClearing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Required staff count for preset patterns (full-day, half-day, thirds)
  const [defaultRequiredStaff, setDefaultRequiredStaff] = useState<number>(
    initialSettings?.defaultRequiredStaff || 1
  );
  
  // Custom shift slots for 'custom' pattern
  const [customSlots, setCustomSlots] = useState<CustomShiftSlot[]>(
    initialSettings?.customSlots || []
  );
  
  // Global hours for "Apply to All" feature
  const [globalOpen, setGlobalOpen] = useState('09:00');
  const [globalClose, setGlobalClose] = useState('18:00');
  
  // Fetch existing shift templates to pre-populate custom slots
  const { data: existingTemplates = [] } = useQuery<ShiftTemplateApi[]>({
    queryKey: ['shift-templates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/shift-templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
    enabled: !!user?.id && isOpen,
  });

  // Reset form when modal opens with initial settings
  useEffect(() => {
    if (isOpen && initialSettings) {
      setOpeningHours(initialSettings.openingHours);
      setShiftPattern(initialSettings.shiftPattern);
      setDefaultShiftLength(initialSettings.defaultShiftLength || 4);
      setDefaultRequiredStaff(initialSettings.defaultRequiredStaff || 1);
      setCustomSlots(initialSettings.customSlots || []);
      
      // Set global hours from first enabled day
      const firstEnabled = Object.values(initialSettings.openingHours).find(h => h.enabled);
      if (firstEnabled) {
        setGlobalOpen(firstEnabled.open);
        setGlobalClose(firstEnabled.close);
      }
    }
  }, [isOpen, initialSettings]);
  
  // Sync custom slots from existing templates when they load (for 'custom' pattern)
  useEffect(() => {
    if (isOpen && existingTemplates.length > 0 && shiftPattern === 'custom' && customSlots.length === 0) {
      // Convert templates to CustomShiftSlot format (group by unique slot, not day)
      // Templates are per-day, but for modal UI we show one entry per unique slot definition
      const uniqueSlots = new Map<string, CustomShiftSlot>();
      for (const t of existingTemplates) {
        const key = `${t.label}-${t.startTime}-${t.endTime}`;
        if (!uniqueSlots.has(key)) {
          uniqueSlots.set(key, {
            id: t.id,
            label: t.label,
            startTime: t.startTime,
            endTime: t.endTime,
            requiredStaff: t.requiredStaffCount,
          });
        }
      }
      if (uniqueSlots.size > 0) {
        setCustomSlots(Array.from(uniqueSlots.values()));
      }
    }
  }, [isOpen, existingTemplates, shiftPattern, customSlots.length]);
  
  // Custom slot management functions
  const addCustomSlot = () => {
    setCustomSlots(prev => [
      ...prev,
      {
        clientId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label: 'Shift',
        startTime: globalOpen,
        endTime: globalClose,
        requiredStaff: 1,
      },
    ]);
  };
  
  const updateCustomSlot = (index: number, updates: Partial<CustomShiftSlot>) => {
    setCustomSlots(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };
  
  const removeCustomSlot = (index: number) => {
    setCustomSlots(prev => prev.filter((_, i) => i !== index));
  };

  const handleDayToggle = (day: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  const handleApplyToAll = () => {
    const updated: OpeningHours = { ...openingHours };
    DAYS_OF_WEEK.forEach(day => {
      updated[day.key] = {
        open: globalOpen,
        close: globalClose,
        enabled: updated[day.key]?.enabled ?? true,
      };
    });
    setOpeningHours(updated);
    toast({
      title: "Hours applied",
      description: `${globalOpen} – ${globalClose} applied to all open days.`,
    });
  };

  const handleClearSchedule = async () => {
    setIsClearing(true);
    try {
      const result = await clearAllShifts();
      
      // Show detailed result to user
      const successMessage = result.count > 0
        ? `Successfully deleted ${result.shiftsDeleted || 0} shift(s) and ${result.jobsDeleted || 0} job(s).`
        : "No shifts or jobs found to delete.";
      
      toast({
        title: "Schedule cleared",
        description: successMessage,
      });
      
      // Invalidate and refetch all calendar-related queries using standardized keys
      // Use refetchType: 'all' to ensure data is refetched immediately
      await Promise.all(
        getCalendarInvalidationKeys().map(key =>
          queryClient.invalidateQueries({ queryKey: [key], refetchType: 'all' })
        )
      );
      
      // Force a small delay to ensure refetch completes before UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Notify parent component that clear completed (for clearing optimistic state)
      if (onClear) {
        onClear();
      }
    } catch (error: any) {
      toast({
        title: "Failed to clear schedule",
        description: error?.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  /** Generate shift slots based on pattern and opening hours */
  const generateSlotsFromPattern = (
    pattern: ShiftPattern,
    hours: OpeningHours,
    requiredStaff: number,
    _shiftLength?: number
  ): Array<{ dayOfWeek: number; startTime: string; endTime: string; requiredStaffCount: number; label: string }> => {
    const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string; requiredStaffCount: number; label: string }> = [];
    
    // Map day keys to dayOfWeek numbers (0=Sun, 1=Mon, etc.)
    const dayMapping: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    
    for (const day of DAYS_OF_WEEK) {
      const dayHours = hours[day.key];
      if (!dayHours?.enabled) continue;
      
      const dayOfWeek = dayMapping[day.key];
      const openMinutes = timeToMinutes(dayHours.open);
      const closeMinutes = timeToMinutes(dayHours.close);
      const totalMinutes = closeMinutes - openMinutes;
      
      if (totalMinutes <= 0) continue;
      
      let slotCount = 1;
      let slotLabels = ['Full Day'];
      
      switch (pattern) {
        case 'full-day':
          slotCount = 1;
          slotLabels = ['Full Day'];
          break;
        case 'half-day':
          slotCount = 2;
          slotLabels = ['Morning', 'Afternoon'];
          break;
        case 'thirds':
          slotCount = 3;
          slotLabels = ['Morning', 'Midday', 'Evening'];
          break;
        case 'custom':
          // For custom, we use the customSlots directly
          continue;
        default:
          slotCount = 1;
      }
      
      const slotDuration = Math.floor(totalMinutes / slotCount);
      
      for (let i = 0; i < slotCount; i++) {
        const slotStart = openMinutes + (i * slotDuration);
        const slotEnd = i === slotCount - 1 ? closeMinutes : slotStart + slotDuration;
        
        slots.push({
          dayOfWeek,
          startTime: minutesToTime(slotStart),
          endTime: minutesToTime(slotEnd),
          requiredStaffCount: requiredStaff,
          label: slotLabels[i] || `Shift ${i + 1}`,
        });
      }
    }
    
    return slots;
  };
  
  /** Convert time string (HH:mm) to minutes since midnight */
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  /** Convert minutes since midnight to time string (HH:mm) */
  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    // Ensure all days are present in openingHours before validation
    const completeOpeningHours: OpeningHours = {
      monday: openingHours.monday || { open: '09:00', close: '18:00', enabled: false },
      tuesday: openingHours.tuesday || { open: '09:00', close: '18:00', enabled: false },
      wednesday: openingHours.wednesday || { open: '09:00', close: '18:00', enabled: false },
      thursday: openingHours.thursday || { open: '09:00', close: '18:00', enabled: false },
      friday: openingHours.friday || { open: '09:00', close: '18:00', enabled: false },
      saturday: openingHours.saturday || { open: '09:00', close: '17:00', enabled: false },
      sunday: openingHours.sunday || { open: '09:00', close: '17:00', enabled: false },
    };
    
    // Validate that enabled days have valid times
    const invalidDays = DAYS_OF_WEEK.filter(day => {
      const hours = completeOpeningHours[day.key];
      if (!hours || !hours.enabled) return false;
      if (!hours.open || !hours.close) return true;
      const openTime = new Date(`2000-01-01T${hours.open}`);
      const closeTime = new Date(`2000-01-01T${hours.close}`);
      return isNaN(openTime.getTime()) || isNaN(closeTime.getTime()) || closeTime <= openTime;
    });

    if (invalidDays.length > 0) {
      toast({
        title: "Invalid hours",
        description: `Please check opening hours for: ${invalidDays.map(d => d.fullLabel).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate custom slots if using custom pattern
    if (shiftPattern === 'custom' && customSlots.length === 0) {
      toast({
        title: "No shift slots defined",
        description: "Please add at least one shift slot for the custom pattern.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Generate shift templates based on pattern
      let templatesToSave: Array<{ dayOfWeek: number; startTime: string; endTime: string; requiredStaffCount: number; label: string }> = [];
      
      if (shiftPattern === 'custom') {
        // For custom pattern, create templates for each enabled day using customSlots
        const dayMapping: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6,
        };
        
        for (const day of DAYS_OF_WEEK) {
          const dayHours = completeOpeningHours[day.key];
          if (!dayHours?.enabled) continue;
          
          for (const slot of customSlots) {
            templatesToSave.push({
              dayOfWeek: dayMapping[day.key],
              startTime: slot.startTime,
              endTime: slot.endTime,
              requiredStaffCount: slot.requiredStaff,
              label: slot.label.trim() || 'Shift',
            });
          }
        }
      } else {
        // For preset patterns (full-day, half-day, thirds)
        templatesToSave = generateSlotsFromPattern(
          shiftPattern,
          completeOpeningHours,
          defaultRequiredStaff
        );
      }
      
      // PERFORMANCE: Single API call with transactional bulk sync
      // Replaces N+1 DELETE/POST pattern with atomic server-side operation
      // Reduces save time from ~5s to <200ms
      const syncResult = await apiRequest('POST', '/api/shift-templates/bulk-sync', {
        templates: templatesToSave,
      });
      
      if (!syncResult.ok) {
        const errorData = await syncResult.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to sync templates');
      }
      
      // Invalidate shift-templates cache
      await queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      
      // Call the parent onSave with settings
      onSave({
        openingHours: completeOpeningHours,
        shiftPattern,
        defaultShiftLength: shiftPattern === 'custom' ? defaultShiftLength : undefined,
        defaultRequiredStaff,
        customSlots: shiftPattern === 'custom' ? customSlots : undefined,
      });

      toast({
        title: "Settings saved",
        description: `Calendar settings and ${templatesToSave.length} shift template(s) have been updated.`,
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error?.message || "An error occurred while saving settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}${minutes !== '00' ? ':' + minutes : ''}${ampm}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Calendar Settings
          </DialogTitle>
          <DialogDescription>
            Set your shop hours and how shifts are divided.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Default Hours - Apply to All */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Default Hours</Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={globalOpen}
                onChange={(e) => setGlobalOpen(e.target.value)}
                className="w-28"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={globalClose}
                onChange={(e) => setGlobalClose(e.target.value)}
                className="w-28"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplyToAll}
              >
                Apply to All
              </Button>
            </div>
          </div>

          <Separator />

          {/* Days Open */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Days Open</Label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((day) => {
                const hours = openingHours[day.key];
                const isEnabled = hours?.enabled ?? false;
                
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => handleDayToggle(day.key)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
                      isEnabled
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/20"
                    )}
                  >
                    <span className="text-xs font-medium">{day.label}</span>
                    {isEnabled && hours && (
                      <span className="text-[10px] opacity-80 mt-0.5">
                        {formatTime(hours.open)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click a day to toggle open/closed
            </p>
          </div>

          <Separator />

          {/* Shift Pattern */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Shift Pattern</Label>
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_PATTERNS.map((pattern) => {
                const Icon = pattern.icon;
                const isSelected = shiftPattern === pattern.value;
                
                return (
                  <button
                    key={pattern.value}
                    type="button"
                    onClick={() => setShiftPattern(pattern.value)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                      isSelected
                        ? "bg-primary/10 border-primary ring-1 ring-primary"
                        : "bg-card border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn(
                        "h-4 w-4",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-primary" : ""
                      )}>
                        {pattern.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {pattern.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Capacity input for preset patterns (not custom) - PROMINENT HEADCOUNT SECTION */}
            {shiftPattern !== 'custom' && (
              <div className="mt-4 p-5 bg-primary/10 border-2 border-primary/40 rounded-xl shadow-sm" data-testid="staff-required-section">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary/20 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="required-staff" className="text-lg font-bold text-primary">
                      Staff Required Per Slot
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      How many staff do you need for each time slot?
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Input
                    id="required-staff"
                    type="number"
                    min="1"
                    max="20"
                    value={defaultRequiredStaff}
                    onChange={(e) => setDefaultRequiredStaff(parseInt(e.target.value, 10) || 1)}
                    className="w-28 h-14 text-2xl font-bold text-center bg-primary/10 border-2 border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/30"
                    data-testid="required-staff-input"
                  />
                  <div className="flex flex-col">
                    <span className="text-base font-semibold">
                      staff per {shiftPattern === 'full-day' ? 'day' : 'slot'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      × {shiftPattern === 'full-day' ? '1 slot' : shiftPattern === 'half-day' ? '2 slots' : '3 slots'}/day
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom shift slots editor */}
            {shiftPattern === 'custom' && (
              <div className="space-y-4 mt-4 p-5 bg-primary/10 border-2 border-primary/40 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/20 rounded-full">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <Label className="text-lg font-bold text-primary">Custom Shift Slots</Label>
                      <p className="text-sm text-muted-foreground">
                        Define your shift types with staff requirements
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={addCustomSlot}
                    data-testid="add-custom-slot-btn"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Slot
                  </Button>
                </div>
                
                {customSlots.length === 0 ? (
                  <div className="text-center py-6 bg-background/50 rounded-lg border border-dashed">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No slots defined. Click "Add Slot" to create shift templates.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {customSlots.map((slot, index) => (
                      <div
                        key={slot.id || slot.clientId || `slot-${index}`}
                        className="p-3 border-2 border-border rounded-lg bg-card"
                        data-testid={`custom-slot-${index}`}
                      >
                        {/* Row 1: Label and Delete */}
                        <div className="flex items-center justify-between mb-2">
                          <Input
                            placeholder="Shift Label (e.g. Bar, Floor)"
                            value={slot.label}
                            onChange={(e) => updateCustomSlot(index, { label: e.target.value })}
                            className="flex-1 font-medium"
                            data-testid={`custom-slot-label-${index}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive ml-2"
                            onClick={() => removeCustomSlot(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Row 2: Time range and Staff Required */}
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Time range */}
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateCustomSlot(index, { startTime: e.target.value })}
                              className="w-28 text-sm"
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateCustomSlot(index, { endTime: e.target.value })}
                              className="w-28 text-sm"
                            />
                          </div>
                          
                          {/* PROMINENT Staff Required input - LARGE AND VISIBLE */}
                          <div className="flex items-center gap-2 ml-auto bg-primary/20 px-4 py-2 rounded-lg border border-primary/30">
                            <Users className="h-5 w-5 text-primary" />
                            <span className="text-sm font-bold text-primary">Staff:</span>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={slot.requiredStaff}
                              onChange={(e) => updateCustomSlot(index, { requiredStaff: parseInt(e.target.value, 10) || 1 })}
                              className="w-20 h-12 text-xl font-bold text-center bg-primary/10 border-2 border-primary/50 focus:border-primary"
                              data-testid={`custom-slot-required-${index}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Each slot will be applied to all open days automatically.
                </p>
              </div>
            )}

            {/* Slot Preview - Shows what will be generated */}
            <SlotPreview
              pattern={shiftPattern}
              openingHours={openingHours}
              defaultRequiredStaff={defaultRequiredStaff}
              customSlots={customSlots}
              formatTime={formatTime}
            />
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
            <div className="p-3 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Clear All Shifts</p>
                  <p className="text-xs text-muted-foreground">
                    Remove all shifts from your schedule. This cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isClearing}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {isClearing ? 'Clearing...' : 'Clear'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all shifts from your schedule.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearSchedule}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, clear everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="gap-2" disabled={isSaving}>
            <Save className={cn("h-4 w-4", isSaving && "animate-spin")} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
