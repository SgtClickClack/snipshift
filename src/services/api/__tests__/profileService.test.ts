/**
 * Profile Service Unit Tests
 * 
 * TDD: Testing profile service functions for User Profile Management
 */

import { apiRequest } from '../../../lib/apiRequest';
import {
  getProfile,
  updateProfile,
  Profile,
  ProfileUpdates,
} from '../profileService';

// Mock the apiRequest module
jest.mock('../../../lib/apiRequest');

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('profileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const mockProfile: Profile = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'professional',
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z',
    };

    describe('Successful data retrieval', () => {
      it('should fetch current user profile', async () => {
        mockApiRequest.mockResolvedValueOnce(mockProfile);

        const result = await getProfile();

        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile');
        expect(result).toEqual(mockProfile);
      });

      it('should map profile data correctly with all fields', async () => {
        mockApiRequest.mockResolvedValueOnce(mockProfile);

        const result = await getProfile();

        expect(result).toMatchObject({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'professional',
        });
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });

      it('should include user_role in response', async () => {
        const profileWithBusinessRole = {
          ...mockProfile,
          role: 'business' as const,
        };
        mockApiRequest.mockResolvedValueOnce(profileWithBusinessRole);

        const result = await getProfile();

        expect(result.role).toBe('business');
      });

      it('should handle all role types', async () => {
        const roles: Array<'professional' | 'business' | 'admin' | 'trainer'> = [
          'professional',
          'business',
          'admin',
          'trainer',
        ];

        for (const role of roles) {
          const profileWithRole = { ...mockProfile, role };
          mockApiRequest.mockResolvedValueOnce(profileWithRole);

          const result = await getProfile();

          expect(result.role).toBe(role);
        }
      });
    });

    describe('Error handling', () => {
      it('should handle 401 Unauthorized error', async () => {
        const error = new Error('Unauthorized');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getProfile()).rejects.toThrow('Unauthorized');
        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile');
      });

      it('should handle 400 Bad Request error', async () => {
        const error = new Error('Bad Request');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getProfile()).rejects.toThrow('Bad Request');
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = new Error('Internal server error');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getProfile()).rejects.toThrow('Internal server error');
      });

      it('should handle network errors', async () => {
        const error = new Error('Network request failed');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getProfile()).rejects.toThrow('Network request failed');
      });

      it('should propagate API error messages', async () => {
        const error = new Error('API Error: 500');
        mockApiRequest.mockRejectedValueOnce(error);

        await expect(getProfile()).rejects.toThrow('API Error: 500');
      });
    });
  });

  describe('updateProfile', () => {
    const mockUpdatedProfile: Profile = {
      id: 'user-123',
      email: 'updated@example.com',
      name: 'Updated User',
      role: 'professional',
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T11:00:00.000Z',
    };

    describe('Successful profile update', () => {
      it('should update profile with name change', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedProfile);

        const updates: ProfileUpdates = { name: 'Updated User' };
        const result = await updateProfile(updates);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile', {
          method: 'PUT',
          body: updates,
        });
        expect(result).toEqual(mockUpdatedProfile);
        expect(result.name).toBe('Updated User');
      });

      it('should update profile with email change', async () => {
        const profileWithNewEmail = {
          ...mockUpdatedProfile,
          email: 'newemail@example.com',
        };
        mockApiRequest.mockResolvedValueOnce(profileWithNewEmail);

        const updates: ProfileUpdates = { email: 'newemail@example.com' };
        const result = await updateProfile(updates);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile', {
          method: 'PUT',
          body: updates,
        });
        expect(result.email).toBe('newemail@example.com');
      });

      it('should update profile with multiple fields', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedProfile);

        const updates: ProfileUpdates = {
          name: 'Updated User',
          email: 'updated@example.com',
        };
        const result = await updateProfile(updates);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile', {
          method: 'PUT',
          body: updates,
        });
        expect(result.name).toBe('Updated User');
        expect(result.email).toBe('updated@example.com');
      });

      it('should return updated profile with updatedAt timestamp', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedProfile);

        const updates: ProfileUpdates = { name: 'Updated User' };
        const result = await updateProfile(updates);

        expect(result.updatedAt).toBeDefined();
        expect(result.updatedAt).toBe('2025-01-15T11:00:00.000Z');
      });
    });

    describe('Partial update payloads', () => {
      it('should handle empty update payload', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedProfile);

        const updates: ProfileUpdates = {};
        const result = await updateProfile(updates);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile', {
          method: 'PUT',
          body: {},
        });
        expect(result).toBeDefined();
      });

      it('should handle update with only name', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedProfile);

        const updates: ProfileUpdates = { name: 'New Name' };
        await updateProfile(updates);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile', {
          method: 'PUT',
          body: { name: 'New Name' },
        });
      });

      it('should handle update with only email', async () => {
        mockApiRequest.mockResolvedValueOnce(mockUpdatedProfile);

        const updates: ProfileUpdates = { email: 'new@example.com' };
        await updateProfile(updates);

        expect(mockApiRequest).toHaveBeenCalledWith('/api/profile', {
          method: 'PUT',
          body: { email: 'new@example.com' },
        });
      });
    });

    describe('Error handling', () => {
      it('should handle 401 Unauthorized error', async () => {
        const error = new Error('Unauthorized');
        mockApiRequest.mockRejectedValueOnce(error);

        const updates: ProfileUpdates = { name: 'Test' };
        await expect(updateProfile(updates)).rejects.toThrow('Unauthorized');

        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/profile',
          expect.objectContaining({
            method: 'PUT',
            body: updates,
          })
        );
      });

      it('should handle 400 Validation error', async () => {
        const error = new Error('Validation error: email must be valid');
        mockApiRequest.mockRejectedValueOnce(error);

        const updates: ProfileUpdates = { email: 'invalid-email' };
        await expect(updateProfile(updates)).rejects.toThrow(
          'Validation error: email must be valid'
        );
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = new Error('Internal server error');
        mockApiRequest.mockRejectedValueOnce(error);

        const updates: ProfileUpdates = { name: 'Test' };
        await expect(updateProfile(updates)).rejects.toThrow(
          'Internal server error'
        );
      });

      it('should handle network errors', async () => {
        const error = new Error('Network request failed');
        mockApiRequest.mockRejectedValueOnce(error);

        const updates: ProfileUpdates = { name: 'Test' };
        await expect(updateProfile(updates)).rejects.toThrow(
          'Network request failed'
        );
      });

      it('should propagate API error messages', async () => {
        const error = new Error('API Error: 400');
        mockApiRequest.mockRejectedValueOnce(error);

        const updates: ProfileUpdates = { name: 'Test' };
        await expect(updateProfile(updates)).rejects.toThrow('API Error: 400');
      });
    });
  });
});

