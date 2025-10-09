'use client';

import React, { useEffect } from 'react';
import { Box, Container, Typography, CircularProgress } from '@mui/material';

export default function AppPage() {
  useEffect(() => {
    // Redirect to the main React application hosted elsewhere
    // For now, redirect to a placeholder that explains the situation
    window.location.href = 'https://snipshift-main-app.vercel.app';
  }, []);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          SnipShift Main Application
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, opacity: 0.8 }}>
          Redirecting to the main React application...
        </Typography>
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ mt: 4, opacity: 0.6 }}>
          If you're not redirected automatically, please contact support.
        </Typography>
      </Container>
    </Box>
  );
}


