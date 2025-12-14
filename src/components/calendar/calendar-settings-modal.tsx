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
import { Clock, Save, Sun, Sunset, Moon, Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";
import { clearAllShifts } from "@/lib/api";
import { cn } from "@/lib/utils";

export type ShiftPattern = 'full-day' | 'half-day' | 'thirds' | 'custom';

export interface OpeningHours {
  [key: string]: {
    open: string;
    close: string;
    enabled: boolean;
  };
}

export interface CalendarSettings {
  openingHours: OpeningHours;
  shiftPattern: ShiftPattern;
  defaultShiftLength?: number; // in hours, for custom pattern
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

export default function CalendarSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  onClear,
}: CalendarSettingsModalProps) {
  const { toast } = useToast();
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
  
  // Global hours for "Apply to All" feature
  const [globalOpen, setGlobalOpen] = useState('09:00');
  const [globalClose, setGlobalClose] = useState('18:00');

  // Reset form when modal opens with initial settings
  useEffect(() => {
    if (isOpen && initialSettings) {
      setOpeningHours(initialSettings.openingHours);
      setShiftPattern(initialSettings.shiftPattern);
      setDefaultShiftLength(initialSettings.defaultShiftLength || 4);
      
      // Set global hours from first enabled day
      const firstEnabled = Object.values(initialSettings.openingHours).find(h => h.enabled);
      if (firstEnabled) {
        setGlobalOpen(firstEnabled.open);
        setGlobalClose(firstEnabled.close);
      }
    }
  }, [isOpen, initialSettings]);

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
      
      // Invalidate and refetch all shift and job-related queries
      // Use refetchType: 'all' to ensure data is refetched immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shop-schedule-shifts'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['/api/shifts'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['shop-shifts'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['/api/jobs'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['jobs'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['my-jobs'], refetchType: 'all' }),
        // Also invalidate employer shifts query used by professional calendar
        queryClient.invalidateQueries({ queryKey: ['employer-shifts'], refetchType: 'all' }),
      ]);
      
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

  const handleSave = () => {
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

    onSave({
      openingHours: completeOpeningHours,
      shiftPattern,
      defaultShiftLength: shiftPattern === 'custom' ? defaultShiftLength : undefined,
    });

    toast({
      title: "Settings saved",
      description: "Your calendar settings have been updated.",
    });

    onClose();
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

            {/* Custom shift length input */}
            {shiftPattern === 'custom' && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="shift-length" className="text-sm whitespace-nowrap">
                  Shift length:
                </Label>
                <Input
                  id="shift-length"
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={defaultShiftLength}
                  onChange={(e) => setDefaultShiftLength(parseFloat(e.target.value) || 4)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            )}
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
