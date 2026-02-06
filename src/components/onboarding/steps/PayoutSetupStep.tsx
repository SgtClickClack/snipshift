import { AlertCircle, SkipForward } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import PayoutSettings from '@/components/payments/payout-settings';

type PayoutSetupStepProps = {
  payoutSkipped: boolean;
  onSkip: () => void;
  onUnskip: () => void;
};

/**
 * Step 4: Stripe payout setup (optional).
 */
export const PayoutSetupStep = ({ payoutSkipped, onSkip, onUnskip }: PayoutSetupStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">Stripe Payout Setup</h2>
      <p className="text-gray-300">Set up your payout account so you can get paid automatically.</p>
    </div>
    {!payoutSkipped ? (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-brand-neon/20 p-2 mt-0.5">
            <SkipForward className="h-4 w-4 text-brand-neon" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-white mb-1">Set up payouts later?</h3>
            <p className="text-sm text-gray-400 mb-3">
              Skip this step and set up your bank account later from your profile settings.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              className="border-zinc-600 hover:bg-zinc-700"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        <Alert className="bg-green-900/30 border-green-500/50">
          <AlertCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-200">
            No problem! You can set up your payout account anytime from{' '}
            <span className="font-semibold">Settings → Payments</span>.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="ghost" onClick={onUnskip} className="w-full text-gray-400 hover:text-white">
          Changed your mind? Set up payouts now
        </Button>
      </div>
    )}
    {!payoutSkipped ? (
      <div className="space-y-4">
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">Or set up your payout account now</p>
        </div>
        <div className="bg-white rounded-lg p-4">
          <PayoutSettings />
        </div>
      </div>
    ) : null}
  </div>
);
