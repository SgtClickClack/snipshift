import { format, getDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export interface SmartMatch {
  shiftId: string;
  shiftTitle: string;
  dayOfWeek: string;
  time: string;
  suggestedCandidate: {
    id: string;
    name: string;
    email: string;
  } | null;
  previousShiftDate?: string;
  startTime: string;
  endTime: string;
  role?: string;
}

interface DraftShift {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  role?: string;
  jobType?: string;
}

interface HistoricalShift {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Get the date range for the current calendar view
 */
export function getViewDateRange(currentDate: Date, view: "month" | "week" | "day"): { start: Date; end: Date } {
  if (view === "week") {
    return {
      start: startOfWeek(currentDate, { weekStartsOn: 0 }),
      end: endOfWeek(currentDate, { weekStartsOn: 0 }),
    };
  } else if (view === "month") {
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
  } else {
    // Day view
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}

/**
 * Extract day of week, start time, and end time from a shift
 */
function extractShiftPattern(shift: DraftShift): {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
} {
  const startDate = new Date(shift.startTime);
  const endDate = new Date(shift.endTime);
  
  const dayOfWeek = getDay(startDate);
  const startTime = format(startDate, "HH:mm");
  const endTime = format(endDate, "HH:mm");
  
  return { dayOfWeek, startTime, endTime };
}

/**
 * Mock historical lookup - returns a few successful matches for testing
 * TODO: Replace with actual database query
 */
async function findHistoricalShift(
  employerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  role?: string
): Promise<HistoricalShift | null> {
  // MOCK: Return some test data for now
  // In production, this would query the database for:
  // - Shifts with the same dayOfWeek, startTime, endTime, and role
  // - Status = 'filled' or 'completed'
  // - Most recent first
  // - Get the accepted application's user info
  
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  // Mock: Return a match 50% of the time for testing
  if (Math.random() > 0.5) {
    const mockNames = ["Sarah Johnson", "Michael Chen", "Emily Rodriguez", "David Kim"];
    const mockEmails = ["sarah@example.com", "michael@example.com", "emily@example.com", "david@example.com"];
    const randomIndex = Math.floor(Math.random() * mockNames.length);
    
    return {
      id: `historical-${Date.now()}`,
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
      status: "filled",
      assignee: {
        id: `user-${randomIndex}`,
        name: mockNames[randomIndex],
        email: mockEmails[randomIndex],
      },
    };
  }
  
  return null;
}

/**
 * Calculate smart matches for draft shifts in the current view
 */
export async function calculateSmartMatches(
  draftShifts: DraftShift[],
  employerId: string,
  viewDateRange: { start: Date; end: Date }
): Promise<SmartMatch[]> {
  const matches: SmartMatch[] = [];
  
  // Filter shifts that are within the current view date range
  const shiftsInView = draftShifts.filter((shift) => {
    const shiftDate = new Date(shift.startTime);
    return isWithinInterval(shiftDate, viewDateRange);
  });
  
  // Process each draft shift
  for (const shift of shiftsInView) {
    const pattern = extractShiftPattern(shift);
    const shiftDate = new Date(shift.startTime);
    
    // Find historical shift
    const historicalShift = await findHistoricalShift(
      employerId,
      pattern.dayOfWeek,
      pattern.startTime,
      pattern.endTime,
      shift.role || shift.jobType
    );
    
    // Format day of week name
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeekName = dayNames[pattern.dayOfWeek];
    
    // Format time
    const timeStr = `${pattern.startTime} - ${pattern.endTime}`;
    
    matches.push({
      shiftId: shift.id,
      shiftTitle: shift.title,
      dayOfWeek: dayOfWeekName,
      time: timeStr,
      suggestedCandidate: historicalShift?.assignee || null,
      previousShiftDate: historicalShift?.startTime,
      startTime: shift.startTime,
      endTime: shift.endTime,
      role: shift.role || shift.jobType,
    });
  }
  
  return matches;
}

