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
  role?: 'bartender' | 'waiter' | 'chef' | 'barista' | 'other';
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

export async function fetchEmployerShifts(params: { start?: string; end?: string } = {}): Promise<ShiftDetails[]> {
  try {
    const query = new URLSearchParams();
    query.append('employer_id', 'me');
    if (params.start) query.append('start', params.start);
    if (params.end) query.append('end', params.end);
    const res = await apiRequest('GET', `/api/shifts?${query.toString()}`);
    const data = await safeJson<any>(res, []);
    return Array.isArray(data) ? data : (data?.data || []);
  } catch (error) {
    throw toApiError(error, 'fetchEmployerShifts');
  }
}

export interface ProfessionalListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  location: string | null;
}

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
  /**
   * Backend expects `message` (CreateApplicationSchema).
   * `coverLetter` is kept for backward compatibility with older call sites.
   */
  message?: string;
  coverLetter?: string;
}

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
  userId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  coverLetter?: string;
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

export async function copyPreviousWeekShifts(payload: { start: string; end: string }): Promise<{ success: boolean; count: number }> {
  try {
    const res = await apiRequest('POST', '/api/shifts/copy-previous-week', payload);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'copyPreviousWeekShifts');
  }
}

export async function publishAllDraftShifts(payload: { start: string; end: string }): Promise<{ success: boolean; count: number }> {
  try {
    const res = await apiRequest('POST', '/api/shifts/publish-all', payload);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'publishAllDraftShifts');
  }
}

export interface GenerateFromTemplatesPayload {
  startDate: string;
  endDate: string;
  defaultHourlyRate?: string;
  defaultLocation?: string;
}

export interface GenerateFromTemplatesResult {
  success: boolean;
  created: number;
  skipped?: number;
  errors?: string[];
}

export interface GenerateFromTemplatesPreviewResult {
  estimatedCount: number;
  hasTemplates: boolean;
  error?: string;
}

/**
 * Preview how many shifts would be generated from templates (for confirmation modal)
 */
export async function previewGenerateFromTemplates(startDate: string, endDate: string): Promise<GenerateFromTemplatesPreviewResult> {
  try {
    const params = new URLSearchParams({ startDate, endDate });
    const res = await apiRequest('GET', `/api/shifts/generate-from-templates/preview?${params}`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'previewGenerateFromTemplates');
  }
}

/**
 * Generate OPEN shifts from Capacity Planner templates for a date range
 */
export async function generateFromTemplates(payload: GenerateFromTemplatesPayload): Promise<GenerateFromTemplatesResult> {
  try {
    const res = await apiRequest('POST', '/api/shifts/generate-from-templates', payload);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'generateFromTemplates');
  }
}

export async function clearAllShifts(): Promise<{ 
  success: boolean; 
  count: number; 
  shiftsDeleted: number;
  jobsDeleted: number;
  message: string;
}> {
  try {
    const res = await apiRequest('DELETE', '/api/shifts/clear-all');
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'clearAllShifts');
  }
}

export interface InviteATeamPayload {
  startDate: string;
  endDate: string;
  defaultHourlyRate?: string | number;
  defaultLocation?: string;
}

export interface InviteATeamResult {
  success: boolean;
  shiftsCreated: number;
  shiftsAssigned: number;
  invitationsSent: number;
  message: string;
  assignmentDetails?: Array<{
    shiftId: string;
    professionalId: string;
    professionalName: string;
    slotLabel: string;
    startTime: string;
    endTime: string;
  }>;
}

/**
 * Invite A-Team: Smart fill shifts with favorite professionals
 * Generates shifts from templates and assigns favorite staff members automatically
 */
export async function inviteATeam(payload: InviteATeamPayload): Promise<InviteATeamResult> {
  try {
    const res = await apiRequest('POST', '/api/shifts/invite-a-team', payload);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'inviteATeam');
  }
}

export interface GenerateRosterPayload {
  startDate: string;
  endDate: string;
  calendarSettings: {
    openingHours: Record<string, { open: string; close: string; enabled: boolean }>;
    shiftPattern: 'half-day' | 'thirds' | 'full-day' | 'custom';
    defaultShiftLength?: number;
  };
  defaultHourlyRate?: string | number;
  defaultLocation?: string;
  clearExistingDrafts?: boolean;
}

export interface GenerateRosterResult {
  success: boolean;
  created: number;
  deleted: number;
  message: string;
  shifts?: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

/**
 * Generate DRAFT roster slots from opening hours settings
 * This creates ghost slots on the calendar that can be clicked to assign staff
 */
export async function generateRoster(payload: GenerateRosterPayload): Promise<GenerateRosterResult> {
  try {
    const res = await apiRequest('POST', '/api/shifts/generate-roster', payload);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'generateRoster');
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

export async function requestSubstitute(shiftId: string): Promise<{ message: string; shift: any; notifiedWorkers: number }> {
  try {
    const res = await apiRequest('PATCH', `/api/shifts/${shiftId}/request-substitute`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'requestSubstitute');
  }
}

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

    const res = await apiRequest('POST', '/api/appeals/upload-certificate', formData, {
      skipContentType: true,
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'appealNoShow');
  }
}

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

export async function requestBackupFromWaitlist(shiftId: string): Promise<{ message: string; notifiedWorkers: number }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/request-backup`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'requestBackupFromWaitlist');
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
      message: (data.coverLetter ?? '').trim(),
    });
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'applyToJob');
  }
};

// Shift Details
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

/**
 * Check in to a shift with geofencing validation
 * @param shiftId - The shift ID to check in to
 * @param latitude - User's current latitude
 * @param longitude - User's current longitude
 * @returns Promise resolving to check-in response
 */
export async function clockOutShift(
  shiftId: string,
  proofImageFile: File
): Promise<{ success: boolean; message: string; proofImageUrl: string; shift: any }> {
  try {
    const formData = new FormData();
    formData.append('proofImage', proofImageFile);

    // Use fetch directly for FormData to ensure proper Content-Type handling
    const auth = (await import('./firebase')).auth;
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    
    const headers: Record<string, string> = {
      'X-HospoGo-CSRF': '1',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/shifts/${shiftId}/clock-out`, {
      method: 'PATCH',
      headers,
      body: formData,
      credentials: 'include',
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to clock out' }));
      throw new Error(error.message || 'Failed to clock out');
    }
    
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'clockOutShift');
  }
}

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
 * @param data - Lead form data
 * @returns Promise resolving to the submission response
 */
export async function submitEnterpriseLead(data: EnterpriseLeadData): Promise<EnterpriseLeadResponse> {
  try {
    const res = await apiRequest('POST', '/api/leads/enterprise', data);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'submitEnterpriseLead');
  }
}

// Venue Analytics
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
 * @returns Promise resolving to venue analytics data
 */
export async function fetchVenueAnalytics(range: '30d' | '3m' | 'ytd' = '30d'): Promise<VenueAnalytics> {
  try {
    const res = await apiRequest('GET', `/api/venues/me/analytics?range=${range}`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'fetchVenueAnalytics');
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
 * @param lat - Worker's latitude (optional, will use current location if available)
 * @param lng - Worker's longitude (optional, will use current location if available)
 * @returns Promise resolving to shift recommendations
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
    throw toApiError(error, 'fetchWorkerRecommendations');
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
 * @returns Promise resolving to priority boost status
 */
export async function fetchPriorityBoostStatus(): Promise<PriorityBoostStatus> {
  try {
    const res = await apiRequest('GET', '/api/worker/priority-boost');
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'fetchPriorityBoostStatus');
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
 * @returns Promise resolving to calendar sync URL and token
 */
export async function getCalendarSyncUrl(): Promise<CalendarSyncResponse> {
  try {
    const res = await apiRequest('GET', '/api/worker/calendar/sync');
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'getCalendarSyncUrl');
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