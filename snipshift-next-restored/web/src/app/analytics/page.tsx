'use client';

import React from 'react';
import { Container, Typography, Paper, Box, Grid, Card, CardContent } from '@mui/material';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AnalyticsPage() {
  const { user } = useAuth();

  // Mock analytics data
  const analyticsData = {
    totalApplications: 12,
    acceptedApplications: 8,
    pendingApplications: 3,
    rejectedApplications: 1,
    totalEarnings: 2450,
    averageRating: 4.7,
    completedShifts: 15,
    upcomingShifts: 2
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="analytics-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your performance and earnings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Total Applications
              </Typography>
              <Typography variant="h4" component="div">
                {analyticsData.totalApplications}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main" gutterBottom>
                Accepted
              </Typography>
              <Typography variant="h4" component="div">
                {analyticsData.acceptedApplications}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" component="div">
                {analyticsData.pendingApplications}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main" gutterBottom>
                Rejected
              </Typography>
              <Typography variant="h4" component="div">
                {analyticsData.rejectedApplications}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Earnings
              </Typography>
              <Typography variant="h3" component="div" color="success.main">
                ${analyticsData.totalEarnings}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                From {analyticsData.completedShifts} completed shifts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Rating
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {analyticsData.averageRating}/5.0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Based on client feedback
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Shifts
              </Typography>
              <Typography variant="h4" component="div">
                {analyticsData.upcomingShifts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scheduled for the next 7 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
