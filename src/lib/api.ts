import { apiRequest } from './queryClient';

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
}

export interface JobFilterParams {
  city?: string;
  date?: string;
  limit?: number;
  offset?: number;
  // Advanced filters
  search?: string;
  minRate?: number;
  maxRate?: number;
  startDate?: string;
  endDate?: string;
  radius?: number;
  lat?: number;
  lng?: number;
}

export async function updateUserProfile(data: UpdateProfileData) {
  return apiRequest('PUT', '/api/me', data);
}

export async function fetchJobs(params: JobFilterParams = {}) {
  const query = new URLSearchParams();
  if (params.city) query.append('city', params.city);
  if (params.date) query.append('date', params.date);
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.offset) query.append('offset', params.offset.toString());
  if (params.search) query.append('search', params.search);
  if (params.minRate !== undefined) query.append('minRate', params.minRate.toString());
  if (params.maxRate !== undefined) query.append('maxRate', params.maxRate.toString());
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.radius !== undefined) query.append('radius', params.radius.toString());
  if (params.lat !== undefined) query.append('lat', params.lat.toString());
  if (params.lng !== undefined) query.append('lng', params.lng.toString());
  
  const res = await apiRequest('GET', `/api/jobs?${query.toString()}`);
  const data = await res.json();
  // Handle both array response and paginated response
  return Array.isArray(data) ? data : (data.data || []);
}

export async function fetchShifts(params: { status?: 'open' | 'filled' | 'completed'; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.offset) query.append('offset', params.offset.toString());
  
  const res = await apiRequest('GET', `/api/shifts?${query.toString()}`);
  const data = await res.json();
  // Handle both array response and paginated response
  return Array.isArray(data) ? data : (data.data || []);
}

export interface JobDetails {
  id: string;
  title: string;
  shopName?: string;
  rate?: string;
  payRate?: string;
  date: string;
  lat?: number;
  lng?: number;
  location?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  requirements?: string[];
  skillsRequired?: string[];
  status?: 'open' | 'filled' | 'closed' | 'completed';
  businessId?: string;
  businessName?: string;
  type?: 'job' | 'shift';
  hourlyRate?: string;
}

export interface ApplicationData {
  name: string;
  email: string;
  coverLetter: string;
  type?: 'job' | 'shift';
}

export async function fetchJobDetails(jobId: string): Promise<JobDetails> {
  // Try to fetch from shifts API first (Primary Data Source)
  try {
    const res = await apiRequest('GET', `/api/shifts/${jobId}`);
    const data = await res.json();
    
    return {
      id: data.id,
      title: data.title,
      shopName: data.shopName || 'Shop', // Fallback if not in shift data
      rate: data.hourlyRate,
      payRate: data.hourlyRate,
      hourlyRate: data.hourlyRate,
      date: data.startTime,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      description: data.description,
      status: data.status,
      businessId: data.employerId,
      type: 'shift',
      requirements: data.description ? [data.description] : [] // Simple fallback
    };
  } catch (error) {
    // If shift not found, try jobs API (Legacy/Fallback)
    console.debug('Shift not found, trying jobs API...', error);
  }

  try {
  const res = await apiRequest('GET', `/api/jobs/${jobId}`);
  const data = await res.json();
  
  if (!data) {
    throw new Error("Job details not found");
  }

  // Parse requirements from description if not provided
    // Requirements might be in description as bullet points or separated by newlines
    let requirements: string[] = [];
    if (data.requirements && Array.isArray(data.requirements)) {
      requirements = data.requirements.filter((r: string) => r && r.trim().length > 0);
    } else if (data.skillsRequired && Array.isArray(data.skillsRequired)) {
      requirements = data.skillsRequired.filter((r: string) => r && r.trim().length > 0);
    } else if (data.description) {
      // Try to parse bullet points from description
      const lines = data.description.split('\n').filter((line: string) => line.trim());
      const bulletPoints = lines
        .filter((line: string) => line.trim().match(/^[-•*]\s+/))
        .map((line: string) => line.replace(/^[-•*]\s+/, '').trim())
        .filter((line: string) => line.length > 0);
      
      if (bulletPoints.length > 0) {
        requirements = bulletPoints;
      } else {
        // If no bullet points, use the description as a single requirement
        requirements = [data.description];
      }
    }
    
    return {
      ...data,
      requirements: Array.isArray(requirements) ? requirements : [],
      type: 'job'
    };
  } catch (error) {
    console.error(`Failed to fetch job details for ${jobId}:`, error);
    throw error; // Rethrow to let useQuery handle it, or return null if we change signature
  }
}

export async function applyToJob(jobId: string, applicationData: ApplicationData) {
  // If type is shift, use the applications endpoint
  if (applicationData.type === 'shift') {
    const res = await apiRequest('POST', '/api/applications', {
      shiftId: jobId,
      message: applicationData.coverLetter,
      name: applicationData.name,
      email: applicationData.email
    });
    return res.json();
  }

  // Default/Legacy behavior
  const res = await apiRequest('POST', `/api/jobs/${jobId}/apply`, applicationData);
  return res.json();
}

export interface MyApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  shopName?: string;
  jobPayRate: string;
  jobLocation?: string;
  jobDescription?: string;
  jobDate?: string;
  jobStatus?: 'open' | 'filled' | 'closed' | 'completed';
  status: 'pending' | 'accepted' | 'rejected';
  appliedDate: string;
  respondedDate?: string | null;
  respondedAt?: string | null;
  businessId?: string;
}

export async function fetchMyApplications(): Promise<MyApplication[]> {
  const res = await apiRequest('GET', '/api/me/applications');
  return res.json();
}

export interface CreateJobData {
  title: string;
  payRate: string | number;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  shopName?: string;
  address?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  sitePhotoUrl?: string;
}

export async function createJob(jobData: CreateJobData) {
  // Forward to Shifts API for unification
  // Map JobData to ShiftData
  const shiftPayload = {
    title: jobData.title,
    description: jobData.description,
    startTime: jobData.startTime && jobData.date ? 
      (jobData.startTime.includes('T') ? jobData.startTime : `${jobData.date.split('T')[0]}T${jobData.startTime}:00`) : 
      new Date().toISOString(), // Fallback
    endTime: jobData.endTime && jobData.date ? 
      (jobData.endTime.includes('T') ? jobData.endTime : `${jobData.date.split('T')[0]}T${jobData.endTime}:00`) : 
      new Date(Date.now() + 8 * 3600000).toISOString(), // Fallback +8h
    hourlyRate: jobData.payRate,
    location: jobData.location || [jobData.address, jobData.city, jobData.state].filter(Boolean).join(', '),
    status: 'open'
  };

  const res = await apiRequest('POST', '/api/shifts', shiftPayload);
  return res.json();
}

export async function createShift(shiftData: any) {
  const res = await apiRequest('POST', '/api/shifts', shiftData);
  return res.json();
}

export interface MyJob {
  id: string;
  title: string;
  shopName?: string;
  payRate: string;
  date: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  status: 'open' | 'filled' | 'closed' | 'completed';
  applicationCount: number;
  createdAt: string;
}

export async function fetchMyJobs(): Promise<MyJob[]> {
  // Fetch from Shifts API
  // We need the user ID to fetch their shifts. 
  // Since we are authenticated, the backend should ideally handle 'me' or we need to pass it.
  // But the plan says: fetch "My Shifts" from /api/shifts/shop/:userId
  // We can't easily get userId here without auth context or decoding token.
  // However, checking src/lib/api.ts imports, it uses './queryClient'.
  // Let's rely on the caller to use fetchShopShifts or we update this to use a 'me' endpoint if available.
  // Since we don't have /api/shifts/me yet (based on shifts.ts), we might need to stick to /api/me/jobs for now 
  // but update the backend implementation of /api/me/jobs to return shifts?
  // OR, we simply implement fetchShopShifts and use that in the dashboard.
  
  // For now, let's leave fetchMyJobs as legacy and add fetchShopShifts.
  const res = await apiRequest('GET', '/api/me/jobs');
  return res.json();
}

export async function fetchShopShifts(userId: string): Promise<MyJob[]> {
  const res = await apiRequest('GET', `/api/shifts/shop/${userId}`);
  const listings = await res.json();
  
  // Backend now returns normalized format (both jobs and shifts)
  // Map to MyJob interface - data is already normalized
  // Preserve _type and employerId for delete button logic
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
    // Preserve backend fields needed for delete functionality
    _type: item._type,
    employerId: item.employerId,
    description: item.description || item.requirements,
    skillsRequired: item.skillsRequired || []
  }));
}

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  coverLetter: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  respondedAt?: string | null;
  userId?: string;
}

export async function fetchJobApplications(jobId: string): Promise<JobApplication[]> {
  const res = await apiRequest('GET', `/api/jobs/${jobId}/applications`);
  return res.json();
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'accepted' | 'rejected'
): Promise<{ id: string; status: string; respondedAt: string | null }> {
  const res = await apiRequest('PUT', `/api/applications/${applicationId}/status`, { status });
  return res.json();
}

export interface Notification {
  id: string;
  type: 'application_received' | 'application_status_change' | 'job_posted' | 'job_updated' | 'job_completed';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export async function fetchNotifications(limit?: number): Promise<Notification[]> {
  const query = limit ? `?limit=${limit}` : '';
  const res = await apiRequest('GET', `/api/notifications${query}`);
  return res.json();
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const res = await apiRequest('GET', '/api/notifications/unread-count');
  return res.json();
}

export async function markNotificationAsRead(notificationId: string): Promise<{ id: string; isRead: boolean }> {
  const res = await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
  return res.json();
}

export async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  const res = await apiRequest('PATCH', '/api/notifications/read-all');
  return res.json();
}

export async function updateJobStatus(
  jobId: string,
  status: 'open' | 'filled' | 'closed' | 'completed'
): Promise<{ id: string; status: string }> {
  const res = await apiRequest('PATCH', `/api/jobs/${jobId}/status`, { status });
  return res.json();
}

export async function updateShiftStatus(
  shiftId: string,
  status: 'open' | 'filled' | 'completed'
): Promise<{ id: string; status: string }> {
  const res = await apiRequest('PATCH', `/api/shifts/${shiftId}`, { status });
  return res.json();
}

export interface CreateReviewData {
  revieweeId: string;
  jobId: string;
  rating: number; // 1-5
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

export async function createCheckoutSession(planId: string): Promise<CheckoutSessionResponse> {
  const res = await apiRequest('POST', '/api/subscriptions/checkout', { planId });
  return res.json();
}

export async function cancelSubscription(): Promise<{ message: string }> {
  const res = await apiRequest('POST', '/api/subscriptions/cancel', {});
  return res.json();
}

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const res = await apiRequest('GET', `/api/reviews/${userId}`);
  return res.json();
}

export interface Conversation {
  id: string;
  jobId?: string;
  otherParticipant: {
    id: string;
    name: string;
    email: string;
  } | null;
  latestMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  job: {
    id: string;
    title: string;
  } | null;
  lastMessageAt?: string;
  createdAt: string;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await apiRequest('GET', '/api/conversations');
  return res.json();
}

export async function createConversation(data: {
  participant2Id: string;
  jobId?: string;
}): Promise<{ id: string; existing: boolean }> {
  const res = await apiRequest('POST', '/api/conversations', data);
  return res.json();
}