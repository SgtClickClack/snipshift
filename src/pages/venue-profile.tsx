import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { SEO } from '@/components/seo/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ArrowLeft } from 'lucide-react';
import { VenueProfileLayout } from '@/components/venues/VenueProfileLayout';
import { VenueActionSidebar } from '@/components/venues/VenueActionSidebar';
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
/**
 * VenueProfilePage - Public venue profile page
 * Displays comprehensive venue information for potential workers
 * Mobile-first layout with share functionality
 */
export default function VenueProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
        url={`/marketplace/${venue.id}`}
        type="profile"
        socialTitle={`${venue.name} - Verified Venue on HospoGo`}
        ogDescription={
          venue.description ||
          `Join ${venue.name} on HospoGo. Verified venue with flexible shift opportunities in Brisbane.`
        }
      />
      <VenueProfileLayout
        name={venue.name}
        imageUrl={venue.imageUrl}
        avatarUrl={venue.avatarUrl}
        location={venue.location}
        status={venue.status}
      >
        {/* Back Button - Mobile-first: positioned above content */}
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="sm:mb-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Main Content Grid - Mobile-first: sidebar first on small screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Mobile-first: appears first on small screens for CTA priority */}
          <div className="lg:order-2">
            <VenueActionSidebar
              venueId={venue.id}
              status={venue.status}
            />
          </div>

          {/* Main Content - Mobile-first: appears after sidebar on small screens */}
          <div className="lg:col-span-2 lg:order-1 space-y-6">
            {/* Venue Description */}
            <VenueDescription
              description={venue.description}
              address={venue.address}
            />

            {/* Operating Hours & Stats */}
            <VenueStats
              operatingHours={venue.operatingHours}
              address={venue.address}
              liquorLicenseNumber={venue.liquorLicenseNumber}
            />
          </div>
        </div>
      </VenueProfileLayout>
    </>
  );
}
