'use client';

import React from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <Box sx={{ minHeight: '100vh' }} data-testid="landing-page">
      {/* Hero Section */}
      <Box className="hero">
        <div className="hero-content">
          <Box sx={{ mb: 6 }} className="logo-container animate-bounce-in">
            <Box sx={{ width: 150, height: 150, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', backgroundColor: 'white' }}>
              <Image
                src="/logo.jpg"
                alt="SnipShift Logo"
                width={150}
                height={150}
                className="logo-image"
                style={{ objectFit: 'cover', width: '100%', height: '100%', transform: 'translateY(2px) translateX(1px)' }}
              />
            </Box>
          </Box>
          <h1 className="hero-title animate-slide-up">
            Welcome to SnipShift
          </h1>
          <p className="hero-subtitle animate-slide-up">
            Connect barbershops, professionals, brands, and trainers through our advanced marketplace platform
          </p>
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', marginTop: '3rem' }}>
            <Button
              component={Link}
              href="/auth/register"
              className="btn btn-primary btn-lg animate-scale-in"
              sx={{ px: 4, py: 1.5, backgroundColor: '#2C2C2C', color: 'white', border: 'none', '&:hover': { backgroundColor: '#1A1A1A' } }}
              data-testid="button-get-started"
            >
              Get Started
            </Button>
            <Button
              component={Link}
              href="/auth/login"
              className="btn btn-outline btn-lg animate-scale-in"
              sx={{ px: 4, py: 1.5, backgroundColor: '#C0C0C0', color: '#2C2C2C', border: '2px solid #C0C0C0', '&:hover': { backgroundColor: '#A8A8A8', color: '#1A1A1A' } }}
              data-testid="button-login"
            >
              Login
            </Button>
          </Box>
        </div>
      </Box>

      {/* Small Scissors Divider */}
      <Box sx={{ 
        py: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(220,20,60,0.1) 50%, transparent 100%)'
      }}>
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              fontSize: '1.2rem',
              color: '#dc143c',
              opacity: 0.6,
              animation: `scissorsFloat ${2 + i * 0.2}s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`
            }}
          >
            ✂️
          </Box>
        ))}
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
              <Card 
                className="card animate-slide-up"
                sx={{
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(44,44,44,0.05) 0%, rgba(220,20,60,0.05) 100%)',
                  border: '1px solid rgba(220,20,60,0.1)',
                  borderRadius: '16px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(220,20,60,0.15)',
                    border: '1px solid rgba(220,20,60,0.2)'
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #dc143c 0%, #b8112e 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 24px',
                      boxShadow: '0 8px 24px rgba(220,20,60,0.3)'
                    }}
                  >
                    <Box sx={{ fontSize: '2rem', color: 'white', fontWeight: 'bold' }}>⚙️</Box>
                  </Box>
                  <Typography 
                    variant="h5" 
                    component="h3" 
                    gutterBottom 
                    sx={{ 
                      fontWeight: 600, 
                      color: '#2C2C2C',
                      mb: 2
                    }}
                  >
                    Hub Management
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#666666',
                      lineHeight: 1.6,
                      fontSize: '1rem',
                      flex: 1
                    }}
                  >
                    Streamline your barbershop operations with our comprehensive management tools
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card 
                className="card animate-slide-up"
                sx={{
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(44,44,44,0.05) 0%, rgba(220,20,60,0.05) 100%)',
                  border: '1px solid rgba(220,20,60,0.1)',
                  borderRadius: '16px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(220,20,60,0.15)',
                    border: '1px solid rgba(220,20,60,0.2)'
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #dc143c 0%, #b8112e 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 24px',
                      boxShadow: '0 8px 24px rgba(220,20,60,0.3)'
                    }}
                  >
                    <Box sx={{ fontSize: '2rem', color: 'white', fontWeight: 'bold' }}>👨‍💼</Box>
                  </Box>
                  <Typography 
                    variant="h5" 
                    component="h3" 
                    gutterBottom 
                    sx={{ 
                      fontWeight: 600, 
                      color: '#2C2C2C',
                      mb: 2
                    }}
                  >
                    Professional Network
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#666666',
                      lineHeight: 1.6,
                      fontSize: '1rem',
                      flex: 1
                    }}
                  >
                    Connect with verified professionals and find the perfect talent for your business
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card 
                className="card animate-slide-up"
                sx={{
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(44,44,44,0.05) 0%, rgba(220,20,60,0.05) 100%)',
                  border: '1px solid rgba(220,20,60,0.1)',
                  borderRadius: '16px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(220,20,60,0.15)',
                    border: '1px solid rgba(220,20,60,0.2)'
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #dc143c 0%, #b8112e 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 24px',
                      boxShadow: '0 8px 24px rgba(220,20,60,0.3)'
                    }}
                  >
                    <Box sx={{ fontSize: '2rem', color: 'white', fontWeight: 'bold' }}>🤝</Box>
                  </Box>
                  <Typography 
                    variant="h5" 
                    component="h3" 
                    gutterBottom 
                    sx={{ 
                      fontWeight: 600, 
                      color: '#2C2C2C',
                      mb: 2
                    }}
                  >
                    Brand Partnerships
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#666666',
                      lineHeight: 1.6,
                      fontSize: '1rem',
                      flex: 1
                    }}
                  >
                    Collaborate with top brands and expand your product offerings
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Small Scissors Divider */}
      <Box sx={{ 
        py: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(220,20,60,0.1) 50%, transparent 100%)'
      }}>
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              fontSize: '1.2rem',
              color: '#dc143c',
              opacity: 0.6,
              animation: `scissorsFloat ${2 + i * 0.2}s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`
            }}
          >
            ✂️
          </Box>
        ))}
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 12, bgcolor: '#2C2C2C', color: 'white' }}>
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

      {/* Small Scissors Divider */}
      <Box sx={{ 
        py: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(220,20,60,0.1) 50%, transparent 100%)'
      }}>
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              fontSize: '1.2rem',
              color: '#dc143c',
              opacity: 0.6,
              animation: `scissorsFloat ${2 + i * 0.2}s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`
            }}
          >
            ✂️
          </Box>
        ))}
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