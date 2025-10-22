'use client';

import React from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} data-testid="landing-page">
      {/* Hero Section */}
      <Box className="hero">
        <div className="hero-content">
          <Box sx={{ mb: 4 }} className="logo-container animate-bounce-in">
            <Image
              src="/logo.jpg"
              alt="SnipShift Logo"
              width={300}
              height={90}
              className="logo-image"
              style={{ marginBottom: '1rem' }}
            />
          </Box>
          <h1 className="hero-title animate-slide-up">
            Welcome to SnipShift
          </h1>
          <p className="hero-subtitle animate-slide-up">
            Connect barbershops, professionals, brands, and trainers through our advanced marketplace platform
          </p>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            <Button
              component={Link}
              href="/auth/register"
              className="btn btn-primary btn-lg animate-scale-in"
              sx={{ px: 4, py: 1.5 }}
              data-testid="button-get-started"
            >
              Get Started
            </Button>
            <Button
              component={Link}
              href="/auth/login"
              className="btn btn-outline btn-lg animate-scale-in"
              sx={{ px: 4, py: 1.5, borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' } }}
              data-testid="button-login"
            >
              Login
            </Button>
          </Box>
        </div>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 12, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" component="h2" gutterBottom className="animate-fade-in">
              Why Choose SnipShift?
            </Typography>
            <Typography variant="h6" color="text.secondary" className="animate-fade-in">
              The ultimate platform for the barbering and beauty industry
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card className="card animate-slide-up">
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ fontSize: '3rem', mb: 2, color: 'primary.main' }}>🏪</Box>
                  <Typography variant="h5" component="h3" gutterBottom className="card-title">
                    Hub Management
                  </Typography>
                  <Typography variant="body1" color="text.secondary" className="card-description">
                    Streamline your barbershop operations with our comprehensive management tools
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card className="card animate-slide-up">
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ fontSize: '3rem', mb: 2, color: 'primary.main' }}>👤</Box>
                  <Typography variant="h5" component="h3" gutterBottom className="card-title">
                    Professional Network
                  </Typography>
                  <Typography variant="body1" color="text.secondary" className="card-description">
                    Connect with verified professionals and find the perfect talent for your business
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card className="card animate-slide-up">
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box sx={{ fontSize: '3rem', mb: 2, color: 'primary.main' }}>🏆</Box>
                  <Typography variant="h5" component="h3" gutterBottom className="card-title">
                    Brand Partnerships
                  </Typography>
                  <Typography variant="body1" color="text.secondary" className="card-description">
                    Collaborate with top brands and expand your product offerings
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 12, bgcolor: 'primary.main', color: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ textAlign: 'center' }}>
            <Grid item xs={12} sm={3}>
              <Box className="animate-scale-in">
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  1000+
                </Typography>
                <Typography variant="h6">
                  Active Professionals
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box className="animate-scale-in">
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  500+
                </Typography>
                <Typography variant="h6">
                  Partner Hubs
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box className="animate-scale-in">
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  50+
                </Typography>
                <Typography variant="h6">
                  Brand Partners
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box className="animate-scale-in">
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  24/7
                </Typography>
                <Typography variant="h6">
                  Support Available
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 12, bgcolor: 'background.default' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom className="animate-fade-in">
            Ready to Transform Your Business?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }} className="animate-fade-in">
            Join thousands of professionals who trust SnipShift for their business growth
          </Typography>
          <Button
            component={Link}
            href="/auth/register"
            className="btn btn-primary btn-lg animate-bounce-in"
            sx={{ px: 6, py: 2 }}
          >
            Start Your Journey Today
          </Button>
        </Container>
      </Box>
    </Box>
  );
}