import { apiRequest } from './queryClient';

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export interface JobFilterParams {
  city?: string;
  date?: string;
  limit?: number;
  offset?: number;
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
  
  const res = await apiRequest('GET', `/api/jobs?${query.toString()}`);
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
}

export interface ApplicationData {
  name: string;
  email: string;
  coverLetter: string;
}

export async function fetchJobDetails(jobId: string): Promise<JobDetails> {
  const res = await apiRequest('GET', `/api/jobs/${jobId}`);
  const data = await res.json();
  
  // Parse requirements from description if not provided
  // Requirements might be in description as bullet points or separated by newlines
  let requirements: string[] = [];
  if (data.requirements && Array.isArray(data.requirements)) {
    requirements = data.requirements;
  } else if (data.skillsRequired && Array.isArray(data.skillsRequired)) {
    requirements = data.skillsRequired;
  } else if (data.description) {
    // Try to parse bullet points from description
    const lines = data.description.split('\n').filter((line: string) => line.trim());
    const bulletPoints = lines
      .filter((line: string) => line.trim().match(/^[-•*]\s+/))
      .map((line: string) => line.replace(/^[-•*]\s+/, '').trim());
    
    if (bulletPoints.length > 0) {
      requirements = bulletPoints;
    } else {
      // If no bullet points, use the description as a single requirement
      requirements = [data.description];
    }
  }
  
  return {
    ...data,
    requirements,
  };
}

export async function applyToJob(jobId: string, applicationData: ApplicationData) {
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
}

export async function createJob(jobData: CreateJobData) {
  const res = await apiRequest('POST', '/api/jobs', jobData);
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
  const res = await apiRequest('GET', '/api/me/jobs');
  return res.json();
}

export interface JobApplication {
  id: string;
  name: string;
  email: string;
  coverLetter: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  respondedAt?: string | null;
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

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const res = await apiRequest('GET', `/api/reviews/${userId}`);
  return res.json();
}