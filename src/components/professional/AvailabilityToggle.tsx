/**
 * AvailabilityToggle - Mobile-Friendly 7-Day Availability Picker
 * 
 * Features:
 * - 7-day rolling horizontal scroller
 * - Three time slots per day: Morning, Lunch, Dinner
 * - Tap to toggle availability for each slot
 * - Bulk saves to POST /api/me/availability
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { 
  Calendar, 
  Sun, 
  Utensils, 
  Moon, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay, isSameDay, isToday, isTomorrow } from 'date-fns';

// Time slot definitions
type TimeSlot = 'morning' | 'lunch' | 'dinner';

interface TimeSlotConfig {
  id: TimeSlot;
  label: string;
  icon: React.ElementType;
  startHour: number;
  endHour: number;
  color: string;
}

const TIME_SLOTS: TimeSlotConfig[] = [
  {
    id: 'morning',
    label: 'Morning',
    icon: Sun,
    startHour: 6,
    endHour: 11,
    color: 'from-amber-400 to-orange-400',
  },
  {
    id: 'lunch',
    label: 'Lunch',
    icon: Utensils,
    startHour: 11,
    endHour: 15,
    color: 'from-blue-400 to-cyan-400',
  },
  {
    id: 'dinner',
    label: 'Dinner',
    icon: Moon,
    startHour: 15,
    endHour: 23,
    color: 'from-purple-400 to-indigo-400',
  },
];

interface DayAvailability {
  date: string; // ISO date string YYYY-MM-DD
  morning: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface AvailabilityData {
  availability: DayAvailability[];
}

// Generate 7 days starting from today
function generateNext7Days(): Date[] {
  const days: Date[] = [];
  const today = startOfDay(new Date());
  
  for (let i = 0; i < 7; i++) {
    days.push(addDays(today, i));
  }
  
  return days;
}

// Format date for display
function formatDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE');
}

// Time Slot Toggle Button
interface SlotToggleProps {
  slot: TimeSlotConfig;
  isAvailable: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function SlotToggle({ slot, isAvailable, onToggle, disabled }: SlotToggleProps) {
  const Icon = slot.icon;
  
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200',
        'min-w-[60px] h-[60px] touch-manipulation',
        isAvailable
          ? 'bg-[#BAFF39] text-black shadow-md shadow-[#BAFF39]/30'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      aria-label={`${slot.label}: ${isAvailable ? 'Available' : 'Not available'}`}
    >
      <Icon className="h-4 w-4 mb-1" />
      <span className="text-[10px] font-medium">{slot.label}</span>
      {isAvailable && (
        <CheckCircle2 className="h-3 w-3 absolute -top-1 -right-1" />
      )}
    </button>
  );
}

// Day Card Component
interface DayCardProps {
  date: Date;
  availability: { morning: boolean; lunch: boolean; dinner: boolean };
  onToggleSlot: (slot: TimeSlot) => void;
  disabled?: boolean;
  isSelected?: boolean;
}

function DayCard({ date, availability, onToggleSlot, disabled, isSelected }: DayCardProps) {
  const dayLabel = formatDayLabel(date);
  const dateLabel = format(date, 'd');
  const monthLabel = format(date, 'MMM');
  
  const availableCount = [availability.morning, availability.lunch, availability.dinner]
    .filter(Boolean).length;
  
  return (
    <div 
      className={cn(
        'flex-shrink-0 w-[100px] p-3 rounded-xl border transition-all duration-200',
        'bg-card hover:border-[#BAFF39]/50',
        isSelected && 'border-[#BAFF39] ring-2 ring-[#BAFF39]/20',
        isToday(date) && 'border-[#BAFF39]/30'
      )}
    >
      {/* Day Header */}
      <div className="text-center mb-3">
        <div className={cn(
          'text-xs font-medium',
          isToday(date) ? 'text-[#BAFF39]' : 'text-muted-foreground'
        )}>
          {dayLabel}
        </div>
        <div className="text-2xl font-bold">{dateLabel}</div>
        <div className="text-xs text-muted-foreground">{monthLabel}</div>
      </div>
      
      {/* Time Slots */}
      <div className="space-y-2">
        {TIME_SLOTS.map((slot) => (
          <SlotToggle
            key={slot.id}
            slot={slot}
            isAvailable={availability[slot.id]}
            onToggle={() => onToggleSlot(slot.id)}
            disabled={disabled}
          />
        ))}
      </div>
      
      {/* Available indicator */}
      {availableCount > 0 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-[#BAFF39] font-medium">
            {availableCount} slot{availableCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// Main Component
interface AvailabilityToggleProps {
  className?: string;
  onAvailabilityChange?: (availability: DayAvailability[]) => void;
}

export function AvailabilityToggle({ className, onAvailabilityChange }: AvailabilityToggleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Generate 7 days
  const days = generateNext7Days();
  
  // Local availability state
  const [localAvailability, setLocalAvailability] = useState<Record<string, DayAvailability>>(() => {
    const initial: Record<string, DayAvailability> = {};
    days.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      initial[dateStr] = {
        date: dateStr,
        morning: false,
        lunch: false,
        dinner: false,
      };
    });
    return initial;
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch existing availability
  const { data: serverAvailability, isLoading } = useQuery<AvailabilityData>({
    queryKey: ['availability', user?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/me/availability');
      if (!res.ok) {
        // Return empty if endpoint doesn't exist yet
        return { availability: [] };
      }
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: false,
  });

  // Initialize local state from server data
  useEffect(() => {
    if (serverAvailability?.availability) {
      const serverMap: Record<string, DayAvailability> = {};
      
      serverAvailability.availability.forEach((item) => {
        serverMap[item.date] = item;
      });
      
      setLocalAvailability((prev) => {
        const merged = { ...prev };
        Object.keys(merged).forEach((dateStr) => {
          if (serverMap[dateStr]) {
            merged[dateStr] = serverMap[dateStr];
          }
        });
        return merged;
      });
    }
  }, [serverAvailability]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (availability: DayAvailability[]) => {
      const res = await apiRequest('POST', '/api/me/availability', { availability });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save availability');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setHasChanges(false);
      toast({
        title: 'Availability saved',
        description: 'Your availability has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Toggle a specific slot
  const handleToggleSlot = (dateStr: string, slot: TimeSlot) => {
    setLocalAvailability((prev) => {
      const updated = {
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [slot]: !prev[dateStr][slot],
        },
      };
      setHasChanges(true);
      
      // Notify parent of changes
      if (onAvailabilityChange) {
        onAvailabilityChange(Object.values(updated));
      }
      
      return updated;
    });
  };

  // Save all availability
  const handleSave = () => {
    const availability = Object.values(localAvailability);
    saveMutation.mutate(availability);
  };

  // Quick actions
  const handleMarkAllAvailable = () => {
    setLocalAvailability((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((dateStr) => {
        updated[dateStr] = {
          ...updated[dateStr],
          morning: true,
          lunch: true,
          dinner: true,
        };
      });
      setHasChanges(true);
      return updated;
    });
  };

  const handleClearAll = () => {
    setLocalAvailability((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((dateStr) => {
        updated[dateStr] = {
          ...updated[dateStr],
          morning: false,
          lunch: false,
          dinner: false,
        };
      });
      setHasChanges(true);
      return updated;
    });
  };

  // Scroll navigation
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -120, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 120, behavior: 'smooth' });
    }
  };

  // Calculate total available slots
  const totalAvailableSlots = Object.values(localAvailability).reduce((total, day) => {
    return total + (day.morning ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0);
  }, 0);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#BAFF39]" />
              My Availability
            </CardTitle>
            <CardDescription className="mt-1">
              Tap slots to toggle when you're available for shifts
            </CardDescription>
          </div>
          
          {/* Status */}
          <div className="text-right">
            <div className={cn(
              'text-2xl font-bold',
              totalAvailableSlots > 0 ? 'text-[#BAFF39]' : 'text-muted-foreground'
            )}>
              {totalAvailableSlots}
            </div>
            <div className="text-xs text-muted-foreground">Slots open</div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAvailable}
            className="text-xs"
          >
            Mark All Available
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Horizontal Scroller */}
        <div className="relative">
          {/* Left Arrow */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm hidden sm:flex"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Scrollable Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none]"
          >
            {days.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              return (
                <DayCard
                  key={dateStr}
                  date={date}
                  availability={localAvailability[dateStr]}
                  onToggleSlot={(slot) => handleToggleSlot(dateStr, slot)}
                  disabled={saveMutation.isPending}
                  isSelected={isToday(date)}
                />
              );
            })}
          </div>
          
          {/* Right Arrow */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm hidden sm:flex"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Time Slot Legend */}
        <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
          {TIME_SLOTS.map((slot) => {
            const Icon = slot.icon;
            return (
              <div key={slot.id} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                <span>{slot.label}</span>
                <span className="text-muted-foreground/60">
                  ({slot.startHour}:00-{slot.endHour}:00)
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Save Button */}
        {hasChanges && (
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full bg-[#BAFF39] hover:bg-[#BAFF39]/90 text-black"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Availability'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AvailabilityToggle;
