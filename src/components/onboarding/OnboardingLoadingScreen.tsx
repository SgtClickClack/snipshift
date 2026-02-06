import { Loader2 } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';

/**
 * Full-screen loader shown while onboarding verifies auth readiness.
 */
export const OnboardingLoadingScreen = () => (
  <>
    <SEO
      title="Staff Onboarding"
      description="Complete your staff profile to start browsing shifts."
      url="/onboarding"
    />
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-brand-neon mx-auto" />
        <h2 className="text-xl font-semibold text-white">Preparing your HospoGo workspace</h2>
        <p className="text-gray-400">Setting up your account, this will just take a moment</p>
      </div>
    </div>
  </>
);
