'use client';

import React from 'react';
import { Container, Typography, Paper, Box, Card, CardContent, Button } from '@mui/material';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TournamentsPage() {
  const { user } = useAuth();

  // Mock tournament data
  const mockTournaments = [
    {
      id: '1',
      name: 'Melbourne Barber Championship',
      description: 'Annual barbering competition in Melbourne',
      date: '2024-02-15',
      location: 'Melbourne Convention Centre',
      prize: '$5,000',
      participants: 25,
      maxParticipants: 50
    },
    {
      id: '2',
      name: 'Sydney Style Showdown',
      description: 'Creative styling competition',
      date: '2024-03-20',
      location: 'Sydney Opera House',
      prize: '$3,000',
      participants: 15,
      maxParticipants: 30
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="tournaments-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tournaments
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Compete and showcase your skills
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {mockTournaments.map((tournament) => (
          <Card key={tournament.id} sx={{ p: 2 }} data-testid="tournament-card">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Typography variant="h6" component="h2" data-testid="tournament-name">
                  {tournament.name}
                </Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {tournament.prize}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {tournament.description}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  📍 {tournament.location}
                </Typography>
                <Typography variant="body2">
                  📅 {tournament.date}
                </Typography>
                <Typography variant="body2">
                  👥 {tournament.participants}/{tournament.maxParticipants} participants
                </Typography>
              </Box>
              
              <Button 
                variant="contained" 
                color="primary" 
                disabled={tournament.participants >= tournament.maxParticipants}
              >
                {tournament.participants >= tournament.maxParticipants ? 'Full' : 'Join Tournament'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
