export interface RecurringShiftConfig {
  frequency: 'weekly';
  endDate?: Date;
  numberOfOccurrences?: number;
  assigneeOption: 'keep' | 'open-slot';
}

export interface BaseShiftData {
  title: string;
  description?: string;
  requirements?: string;
  startTime: Date;
  endTime: Date;
  hourlyRate: string | number;
  location?: string;
  status?: 'draft' | 'invited' | 'open' | 'filled' | 'completed';
  assigneeId?: string | null;
  employerId: string;
  capacity?: number;
}

/**
 * Generates an array of shift objects based on a base shift and recurrence configuration
 * @param baseShift - The initial shift data to use as a template
 * @param config - Recurrence configuration (frequency, end date or occurrences, assignee option)
 * @returns Array of shift objects with incremented dates and recurring metadata
 */
export function generateRecurringShifts(
  baseShift: BaseShiftData,
  config: RecurringShiftConfig
): (Omit<BaseShiftData, 'employerId'> & { recurringSeriesId?: string; isRecurring?: boolean; recurringIndex?: number })[] {
  const shifts: (Omit<BaseShiftData, 'employerId'> & { recurringSeriesId?: string; isRecurring?: boolean; recurringIndex?: number })[] = [];
  
  // Generate a unique series ID for this recurring series
  const recurringSeriesId = `recurring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate the number of occurrences
  let occurrences = 1; // Always include the first shift
  
  if (config.numberOfOccurrences) {
    occurrences = config.numberOfOccurrences;
  } else if (config.endDate) {
    // Calculate occurrences based on end date
    const startDate = new Date(baseShift.startTime);
    const endDate = new Date(config.endDate);
    
    if (config.frequency === 'weekly') {
      const weeksDiff = Math.floor(
        (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      occurrences = Math.max(1, weeksDiff + 1); // +1 to include the start date
    }
  }
  
  // Generate shifts
  for (let i = 0; i < occurrences; i++) {
    const shiftDate = new Date(baseShift.startTime);
    
    // Increment date based on frequency
    if (config.frequency === 'weekly') {
      shiftDate.setDate(shiftDate.getDate() + (i * 7));
    }
    
    // Calculate end time maintaining the same duration
    const duration = baseShift.endTime.getTime() - baseShift.startTime.getTime();
    const shiftEndTime = new Date(shiftDate.getTime() + duration);
    
    // Determine assignee and status based on option
    let assigneeId: string | null | undefined = baseShift.assigneeId;
    let status: 'draft' | 'invited' | 'open' | 'filled' | 'completed' = baseShift.status || 'open';
    
    if (config.assigneeOption === 'open-slot') {
      // For "Open Slot Only", set assigneeId to null and status to DRAFT
      assigneeId = null;
      status = 'draft';
    }
    
    shifts.push({
      title: baseShift.title,
      description: baseShift.description,
      requirements: baseShift.requirements,
      startTime: shiftDate,
      endTime: shiftEndTime,
      hourlyRate: baseShift.hourlyRate,
      location: baseShift.location,
      status,
      assigneeId,
      capacity: baseShift.capacity ?? 1,
      recurringSeriesId,
      isRecurring: true,
      recurringIndex: i,
    });
  }
  
  return shifts;
}

