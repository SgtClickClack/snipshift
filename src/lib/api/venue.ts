import { apiRequest } from '../queryClient';
import { toApiError, safeJson } from './core';

// ===== INTERFACES =====

export interface UpdateBusinessProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  logoUrl?: string;
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

// ===== BUSINESS PROFILE =====

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

// ===== SHIFT FETCHING =====

export async function fetchEmployerShifts(params: { start?: string; end?: string } = {}): Promise<any[]> {
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

export async function fetchVenueShifts(userId: string): Promise<MyJob[]> {
  try {
    // TODO: Backend route still uses legacy /shop/ path - update backend to add /venue/ alias
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

/** @deprecated Use fetchVenueShifts instead */
export const fetchShopShifts = fetchVenueShifts;

export async function fetchMyJobs(): Promise<MyJob[]> {
  try {
    const res = await apiRequest('GET', '/api/me/jobs');
    return await safeJson(res, [] as MyJob[]);
  } catch {
    return [];
  }
}

// ===== BULK OPERATIONS =====

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

// ===== TEMPLATE & ROSTER GENERATION =====

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

// ===== APPLICATIONS =====

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

export async function requestBackupFromWaitlist(shiftId: string): Promise<{ message: string; notifiedWorkers: number }> {
  try {
    const res = await apiRequest('POST', `/api/shifts/${shiftId}/request-backup`);
    return await res.json();
  } catch (error) {
    throw toApiError(error, 'requestBackupFromWaitlist');
  }
}
