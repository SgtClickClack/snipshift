import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Mail, CheckCircle2, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

interface VenueActionSidebarProps {
  venueId: string;
  status: 'pending' | 'active';
  onShare?: () => void;
}

/**
 * VenueActionSidebar - Contains the "Contact" or "Apply" buttons
 * Mobile-first: CTA buttons are prioritized on small screens
 */
export function VenueActionSidebar({
  venueId,
  status,
  onShare,
}: VenueActionSidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleBookShift = () => {
    if (!user) {
      navigate(`/login?redirect=/marketplace/${venueId}`);
      return;
    }
    navigate(`/browse-shifts?venue=${venueId}`);
  };

  const handleContact = () => {
    if (!user) {
      navigate(`/login?redirect=/marketplace/${venueId}`);
      return;
    }
    navigate(`/messages?venue=${venueId}`);
  };

  const handleShareClick = () => {
    const url = `${window.location.origin}/marketplace/${venueId}`;
    
    // Try native share API first (mobile)
    if (navigator.share) {
      navigator.share({
        title: `Check out this venue on HospoGo`,
        text: `View ${venueId} on HospoGo marketplace`,
        url: url,
      }).catch(() => {
        // Fallback to clipboard if share is cancelled
        copyToClipboard(url);
      });
    } else {
      // Fallback to clipboard
      copyToClipboard(url);
    }
    
    if (onShare) {
      onShare();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Link copied!',
        description: 'Venue link copied to clipboard.',
      });
    }).catch(() => {
      toast({
        title: 'Failed to copy',
        description: 'Please try again.',
        variant: 'destructive',
      });
    });
  };

  return (
    <div className="space-y-4">
      {/* Action Card - Mobile-first: Sticky on small screens */}
      <Card className="sticky top-4 sm:static">
        <CardHeader>
          <CardTitle className="text-lg">Get Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Primary CTA - Book/Apply Button */}
          <Button
            onClick={handleBookShift}
            className="w-full"
            size="lg"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {user ? 'Browse Shifts' : 'Sign Up to Book Shifts'}
          </Button>
          
          {/* Secondary CTA - Contact Button */}
          <Button
            onClick={handleContact}
            variant="outline"
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            {user ? 'Contact Venue' : 'Sign Up to Contact'}
          </Button>

          {/* Share Button */}
          <Button
            onClick={handleShareClick}
            variant="ghost"
            className="w-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          {!user && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Sign up or log in to book shifts and contact venues
            </p>
          )}
        </CardContent>
      </Card>

      {/* Verification Badge */}
      {status === 'active' && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100 text-sm">
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
  );
}
