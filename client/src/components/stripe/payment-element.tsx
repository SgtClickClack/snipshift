import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement as StripePaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Clock
} from "lucide-react";

interface PaymentElementProps {
  contentId: string;
  contentTitle: string;
  amount: number;
  trainerId: string;
  trainerName: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

export default function PaymentElement({ 
  contentId, 
  contentTitle, 
  amount, 
  trainerId, 
  trainerName,
  onSuccess, 
  onCancel 
}: PaymentElementProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const platformFee = amount * 0.1; // 10% platform fee
  const trainerEarnings = amount - platformFee;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPaymentStatus('processing');

    try {
      // Confirm the payment
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/training-hub?payment=success&content=${contentId}`,
        },
        redirect: 'if_required'
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentStatus('success');
        toast({
          title: "Payment Successful!",
          description: "Your purchase is complete. Accessing content now...",
        });
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentStatus('error');
      toast({
        title: "Payment Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-medium text-green-900 mb-2">Payment Successful!</h3>
          <p className="text-green-700 mb-4">
            You now have access to "{contentTitle}". Enjoy your training!
          </p>
          <Button onClick={() => window.location.href = '/training-hub'}>
            Go to Training Hub
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="payment-element">
      {/* Purchase Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Purchase Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Training Content:</span>
              <span className="text-muted-foreground">{contentTitle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Trainer:</span>
              <span className="text-muted-foreground">{trainerName}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Content Price:</span>
                <span className="font-bold text-lg">${amount.toFixed(2)} AUD</span>
              </div>
            </div>
          </div>

          {/* Escrow Information */}
          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Secure Escrow Payment:</strong> Your payment is held securely until content access is confirmed. 
              This protects both you and the trainer.
            </AlertDescription>
          </Alert>

          {/* Payment Breakdown */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Payment Breakdown:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Trainer Earnings:</span>
                <span className="font-medium">${trainerEarnings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span className="font-medium">${platformFee.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <StripePaymentElement 
                options={{
                  layout: 'tabs',
                  paymentMethodOrder: ['card'],
                }}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!stripe || !elements || isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-complete-payment"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Complete Secure Payment
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Security Information */}
          <div className="mt-6 pt-4 border-t border-muted">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>256-bit SSL Encryption</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Instant Access</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Stripe Secure</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}