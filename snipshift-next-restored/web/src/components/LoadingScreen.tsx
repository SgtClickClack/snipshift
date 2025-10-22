'use client';

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingScreen() {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default',
        gap: 2
      }}
      className="animate-fade-in"
    >
      <CircularProgress 
        size={60} 
        sx={{ 
          color: 'brand.primary',
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          }
        }} 
      />
      <Typography 
        variant="h6" 
        color="text.secondary"
        className="animate-slide-up"
      >
        Loading SnipShift...
      </Typography>
    </Box>
  );
}
