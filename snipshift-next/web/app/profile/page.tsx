'use client';

import React from 'react';
import { Container, Typography, Paper, Box, Avatar, Button } from '@mui/material';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="profile-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account information
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar 
            sx={{ width: 80, height: 80, mr: 3 }}
            src={user?.profileImage}
          >
            {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5" gutterBottom>
              {user?.displayName || 'No name set'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user?.currentRole || 'No role assigned'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Email Address
              </Typography>
              <Typography variant="body1" data-testid="profile-email">
                {user?.email}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Display Name
              </Typography>
              <Typography variant="body1" data-testid="profile-display-name">
                {user?.displayName || 'Not set'}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                User ID
              </Typography>
              <Typography variant="body1">
                {user?.id}
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Account Details
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Current Role
              </Typography>
              <Typography variant="body1">
                {user?.currentRole || 'Not assigned'}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Available Roles
              </Typography>
              <Typography variant="body1">
                {user?.roles?.join(', ') || 'None'}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Account Status
              </Typography>
              <Typography variant="body1" color="success.main">
                Active
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary">
            Edit Profile
          </Button>
          <Button variant="outlined" color="primary">
            Change Password
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
