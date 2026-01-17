import { useMemo } from 'react';
import { OpeningHours } from '@/components/calendar/calendar-settings-modal';
import { format } from 'date-fns';

export type ShiftSplitType = 'halves' | 'thirds' | 'custom' | 'full-day';

interface ShiftStructurePreviewProps {
  openingHours: OpeningHours;
  shiftSplitType: ShiftSplitType;
  selectedDay?: string; // Day of week key (e.g., 'monday')
  customShiftLength?: number; // Hours for custom split
}

/**
 * Visual preview component showing how a day is split into shifts
 */
export default function ShiftStructurePreview({
  openingHours,
  shiftSplitType,
  selectedDay = 'monday',
  customShiftLength = 8,
}: ShiftStructurePreviewProps) {
  const dayHours = openingHours[selectedDay];

  const shiftSegments = useMemo(() => {
    if (!dayHours || !dayHours.enabled || !dayHours.open || !dayHours.close) {
      return [];
    }

    const [openHour, openMin] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number);

    const openTime = new Date(2000, 0, 1, openHour, openMin);
    const closeTime = new Date(2000, 0, 1, closeHour, closeMin);
    const totalMinutes = (closeTime.getTime() - openTime.getTime()) / (1000 * 60);

    if (totalMinutes <= 0) return [];

    const segments: Array<{ 
      start: Date; 
      end: Date; 
      label: string; 
      width: number;
      isPartial?: boolean;
      isProblematic?: boolean;
    }> = [];

    switch (shiftSplitType) {
      case 'halves': {
        const halfPoint = totalMinutes / 2;
        const midTime = new Date(openTime.getTime() + halfPoint * 60 * 1000);
        segments.push(
          {
            start: openTime,
            end: midTime,
            label: 'Morning',
            width: 50,
          },
          {
            start: midTime,
            end: closeTime,
            label: 'Afternoon',
            width: 50,
          }
        );
        break;
      }

      case 'thirds': {
        const third = totalMinutes / 3;
        const firstThird = new Date(openTime.getTime() + third * 60 * 1000);
        const secondThird = new Date(openTime.getTime() + (third * 2) * 60 * 1000);
        segments.push(
          {
            start: openTime,
            end: firstThird,
            label: 'Morning',
            width: 33.33,
          },
          {
            start: firstThird,
            end: secondThird,
            label: 'Afternoon',
            width: 33.33,
          },
          {
            start: secondThird,
            end: closeTime,
            label: 'Close',
            width: 33.34,
          }
        );
        break;
      }

      case 'custom': {
        // Handle decimal hours (e.g., 4.5 hours = 4 hours 30 minutes)
        const shiftLengthMinutes = Math.round(customShiftLength * 60);
        let currentStart = openTime;
        let segmentIndex = 0;

        while (currentStart < closeTime) {
          const segmentEnd = new Date(currentStart.getTime() + shiftLengthMinutes * 60 * 1000);
          // Option A: Create a shorter final shift (Partial Shift) - Default behavior
          const actualEnd = segmentEnd > closeTime ? closeTime : segmentEnd;
          const segmentMinutes = (actualEnd.getTime() - currentStart.getTime()) / (1000 * 60);
          
          // Skip segments shorter than 15 minutes (minimum viable shift)
          if (segmentMinutes < 15) {
            break;
          }
          
          const width = (segmentMinutes / totalMinutes) * 100;
          
          // Check if this is a partial shift (remainder)
          const isPartial = segmentEnd > closeTime || segmentMinutes < shiftLengthMinutes * 0.95;
          // Flag as problematic if remainder is:
          // - Less than 30 minutes, OR
          // - Less than 50% of intended length AND less than 1 hour
          const isProblematic = isPartial && (
            segmentMinutes < 30 || 
            (segmentMinutes < shiftLengthMinutes * 0.5 && segmentMinutes < 60)
          );

          segments.push({
            start: currentStart,
            end: actualEnd,
            label: isPartial ? `Shift ${segmentIndex + 1} (Partial)` : `Shift ${segmentIndex + 1}`,
            width,
            isPartial,
            isProblematic,
          });

          currentStart = actualEnd;
          segmentIndex++;

          // Prevent infinite loop
          if (segmentIndex > 20) break;
        }
        break;
      }

      case 'full-day':
      default: {
        segments.push({
          start: openTime,
          end: closeTime,
          label: 'Full Day',
          width: 100,
        });
        break;
      }
    }

    return segments;
  }, [dayHours, shiftSplitType, customShiftLength]);

  // Calculate time values for validation (needed before early return for useMemo)
  const [openHour, openMin] = dayHours?.open?.split(':').map(Number) || [0, 0];
  const [closeHour, closeMin] = dayHours?.close?.split(':').map(Number) || [0, 0];
  const openTime = new Date(2000, 0, 1, openHour, openMin);
  const closeTime = new Date(2000, 0, 1, closeHour, closeMin);
  const totalMinutes = (closeTime.getTime() - openTime.getTime()) / (1000 * 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Validation: Check if split is valid
  const isValidSplit = useMemo(() => {
    if (shiftSplitType === 'thirds' && totalMinutes < 180) {
      // Need at least 3 hours for thirds (1 hour per shift minimum)
      return false;
    }
    if (shiftSplitType === 'halves' && totalMinutes < 120) {
      // Need at least 2 hours for halves (1 hour per shift minimum)
      return false;
    }
    if (shiftSplitType === 'custom' && customShiftLength * 60 > totalMinutes) {
      // Custom shift length can't exceed total hours
      return false;
    }
    return true;
  }, [shiftSplitType, totalMinutes, customShiftLength]);

  if (!dayHours || !dayHours.enabled || !dayHours.open || !dayHours.close) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground text-center">
          Select a day with opening hours to see preview
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-background">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium capitalize">{selectedDay}</span>
          <span className="text-xs text-muted-foreground">
            {format(openTime, 'h:mm a')} - {format(closeTime, 'h:mm a')} ({totalHours}h{' '}
            {remainingMinutes > 0 ? `${remainingMinutes}m` : ''})
          </span>
        </div>
        {!isValidSplit && (
          <p className="text-xs text-destructive mt-1">
            {shiftSplitType === 'thirds' && totalMinutes < 180
              ? 'Need at least 3 hours for thirds split'
              : shiftSplitType === 'halves' && totalMinutes < 120
              ? 'Need at least 2 hours for halves split'
              : shiftSplitType === 'custom' && customShiftLength * 60 > totalMinutes
              ? 'Custom shift length exceeds opening hours'
              : 'Invalid split configuration'}
          </p>
        )}
      </div>

      {/* Visual Bar */}
      <div className="relative h-12 bg-muted rounded-md overflow-hidden border">
        {shiftSegments.map((segment, index) => {
          const segmentStart = format(segment.start, 'h:mm a');
          const segmentEnd = format(segment.end, 'h:mm a');
          const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-orange-500',
            'bg-pink-500',
          ];
          // Use red for problematic remainders, otherwise use normal colors
          const color = segment.isProblematic 
            ? 'bg-red-500' 
            : segment.isPartial 
            ? 'bg-amber-500' 
            : colors[index % colors.length];

          return (
            <div
              key={index}
              className={`absolute top-0 bottom-0 ${color} border-r border-background/50 flex items-center justify-center group hover:opacity-90 transition-opacity ${
                segment.isProblematic ? 'ring-2 ring-red-600 ring-offset-1' : ''
              }`}
              style={{
                left: `${shiftSegments.slice(0, index).reduce((sum, s) => sum + s.width, 0)}%`,
                width: `${segment.width}%`,
              }}
              title={`${segment.label}: ${segmentStart} - ${segmentEnd}${segment.isProblematic ? ' (Very short remainder!)' : segment.isPartial ? ' (Partial shift)' : ''}`}
            >
              <span className="text-xs font-medium text-white px-1 text-center truncate">
                {segment.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time Labels */}
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{format(openTime, 'h:mm a')}</span>
        {shiftSegments.length > 1 && (
          <div className="flex-1 flex justify-around">
            {shiftSegments.slice(1).map((segment, index) => (
              <span key={index}>{format(segment.start, 'h:mm a')}</span>
            ))}
          </div>
        )}
        <span>{format(closeTime, 'h:mm a')}</span>
      </div>

      {/* Segment Details */}
      <div className="mt-3 space-y-1">
        {shiftSegments.map((segment, index) => {
          const duration = (segment.end.getTime() - segment.start.getTime()) / (1000 * 60);
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          return (
            <div 
              key={index} 
              className={`flex items-center justify-between text-xs ${
                segment.isProblematic ? 'text-destructive font-medium' : ''
              }`}
            >
              <span className={segment.isProblematic ? 'text-destructive' : 'text-muted-foreground'}>
                {segment.label}: {format(segment.start, 'h:mm a')} - {format(segment.end, 'h:mm a')}
                {segment.isProblematic && (
                  <span className="ml-2 text-destructive">⚠️ Very short!</span>
                )}
                {segment.isPartial && !segment.isProblematic && (
                  <span className="ml-2 text-amber-600">(Partial)</span>
                )}
              </span>
              <span className={segment.isProblematic ? 'text-destructive' : 'text-muted-foreground'}>
                ({hours}h {minutes > 0 ? `${minutes}m` : ''})
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Warning for problematic remainders */}
      {shiftSegments.some(s => s.isProblematic) && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-xs text-destructive font-medium">
            ⚠️ Warning: The final shift is very short. Consider adjusting your opening hours or shift length.
          </p>
        </div>
      )}
    </div>
  );
}

