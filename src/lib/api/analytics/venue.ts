/**
 * Venue-specific analytics API functions
 * Extracted from analytics.ts for domain separation
 */
import { apiRequest } from '../../queryClient';

function toApiErrorFromModule(error: unknown, context: string): Error {
  if (error instanceof Error) {
    const wrapped = new Error(`${context}: ${error.message}`);
    (wrapped as any).isAuthError = (error as any).isAuthError;
    (wrapped as any).shouldNotReload = (error as any).shouldNotReload;
    return wrapped;
  }
  return new Error(`${context}: Unknown error`);
}

export interface VenueAnalytics {
  period: {
    startDate: string;
    endDate: string;
    range: '30d' | '3m' | 'ytd';
  };
  metrics: {
    totalSpend: number;
    totalSpendChange: number;
    fillRate: number;
    fillRateChange: number;
    reliabilityScore: number;
    reliabilityChange: number;
    totalShifts: number;
    filledOrCompletedShifts: number;
    shiftsWithActualStart: number;
    reliableShifts: number;
  };
  spendOverTime: Array<{
    date: string;
    spend: number;
  }>;
}

/**
 * Fetch venue analytics for the current user's venue
 * @param range - Date range: '30d' (default), '3m', or 'ytd'
 */
export async function fetchVenueAnalytics(range: '30d' | '3m' | 'ytd' = '30d'): Promise<VenueAnalytics> {
  try {
    const res = await apiRequest('GET', `/api/venues/me/analytics?range=${range}`);
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'fetchVenueAnalytics');
  }
}

// Roster Finance (Business only)
export interface RosterTotals {
  totalHours: number;
  totalCost: number;
  currency: string;
}

/**
 * Fetch roster wage totals for the visible period (business users only)
 */
export async function fetchRosterTotals(startDate: Date, endDate: Date): Promise<RosterTotals> {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  const res = await apiRequest('GET', `/api/venues/me/roster-totals?${params.toString()}`);
  return res.json();
}

/**
 * Update staff member's base hourly rate (business owners only)
 */
export async function updateStaffPayRate(
  staffId: string,
  baseHourlyRate: number | null,
  currency?: string
): Promise<{ id: string; baseHourlyRate: number | null; currency: string }> {
  const body: { baseHourlyRate?: number | null; currency?: string } = {};
  if (baseHourlyRate !== undefined) body.baseHourlyRate = baseHourlyRate;
  if (currency !== undefined) body.currency = currency;
  const res = await apiRequest('PATCH', `/api/users/${staffId}/pay-rate`, body);
  return res.json();
}
