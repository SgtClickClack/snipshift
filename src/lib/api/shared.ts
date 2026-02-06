import { apiRequest } from '../queryClient';
import { toApiError, safeJson, ApiError } from './core';

// ===== INTERFACES =====

export interface JobDetails {
  id: string;
  title: string;
  description: string;
  payRate: string | number;
  rate?: string | number;
  hourlyRate?: string | number;
  date: string;
  startTime?: string;
  endTime?: string;
  location: string | { city: string; state: string };
  city?: string;
  state?: string;
  address?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  skillsRequired?: string[];
  requirements?: string[] | string;
  payType: 'hourly' | 'daily' | 'fixed';
  businessId: string;
  businessName?: string;
  shopName?: string;
  type?: string;
  hubId?: string;
  applicants?: string[];
  status?: 'open' | 'filled' | 'closed' | 'completed';
}

export interface CreateApplicationData {
  jobId?: string;
  shiftId?: string;
  /**
   * Backend expects `message` (CreateApplicationSchema).
   * `coverLetter` is kept for backward compatibility with older call sites.
   */
  message?: string;
  coverLetter?: string;
}

export interface Application {
  id: string;
  userId: string;
  jobId?: string;
  shiftId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  coverLetter?: string;
  appliedAt: string;
  job?: JobDetails;
  shift?: any;
}

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  userId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  coverLetter?: string;
  appliedAt: string;
}

export interface ShiftDetails {
  id: string;
  role?: string | null;
  title: string;
  description: string;
  hourlyRate: string;
  startTime: string;
  endTime: string;
  shiftLengthHours?: number | null;
  location?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  uniformRequirements?: string | null;
  rsaRequired?: boolean;
  expectedPax?: number | null;
  status:
    | 'draft'
    | 'pending'
    | 'invited'
    | 'open'
    | 'filled'
    | 'completed'
    | 'confirmed'
    | 'cancelled'
    | 'pending_completion';
  attendanceStatus?: 'pending' | 'completed' | 'no_show' | 'checked_in' | null;
  employerId: string;
  assigneeId?: string | null;
  shopName?: string | null;
  shopAvatarUrl?: string | null;
  assigneeName?: string | null;
  waitlistCount?: number | null;
  requirements?: string[];
  actualStartTime?: string | null;
  createdAt: string;
  updatedAt: string;
  // Frontend compatibility fields
  rate?: string;
  payRate?: string;
  date?: string;
  businessId?: string;
  hubId?: string;
}

export interface CreateReviewData {
  revieweeId: string;
  jobId: string;
  rating: number;
  comment?: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  jobId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
  };
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface ApplicationData {
  /** Optional cover letter sent with the application */
  coverLetter?: string;
  /** Legacy/UI-only fields (backend derives identity from auth) */
  name?: string;
  email?: string;
  type?: string;
}

// Review types - mapped from legacy DB enum names to semantic aliases
/** @description Venue reviewing a professional (legacy DB name: SHOP_REVIEWING_BARBER) */
export const REVIEW_TYPE_VENUE_TO_PROFESSIONAL = 'SHOP_REVIEWING_BARBER' as const;
/** @description Professional reviewing a venue (legacy DB name: BARBER_REVIEWING_SHOP) */
export const REVIEW_TYPE_PROFESSIONAL_TO_VENUE = 'BARBER_REVIEWING_SHOP' as const;

export type ReviewType = typeof REVIEW_TYPE_VENUE_TO_PROFESSIONAL | typeof REVIEW_TYPE_PROFESSIONAL_TO_VENUE;

// Shift review functions
export interface ShiftReview {
  id: string;
  shiftId: string;
  reviewerId: string;
  revieweeId: string;
  type: ReviewType;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ===== SHIFT CRUD =====

export async function fetchShifts(params: { 
  status?: 'open' | 'filled' | 'completed'; 
  limit?: number; 
  offset?: number;
  lat?: number;
  lng?: number;
  radius?: number;
} = {}) {
  try {
    // Use marketplace endpoint if location is provided for proximity search
    const useMarketplace = params.lat !== undefined && params.lng !== undefined;
    const endpoint = useMarketplace ? '/api/marketplace/shifts' : '/api/shifts';
    
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());
    
    // Add location parameters for marketplace endpoint
    if (useMarketplace) {
      query.append('lat', params.lat!.toString());
      query.append('lng', params.lng!.toString());
      if (params.radius) {
        query.append('radius', params.radius.toString());
      }
    }
    
    const res = await apiRequest('GET', `${endpoint}?${query.toString()}`);
    const data = await safeJson<any>(res, []);
    
    // Marketplace endpoint returns { shifts, pagination, searchParams }
    if (useMarketplace && data.shifts) {
      return data.shifts;
    }
    
    // Regular endpoint returns array or { data: [] }
    return Array.isArray(data) ? data : (data?.data || []);
  } catch {
    return [];
  }
}

export async function fetchShiftDetails(id: string): Promise<ShiftDetails> {
  try {
    const res = await apiRequest('GET', `/api/shifts/${id}`);
    const shift = await res.json();
    const latNum = shift?.lat === null || shift?.lat === undefined ? null : Number(shift.lat);
    const lngNum = shift?.lng === null || shift?.lng === undefined ? null : Number(shift.lng);
    const lat = Number.isFinite(latNum as number) ? (latNum as number) : null;
    const lng = Number.isFinite(lngNum as number) ? (lngNum as number) : null;

    // Normalize the shift data for frontend compatibility
    return {
      ...shift,
      lat,
      lng,
      rate: shift.hourlyRate,
      payRate: shift.hourlyRate,
      date: shift.startTime,
      businessId: shift.employerId,
      requirements: shift.description ? [shift.description] : [],
    };
  } catch (error) {
    throw toApiError(error, 'fetchShiftDetails');
  }
}

export async function createShift(shiftData: {
  role?: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string | number;
  uniformRequirements?: string;
  rsaRequired?: boolean;
  expectedPax?: number;
  status?: 'draft' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed';
  location?: string;
  lat?: number;
  lng?: number;
  assigneeId?: string;
}) {
  try {
    const res = await apiRequest('POST', '/api/shifts', shiftData);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createShift');
  }
}

export async function updateShiftTimes(
  shiftId: string,
  payload: { startTime: string; endTime: string; changeReason?: string }
): Promise<ShiftDetails> {
  try {
    const res = await apiRequest('PUT', `/api/shifts/${shiftId}`, payload);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'updateShiftTimes');
  }
}

export async function updateShiftStatus(
  shiftId: string,
  status: 'draft' | 'invited' | 'open' | 'filled' | 'completed'
): Promise<{ id: string; status: string }> {
  try {
    const res = await apiRequest('PATCH', `/api/shifts/${shiftId}`, { status });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'updateShiftStatus');
  }
}

export async function deleteShift(shiftId: string): Promise<void> {
  try {
    await apiRequest('DELETE', `/api/shifts/${shiftId}`);
  } catch (error) {
    throw toApiError(error, 'deleteShift');
  }
}

// ===== JOB CRUD =====

export async function getJobDetails(jobId: string): Promise<JobDetails> {
  try {
    const res = await apiRequest('GET', `/api/jobs/${jobId}`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'getJobDetails');
  }
}

export const fetchJobDetails = async (id: string): Promise<JobDetails> => {
  return await getJobDetails(id);
};

export async function updateJobStatus(
  jobId: string,
  status: 'open' | 'filled' | 'closed' | 'completed'
): Promise<{ id: string; status: string }> {
  try {
    const res = await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { status });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'updateJobStatus');
  }
}

// ===== APPLICATIONS =====

export async function createApplication(data: CreateApplicationData) {
  try {
    const message = (data.message ?? data.coverLetter ?? '').trim();
    const res = await apiRequest('POST', '/api/applications', {
      jobId: data.jobId,
      shiftId: data.shiftId,
      message,
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createApplication');
  }
}

export async function getApplications(params: { status?: string; jobId?: string; shiftId?: string } = {}) {
  try {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.jobId) query.append('jobId', params.jobId);
    if (params.shiftId) query.append('shiftId', params.shiftId);
    const res = await apiRequest('GET', `/api/applications?${query.toString()}`);
    return await safeJson(res, []);
  } catch {
    return [];
  }
}

export async function getJobApplications(jobId: string): Promise<JobApplication[]> {
  try {
    const res = await apiRequest('GET', `/api/jobs/${jobId}/applications`);
    return await safeJson(res, [] as JobApplication[]);
  } catch {
    return [];
  }
}

export const fetchJobApplications = async (jobId: string): Promise<JobApplication[]> => {
  return await getJobApplications(jobId);
};

export const applyToJob = async (
  jobId: string,
  data: ApplicationData
): Promise<{ id: string; status: string }> => {
  try {
    const res = await apiRequest('POST', '/api/applications', {
      jobId,
      message: (data.coverLetter ?? '').trim(),
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'applyToJob');
  }
};

// ===== REVIEWS =====

export async function submitShiftReview(
  shiftId: string,
  reviewData: {
    rating: number;
    comment?: string;
    type: ReviewType;
    markAsNoShow?: boolean;
  }
): Promise<ShiftReview> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/review`, reviewData);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'submitShiftReview');
  }
}

export async function createReview(data: CreateReviewData): Promise<Review> {
  try {
    const res = await apiRequest('POST', '/api/reviews', data);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createReview');
  }
}

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  try {
    const res = await apiRequest('GET', `/api/reviews/${userId}`);
    return await safeJson(res, [] as Review[]);
  } catch {
    return [];
  }
}

// ===== CONVERSATIONS =====

export const createConversation = async (data: {
  participant2Id: string;
  jobId?: string | null;
  shiftId?: string | null;
}): Promise<{ id: string }> => {
  try {
    const res = await apiRequest('POST', '/api/conversations', {
      participant2Id: data.participant2Id,
      ...(data.jobId ? { jobId: data.jobId } : {}),
      ...(data.shiftId ? { shiftId: data.shiftId } : {}),
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createConversation');
  }
};

// ===== SUBSCRIPTIONS =====

export async function createCheckoutSession(priceId: string): Promise<CheckoutSessionResponse> {
  try {
    // Backend endpoint: POST /api/subscriptions/checkout { planId }
    const res = await apiRequest('POST', '/api/subscriptions/checkout', { planId: priceId });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createCheckoutSession');
  }
}

export const cancelSubscription = async (): Promise<boolean> => {
  try {
    await apiRequest('POST', '/api/subscriptions/cancel');
    return true;
  } catch (error) {
    throw toApiError(error, 'cancelSubscription');
  }
};

export async function createPortalSession(): Promise<{ url: string }> {
  // No portal endpoint is currently implemented in the API package.
  // Keep a standardized error so UI can surface a friendly message if/when used.
  throw new ApiError('createPortalSession: Not implemented', { status: 501 });
}
