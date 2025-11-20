import { apiRequest } from './queryClient';

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export async function updateUserProfile(data: UpdateProfileData) {
  return apiRequest('PUT', '/api/me', data);
}

