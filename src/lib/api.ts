import { apiRequest } from './queryClient';

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
  // Check if data is FormData
  const isFormData = data instanceof FormData;
  
  // If FormData, use it directly. Otherwise, use the data as-is (will be JSON stringified)
  const response = await apiRequest('PUT', '/api/me', data);
  // apiRequest already throws on non-OK responses, so we can safely parse JSON
  return response.json();
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
  // Check if data is FormData
  const isFormData = data instanceof FormData;
  
  // If FormData, use it directly. Otherwise, use the data as-is (will be JSON stringified)
  const response = await apiRequest('PUT', '/api/me', data);
  // apiRequest already throws on non-OK responses, so we can safely parse JSON
  return response.json();
}

export async function fetchJobs(params: JobFilterParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });
  const res = await apiRequest('GET', `/api/jobs?${query.toString()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
}

export async function fetchShifts(params: { status?: 'open' | 'filled' | 'completed'; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.offset) query.append('offset', params.offset.toString());
  const res = await apiRequest('GET', `/api/shifts?${query.toString()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
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
  const res = await apiRequest('GET', `/api/jobs/${jobId}`);
  return res.json();
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
  const res = await apiRequest('POST', '/api/jobs', data);
  return res.json();
}

export interface CreateApplicationData {
  jobId?: string;
  shiftId?: string;
  coverLetter?: string;
}

export async function createApplication(data: CreateApplicationData) {
  const res = await apiRequest('POST', '/api/applications', data);
  return res.json();
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
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.jobId) query.append('jobId', params.jobId);
  if (params.shiftId) query.append('shiftId', params.shiftId);
  const res = await apiRequest('GET', `/api/applications?${query.toString()}`);
  return res.json();
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
  const res = await apiRequest('GET', '/api/me/jobs');
  return res.json();
}

export async function fetchShopShifts(userId: string): Promise<MyJob[]> {
  const res = await apiRequest('GET', `/api/shifts/shop/${userId}`);
  const listings = await res.json();
  return listings.map((item: any) => ({
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
    skillsRequired: item.skillsRequired || []
  }));
}

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}

export async function getJobApplications(jobId: string): Promise<JobApplication[]> {
  const res = await apiRequest('GET', `/api/jobs/${jobId}/applications`);
  return res.json();
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'pending' | 'accepted' | 'rejected'
): Promise<{ id: string; status: string }> {
  const res = await apiRequest('PUT', `/api/applications/${applicationId}/status`, { status });
  return res.json();
}

export async function deleteJob(jobId: string): Promise<void> {
  await apiRequest('DELETE', `/api/jobs/${jobId}`);
}

export async function deleteShift(shiftId: string): Promise<void> {
  await apiRequest('DELETE', `/api/shifts/${shiftId}`);
}

export async function updateJobStatus(
  jobId: string,
  status: 'open' | 'filled' | 'closed' | 'completed'
): Promise<{ id: string; status: string }> {
  const res = await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { status });
  return res.json();
}

export async function createShift(shiftData: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string | number;
  status?: 'draft' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed';
  location?: string;
  assigneeId?: string;
}) {
  const res = await apiRequest('POST', '/api/shifts', shiftData);
  return res.json();
}

export async function updateShiftStatus(
  shiftId: string,
  status: 'draft' | 'invited' | 'open' | 'filled' | 'completed'
): Promise<{ id: string; status: string }> {
  const res = await apiRequest('PATCH', `/api/shifts/${shiftId}`, { status });
  return res.json();
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
  const res = await apiRequest('GET', '/api/shifts/offers/me');
  return res.json();
}

export async function acceptShiftOffer(shiftId: string): Promise<{ id: string; status: string }> {
  const res = await apiRequest('POST', `/api/shifts/${shiftId}/accept`);
  return res.json();
}

export async function declineShiftOffer(shiftId: string): Promise<{ id: string; status: string }> {
  const res = await apiRequest('POST', `/api/shifts/${shiftId}/decline`);
  return res.json();
}

export async function applyToShift(shiftId: string): Promise<{ message: string; shift?: any; application?: any; instantAccept: boolean }> {
  const res = await apiRequest('POST', `/api/shifts/${shiftId}/apply`);
  return res.json();
}

export async function decideApplication(
  applicationId: string,
  decision: 'APPROVED' | 'DECLINED'
): Promise<{ message: string; application: any }> {
  const res = await apiRequest('POST', `/api/applications/${applicationId}/decide`, { decision });
  return res.json();
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
  const res = await apiRequest('POST', '/api/reviews', data);
  return res.json();
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export async function createCheckoutSession(priceId: string): Promise<CheckoutSessionResponse> {
  const res = await apiRequest('POST', '/api/stripe/create-checkout-session', { priceId });
  return res.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  const res = await apiRequest('POST', '/api/stripe/create-portal-session');
  return res.json();
}

// --- Stubs for E2E Testing & Future Implementation ---

// Type alias for ApplicationData (used in job-details.tsx)
export type ApplicationData = CreateApplicationData;

// Notifications
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

/**
 * Fetch notifications for the current user
 * @param limit - Maximum number of notifications to return (default: 50)
 */
export const fetchNotifications = async (limit: number = 50): Promise<Notification[]> => {
  const query = new URLSearchParams();
  if (limit) query.append('limit', limit.toString());
  const res = await apiRequest('GET', `/api/notifications?${query.toString()}`);
  return res.json();
};

/**
 * Mark a single notification as read
 * @param id - Notification ID
 */
export const markNotificationAsRead = async (id: string): Promise<{ id: string; isRead: boolean }> => {
  const res = await apiRequest('PATCH', `/api/notifications/${id}/read`);
  return res.json();
};

/**
 * Mark all notifications as read for the current user
 */
export const markAllNotificationsAsRead = async (): Promise<{ count: number }> => {
  const res = await apiRequest('PATCH', '/api/notifications/read-all');
  return res.json();
};

/**
 * Get unread notification count
 */
export const fetchUnreadNotificationCount = async (): Promise<number> => {
  const res = await apiRequest('GET', '/api/notifications/unread-count');
  const data = await res.json();
  return data.count || 0;
};

// Job Board
export const fetchJobDetails = async (id: string): Promise<JobDetails> => { 
  return {} as JobDetails; 
};

export const applyToJob = async (id: string, data: ApplicationData): Promise<{ id: string; status: string }> => { 
  return { id: 'mock-application-id', status: 'pending' }; 
};

export const fetchMyApplications = async (): Promise<Application[]> => { return []; };

export const fetchJobApplications = async (): Promise<JobApplication[]> => { return []; };

// Social / Community
export const createConversation = async (userId: string): Promise<{ id: string }> => { 
  return { id: 'mock-conv-id' }; 
};

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const res = await apiRequest('GET', `/api/reviews/${userId}`);
  return res.json();
}

// Subscription
export const cancelSubscription = async (): Promise<boolean> => { return true; };