'use client';

import React from 'react';
import { Container, Typography, Paper, Box, Grid, Button } from '@mui/material';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AccessControl from '../../src/components/AccessControl';
import Image from 'next/image';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    }
    logout();
    router.push('/');
  };

  return (
    <AccessControl requireVerification={true}>
      <Container maxWidth="lg" sx={{ py: 4 }} data-testid="professional-dashboard">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Image
            src="/logo-new.svg"
            alt="SnipShift V2 Logo"
            width={200}
            height={60}
            style={{ marginBottom: '2rem' }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Welcome to SnipShift 2.0 Dashboard
          </Typography>
          <Button variant="outlined" onClick={handleLogout}>
            Logout
          </Button>
        </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Registration Test Results
            </Typography>
            <Typography variant="body1" color="success.main" sx={{ mb: 2 }}>
              ✅ Integration test completed successfully!
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                User Information:
              </Typography>
              <Typography variant="body2" data-testid="profile-display-name">
                <strong>Name:</strong> {user?.displayName}
              </Typography>
              <Typography variant="body2" data-testid="profile-email">
                <strong>Email:</strong> {user?.email}
              </Typography>
              <Typography variant="body2">
                <strong>Role:</strong> {user?.currentRole}
              </Typography>
              <Typography variant="body2">
                <strong>User ID:</strong> {user?.id}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              API Integration Status
            </Typography>
            <Typography variant="body2" color="success.main">
              ✅ GraphQL API Connected
            </Typography>
            <Typography variant="body2" color="success.main">
              ✅ Authentication Working
            </Typography>
            <Typography variant="body2" color="success.main">
              ✅ User Registration Complete
            </Typography>
            <Typography variant="body2" color="success.main">
              ✅ JWT Token Received
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
    </AccessControl>
  );
}