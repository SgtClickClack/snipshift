'use client';

import React from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 12 }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Box sx={{ mb: 4 }}>
            <Image
              src="/logo-new.svg"
              alt="SnipShift Logo"
              width={300}
              height={90}
              style={{ marginBottom: '1rem' }}
            />
          </Box>
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to SnipShift
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            Connect barbershops, professionals, brands, and trainers through our advanced marketplace platform
          </Typography>
          <Button
            component={Link}
            href="/auth/register"
            variant="contained"
            color="secondary"
            size="large"
            sx={{ px: 4, py: 1.5 }}
          >
            Get Started
          </Button>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          align="center"
          gutterBottom
          sx={{ mb: 2 }}
        >
          Why Choose SnipShift?
        </Typography>
        <Typography
          variant="h6"
          align="center"
          color="text.secondary"
          sx={{ mb: 6 }}
        >
          The platform that connects the creative industry
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <CardContent>
                <Typography variant="h5" component="h3" gutterBottom>
                  🏪 For Shop Owners
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Post shifts and find talented professionals for your barbershop or salon.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <CardContent>
                <Typography variant="h5" component="h3" gutterBottom>
                  ✂️ For Professionals
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Find flexible work opportunities and showcase your skills to potential employers.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <CardContent>
                <Typography variant="h5" component="h3" gutterBottom>
                  🏷️ For Brands & Trainers
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Connect with professionals and promote your products or training content.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Ready to Join the Community?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Connect with the creative community and take your career to the next level.
          </Typography>
          <Button
            component={Link}
            href="/auth/register"
            variant="contained"
            color="secondary"
            size="large"
            sx={{ px: 4, py: 1.5 }}
          >
            Get Started Today
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
