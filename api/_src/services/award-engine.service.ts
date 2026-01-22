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
 * Calculate award-based gross pay for a shift
 */
export function calculateAwardPay(input: AwardCalculationInput): AwardCalculationResult {
  const { baseRate, startTime, endTime } = input;
  
  // Convert to Date objects if needed
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Calculate total hours worked
  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const hoursWorked = Math.round(totalHours * 100) / 100; // Round to 2 decimal places
  
  const lineItems: AwardLineItem[] = [];
  let basePayCents = 0;
  let penaltyPayCents = 0;
  
  // Check if shift is on Sunday
  const isSundayShift = isSunday(start);
  
  if (isSundayShift) {
    // Sunday: All hours get 1.5x penalty
    const sundayHours = hoursWorked;
    const sundayRate = baseRate * 1.5;
    const sundayAmountCents = Math.round(sundayHours * sundayRate * 100);
    
    lineItems.push({
      type: 'SUNDAY_PENALTY',
      description: `Sunday Penalty (1.5x) - ${sundayHours.toFixed(2)} hours`,
      hours: sundayHours,
      rate: sundayRate,
      amountCents: sundayAmountCents,
    });
    
    penaltyPayCents += sundayAmountCents;
  } else {
    // Regular day: Calculate base pay and late night loading separately
    // Base pay for all hours
    basePayCents = Math.round(hoursWorked * baseRate * 100);
    
    lineItems.push({
      type: 'BASE_PAY',
      description: `Base Pay - ${hoursWorked.toFixed(2)} hours`,
      hours: hoursWorked,
      rate: baseRate,
      amountCents: basePayCents,
    });
    
    // Calculate late night hours (10pm-6am)
    const lateNightHours = calculateHoursInPeriod(
      start,
      end,
      (date) => isLateNightHour(date.getHours())
    );
    
    if (lateNightHours > 0) {
      // Late night loading: Additional 10% on top of base rate
      const lateNightRate = baseRate * 0.1; // 10% loading
      const lateNightAmountCents = Math.round(lateNightHours * lateNightRate * 100);
      
      lineItems.push({
        type: 'LATE_NIGHT_LOADING',
        description: `Late Night Loading (10pm-6am) - ${lateNightHours.toFixed(2)} hours @ 10%`,
        hours: lateNightHours,
        rate: lateNightRate,
        amountCents: lateNightAmountCents,
      });
      
      penaltyPayCents += lateNightAmountCents;
    }
  }
  
  // If Sunday shift, base pay is 0 (all pay is penalty)
  // Otherwise, base pay is already calculated above
  const grossPayCents = basePayCents + penaltyPayCents;
  
  return {
    grossPayCents,
    basePayCents: isSundayShift ? 0 : basePayCents,
    penaltyPayCents,
    lineItems,
    hoursWorked,
  };
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
