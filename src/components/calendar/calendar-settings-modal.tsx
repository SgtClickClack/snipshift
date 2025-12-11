import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Clock, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
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

export default function CalendarSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialSettings,
}: CalendarSettingsModalProps) {
  const { toast } = useToast();
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    initialSettings?.openingHours || DEFAULT_OPENING_HOURS
  );
  const [shiftPattern, setShiftPattern] = useState<ShiftPattern>(
    initialSettings?.shiftPattern || 'full-day'
  );
  const [defaultShiftLength, setDefaultShiftLength] = useState<number>(
    initialSettings?.defaultShiftLength || 8
  );

  // Reset form when modal opens with initial settings
  useEffect(() => {
    if (isOpen && initialSettings) {
      setOpeningHours(initialSettings.openingHours);
      setShiftPattern(initialSettings.shiftPattern);
      setDefaultShiftLength(initialSettings.defaultShiftLength || 8);
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

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleCopyToAll = (sourceDay: string) => {
    const sourceHours = openingHours[sourceDay];
    const updated = { ...openingHours };
    DAYS_OF_WEEK.forEach(day => {
      if (day.key !== sourceDay) {
        updated[day.key] = {
          ...sourceHours,
          enabled: updated[day.key].enabled, // Preserve enabled state
        };
      }
    });
    setOpeningHours(updated);
    toast({
      title: "Hours copied",
      description: `${DAYS_OF_WEEK.find(d => d.key === sourceDay)?.label} hours copied to all days.`,
    });
  };

  const handleSave = () => {
    // Validate that enabled days have valid times
    const invalidDays = DAYS_OF_WEEK.filter(day => {
      const hours = openingHours[day.key];
      if (!hours.enabled) return false;
      if (!hours.open || !hours.close) return true;
      const openTime = new Date(`2000-01-01T${hours.open}`);
      const closeTime = new Date(`2000-01-01T${hours.close}`);
      return isNaN(openTime.getTime()) || isNaN(closeTime.getTime()) || closeTime <= openTime;
    });

    if (invalidDays.length > 0) {
      toast({
        title: "Invalid hours",
        description: `Please check opening hours for: ${invalidDays.map(d => d.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    onSave({
      openingHours,
      shiftPattern,
      defaultShiftLength: shiftPattern === 'custom' ? defaultShiftLength : undefined,
    });

    toast({
      title: "Settings saved",
      description: "Your calendar settings have been saved successfully.",
    });

    onClose();
  };

  const getShiftPatternDescription = (pattern: ShiftPattern) => {
    switch (pattern) {
      case 'full-day':
        return 'Single shift covering the full opening hours';
      case 'half-day':
        return 'Day split into two shifts (morning and afternoon)';
      case 'thirds':
        return 'Day split into three shifts (morning, afternoon, and close)';
      case 'custom':
        return `Custom shift length (${defaultShiftLength} hours)`;
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Calendar Settings
          </DialogTitle>
          <DialogDescription>
            Configure your shop's opening hours and shift patterns for quick shift creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Opening Hours Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Opening Hours</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set your shop's operating hours for each day of the week.
              </p>
            </div>

            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const hours = openingHours[day.key];
                return (
                  <div
                    key={day.key}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 w-24">
                      <input
                        type="checkbox"
                        id={`enable-${day.key}`}
                        checked={hours.enabled}
                        onChange={() => handleDayToggle(day.key)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label
                        htmlFor={`enable-${day.key}`}
                        className="font-medium cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>

                    {hours.enabled ? (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`${day.key}-open`} className="text-sm w-12">
                              Open:
                            </Label>
                            <Input
                              id={`${day.key}-open`}
                              type="time"
                              value={hours.open}
                              onChange={(e) => handleTimeChange(day.key, 'open', e.target.value)}
                              className="w-32"
                            />
                          </div>
                          <span className="text-muted-foreground">-</span>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`${day.key}-close`} className="text-sm w-12">
                              Close:
                            </Label>
                            <Input
                              id={`${day.key}-close`}
                              type="time"
                              value={hours.close}
                              onChange={(e) => handleTimeChange(day.key, 'close', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyToAll(day.key)}
                        >
                          Copy to All
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Shift Pattern Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Shift Pattern</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose how you want to split the day into shifts when creating new shifts.
              </p>
            </div>

            <RadioGroup value={shiftPattern} onValueChange={(value) => setShiftPattern(value as ShiftPattern)}>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="full-day" id="full-day" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="full-day" className="cursor-pointer font-medium">
                      Full Day
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getShiftPatternDescription('full-day')}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Example: 9:00 AM - 6:00 PM
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="half-day" id="half-day" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="half-day" className="cursor-pointer font-medium">
                      Half Day (Split in Two)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getShiftPatternDescription('half-day')}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Example: Morning (9:00 AM - 1:30 PM), Afternoon (1:30 PM - 6:00 PM)
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="thirds" id="thirds" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="thirds" className="cursor-pointer font-medium">
                      Thirds (Morning, Afternoon, Close)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getShiftPatternDescription('thirds')}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Example: Morning (9:00 AM - 1:00 PM), Afternoon (1:00 PM - 5:00 PM), Close (5:00 PM - 9:00 PM)
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="cursor-pointer font-medium">
                      Custom Length
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getShiftPatternDescription('custom')}
                    </p>
                    {shiftPattern === 'custom' && (
                      <div className="mt-3 flex items-center gap-2">
                        <Label htmlFor="shift-length" className="text-sm">
                          Shift Length (hours):
                        </Label>
                        <Input
                          id="shift-length"
                          type="number"
                          min="1"
                          max="24"
                          value={defaultShiftLength}
                          onChange={(e) => setDefaultShiftLength(parseInt(e.target.value) || 8)}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

