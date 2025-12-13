import { apiRequest } from './queryClient';

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, opts?: { status?: number; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

function parseStatus(message: string): number | undefined {
  const match = message.match(/^(\d{3}):/);
  if (!match) return undefined;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : undefined;
}

function toApiError(error: unknown, context?: string): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof Error) {
    const status = parseStatus(error.message);
    const message = context ? `${context}: ${error.message}` : error.message;
    const apiError = new ApiError(message, { status });
    // Preserve auth signaling flags used by queryClient.ts
    (apiError as any).isAuthError = (error as any).isAuthError;
    (apiError as any).shouldNotReload = (error as any).shouldNotReload;
    return apiError;
  }

  return new ApiError(context ? `${context}: Unknown error` : 'Unknown error');
}

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

export interface JobFilterParams {
  city?: string;
  date?: string;
  limit?: number;
  offset?: number;
  search?: string;
  role?: 'barber' | 'hairdresser' | 'stylist' | 'other';
  minRate?: number;
  maxRate?: number;
  startDate?: string;
  endDate?: string;
  radius?: number;
  lat?: number;
  lng?: number;
}

/**
 * Update the current user's profile
 * @param data - Profile data to update (avatarUrl, bannerUrl, displayName, bio, phone, location)
 * @returns Promise resolving to the updated user object
 */
export async function updateUserProfile(data: UpdateProfileData | FormData) {
  try {
    const response = await apiRequest('PUT', '/api/me', data);
    return await safeJson(response, null);
  } catch (error) {
    throw toApiError(error, 'updateUserProfile');
  }
}

export interface UpdateBusinessProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  logoUrl?: string;
}

/**
 * Update the current business profile
 * @param data - Business profile data to update (avatarUrl/logoUrl, bannerUrl, displayName, bio, phone, location)
 * @returns Promise resolving to the updated user object
 */
export async function updateBusinessProfile(data: UpdateBusinessProfileData | FormData) {
  try {
    const response = await apiRequest('PUT', '/api/me', data);
    return await safeJson(response, null);
  } catch (error) {
    throw toApiError(error, 'updateBusinessProfile');
  }
}

export async function fetchJobs(params: JobFilterParams = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    const res = await apiRequest('GET', `/api/jobs?${query.toString()}`);
    const data = await safeJson<any>(res, []);
    return Array.isArray(data) ? data : (data?.data || []);
  } catch {
    return [];
  }
}

export async function fetchShifts(params: { status?: 'open' | 'filled' | 'completed'; limit?: number; offset?: number } = {}) {
  try {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());
    const res = await apiRequest('GET', `/api/shifts?${query.toString()}`);
    const data = await safeJson<any>(res, []);
    return Array.isArray(data) ? data : (data?.data || []);
  } catch {
    return [];
  }
}

export interface JobDetails {
  id: string;
  title: string;
  description: string;
  payRate: string | number;
  date: string;
  location: string | { city: string; state: string };
  skillsRequired?: string[];
  payType: 'hourly' | 'daily' | 'fixed';
  businessId: string;
  hubId?: string;
  applicants?: string[];
}

export async function getJobDetails(jobId: string): Promise<JobDetails> {
  try {
    const res = await apiRequest('GET', `/api/jobs/${jobId}`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'getJobDetails');
  }
}

export interface CreateJobData {
  title: string;
  description: string;
  payRate: string | number;
  date: string;
  location: string | { city: string; state: string };
  skillsRequired?: string[];
  payType: 'hourly' | 'daily' | 'fixed';
  startTime?: string;
  endTime?: string;
}

export async function createJob(data: CreateJobData) {
  try {
    const res = await apiRequest('POST', '/api/jobs', data);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createJob');
  }
}

export interface CreateApplicationData {
  jobId?: string;
  shiftId?: string;
  coverLetter?: string;
}

export async function createApplication(data: CreateApplicationData) {
  try {
    const res = await apiRequest('POST', '/api/applications', data);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createApplication');
  }
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

export interface MyJob {
  id: string;
  title: string;
  shopName?: string;
  payRate: string | number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  location: string | null;
  applicationCount: number;
  createdAt: string;
}

export async function fetchMyJobs(): Promise<MyJob[]> {
  try {
    const res = await apiRequest('GET', '/api/me/jobs');
    return await safeJson(res, [] as MyJob[]);
  } catch {
    return [];
  }
}

export async function fetchShopShifts(userId: string): Promise<MyJob[]> {
  try {
    const res = await apiRequest('GET', `/api/shifts/shop/${userId}`);
    const listings = await safeJson<any>(res, []);
    const arr = Array.isArray(listings) ? listings : [];
    return arr.map((item: any) => ({
      id: item.id,
      title: item.title,
      shopName: item.shopName,
      payRate: item.payRate,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status,
      location: item.location,
      applicationCount: item.applicationCount || 0,
      createdAt: item.createdAt || new Date().toISOString(),
      _type: item._type,
      employerId: item.employerId,
      businessId: item.businessId,
      description: item.description || item.requirements,
      skillsRequired: item.skillsRequired || [],
    }));
  } catch {
    return [];
  }
}

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}

export async function getJobApplications(jobId: string): Promise<JobApplication[]> {
  try {
    const res = await apiRequest('GET', `/api/jobs/${jobId}/applications`);
    return await safeJson(res, [] as JobApplication[]);
  } catch {
    return [];
  }
}

export interface ShiftApplication {
  id: string;
  name: string;
  email: string;
  coverLetter: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  respondedAt: string | null;
  userId?: string;
  applicant?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    displayName: string;
    rating: number | null;
  } | null;
}

export async function getShiftApplications(shiftId: string): Promise<ShiftApplication[]> {
  try {
    const res = await apiRequest('GET', `/api/shifts/${shiftId}/applications`);
    return await safeJson(res, [] as ShiftApplication[]);
  } catch {
    return [];
  }
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'pending' | 'accepted' | 'rejected'
): Promise<{ id: string; status: string }> {
  try {
    const res = await apiRequest('PUT', `/api/applications/${applicationId}/status`, { status });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'updateApplicationStatus');
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  try {
    await apiRequest('DELETE', `/api/jobs/${jobId}`);
  } catch (error) {
    throw toApiError(error, 'deleteJob');
  }
}

export async function deleteShift(shiftId: string): Promise<void> {
  try {
    await apiRequest('DELETE', `/api/shifts/${shiftId}`);
  } catch (error) {
    throw toApiError(error, 'deleteShift');
  }
}

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

export async function createShift(shiftData: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string | number;
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

// Shift offer functions
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

export async function fetchShiftOffers(): Promise<ShiftOffer[]> {
  try {
    const res = await apiRequest('GET', '/api/shifts/offers/me');
    return await safeJson(res, [] as ShiftOffer[]);
  } catch {
    return [];
  }
}

// Shift review functions
export interface ShiftReview {
  id: string;
  shiftId: string;
  reviewerId: string;
  revieweeId: string;
  type: 'SHOP_REVIEWING_BARBER' | 'BARBER_REVIEWING_SHOP';
  rating: number;
  comment?: string;
  createdAt: string;
}

export async function submitShiftReview(
  shiftId: string,
  reviewData: {
    rating: number;
    comment?: string;
    type: 'SHOP_REVIEWING_BARBER' | 'BARBER_REVIEWING_SHOP';
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

// Get shifts pending review for the current user
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

export async function applyToShift(shiftId: string): Promise<{ message: string; shift?: any; application?: any; instantAccept: boolean }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/apply`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'applyToShift');
  }
}

export async function decideApplication(
  applicationId: string,
  decision: 'APPROVED' | 'DECLINED'
): Promise<{ message: string; application: any }> {
  try {
    const res = await apiRequest('POST', `/api/applications/${applicationId}/decide`, { decision });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'decideApplication');
  }
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

export async function createReview(data: CreateReviewData): Promise<Review> {
  try {
    const res = await apiRequest('POST', '/api/reviews', data);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createReview');
  }
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export async function createCheckoutSession(priceId: string): Promise<CheckoutSessionResponse> {
  try {
    // Backend endpoint: POST /api/subscriptions/checkout { planId }
    const res = await apiRequest('POST', '/api/subscriptions/checkout', { planId: priceId });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'createCheckoutSession');
  }
}

export async function createPortalSession(): Promise<{ url: string }> {
  // No portal endpoint is currently implemented in the API package.
  // Keep a standardized error so UI can surface a friendly message if/when used.
  throw new ApiError('createPortalSession: Not implemented', { status: 501 });
}

// --- Stubs for E2E Testing & Future Implementation ---

// Type alias for ApplicationData (used in job-details.tsx)
export interface ApplicationData {
  /** Optional cover letter sent with the application */
  coverLetter?: string;
  /** Legacy/UI-only fields (backend derives identity from auth) */
  name?: string;
  email?: string;
  type?: string;
}

// Notifications
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

/**
 * Fetch notifications for the current user
 * @param limit - Maximum number of notifications to return (default: 50)
 */
export const fetchNotifications = async (limit: number = 50): Promise<Notification[]> => {
  try {
    const query = new URLSearchParams();
    if (limit) query.append('limit', limit.toString());
    const res = await apiRequest('GET', `/api/notifications?${query.toString()}`);
    return await safeJson(res, [] as Notification[]);
  } catch {
    return [];
  }
};

/**
 * Mark a single notification as read
 * @param id - Notification ID
 */
export const markNotificationAsRead = async (id: string): Promise<{ id: string; isRead: boolean }> => {
  try {
    const res = await apiRequest('PATCH', `/api/notifications/${id}/read`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'markNotificationAsRead');
  }
};

/**
 * Mark all notifications as read for the current user
 */
export const markAllNotificationsAsRead = async (): Promise<{ count: number }> => {
  try {
    const res = await apiRequest('PATCH', '/api/notifications/read-all');
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'markAllNotificationsAsRead');
  }
};

/**
 * Get unread notification count
 */
export const fetchUnreadNotificationCount = async (): Promise<number> => {
  try {
    const res = await apiRequest('GET', '/api/notifications/unread-count');
    const data = await safeJson<any>(res, {});
    return data?.count || 0;
  } catch {
    return 0;
  }
};

// Job Board
export const fetchJobDetails = async (id: string): Promise<JobDetails> => {
  return await getJobDetails(id);
};

export const applyToJob = async (
  jobId: string,
  data: ApplicationData
): Promise<{ id: string; status: string }> => {
  try {
    const res = await apiRequest('POST', '/api/applications', {
      jobId,
      coverLetter: data.coverLetter,
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'applyToJob');
  }
};

// Shift Details
export interface ShiftDetails {
  id: string;
  title: string;
  description: string;
  hourlyRate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  status: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled';
  employerId: string;
  assigneeId?: string | null;
  shopName?: string | null;
  shopAvatarUrl?: string | null;
  requirements?: string[];
  createdAt: string;
  updatedAt: string;
  // Frontend compatibility fields
  rate?: string;
  payRate?: string;
  date?: string;
  businessId?: string;
  hubId?: string;
}

export async function fetchShiftDetails(id: string): Promise<ShiftDetails> {
  try {
    const res = await apiRequest('GET', `/api/shifts/${id}`);
    const shift = await res.json();

    // Normalize the shift data for frontend compatibility
    return {
      ...shift,
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

export const fetchMyApplications = async (): Promise<Application[]> => {
  try {
    const res = await apiRequest('GET', '/api/applications');
    return await safeJson(res, [] as Application[]);
  } catch {
    return [];
  }
};

export const fetchJobApplications = async (jobId: string): Promise<JobApplication[]> => {
  return await getJobApplications(jobId);
};

// Social / Community
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

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  try {
    const res = await apiRequest('GET', `/api/reviews/${userId}`);
    return await safeJson(res, [] as Review[]);
  } catch {
    return [];
  }
}

// Subscription
export const cancelSubscription = async (): Promise<boolean> => {
  try {
    await apiRequest('POST', '/api/subscriptions/cancel');
    return true;
  } catch (error) {
    throw toApiError(error, 'cancelSubscription');
  }
};