/**
 * Professional-specific analytics API functions
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
