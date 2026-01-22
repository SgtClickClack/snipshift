/**
 * HIGA Award Engine Service (2026 Rates)
 * 
 * Calculates Gross Pay based on Australian Hospitality Industry General Award (HIGA) 2026 rules:
 * - Casual Loading: 25% (applied to base rate for casual workers)
 * - Sunday Penalty: 150% (FT/PT), 175% (Casual)
 * - Late Night Mon-Fri (7pm-12am): +$2.81/hr flat loading
 * - Night Mon-Fri (12am-7am): +$4.22/hr flat loading
 * - Saturday: 125% (FT/PT), 150% (Casual)
 * 
 * This replaces the need for external systems like SAP SuccessFactors for award interpretation.
 */

export type UserType = 'casual' | 'fulltime' | 'parttime';

export interface AwardCalculationInput {
  baseRate: number; // Base hourly rate in dollars
  startTime: Date; // Shift start time
  endTime: Date; // Shift end time
  userType?: UserType; // Employment type: 'casual' (default), 'fulltime', or 'parttime'
}

export interface AwardLineItem {
  type: 'BASE_PAY' | 'CASUAL_LOADING' | 'SUNDAY_PENALTY' | 'SATURDAY_PENALTY' | 'LATE_NIGHT_LOADING' | 'NIGHT_LOADING';
  description: string;
  hours: number;
  rate: number; // Rate per hour in dollars
  amountCents: number; // Amount in cents
}

export interface AwardCalculationResult {
  grossPayCents: number; // Total gross pay in cents
  basePayCents: number; // Base pay in cents
  penaltyPayCents: number; // Total penalty pay in cents (Sunday + Late Night)
  lineItems: AwardLineItem[]; // Detailed breakdown
  hoursWorked: number; // Total hours worked
}

/**
 * Check if a date falls on a specific day of week (0 = Sunday, 6 = Saturday)
 */
function isDayOfWeek(date: Date, day: number): boolean {
  return date.getDay() === day;
}

function isSunday(date: Date): boolean {
  return isDayOfWeek(date, 0);
}

function isSaturday(date: Date): boolean {
  return isDayOfWeek(date, 6);
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
}

/**
 * Check if a time falls within late night hours (7pm-12am) on weekdays
 */
function isLateNightHour(date: Date): boolean {
  if (!isWeekday(date)) return false;
  const hour = date.getHours();
  return hour >= 19 && hour < 24; // 7pm to 11:59pm
}

/**
 * Check if a time falls within night hours (12am-7am) on weekdays
 */
function isNightHour(date: Date): boolean {
  if (!isWeekday(date)) return false;
  const hour = date.getHours();
  return hour >= 0 && hour < 7; // 12am to 6:59am
}

/**
 * Calculate hours worked in a specific time period
 * Returns hours as a decimal (e.g., 2.5 for 2 hours 30 minutes)
 */
function calculateHoursInPeriod(
  startTime: Date,
  endTime: Date,
  isInPeriod: (date: Date) => boolean
): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (start >= end) {
    return 0;
  }

  let hours = 0;
  const current = new Date(start);
  
  // Iterate through each hour
  while (current < end) {
    const nextHour = new Date(current);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    
    const periodStart = current > start ? current : start;
    const periodEnd = nextHour < end ? nextHour : end;
    
    if (isInPeriod(periodStart)) {
      const periodHours = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
      hours += periodHours;
    }
    
    current.setHours(current.getHours() + 1);
  }
  
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate award-based gross pay for a shift (2026 HIGA Rates)
 */
export function calculateGrossPay(input: AwardCalculationInput): AwardCalculationResult {
  const { baseRate, startTime, endTime, userType = 'casual' } = input;
  
  // Convert to Date objects if needed
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Calculate total hours worked
  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const hoursWorked = Math.round(totalHours * 100) / 100; // Round to 2 decimal places
  
  const lineItems: AwardLineItem[] = [];
  let basePayCents = 0;
  let penaltyPayCents = 0;
  
  // Determine if shift spans multiple days
  const isSundayShift = isSunday(start);
  const isSaturdayShift = isSaturday(start);
  const isWeekdayShift = isWeekday(start);
  
  // 2026 HIGA Rates
  const CASUAL_LOADING_PERCENT = 0.25; // 25%
  const SUNDAY_PENALTY_FT_PT = 1.5; // 150%
  const SUNDAY_PENALTY_CASUAL = 1.75; // 175%
  const SATURDAY_PENALTY_FT_PT = 1.25; // 125%
  const SATURDAY_PENALTY_CASUAL = 1.5; // 150%
  const LATE_NIGHT_LOADING = 2.81; // $2.81/hr (7pm-12am Mon-Fri)
  const NIGHT_LOADING = 4.22; // $4.22/hr (12am-7am Mon-Fri)
  
  // Calculate effective base rate (with casual loading if applicable)
  let effectiveBaseRate = baseRate;
  if (userType === 'casual') {
    effectiveBaseRate = baseRate * (1 + CASUAL_LOADING_PERCENT);
    // Add casual loading as a separate line item
    const casualLoadingCents = Math.round(hoursWorked * baseRate * CASUAL_LOADING_PERCENT * 100);
    lineItems.push({
      type: 'CASUAL_LOADING',
      description: `Casual Loading (25%) - ${hoursWorked.toFixed(2)} hours`,
      hours: hoursWorked,
      rate: baseRate * CASUAL_LOADING_PERCENT,
      amountCents: casualLoadingCents,
    });
    penaltyPayCents += casualLoadingCents;
  }
  
  // Calculate pay based on day of week
  if (isSundayShift) {
    // Sunday: Apply penalty rate to all hours
    const penaltyMultiplier = userType === 'casual' ? SUNDAY_PENALTY_CASUAL : SUNDAY_PENALTY_FT_PT;
    const sundayRate = baseRate * penaltyMultiplier;
    const sundayAmountCents = Math.round(hoursWorked * sundayRate * 100);
    
    lineItems.push({
      type: 'SUNDAY_PENALTY',
      description: `Sunday Penalty (${(penaltyMultiplier * 100).toFixed(0)}%) - ${hoursWorked.toFixed(2)} hours`,
      hours: hoursWorked,
      rate: sundayRate,
      amountCents: sundayAmountCents,
    });
    
    penaltyPayCents += sundayAmountCents;
    
    // Base pay is 0 on Sunday (all pay is penalty)
    basePayCents = 0;
  } else if (isSaturdayShift) {
    // Saturday: Apply penalty rate to all hours
    const penaltyMultiplier = userType === 'casual' ? SATURDAY_PENALTY_CASUAL : SATURDAY_PENALTY_FT_PT;
    const saturdayRate = baseRate * penaltyMultiplier;
    const saturdayAmountCents = Math.round(hoursWorked * saturdayRate * 100);
    
    lineItems.push({
      type: 'SATURDAY_PENALTY',
      description: `Saturday Penalty (${(penaltyMultiplier * 100).toFixed(0)}%) - ${hoursWorked.toFixed(2)} hours`,
      hours: hoursWorked,
      rate: saturdayRate,
      amountCents: saturdayAmountCents,
    });
    
    penaltyPayCents += saturdayAmountCents;
    
    // Base pay is 0 on Saturday (all pay is penalty)
    basePayCents = 0;
  } else if (isWeekdayShift) {
    // Weekday: Base pay + time-based loadings
    basePayCents = Math.round(hoursWorked * baseRate * 100);
    
    lineItems.push({
      type: 'BASE_PAY',
      description: `Base Pay - ${hoursWorked.toFixed(2)} hours`,
      hours: hoursWorked,
      rate: baseRate,
      amountCents: basePayCents,
    });
    
    // Calculate late night hours (7pm-12am Mon-Fri)
    const lateNightHours = calculateHoursInPeriod(
      start,
      end,
      (date) => isLateNightHour(date)
    );
    
    if (lateNightHours > 0) {
      const lateNightAmountCents = Math.round(lateNightHours * LATE_NIGHT_LOADING * 100);
      lineItems.push({
        type: 'LATE_NIGHT_LOADING',
        description: `Late Night Loading (7pm-12am) - ${lateNightHours.toFixed(2)} hours @ $${LATE_NIGHT_LOADING.toFixed(2)}/hr`,
        hours: lateNightHours,
        rate: LATE_NIGHT_LOADING,
        amountCents: lateNightAmountCents,
      });
      penaltyPayCents += lateNightAmountCents;
    }
    
    // Calculate night hours (12am-7am Mon-Fri)
    const nightHours = calculateHoursInPeriod(
      start,
      end,
      (date) => isNightHour(date)
    );
    
    if (nightHours > 0) {
      const nightAmountCents = Math.round(nightHours * NIGHT_LOADING * 100);
      lineItems.push({
        type: 'NIGHT_LOADING',
        description: `Night Loading (12am-7am) - ${nightHours.toFixed(2)} hours @ $${NIGHT_LOADING.toFixed(2)}/hr`,
        hours: nightHours,
        rate: NIGHT_LOADING,
        amountCents: nightAmountCents,
      });
      penaltyPayCents += nightAmountCents;
    }
  } else {
    // Other days (shouldn't happen, but fallback to base pay)
    basePayCents = Math.round(hoursWorked * baseRate * 100);
    lineItems.push({
      type: 'BASE_PAY',
      description: `Base Pay - ${hoursWorked.toFixed(2)} hours`,
      hours: hoursWorked,
      rate: baseRate,
      amountCents: basePayCents,
    });
  }
  
  const grossPayCents = basePayCents + penaltyPayCents;
  
  return {
    grossPayCents,
    basePayCents,
    penaltyPayCents,
    lineItems,
    hoursWorked,
  };
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use calculateGrossPay instead
 */
export function calculateAwardPay(input: AwardCalculationInput): AwardCalculationResult {
  return calculateGrossPay(input);
}

/**
 * Format award calculation result for display
 */
export function formatAwardCalculation(result: AwardCalculationResult): {
  grossPay: string;
  basePay: string;
  penaltyPay: string;
  lineItems: Array<{
    type: string;
    description: string;
    amount: string;
  }>;
} {
  return {
    grossPay: `$${(result.grossPayCents / 100).toFixed(2)}`,
    basePay: `$${(result.basePayCents / 100).toFixed(2)}`,
    penaltyPay: `$${(result.penaltyPayCents / 100).toFixed(2)}`,
    lineItems: result.lineItems.map(item => ({
      type: item.type,
      description: item.description,
      amount: `$${(item.amountCents / 100).toFixed(2)}`,
    })),
  };
}
