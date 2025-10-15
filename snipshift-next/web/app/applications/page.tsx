'use client';

import React from 'react';
import { Container, Typography, Paper, Box, Card, CardContent, Chip } from '@mui/material';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ApplicationsPage() {
  const { user } = useAuth();

  // Mock application data
  const mockApplications = [
    {
      id: '1',
      shiftTitle: 'Senior Barber Needed',
      shiftLocation: 'Melbourne CBD',
      appliedDate: '2024-01-10',
      status: 'pending',
      payRate: 35
    },
    {
      id: '2',
      shiftTitle: 'Part-time Stylist',
      shiftLocation: 'Sydney North',
      appliedDate: '2024-01-08',
      status: 'accepted',
      payRate: 30
    },
    {
      id: '3',
      shiftTitle: 'Weekend Barber',
      shiftLocation: 'Brisbane Central',
      appliedDate: '2024-01-05',
      status: 'rejected',
      payRate: 32
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="applications-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Applications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your job applications
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {mockApplications.map((application) => (
          <Card key={application.id} sx={{ p: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  {application.shiftTitle}
                </Typography>
                <Chip 
                  label={application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  color={getStatusColor(application.status) as any}
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  📍 {application.shiftLocation}
                </Typography>
                <Typography variant="body2">
                  💰 ${application.payRate}/hour
                </Typography>
                <Typography variant="body2">
                  📅 Applied: {application.appliedDate}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Application ID: {application.id}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
