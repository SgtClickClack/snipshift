/**
 * Profile Service
 * 
 * Service functions for managing user profile information.
 * Provides functions for fetching and updating user profile data including role information.
 */

import { apiRequest } from '../../lib/apiRequest';

/**
 * User profile interface matching the API response
 */
export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'professional' | 'business' | 'admin' | 'trainer';
  createdAt: string;
  updatedAt: string;
}

/**
 * Profile update payload interface
 * All fields are optional to allow partial updates
 */
export interface ProfileUpdates {
  name?: string;
  email?: string;
}

/**
 * Fetches the current user's profile details, including their user_role.
 * 
 * @returns Promise resolving to the user's profile data
 * @throws Error if the API request fails (401 Unauthorized, 500 Server Error, etc.)
 */
export async function getProfile(): Promise<Profile> {
  return apiRequest<Profile>('/api/profile');
}

/**
 * Submits changes to the user's profile (e.g., name, contact info).
 * 
 * @param updates - Partial profile update object containing fields to update
 * @returns Promise resolving to the updated profile data
 * @throws Error if the API request fails (401 Unauthorized, 400 Validation, 500 Server Error, etc.)
 */
export async function updateProfile(updates: ProfileUpdates): Promise<Profile> {
  return apiRequest<Profile>('/api/profile', {
    method: 'PUT',
    body: updates,
  });
}

