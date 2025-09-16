'use client';

import React from 'react';
import { Container, Typography, Paper, Box, Button, Alert } from '@mui/material';
import { CheckCircle, Schedule, Email } from '@mui/icons-material';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ApplicationPendingPage() {
  const { state } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    }
    router.push('/');
  };

  if (!state.isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/auth/register');
    }
    return null;
  }

  const isBrandOrTrainer = state.user?.roles?.includes('brand') || state.user?.roles?.includes('trainer');

  if (!isBrandOrTrainer) {
    router.push('/dashboard');
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Image
          src="/logo-new.svg"
          alt="SnipShift V2 Logo"
          width={200}
          height={60}
          style={{ marginBottom: '2rem' }}
        />
      </Box>

      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Schedule sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          Application Under Review
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Thank you for submitting your {state.user?.roles?.includes('brand') ? 'Brand' : 'Trainer'} application!
        </Typography>

        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body1">
            Your application is currently being reviewed by our team. We typically review applications within 24-48 hours.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <CheckCircle sx={{ color: 'success.main', mr: 1, verticalAlign: 'middle' }} />
            Your profile information has been submitted successfully
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <Email sx={{ color: 'primary.main', mr: 1, verticalAlign: 'middle' }} />
            You will receive an email notification once your application is reviewed
          </Typography>
          <Typography variant="body1">
            <Schedule sx={{ color: 'warning.main', mr: 1, verticalAlign: 'middle' }} />
            Review typically takes 24-48 hours
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Once approved, you'll have full access to the SnipShift platform and can start connecting with professionals, 
          posting content, and growing your network.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={handleLogout}>
            Sign Out
          </Button>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
          >
            Check Status
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
