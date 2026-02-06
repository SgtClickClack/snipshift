import { apiRequest } from '../queryClient';
import { toApiError, safeJson, authenticatedFormDataRequest } from './core';
// Re-export Application from shared to avoid duplicate type definitions
export type { Application } from './shared';

// ===== INTERFACES =====

export interface ProfessionalListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  location: string | null;
}

export interface ShiftOffer {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  location: string | null;
  status: string;
  employerId: string;
  businessName: string;
  businessLogo: string | null;
  createdAt: string;
}

// ===== DIRECTORY =====

export async function fetchProfessionals(params: { search?: string; limit?: number; offset?: number } = {}): Promise<ProfessionalListItem[]> {
  try {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));
    const res = await apiRequest('GET', `/api/professionals?${query.toString()}`);
    const data = await safeJson<any>(res, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw toApiError(error, 'fetchProfessionals');
  }
}

// ===== NO-SHOW MANAGEMENT =====

export async function getNoShowHistory(): Promise<{ noShows: Array<{
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  employerName: string;
  createdAt: string;
}>; count: number }> {
  try {
    const res = await apiRequest('GET', '/api/worker/no-show-history');
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'getNoShowHistory');
  }
}

export async function appealNoShow(
  shiftId: string,
  certificateFile: File,
  additionalNotes?: string
): Promise<{ success: boolean; message: string; status: 'approved' | 'manual_review' }> {
  try {
    const formData = new FormData();
    formData.append('certificate', certificateFile);
    formData.append('shiftId', shiftId);
    if (additionalNotes) {
      formData.append('additionalNotes', additionalNotes);
    }

    const res = await apiRequest('POST', '/api/appeals/upload-certificate', formData);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'appealNoShow');
  }
}

// ===== WAITLIST =====

export async function joinWaitlist(shiftId: string): Promise<{ message: string; entry: { id: string; shiftId: string; rank: number; status: string } }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/waitlist`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'joinWaitlist');
  }
}

export async function leaveWaitlist(shiftId: string): Promise<{ message: string }> {
  try {
    const res = await apiRequest('DELETE', `/api/shifts/${shiftId}/waitlist`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'leaveWaitlist');
  }
}

export async function getWaitlistStatus(shiftId: string): Promise<{ isOnWaitlist: boolean; waitlistCount: number; maxWaitlistSize: number }> {
  try {
    const res = await apiRequest('GET', `/api/shifts/${shiftId}/waitlist`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'getWaitlistStatus');
  }
}

export async function getWaitlistedShifts(): Promise<{
  shifts: Array<{
    id: string;
    shiftId: string;
    rank: number;
    shift: {
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      location: string | null;
      hourlyRate: string;
      status: string;
    };
  }>;
  count: number;
}> {
  try {
    const res = await apiRequest('GET', '/api/worker/waitlisted-shifts');
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'getWaitlistedShifts');
  }
}

// ===== SHIFT OFFERS =====

export async function fetchShiftOffers(): Promise<ShiftOffer[]> {
  try {
    const res = await apiRequest('GET', '/api/shifts/offers/me');
    return await safeJson(res, [] as ShiftOffer[]);
  } catch {
    return [];
  }
}

export async function acceptShiftOffer(shiftId: string): Promise<{ id: string; status: string }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/accept`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'acceptShiftOffer');
  }
}

export async function declineShiftOffer(shiftId: string): Promise<{ id: string; status: string }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/decline`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'declineShiftOffer');
  }
}

// ===== APPLICATIONS =====

export async function applyToShift(shiftId: string): Promise<{ message: string; shift?: any; application?: any; instantAccept: boolean }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/apply`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'applyToShift');
  }
}

export const fetchMyApplications = async (): Promise<Application[]> => {
  try {
    const res = await apiRequest('GET', '/api/applications');
    return await safeJson(res, [] as Application[]);
  } catch {
    return [];
  }
};

// ===== SHIFT ACTIONS =====

/**
 * Check in to a shift with geofencing validation
 * @param shiftId - The shift ID to check in to
 * @param latitude - User's current latitude
 * @param longitude - User's current longitude
 * @returns Promise resolving to check-in response
 */
export async function checkInShift(
  shiftId: string,
  latitude: number,
  longitude: number
): Promise<{ success: boolean; actualStartTime: string; distance: number; message: string }> {
  try {
    const res = await apiRequest('PATCH', `/api/shifts/${shiftId}/check-in`, {
      latitude,
      longitude,
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'checkInShift');
  }
}

/**
 * Clock out of a shift with proof image upload
 * Uses the authenticatedFormDataRequest helper from core.ts
 * @param shiftId - The shift ID to clock out of
 * @param proofImageFile - Proof of completion image file
 * @returns Promise resolving to clock-out response
 */
export async function clockOutShift(
  shiftId: string,
  proofImageFile: File
): Promise<{ success: boolean; message: string; proofImageUrl: string; shift: any }> {
  try {
    const formData = new FormData();
    formData.append('proofImage', proofImageFile);

    const res = await authenticatedFormDataRequest('PATCH', `/api/shifts/${shiftId}/clock-out`, formData);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to clock out' }));
      throw new Error(error.message || 'Failed to clock out');
    }
    
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'clockOutShift');
  }
}

export async function reportLateArrival(shiftId: string, etaMinutes: number): Promise<{ message: string; etaMinutes: number; expectedArrivalTime: string }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/late-arrival`, {
      etaMinutes,
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'reportLateArrival');
  }
}

export async function acceptBackupShift(shiftId: string): Promise<{ message: string; shift: any }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/accept-backup`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'acceptBackupShift');
  }
}

export async function requestSubstitute(shiftId: string): Promise<{ message: string; shift: any; notifiedWorkers: number }> {
  try {
    const res = await apiRequest('PATCH', `/api/shifts/${shiftId}/request-substitute`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'requestSubstitute');
  }
}

// ===== REVIEWS =====

export async function fetchShiftsPendingReview(): Promise<Array<{
  id: string;
  title: string;
  endTime: string;
  employerId: string;
  assigneeId: string;
  employerName?: string;
  assigneeName?: string;
  status: string;
  attendanceStatus?: string;
}>> {
  try {
    const res = await apiRequest('GET', '/api/shifts/pending-review');
    return await safeJson(res, []);
  } catch {
    return [];
  }
}
