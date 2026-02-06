import { Building2, ChevronRight, Sparkles } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfettiAnimation } from '@/components/onboarding/ConfettiAnimation';

type OnboardingCompletionScreenProps = {
  displayName: string;
  formattedTime: string;
  onGoToDashboard: () => void;
};

/**
 * Onboarding completion screen with confetti and CTA.
 */
export const OnboardingCompletionScreen = ({
  displayName,
  formattedTime,
  onGoToDashboard,
}: OnboardingCompletionScreenProps) => (
  <>
    <SEO title="Onboarding Complete" description="Welcome to HospoGo!" url="/onboarding" />
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      <ConfettiAnimation />
      <div className="w-full max-w-2xl relative z-10">
        <Card className="card-chrome bg-zinc-900 border border-zinc-800">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-6">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-brand-neon/20 rounded-full animate-ping" />
                <div className="absolute inset-2 bg-brand-neon/40 rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center w-full h-full bg-brand-neon rounded-full">
                  <Building2 className="h-12 w-12 text-black" />
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <Sparkles className="h-6 w-6 text-brand-neon animate-pulse" style={{ animationDelay: '0s' }} />
                <Sparkles className="h-6 w-6 text-brand-neon animate-pulse" style={{ animationDelay: '0.2s' }} />
                <Sparkles className="h-6 w-6 text-brand-neon animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-black text-brand-neon animate-steady-hum">
                  Welcome to the Valley
                </h1>
                <p className="text-2xl font-bold text-white">{displayName}</p>
                <p className="text-lg text-gray-300">Your profile is active and ready for Brisbane.</p>
                <p className="text-sm text-gray-400">Activated on {formattedTime}</p>
              </div>

              <div className="pt-6 space-y-4">
                <Button
                  onClick={onGoToDashboard}
                  variant="accent"
                  size="lg"
                  className="shadow-neon-realistic hover:shadow-[0_0_20px_rgba(186,255,57,1),0_0_40px_rgba(186,255,57,0.8),0_0_60px_rgba(186,255,57,0.6)] transition-all duration-300 text-lg px-8 py-6"
                  data-testid="onboarding-go-to-dashboard"
                >
                  Enter Dashboard
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
                <p className="text-sm text-gray-400">
                  Start posting shifts and connecting with Brisbane's hospitality community
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </>
);
