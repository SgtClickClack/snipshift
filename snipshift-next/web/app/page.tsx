import React, { Suspense } from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { Store, Person, EmojiEvents, School, ArrowForward } from '@mui/icons-material';

// TODO: Create these components
// import { LoadingSpinner } from '../src/components/common/LoadingSpinner';
// import { HeroSection } from '../src/components/landing/HeroSection';
// import { FeaturesSection } from '../src/components/landing/FeaturesSection';
// import { TestimonialsSection } from '../src/components/landing/TestimonialsSection';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const RoleCard = ({
  icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}) => (
  <Grid item xs={12} sm={6} md={3}>
    <StyledCard>
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <Avatar
          sx={{
            mx: 'auto',
            mb: 2,
            bgcolor: color,
            width: 64,
            height: 64,
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Button
          component={Link}
          href={href}
          variant="outlined"
          endIcon={<ArrowForward />}
          fullWidth
        >
          Get Started
        </Button>
      </CardContent>
    </StyledCard>
  </Grid>
);

export default function HomePage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>Loading...</Box>}>
        {/* Hero Section */}
        <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 12 }}>
          <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
            <Typography variant="h2" component="h1" gutterBottom>
              Welcome to SnipShift 2.0
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
              The next generation platform connecting the creative industry
            </Typography>
          </Container>
        </Box>

        {/* Role Selection Section */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 2 }}
          >
            Choose Your Role
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{ mb: 6 }}
          >
            Join the platform that connects the creative industry
          </Typography>

          <Grid container spacing={4}>
            <RoleCard
              icon={<Store sx={{ fontSize: 32, color: 'white' }} />}
              title="Hub Owner"
              description="Own a barbershop or salon? Post shifts and find talented professionals."
              href="/auth/register?role=hub"
              color="#2196F3"
            />
            <RoleCard
              icon={<Person sx={{ fontSize: 32, color: 'white' }} />}
              title="Professional"
              description="Barber or stylist? Find flexible work opportunities and showcase your skills."
              href="/auth/register?role=professional"
              color="#4CAF50"
            />
            <RoleCard
              icon={<EmojiEvents sx={{ fontSize: 32, color: 'white' }} />}
              title="Brand"
              description="Product company? Connect with professionals and promote your products."
              href="/auth/register?role=brand"
              color="#9C27B0"
            />
            <RoleCard
              icon={<School sx={{ fontSize: 32, color: 'white' }} />}
              title="Trainer"
              description="Educator? Share your expertise and monetize your training content."
              href="/auth/register?role=trainer"
              color="#FF9800"
            />
          </Grid>
        </Container>

        {/* Features and testimonials will be added here */}

        {/* CTA Section */}
        <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
          <Container maxWidth="md" sx={{ textAlign: 'center' }}>
            <Typography variant="h3" component="h2" gutterBottom>
              Ready to Join the Revolution?
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
      </Suspense>
    </Box>
  );
}
