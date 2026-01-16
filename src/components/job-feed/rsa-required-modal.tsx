import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RSARequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExpired?: boolean;
}

export function RSARequiredModal({ isOpen, onClose, isExpired = false }: RSARequiredModalProps) {
  const navigate = useNavigate();

  const handleGoToVerification = () => {
    onClose();
    navigate('/settings?category=verification');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-destructive/10 p-2">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-xl">RSA Verification Required</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            {isExpired ? (
              <>
                Your RSA certificate appears to be expired. Please upload a current RSA certificate to apply for shifts.
              </>
            ) : (
              <>
                You need to upload and verify your RSA certificate before you can apply for shifts. This ensures compliance with hospitality industry requirements.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">What you need to do:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Upload your RSA certificate (PDF or image)</li>
                <li>Enter your RSA certificate number</li>
                <li>Set your RSA expiry date</li>
                <li>Wait for admin verification</li>
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button onClick={handleGoToVerification} className="w-full sm:w-auto">
            Go to Verification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
