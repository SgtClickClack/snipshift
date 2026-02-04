/**
 * Shift Bucketing Utility
 * 
 * Optimized algorithm for grouping calendar events into shift buckets.
 * Uses pre-indexed event map for O(1) lookups instead of O(n) filtering.
 * 
 * Performance: Reduces complexity from O(days × templates × events) to O(days × templates + events)
 */

import { isSameDay, startOfWeek, endOfWeek } from 'date-fns';

// Type definitions - aligned with ShiftBucketPill.tsx
export interface BucketEvent {
  id: string;
  title?: string;
  start: Date;
  end: Date;
  resource?: {
    booking?: { shift?: any; job?: any };
    status?: string;
    type?: string;
  };
}

export interface ShiftBucket {
  key: string;
  label: string;
  filledCount: number;
  requiredCount: number;
  events: BucketEvent[];
  start: Date;
  end: Date;
  templateId?: string;
}

export interface ShiftTemplate {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string;
  requiredStaffCount: number;
}

export interface BucketingOptions {
  view: 'month' | 'week' | 'day';
  currentDate: Date;
}

export interface BucketedResult {
  bucketEvents: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: {
      type: 'bucket';
      status: 'confirmed' | 'pending' | 'unassigned';
      bucket: ShiftBucket;
    };
  }>;
  ungroupedEvents: BucketEvent[];
}

/**
 * Create a date key for indexing (YYYY-MM-DD format)
 * Uses UTC-safe date extraction to avoid timezone issues
 */
function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Normalize a date/string to a Date object
 */
function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Parse time string (HH:mm) to hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Build a Date from base date + time components
 * Uses explicit hour/minute setting to avoid timezone ambiguity
 */
function combineDateAndTime(baseDate: Date, hours: number, minutes: number): Date {
  const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Count assigned staff from an event's resource data
 */
function getAssignedCount(event: BucketEvent): number {
  const shift = event.resource?.booking?.shift || event.resource?.booking?.job;
  const raw = shift?.assignedStaff ?? shift?.assignments ?? shift?.professional;
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.filter(Boolean).length;
}

/**
 * Check if an event matches a time slot (exact match, contained within, or overlaps significantly)
 * 
 * MIDNIGHT-CROSSING FIX: Handles shifts that span midnight by checking:
 * 1. Exact match
 * 2. Event contained within slot
 * 3. Event starts within slot (for shifts that cross midnight - end time may be next day)
 * 4. Significant overlap (>50% of event duration falls within slot)
 * 
 * Edge cases handled:
 * - 22:00-02:00 shift (8-hour overnight) matches 22:00 slot
 * - 23:00-07:00 shift (8-hour overnight) matches 23:00 slot
 * - 00:30-06:00 shift (early morning) matches 00:00 slot if no 00:30 template
 */
function eventMatchesSlot(
  eventStart: Date,
  eventEnd: Date,
  slotStart: Date,
  slotEnd: Date
): boolean {
  const evStartTime = eventStart.getTime();
  const evEndTime = eventEnd.getTime();
  const slotStartTime = slotStart.getTime();
  let slotEndTime = slotEnd.getTime();

  // Handle midnight-crossing slots (e.g., 22:00 to 02:00)
  // If slot end is before slot start, it crosses midnight - add 24 hours
  if (slotEndTime <= slotStartTime) {
    slotEndTime += 24 * 60 * 60 * 1000;
  }

  // Handle midnight-crossing events
  // A shift from 22:00 to 02:00 will have evEndTime < evStartTime
  let adjustedEvEndTime = evEndTime;
  if (evEndTime <= evStartTime) {
    adjustedEvEndTime = evEndTime + 24 * 60 * 60 * 1000;
  }

  // Extract hours for time-of-day comparison (handles same-day comparison better)
  const evStartHour = eventStart.getHours() + eventStart.getMinutes() / 60;
  const slotStartHour = slotStart.getHours() + slotStart.getMinutes() / 60;
  const slotEndHour = slotEnd.getHours() + slotEnd.getMinutes() / 60;
  
  // Midnight crossing for slot hours (22:00 to 02:00 = 22 to 26)
  const adjustedSlotEndHour = slotEndHour <= slotStartHour 
    ? slotEndHour + 24 
    : slotEndHour;

  // Exact match (same start time, within 5 minutes)
  const startDiffMs = Math.abs(evStartTime - slotStartTime);
  if (startDiffMs < 5 * 60 * 1000) {
    return true;
  }
  
  // Event starts within slot time window (hour-based check)
  // This is more robust for timezone edge cases
  const adjustedEvStartHour = evStartHour < slotStartHour && slotStartHour > 18 
    ? evStartHour + 24 // Event is early morning, slot is evening
    : evStartHour;
  
  if (adjustedEvStartHour >= slotStartHour && adjustedEvStartHour < adjustedSlotEndHour) {
    return true;
  }
  
  // Contained within slot (timestamp-based)
  if (evStartTime >= slotStartTime && adjustedEvEndTime <= slotEndTime) {
    return true;
  }
  
  // Event starts within slot (timestamp-based, catches midnight-crossing shifts)
  if (evStartTime >= slotStartTime && evStartTime < slotEndTime) {
    return true;
  }
  
  // Significant overlap check (>50% of event falls within slot)
  const overlapStart = Math.max(evStartTime, slotStartTime);
  const overlapEnd = Math.min(adjustedEvEndTime, slotEndTime);
  const overlapDuration = Math.max(0, overlapEnd - overlapStart);
  const eventDuration = adjustedEvEndTime - evStartTime;
  
  if (eventDuration > 0 && overlapDuration / eventDuration >= 0.5) {
    return true;
  }
  
  return false;
}

/**
 * Get date range based on view type
 */
export function getDateRange(view: 'month' | 'week' | 'day', currentDate: Date): { start: Date; end: Date } {
  if (view === 'month') {
    return {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
    };
  } else if (view === 'week') {
    return {
      start: startOfWeek(currentDate, { weekStartsOn: 0 }),
      end: endOfWeek(currentDate, { weekStartsOn: 0 }),
    };
  } else {
    return {
      start: new Date(currentDate),
      end: new Date(currentDate),
    };
  }
}

/**
 * Pre-index events by date for O(1) lookups
 * Returns a Map where key is date string and value is array of events for that day
 * 
 * MULTI-DAY FIX: Events spanning multiple days are indexed under ALL days they span,
 * so a shift from Jan 1 22:00 to Jan 2 06:00 appears in both Jan 1 and Jan 2 buckets.
 */
function indexEventsByDate(events: BucketEvent[]): Map<string, BucketEvent[]> {
  const index = new Map<string, BucketEvent[]>();
  
  for (const event of events) {
    const eventStart = normalizeDate(event.start);
    const eventEnd = normalizeDate(event.end);
    
    // Index by start date (always)
    const startKey = getDateKey(eventStart);
    const startExisting = index.get(startKey);
    if (startExisting) {
      startExisting.push(event);
    } else {
      index.set(startKey, [event]);
    }
    
    // MULTI-DAY/MIDNIGHT-CROSSING: Also index by any additional days the event spans
    // This handles shifts like 22:00-06:00 that span two days
    if (!isSameDay(eventStart, eventEnd)) {
      const currentDay = new Date(eventStart);
      currentDay.setDate(currentDay.getDate() + 1);
      currentDay.setHours(0, 0, 0, 0);
      
      // Index for each day until we reach or pass the end date
      while (currentDay <= eventEnd) {
        const dayKey = getDateKey(currentDay);
        
        // Avoid duplicating if already indexed
        const dayExisting = index.get(dayKey);
        if (dayExisting) {
          // Only add if not already in the array
          if (!dayExisting.some(e => e.id === event.id)) {
            dayExisting.push(event);
          }
        } else {
          index.set(dayKey, [event]);
        }
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
  }
  
  return index;
}

/**
 * Group events into shift buckets based on templates
 * 
 * Performance optimization:
 * - Pre-indexes events by date for O(1) day lookups
 * - Only iterates events for the specific day (not all events)
 * - Tracks used event IDs to prevent double-grouping
 * 
 * @param events - All calendar events to group
 * @param templates - Shift templates defining time slots
 * @param options - View and date configuration
 * @returns Bucketed results with bucket events and ungrouped events
 */
export function groupEventsIntoBuckets(
  events: BucketEvent[],
  templates: ShiftTemplate[],
  options: BucketingOptions
): BucketedResult {
  const { view, currentDate } = options;
  const { start: rangeStart, end: rangeEnd } = getDateRange(view, currentDate);
  
  // Pre-index events by date for O(1) lookups
  const eventsByDate = indexEventsByDate(events);
  const eventIdsInBuckets = new Set<string>();
  const bucketEvents: BucketedResult['bucketEvents'] = [];
  
  // Iterate through each day in the range
  const current = new Date(rangeStart);
  while (current <= rangeEnd) {
    const dayOfWeek = current.getDay();
    const baseDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);
    const dateKey = getDateKey(baseDate);
    
    // O(1) lookup for events on this day
    const dayEvents = eventsByDate.get(dateKey) ?? [];
    
    // Process each template for this day
    for (const template of templates) {
      if (template.dayOfWeek !== dayOfWeek) continue;
      
      const startTime = parseTime(template.startTime);
      const endTime = parseTime(template.endTime);
      
      const slotStart = combineDateAndTime(baseDate, startTime.hours, startTime.minutes);
      let slotEnd = combineDateAndTime(baseDate, endTime.hours, endTime.minutes);
      
      // MIDNIGHT-CROSSING FIX: If end time is before start time, shift crosses midnight
      // Add one day to the end time (e.g., 22:00-02:00 becomes 22:00-26:00 in terms of calculation)
      if (slotEnd.getTime() <= slotStart.getTime()) {
        slotEnd = new Date(slotEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      
      // Only filter day events (not all events) - O(events_per_day) not O(all_events)
      // MULTI-DAY FIX: Events from previous days can match if they extend into this slot
      const matching = dayEvents.filter((event) => {
        if (eventIdsInBuckets.has(event.id)) return false;
        
        const eventStart = normalizeDate(event.start);
        const eventEnd = normalizeDate(event.end);
        
        // For same-day events, use standard slot matching
        if (isSameDay(eventStart, baseDate)) {
          return eventMatchesSlot(eventStart, eventEnd, slotStart, slotEnd);
        }
        
        // MULTI-DAY: For events that started on a previous day but extend into today,
        // check if the event's end overlaps with the slot on this day
        // This handles shifts like "Jan 1 22:00 - Jan 2 06:00" matching a "00:00-08:00" slot on Jan 2
        if (eventStart < baseDate && eventEnd > baseDate) {
          // Event spans across this day - check if slot falls within the event's span on this day
          const todayStart = new Date(baseDate);
          todayStart.setHours(0, 0, 0, 0);
          
          // The event covers part of today - check if today's slot overlaps with the event
          return eventMatchesSlot(eventStart, eventEnd, slotStart, slotEnd);
        }
        
        return false;
      });
      
      // Calculate filled count from assigned staff
      const filledCount = matching.reduce((sum, event) => sum + getAssignedCount(event), 0);
      
      // Mark events as grouped
      for (const event of matching) {
        eventIdsInBuckets.add(event.id);
      }
      
      // Determine bucket status
      const status: 'confirmed' | 'pending' | 'unassigned' = 
        filledCount >= template.requiredStaffCount ? 'confirmed' :
        filledCount > 0 ? 'pending' : 'unassigned';
      
      // Create bucket event
      const bucket: ShiftBucket = {
        key: `bucket-${template.id}-${baseDate.getTime()}`,
        label: template.label,
        filledCount,
        requiredCount: template.requiredStaffCount,
        events: matching,
        start: slotStart,
        end: slotEnd,
        templateId: template.id,
      };
      
      bucketEvents.push({
        id: bucket.key,
        title: `${template.label}: ${filledCount}/${template.requiredStaffCount}`,
        start: slotStart,
        end: slotEnd,
        resource: {
          type: 'bucket' as const,
          status,
          bucket,
        },
      });
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  // Collect ungrouped events
  const ungroupedEvents = events.filter((event) => !eventIdsInBuckets.has(event.id));
  
  return {
    bucketEvents,
    ungroupedEvents,
  };
}
