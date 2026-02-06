import { AlertCircle, SkipForward, Sparkles } from 'lucide-react';
import { RSALocker } from '@/components/profile/RSALocker';
import { GovernmentIDLocker } from '@/components/profile/GovernmentIDLocker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type DocumentVerificationStepProps = {
  documentsSkipped: boolean;
  onSkip: () => void;
  onUnskip: () => void;
};

/**
 * Step 2: Document verification (RSA + Government ID).
 */
export const DocumentVerificationStep = ({
  documentsSkipped,
  onSkip,
  onUnskip,
}: DocumentVerificationStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-black tracking-tighter text-white mb-2">Welcome to The Vault</h2>
      <p className="text-gray-300">
        Your credentials are protected with enterprise-grade security.
      </p>
    </div>

    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/20 p-2">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Automated DVS Verification</h3>
          <p className="text-xs text-gray-400 mt-1">
            Your RSA certificate and Government ID are verified instantly via the Document
            Verification Service (DVS) API handshake. No manual review delays.
          </p>
        </div>
      </div>
    </div>

    {!documentsSkipped ? (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-brand-neon/20 p-2 mt-0.5">
            <SkipForward className="h-4 w-4 text-brand-neon" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-white mb-1">Want to explore first?</h3>
            <p className="text-sm text-gray-400 mb-3">
              Skip this step and upload your documents later from your profile settings.
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
            No problem! You can upload your documents anytime from{' '}
            <span className="font-semibold">Settings → Verification</span>.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="ghost" onClick={onUnskip} className="w-full text-gray-400 hover:text-white">
          Changed your mind? Upload documents now
        </Button>
      </div>
    )}

    {!documentsSkipped ? (
      <div className="space-y-4">
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">Or upload your documents now</p>
        </div>
        <RSALocker />
        <GovernmentIDLocker />
      </div>
    ) : null}
  </div>
);
