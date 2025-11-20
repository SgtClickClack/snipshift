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
  return res.json();
}
