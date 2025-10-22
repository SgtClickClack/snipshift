'use client';

import React from 'react';
import { Container, Typography, Paper, Box, Card, CardContent, Button } from '@mui/material';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ShiftFeedPage() {
  const { user } = useAuth();

  // Mock shift data
  const mockShifts = [
    {
      id: '1',
      title: 'Senior Barber Needed',
      description: 'Looking for an experienced barber for weekend shifts',
      payRate: 35,
      location: 'Melbourne CBD',
      skillsRequired: ['Haircutting', 'Beard Trimming', 'Styling'],
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '17:00'
    },
    {
      id: '2',
      title: 'Part-time Stylist',
      description: 'Flexible hours for creative stylist',
      payRate: 30,
      location: 'Sydney North',
      skillsRequired: ['Coloring', 'Styling', 'Consultation'],
      date: '2024-01-16',
      startTime: '10:00',
      endTime: '18:00'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="shift-feed">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Shift Feed
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find your next opportunity
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {mockShifts.map((shift) => (
          <Card key={shift.id} sx={{ p: 2 }} data-testid="shift-card">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  {shift.title}
                </Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  ${shift.payRate}/hour
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {shift.description}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  📍 {shift.location}
                </Typography>
                <Typography variant="body2">
                  📅 {shift.date}
                </Typography>
                <Typography variant="body2">
                  ⏰ {shift.startTime} - {shift.endTime}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Skills Required:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {shift.skillsRequired.map((skill, index) => (
                    <Paper key={index} sx={{ px: 1, py: 0.5, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <Typography variant="caption">
                        {skill}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
              
              <Button variant="contained" color="primary" data-testid="button-apply-shift">
                Apply Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
