/**
 * Analytics & Venue metrics API functions
 * Extracted from api.ts for domain separation
 */
import { apiRequest } from '../queryClient';

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

// Worker Recommendations
export interface ShiftRecommendation {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  location: string | null;
  lat: string | null;
  lng: string | null;
  distanceKm: number;
  matchReason: string;
  score: number;
  venue: {
    id: string;
    name: string;
    averageRating: number | null;
    reviewCount: number;
  };
  createdAt: string;
}

export interface WorkerRecommendations {
  recommendations: ShiftRecommendation[];
  count: number;
}

/**
 * Fetch personalized shift recommendations for the current worker
 */
export async function fetchWorkerRecommendations(
  lat?: number,
  lng?: number
): Promise<WorkerRecommendations> {
  try {
    const params = new URLSearchParams();
    if (lat !== undefined) params.append('lat', lat.toString());
    if (lng !== undefined) params.append('lng', lng.toString());

    const queryString = params.toString();
    const url = `/api/worker/recommendations${queryString ? `?${queryString}` : ''}`;
    const res = await apiRequest('GET', url);
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'fetchWorkerRecommendations');
  }
}

// Priority Boost
export interface PriorityBoostStatus {
  hasActiveBoost: boolean;
  token?: {
    id: string;
    grantedAt: string;
    expiresAt: string;
    hoursRemaining: number;
  };
  shift?: {
    id: string;
    title: string;
    startTime: string;
  };
  boostMultiplier?: number;
  message?: string;
}

/**
 * Fetch active priority boost status for the current worker
 */
export async function fetchPriorityBoostStatus(): Promise<PriorityBoostStatus> {
  try {
    const res = await apiRequest('GET', '/api/worker/priority-boost');
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'fetchPriorityBoostStatus');
  }
}

// Calendar Sync
export interface CalendarSyncResponse {
  calendarUrl: string;
  token: string;
  message: string;
}

/**
 * Get calendar sync URL for worker's shifts
 */
export async function getCalendarSyncUrl(): Promise<CalendarSyncResponse> {
  try {
    const res = await apiRequest('GET', '/api/worker/calendar/sync');
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'getCalendarSyncUrl');
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

// Enterprise Leads
export interface EnterpriseLeadData {
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  numberOfLocations?: number;
  inquiryType?: 'enterprise_plan' | 'custom_solution' | 'partnership' | 'general';
  message?: string;
}

export interface EnterpriseLeadResponse {
  success: boolean;
  message: string;
  leadId: string;
}

/**
 * Submit an enterprise lead from the ContactSalesForm
 */
export async function submitEnterpriseLead(data: EnterpriseLeadData): Promise<EnterpriseLeadResponse> {
  try {
    const res = await apiRequest('POST', '/api/leads/enterprise', data);
    return await res.json();
  } catch (error) {
    throw toApiErrorFromModule(error, 'submitEnterpriseLead');
  }
}
