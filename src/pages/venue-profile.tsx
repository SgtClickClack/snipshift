import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { SEO } from '@/components/seo/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/ui/optimized-image';
import {
  MapPin,
  Clock,
  CheckCircle2,
  Building2,
  Mail,
  Calendar,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { VenueHeader } from '@/components/venues/VenueHeader';
import { VenueStats } from '@/components/venues/VenueStats';
import { VenueDescription } from '@/components/venues/VenueDescription';

interface VenueProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  location: string | null;
  address: any;
  operatingHours: any;
  imageUrl: string | null;
  avatarUrl: string | null;
  liquorLicenseNumber: string | null;
  status: 'pending' | 'active';
  createdAt: string;
  updatedAt: string;
}

/**
 * VenueProfilePage - Public venue profile page
 * Displays comprehensive venue information for potential workers
 */
export default function VenueProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch venue profile
  const { data: venue, isLoading, error } = useQuery<VenueProfile>({
    queryKey: ['venue-profile', id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/marketplace/venues/${id}`);
      if (res.status === 404) {
        throw new Error('Venue not found');
      }
      if (!res.ok) {
        throw new Error('Failed to fetch venue');
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleBookShift = () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/marketplace/venue/${id}`);
      return;
    }
    // Navigate to shifts/jobs for this venue
    navigate(`/browse-shifts?venue=${id}`);
  };

  const handleContact = () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/marketplace/venue/${id}`);
      return;
    }
    // TODO: Implement contact/messaging functionality
    navigate(`/messages?venue=${id}`);
  };

  if (isLoading) {
    return (
      <>
        <SEO
          title="Loading Venue..."
          description="Loading venue profile..."
        />
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="h-64 w-full mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !venue) {
    return (
      <>
        <SEO
          title="Venue Not Found"
          description="The venue you're looking for is not available."
        />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-2xl font-bold mb-2">Venue Not Found</h1>
              <p className="text-muted-foreground mb-6">
                This venue is not available or has been removed.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const fullImageUrl = venue.imageUrl
    ? (venue.imageUrl.startsWith('http') ? venue.imageUrl : `https://hospogo.com${venue.imageUrl}`)
    : 'https://hospogo.com/og-image.jpg';

  return (
    <>
      <SEO
        title={`${venue.name} | HospoGo Marketplace`}
        description={
          venue.description ||
          `${venue.name} - Find shifts at this verified Brisbane hospitality venue.`
        }
        image={fullImageUrl}
        url={`/marketplace/venue/${venue.id}`}
        type="profile"
        socialTitle={`${venue.name} - Verified Venue on HospoGo`}
        ogDescription={
          venue.description ||
          `Join ${venue.name} on HospoGo. Verified venue with flexible shift opportunities in Brisbane.`
        }
      />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Venue Header */}
          <VenueHeader
            name={venue.name}
            imageUrl={venue.imageUrl}
            avatarUrl={venue.avatarUrl}
            location={venue.location}
            status={venue.status}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Venue Description */}
              <VenueDescription
                description={venue.description}
                address={venue.address}
              />

              {/* Operating Hours */}
              <VenueStats
                operatingHours={venue.operatingHours}
                address={venue.address}
                liquorLicenseNumber={venue.liquorLicenseNumber}
              />
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Action Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Get Started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleBookShift}
                    className="w-full"
                    size="lg"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {user ? 'Browse Shifts' : 'Sign Up to Book Shifts'}
                  </Button>
                  <Button
                    onClick={handleContact}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {user ? 'Contact Venue' : 'Sign Up to Contact'}
                  </Button>
                  {!user && (
                    <p className="text-xs text-muted-foreground text-center">
                      Sign up or log in to book shifts and contact venues
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Verification Badge */}
              {venue.status === 'active' && (
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">
                          Verified Venue
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Stripe verified and ready to pay
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
