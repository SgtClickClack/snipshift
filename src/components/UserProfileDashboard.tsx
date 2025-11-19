/**
 * UserProfileDashboard Component
 * 
 * Displays and allows editing of user profile information including name, email, and role.
 * Uses React Query for data fetching and mutations.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, Profile, ProfileUpdates } from '../services/api/profileService';

export default function UserProfileDashboard() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch user profile
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  // Update form fields when profile data loads
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);

  // Mutation for updating profile
  const updateMutation = useMutation({
    mutationFn: (updates: ProfileUpdates) => updateProfile(updates),
    onSuccess: (updatedProfile: Profile) => {
      // Clear errors and show success message
      setUpdateError('');
      setSuccessMessage('Profile updated successfully!');
      
      // Update the query cache with the new data
      queryClient.setQueryData(['profile'], updatedProfile);
      
      // Update form fields with new data
      setName(updatedProfile.name);
      setEmail(updatedProfile.email);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    },
    onError: (err: Error) => {
      setUpdateError(err.message || 'Failed to update profile.');
      setSuccessMessage('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    setSuccessMessage('');

    // Build update payload with only changed fields
    const updates: ProfileUpdates = {};
    if (profile) {
      if (name !== profile.name) {
        updates.name = name;
      }
      if (email !== profile.email) {
        updates.email = email;
      }
    }

    // Only submit if there are changes
    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="profile-loading">
        <p>Loading profile...</p>
      </div>
    );
  }

  // Error state (fetch error)
  if (error) {
    return (
      <div data-testid="profile-error">
        <p>Error loading profile. Please try again later.</p>
      </div>
    );
  }

  // Success display
  if (!profile) {
    return null;
  }

  return (
    <div data-testid="profile-display">
      <h2>User Profile</h2>
      
      {successMessage && (
        <div data-testid="profile-success-message" style={{ color: 'green', marginBottom: '1rem' }}>
          {successMessage}
        </div>
      )}

      {updateError && (
        <div data-testid="profile-update-error" style={{ color: 'red', marginBottom: '1rem' }}>
          {updateError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="profile-name-input">Name:</label>
          <br />
          <input
            data-testid="profile-name-input"
            id="profile-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '300px', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="profile-email-input">Email:</label>
          <br />
          <input
            data-testid="profile-email-input"
            id="profile-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '300px', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Role:</label>
          <br />
          <div
            data-testid="user-role-display"
            style={{
              padding: '0.5rem',
              marginTop: '0.25rem',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              display: 'inline-block',
              minWidth: '300px',
            }}
          >
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </div>
        </div>

        <button
          data-testid="profile-submit-button"
          type="submit"
          disabled={updateMutation.isPending}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: updateMutation.isPending ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {updateMutation.isPending ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}

