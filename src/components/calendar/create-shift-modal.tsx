import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateRecurringShifts, RecurringShiftConfig } from "@/utils/recurring-shifts";

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftData: any, recurringShifts?: any[]) => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  isLoading?: boolean;
}

export default function CreateShiftModal({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
  initialStartTime,
  initialEndTime,
  isLoading = false,
}: CreateShiftModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: initialDate ? format(initialDate, "yyyy-MM-dd") : "",
    startTime: initialStartTime || "09:00",
    endTime: initialEndTime || "17:00",
    hourlyRate: "",
    location: "",
  });

  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  });
  const [numberOfOccurrences, setNumberOfOccurrences] = useState<number>(4);
  const [useEndDate, setUseEndDate] = useState(true);
  const [assigneeOption, setAssigneeOption] = useState<'keep' | 'open-slot'>('keep');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setFormData(prev => ({
          ...prev,
          date: format(initialDate, "yyyy-MM-dd"),
        }));
      }
      if (initialStartTime) {
        setFormData(prev => ({ ...prev, startTime: initialStartTime }));
      }
      if (initialEndTime) {
        setFormData(prev => ({ ...prev, endTime: initialEndTime }));
      }
    } else {
      // Reset form when closing
      setFormData({
        title: "",
        description: "",
        date: "",
        startTime: "09:00",
        endTime: "17:00",
        hourlyRate: "",
        location: "",
      });
      setRepeatWeekly(false);
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      setEndDate(date);
      setNumberOfOccurrences(4);
      setUseEndDate(true);
      setAssigneeOption('keep');
    }
  }, [isOpen, initialDate, initialStartTime, initialEndTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.startTime || !formData.endTime) {
      return;
    }

    // Create base shift data
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    const baseShiftData = {
      title: formData.title,
      description: formData.description,
      requirements: formData.description,
      startTime: startDateTime,
      endTime: endDateTime,
      hourlyRate: formData.hourlyRate || "0",
      location: formData.location,
      status: 'open' as const,
    };

    // If recurring, generate multiple shifts
    if (repeatWeekly) {
      const config: RecurringShiftConfig = {
        frequency: 'weekly',
        endDate: useEndDate ? endDate : undefined,
        numberOfOccurrences: useEndDate ? undefined : numberOfOccurrences,
        assigneeOption,
      };

      const recurringShifts = generateRecurringShifts(baseShiftData, config);
      onSubmit(baseShiftData, recurringShifts);
    } else {
      // Single shift
      onSubmit(baseShiftData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
          <DialogDescription>
            Fill in the details for your shift. You can make it recurring to save time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Shift Title *</Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Weekend Barber Needed"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the shift requirements..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($) *</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                required
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., 123 Main St, City, State"
              />
            </div>
          </div>

          {/* Repeat Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="repeatWeekly"
                checked={repeatWeekly}
                onCheckedChange={(checked) => setRepeatWeekly(checked === true)}
              />
              <Label htmlFor="repeatWeekly" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                Repeat Weekly
              </Label>
            </div>

            {repeatWeekly && (
              <div className="ml-6 space-y-4 pl-4 border-l-2">
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroup
                        value={useEndDate ? "endDate" : "occurrences"}
                        onValueChange={(value) => setUseEndDate(value === "endDate")}
                        className="flex flex-row gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="endDate" id="endDate" />
                          <Label htmlFor="endDate" className="cursor-pointer">Ends On</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="occurrences" id="occurrences" />
                          <Label htmlFor="occurrences" className="cursor-pointer">Number of Occurrences</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {useEndDate ? (
                    <div>
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            disabled={(date) => {
                              if (!formData.date) return false;
                              const startDate = new Date(formData.date);
                              return date < startDate;
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="occurrences">Number of Occurrences</Label>
                      <Input
                        id="occurrences"
                        type="number"
                        min="2"
                        max="52"
                        value={numberOfOccurrences}
                        onChange={(e) => setNumberOfOccurrences(parseInt(e.target.value) || 2)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Total shifts including the first one (2-52)
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Assignee Option</Label>
                  <RadioGroup
                    value={assigneeOption}
                    onValueChange={(value) => setAssigneeOption(value as 'keep' | 'open-slot')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="keep" id="keep" />
                      <Label htmlFor="keep" className="cursor-pointer">
                        Keep Assignee - Clone the specific staff member for all weeks
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="open-slot" id="open-slot" />
                      <Label htmlFor="open-slot" className="cursor-pointer">
                        Open Slot Only - Create empty slots (each shift needs separate assignment)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : repeatWeekly ? "Create Recurring Shifts" : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

