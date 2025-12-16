import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { sendPasswordReset } from '@/lib/firebase';

type SubmitState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && !isSubmitting;
  }, [email, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitState({ status: 'idle' });

    const cleanEmail = email.trim();

    try {
      await sendPasswordReset(cleanEmail);

      // Neutral messaging: do not reveal whether the email exists.
      setSubmitState({ status: 'success' });
      toast({
        title: 'Check your email',
        description: 'If an account exists for that email, you’ll receive a reset link shortly.',
      });
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';

      // Still keep messaging neutral for user-not-found to prevent account enumeration.
      if (code === 'auth/user-not-found') {
        setSubmitState({ status: 'success' });
        toast({
          title: 'Check your email',
          description: 'If an account exists for that email, you’ll receive a reset link shortly.',
        });
        return;
      }

      let message = 'Something went wrong. Please try again.';

      if (code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection and try again.';
      }

      setSubmitState({ status: 'error', message });
      toast({
        title: 'Password reset failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-6 md:py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <Mail className="text-primary text-3xl mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-card-foreground">
              Reset your password
            </CardTitle>
            <p className="text-muted-foreground">We’ll email you a secure reset link.</p>
          </CardHeader>
          <CardContent>
            {submitState.status === 'success' && (
              <Alert className="mb-6" data-testid="alert-success">
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>
                  If an account exists for <span className="font-medium">{email.trim()}</span>, you’ll receive a
                  reset link shortly.
                </AlertDescription>
              </Alert>
            )}

            {submitState.status === 'error' && (
              <Alert className="mb-6" variant="destructive" data-testid="alert-error">
                <AlertTitle>Unable to send reset email</AlertTitle>
                <AlertDescription>{submitState.message}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-2"
                  data-testid="input-email"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!canSubmit}
                data-testid="button-send-reset"
              >
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>

            <div className="text-center mt-6">
              <p className="text-muted-foreground">
                Remembered your password?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Back to sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


